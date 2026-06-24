// =============================================================================
// ShipFlow AI — Discovery Step 4: Decision Maker
// =============================================================================

import { prisma } from "@shipflow/db";
import { ConfidenceEngine, ConfidenceResult } from "../../utils/confidence-engine";
import { logger } from "@shipflow/logger";

export interface DecisionSignals {
  isAmbiguous: boolean;
  isFeasible: boolean;
  hasDuplicates: boolean;
  repoMatchScore: number;
}

export class DiscoveryDecisionMaker {
  static async evaluate(
    featureId: string,
    signals: DecisionSignals
  ): Promise<{ decision: ConfidenceResult }> {
    // 1. Gather questions and answers count from database
    let questionsCount = 0;
    let answersCount = 0;

    try {
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

      if (feature) {
        questionsCount = feature.questions.length;
        answersCount = feature.questions.filter((q) => q.answer !== null).length;
      }
    } catch (error) {
      logger.error(`[Decision Maker] Failed to retrieve questions/answers counts for feature ${featureId}:`, error);
    }

    // 2. Compute confidence score and recommendation
    const decision = ConfidenceEngine.calculate({
      isAmbiguous: signals.isAmbiguous,
      isFeasible: signals.isFeasible,
      hasDuplicates: signals.hasDuplicates,
      repoMatchScore: signals.repoMatchScore,
      questionsCount,
      answersCount,
    });

    logger.info(`[Decision Maker] Feature ${featureId} decision: ${decision.recommendation} (Confidence score: ${decision.score})`);

    return { decision };
  }
}
