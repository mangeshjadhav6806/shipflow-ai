// =============================================================================
// ShipFlow AI — Planning Agent
// =============================================================================
// Triggered after a feature reaches PRD_APPROVED status.
// Reuses: AgentRunner, PromptLoader, ConversationMemory, AgentRun, AgentLog, ContextSnapshot
// =============================================================================

import { prisma } from "@shipflow/db";
import { FeatureStatus, AgentType } from "@prisma/client";
import { logger } from "@shipflow/logger";
import { AgentRunner } from "../core/agent-runner";
import { ConversationMemory } from "../memory/conversation-memory";
import { engineeringPlanSchema, EngineeringPlan } from "../schemas/planning";
import type { PlanningGenerationResult, PlanningGenerationContext } from "../contracts/planning";
import type { EngineeringPlanResponse } from "../contracts/planning"; // wait, exported in types or contracts? Let's use our types package or export directly

export class PlanningAgent {
  /**
   * Generates an engineering plan for a given PRD.
   */
  static async generatePlan(prdId: string, workspaceId: string): Promise<PlanningGenerationResult> {
    logger.info(`[PlanningAgent] Starting plan generation for PRD: ${prdId}`);

    // 1. Load PRD + Feature
    const prd = await prisma.pRD.findUnique({
      where: { id: prdId },
      include: {
        feature: true,
      },
    });

    if (!prd) {
      throw new Error(`PRD ${prdId} not found.`);
    }

    // 2. Load conversation history
    let conversationHistory = "No prior conversation history.";
    try {
      const conversationId = await ConversationMemory.getOrCreateConversation(
        workspaceId,
        prd.featureId,
        AgentType.TASK_GENERATOR,
        `Planning conversation for Feature ${prd.featureId}`
      );
      const messages = await ConversationMemory.loadMessages(conversationId);
      if (messages.length > 0) {
        conversationHistory = messages
          .map((m) => `[${m.role.toUpperCase()}]: ${m.content}`)
          .join("\n\n");
      }
    } catch (err) {
      logger.warn(`[PlanningAgent] Could not load conversation history for feature ${prd.featureId}:`, err);
    }

    // 3. Clean up any existing tasks/dependencies to ensure idempotency
    await this.cleanupExistingPlan(prdId);

    // 4. Run plan generation via AgentRunner
    const result = await AgentRunner.run({
      agentType: AgentType.TASK_GENERATOR,
      featureId: prd.featureId,
      workspaceId,
      promptKey: "planning:generate",
      schema: engineeringPlanSchema,
      inputVariables: {
        prdTitle: prd.feature.title,
        prdDescription: prd.feature.description,
        prdContent: prd.content,
        conversationHistory,
      },
    });

    const plan: EngineeringPlan = result.object as EngineeringPlan;
    const agentRunId = result.agentRunId;

    // 5. Create Task records
    const taskMap = new Map<string, string>(); // LLM Task ID -> DB UUID
    for (let i = 0; i < plan.tasks.length; i++) {
      const taskData = plan.tasks[i];
      const filesAffectedClean = Array.isArray(taskData.filesAffected)
        ? taskData.filesAffected.filter((f) => typeof f === "string")
        : [];

      const createdTask = await prisma.task.create({
        data: {
          prdId,
          title: taskData.title,
          description: taskData.description,
          filesAffected: filesAffectedClean,
          orderIndex: i,
          status: "TODO",
        },
      });
      taskMap.set(taskData.id, createdTask.id);
    }

    // 6. Create TaskDependency records
    const dependencyData: { taskId: string; dependsOnId: string }[] = [];
    for (const taskData of plan.tasks) {
      const dbTaskId = taskMap.get(taskData.id);
      if (!dbTaskId) continue;

      if (Array.isArray(taskData.blockers)) {
        for (const blockerId of taskData.blockers) {
          const dbBlockerId = taskMap.get(blockerId);
          if (dbBlockerId) {
            dependencyData.push({
              taskId: dbTaskId,
              dependsOnId: dbBlockerId,
            });
          }
        }
      }
    }

    if (dependencyData.length > 0) {
      await prisma.taskDependency.createMany({
        data: dependencyData,
        skipDuplicates: true,
      });
    }

    // 7. Store planning metadata separately inside ContextSnapshot
    const mappedTasks = plan.tasks.map((t) => ({
      id: t.id,
      dbTaskId: taskMap.get(t.id),
      epicId: t.epicId,
      storyPoints: t.storyPoints,
      complexity: t.complexity,
      estimatedHours: t.estimatedHours,
      labels: t.labels,
      blockers: t.blockers,
      acceptanceCriteria: t.acceptanceCriteria,
      confidence: t.confidence,
      riskAnalysis: t.riskAnalysis,
      affectedAreas: t.affectedAreas,
      reasoning: t.reasoning,
    }));

    const planMetadata = {
      epics: plan.epics,
      tasks: mappedTasks,
      testingStrategy: plan.testingStrategy,
      executionMetadata: plan.executionMetadata,
      implementationStrategy: plan.implementationStrategy,
      milestones: plan.milestones,
      metrics: plan.metrics,
    };

    try {
      const existingSnapshot = await prisma.contextSnapshot.findUnique({
        where: { agentRunId },
      });

      const updatedSnapshot = {
        ...(existingSnapshot?.snapshot as any || {}),
        planMetadata,
      };

      await prisma.contextSnapshot.update({
        where: { agentRunId },
        data: {
          snapshot: updatedSnapshot,
        },
      });
    } catch (err) {
      logger.error(`[PlanningAgent] Failed to update ContextSnapshot with plan metadata:`, err);
    }

    // 8. Update PRD content JSON with the plan block referencing agentRunId
    try {
      const currentContent = JSON.parse(prd.content);
      const updatedContent = {
        ...currentContent,
        plan: {
          agentRunId,
          generatedAt: new Date().toISOString(),
          metrics: plan.metrics,
          milestones: plan.milestones.map((m) => ({
            id: m.id,
            title: m.title,
            description: m.description,
            taskIds: m.taskIds,
          })),
        },
      };

      await prisma.pRD.update({
        where: { id: prdId },
        data: {
          content: JSON.stringify(updatedContent),
        },
      });
    } catch (err) {
      logger.error(`[PlanningAgent] Failed to update PRD content with plan reference:`, err);
    }

    // 9. Update Feature status to TASKS_CREATED
    await prisma.feature.update({
      where: { id: prd.featureId },
      data: {
        status: FeatureStatus.TASKS_CREATED,
      },
    });

    // 10. Append to conversation memory
    try {
      const conversationId = await ConversationMemory.getOrCreateConversation(
        workspaceId,
        prd.featureId,
        AgentType.TASK_GENERATOR
      );
      await ConversationMemory.appendMessage(
        conversationId,
        "assistant",
        `Engineering plan generated successfully. Sprints/Milestones: ${plan.milestones.length}. Tasks: ${plan.metrics.totalTasks}.`
      );
    } catch (err) {
      logger.warn(`[PlanningAgent] Could not append to conversation memory:`, err);
    }

    logger.info(`[PlanningAgent] Engineering plan created and persisted for PRD: ${prdId}`);

    return {
      prdId,
      featureId: prd.featureId,
      agentRunId,
      plan,
    };
  }

