// =============================================================================
// ShipFlow AI — Discovery Confidence Engine
// =============================================================================

export interface ConfidenceSignals {
  isAmbiguous: boolean;
  isFeasible: boolean;
  hasDuplicates: boolean;
  repoMatchScore: number; // 0.0 to 1.0
  questionsCount: number;
  answersCount: number;
}

export interface ConfidenceResult {
  score: number; // 0.0 to 1.0
  recommendation: "PROCEED" | "NEEDS_CLARIFICATION" | "FLAG_DUPLICATE" | "INFEASIBLE";
  breakdown: {
    clarityScore: number;
    feasibilityScore: number;
    duplicateScore: number;
    repoScore: number;
    completenessScore: number;
  };
}

export class ConfidenceEngine {
  /**
   * Calculates a weighted confidence score and recommendation.
   */
  static calculate(signals: ConfidenceSignals): ConfidenceResult {
    // 1. Clarity Score (0.0 to 1.0)
    const clarityScore = signals.isAmbiguous ? 0.2 : 1.0;

    // 2. Feasibility Score
    const feasibilityScore = signals.isFeasible ? 1.0 : 0.0;

    // 3. Duplicate Score
    const duplicateScore = signals.hasDuplicates ? 0.2 : 1.0;

    // 4. Repo Context Score
    const repoScore = signals.repoMatchScore;

    // 5. Completeness Score (answers count vs questions count)
    let completenessScore = 1.0;
    if (signals.questionsCount > 0) {
      completenessScore = signals.answersCount / signals.questionsCount;
    }

    // Weights:
    // Clarity: 35%
    // Feasibility: 20%
    // Duplicate status: 15%
    // Repo context: 15%
    // Completeness of clarifications: 15%
    const score =
      clarityScore * 0.35 +
      feasibilityScore * 0.20 +
      duplicateScore * 0.15 +
      repoScore * 0.15 +
      completenessScore * 0.15;

    // Recommendation rules:
    let recommendation: ConfidenceResult["recommendation"] = "PROCEED";

    if (!signals.isFeasible) {
      recommendation = "INFEASIBLE";
    } else if (signals.hasDuplicates) {
      recommendation = "FLAG_DUPLICATE";
    } else if (signals.isAmbiguous || (signals.questionsCount > 0 && signals.answersCount < signals.questionsCount)) {
      recommendation = "NEEDS_CLARIFICATION";
    } else if (score < 0.7) {
      recommendation = "NEEDS_CLARIFICATION";
    }

    return {
      score: Math.round(score * 100) / 100,
      recommendation,
      breakdown: {
        clarityScore,
        feasibilityScore,
        duplicateScore,
        repoScore,
        completenessScore,
      },
    };
  }
}
