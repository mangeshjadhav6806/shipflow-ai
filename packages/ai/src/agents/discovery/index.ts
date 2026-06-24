// =============================================================================
// ShipFlow AI — Discovery Agent Public API
// =============================================================================

import { prisma } from "@shipflow/db";
import { FeatureStatus } from "@prisma/client";
import { logger } from "@shipflow/logger";
import { FeatureAnalyzer } from "./analyzer";
import { FeatureClarifier } from "./clarifier";
import { FeatureDuplicateDetector } from "./duplicate-detector";
import { DiscoveryDecisionMaker } from "./decision-maker";
import { FeatureSpecBuilder } from "./spec-builder";
import { RepoContextStub } from "./context/repo-context";
import { FeatureAnalysis, ClarificationQuestions, DuplicateCheck, FeatureSpecification } from "../../schemas/discovery";
import { ConfidenceResult } from "../../utils/confidence-engine";

export interface DiscoveryResult {
  featureId: string;
  status: FeatureStatus;
  recommendation: ConfidenceResult["recommendation"];
  score: number;
  analysis: FeatureAnalysis;
  duplicateCheck?: DuplicateCheck;
  questions?: ClarificationQuestions;
  spec?: FeatureSpecification;
  agentRunIds: string[];
}

export class DiscoveryAgent {
  /**
   * Submit a new feature request and process it through the Discovery pipeline.
   */
  static async submitRequest(
    rawText: string,
    projectId: string,
    workspaceId: string
  ): Promise<DiscoveryResult> {
    logger.info(`[DiscoveryAgent] Submitting new feature request in workspace: ${workspaceId}, project: ${projectId}`);

    // 1. Create Feature in DRAFT state
    const feature = await prisma.feature.create({
      data: {
        workspaceId,
        projectId,
        title: "New Feature Request",
        description: rawText,
        status: FeatureStatus.DRAFT,
      },
    });

    return this.runPipeline(feature.id, rawText, projectId, workspaceId);
  }

  /**
   * Submit answers to clarification questions, append context, and re-run pipeline.
   */
  static async answerClarification(
    featureId: string,
    answers: { questionId: string; answerText: string }[],
    workspaceId: string
  ): Promise<DiscoveryResult> {
    logger.info(`[DiscoveryAgent] Answering clarification questions for feature: ${featureId}`);

    // 1. Persist answers
    for (const ans of answers) {
      await prisma.clarificationAnswer.upsert({
        where: { clarificationQuestionId: ans.questionId },
        create: {
          clarificationQuestionId: ans.questionId,
          answer: ans.answerText,
        },
        update: {
          answer: ans.answerText,
        },
      });
    }

    // 2. Fetch original feature
    const feature = await prisma.feature.findUnique({
      where: { id: featureId },
      include: {
        questions: {
          include: {
            answer: true,
          },
        },
      },
    });

    if (!feature) {
      throw new Error(`Feature with ID ${featureId} not found.`);
    }

    // 3. Compile updated prompt description containing original text + answers
    const answersText = feature.questions
      .filter((q) => q.answer !== null)
      .map((q) => `Q: ${q.question}\nA: ${q.answer?.answer}`)
      .join("\n\n");

    const augmentedDescription = `${feature.description}\n\n=== Clarification Answers ===\n${answersText}`;

    // 4. Re-run pipeline with augmented description
    return this.runPipeline(featureId, augmentedDescription, feature.projectId, workspaceId);
  }

  /**
   * Internal pipeline execution runner
   */
  private static async runPipeline(
    featureId: string,
    description: string,
    projectId: string,
    workspaceId: string
  ): Promise<DiscoveryResult> {
    const agentRunIds: string[] = [];

    // Step 1: Feature Analysis
    const { analysis, agentRunId: analysisRunId } = await FeatureAnalyzer.analyze(
      featureId,
      description,
      workspaceId
    );
    agentRunIds.push(analysisRunId);

    // Update feature title and description in DB with refined inputs if analyzer returned them
    await prisma.feature.update({
      where: { id: featureId },
      data: {
        title: analysis.initialTitle,
      },
    });

    // Step 2: If clarification is needed, generate clarification questions and exit pipeline
    if (analysis.needsClarification) {
      const { questions, agentRunId: clarifierRunId } = await FeatureClarifier.clarify(
        featureId,
        description,
        analysis.missingContext,
        workspaceId,
        analysisRunId
      );
      agentRunIds.push(clarifierRunId);

      await prisma.feature.update({
        where: { id: featureId },
        data: { status: FeatureStatus.CLARIFYING },
      });

      const { decision } = await DiscoveryDecisionMaker.evaluate(featureId, {
        isAmbiguous: true,
        isFeasible: analysis.isFeasible,
        hasDuplicates: false,
        repoMatchScore: 0.5,
      });

      return {
        featureId,
        status: FeatureStatus.CLARIFYING,
        recommendation: decision.recommendation,
        score: decision.score,
        analysis,
        questions,
        agentRunIds,
      };
    }

    // Step 3: Duplicate detection (runs when request is unambiguous)
    const { duplicateCheck, agentRunId: duplicateRunId } = await FeatureDuplicateDetector.check(
      featureId,
      description,
      workspaceId,
      analysisRunId
    );
    agentRunIds.push(duplicateRunId);

    // Step 4: Decision Making
    const { decision } = await DiscoveryDecisionMaker.evaluate(featureId, {
      isAmbiguous: false,
      isFeasible: analysis.isFeasible,
      hasDuplicates: duplicateCheck.hasDuplicates,
      repoMatchScore: 0.5,
    });

    // Step 5: Spec Generation (runs when decision recommendation is PROCEED)
    if (decision.recommendation === "PROCEED") {
      const repoProvider = new RepoContextStub();
      const repoContext = await repoProvider.gather(workspaceId, featureId);

      const { spec, agentRunId: specRunId } = await FeatureSpecBuilder.build(
        featureId,
        description,
        repoContext,
        workspaceId,
        analysisRunId
      );
      agentRunIds.push(specRunId);

      await prisma.feature.update({
        where: { id: featureId },
        data: { status: FeatureStatus.READY_FOR_PRD },
      });

      return {
        featureId,
        status: FeatureStatus.READY_FOR_PRD,
        recommendation: decision.recommendation,
        score: decision.score,
        analysis,
        duplicateCheck,
        spec,
        agentRunIds,
      };
    }

    // Decision recommendation is FLAG_DUPLICATE, INFEASIBLE, or NEEDS_CLARIFICATION
    // Update feature status to DRAFT
    await prisma.feature.update({
      where: { id: featureId },
      data: { status: FeatureStatus.DRAFT },
    });

    return {
      featureId,
      status: FeatureStatus.DRAFT,
      recommendation: decision.recommendation,
      score: decision.score,
      analysis,
      duplicateCheck,
      agentRunIds,
    };
  }
}