  /**
   * Regenerates a plan (creates a new run and updates tasks).
   */
  static async regeneratePlan(prdId: string, workspaceId: string): Promise<PlanningGenerationResult> {
    logger.info(`[PlanningAgent] Regenerating plan for PRD: ${prdId}`);
    return this.generatePlan(prdId, workspaceId);
  }

  /**
   * Retrieves and reconstructs the full planning payload from Task table and ContextSnapshot metadata.
   */
  static async getPlan(prdId: string): Promise<EngineeringPlanResponse> {
    const prd = await prisma.pRD.findUnique({
      where: { id: prdId },
    });

    if (!prd) {
      throw new Error(`PRD ${prdId} not found.`);
    }

    let currentContent: any = {};
    try {
      currentContent = JSON.parse(prd.content);
    } catch (err) {
      throw new Error(`PRD ${prdId} has invalid or empty JSON content.`);
    }

    const planSummary = currentContent.plan;
    if (!planSummary || !planSummary.agentRunId) {
      throw new Error(`No plan generated yet for PRD ${prdId}.`);
    }

    const agentRunId = planSummary.agentRunId;

    // Fetch the snapshot
    const contextSnapshot = await prisma.contextSnapshot.findUnique({
      where: { agentRunId },
    });

    if (!contextSnapshot) {
      throw new Error(`Planning snapshot for run ${agentRunId} not found.`);
    }

    const snapshot = contextSnapshot.snapshot as any;
    const planMetadata = snapshot.planMetadata;
    if (!planMetadata) {
      throw new Error(`Planning metadata not found in snapshot for run ${agentRunId}.`);
    }

    // Fetch Task records from database
    const tasks = await prisma.task.findMany({
      where: { prdId },
      orderBy: { orderIndex: "asc" },
    });

    // Map tasks and merge with metadata stored in ContextSnapshot
    const metadataTasksMap = new Map<string, any>();
    if (Array.isArray(planMetadata.tasks)) {
      for (const tMeta of planMetadata.tasks) {
        if (tMeta.dbTaskId) {
          metadataTasksMap.set(tMeta.dbTaskId, tMeta);
        }
      }
    }

    const reconstructedTasks = tasks.map((t) => {
      const meta = metadataTasksMap.get(t.id) || {};
      return {
        id: meta.id || t.id,
        title: t.title,
        description: t.description,
        filesAffected: (t.filesAffected as string[]) || [],
        epicId: meta.epicId || "",
        storyPoints: meta.storyPoints || 1,
        complexity: meta.complexity || "LOW",
        estimatedHours: meta.estimatedHours || 8,
        labels: meta.labels || [],
        blockers: meta.blockers || [],
        acceptanceCriteria: meta.acceptanceCriteria || [],
        confidence: meta.confidence || { score: 100, reason: "" },
        riskAnalysis: meta.riskAnalysis || { level: "LOW", description: "", mitigation: "" },
        affectedAreas: meta.affectedAreas || [],
        reasoning: meta.reasoning || { whyThisTaskExists: "", whyThisOrder: "", whyThisDependsOn: "" },
      };
    });

    return {
      prdId,
      featureId: prd.featureId,
      version: prd.version,
      agentRunId,
      plan: {
        epics: planMetadata.epics || [],
        tasks: reconstructedTasks,
        testingStrategy: planMetadata.testingStrategy || { unit: "", integration: "", endToEnd: "", performance: "", security: "" },
        executionMetadata: planMetadata.executionMetadata || { criticalPath: [], parallelWorkGroups: [] },
        implementationStrategy: planMetadata.implementationStrategy || { recommendedCommitSequence: [], implementationPhases: [] },
        milestones: planMetadata.milestones || [],
        metrics: planMetadata.metrics || {
          totalTasks: 0,
          totalStoryPoints: 0,
          estimatedHours: 0,
          criticalPathLength: 0,
          parallelizationPercentage: 0,
          averageConfidence: 0,
          riskScore: 0,
          testingCoverage: 0,
        },
      },
    };
  }

  /**
   * Retrieves overall planning metrics and milestones directly from ContextSnapshot.
   */
  static async getPlanningMetrics(prdId: string) {
    const prd = await prisma.pRD.findUnique({
      where: { id: prdId },
    });

    if (!prd) {
      throw new Error(`PRD ${prdId} not found.`);
    }

    let currentContent: any = {};
    try {
      currentContent = JSON.parse(prd.content);
    } catch (err) {
      return null;
    }

    const planSummary = currentContent.plan;
    if (!planSummary || !planSummary.agentRunId) {
      return null;
    }

    const agentRunId = planSummary.agentRunId;

    const contextSnapshot = await prisma.contextSnapshot.findUnique({
      where: { agentRunId },
    });

    if (!contextSnapshot) {
      return null;
    }

    const snapshot = contextSnapshot.snapshot as any;
    const planMetadata = snapshot.planMetadata;
    if (!planMetadata) {
      return null;
    }

    return {
      metrics: planMetadata.metrics || null,
      milestones: planMetadata.milestones || [],
    };
  }

  /**
   * Clean up tasks and dependencies for a PRD.
   */
  private static async cleanupExistingPlan(prdId: string): Promise<void> {
    try {
      // 1. Delete dependencies referencing tasks in this PRD
      await prisma.taskDependency.deleteMany({
        where: {
          OR: [
            { task: { prdId } },
            { dependsOn: { prdId } },
          ],
        },
      });

      // 2. Delete tasks
      await prisma.task.deleteMany({
        where: { prdId },
      });
    } catch (err) {
      logger.error(`[PlanningAgent] Failed to clean up existing plan for PRD: ${prdId}. Error:`, err);
    }
  }
}
