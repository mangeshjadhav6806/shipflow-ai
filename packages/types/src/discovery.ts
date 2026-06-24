// =============================================================================
// ShipFlow AI — Discovery Type Definitions
// =============================================================================

export interface FeatureAnalysis {
  isAmbiguous: boolean;
  isFeasible: boolean;
  needsClarification: boolean;
  missingContext: string[];
  complexityEstimate: "LOW" | "MEDIUM" | "HIGH";
  primaryCategory: string;
  initialTitle: string;
  initialDescription: string;
}

export interface ClarificationQuestionItem {
  question: string;
  options?: string[];
  reason: string;
}

export interface ClarificationQuestions {
  questions: ClarificationQuestionItem[];
}

export interface DuplicateCheckItem {
  featureId: string;
  similarityScore: number;
  reason: string;
}

export interface DuplicateCheck {
  hasDuplicates: boolean;
  potentialDuplicates: DuplicateCheckItem[];
}

export interface RiskItem {
  category: string;
  description: string;
  mitigation: string;
}

export interface RiskAnalysis {
  isRisky: boolean;
  score: number;
  risks: RiskItem[];
}

export interface FeatureSpecification {
  title: string;
  summary: string;
  userStories: string[];
  acceptanceCriteria: string[];
  technicalRequirements: string[];
  outOfScope: string[];
  riskAnalysis: RiskAnalysis;
}

export interface DiscoveryResult {
  featureId: string;
  status: string;
  recommendation: "PROCEED" | "NEEDS_CLARIFICATION" | "FLAG_DUPLICATE" | "INFEASIBLE";
  score: number;
  analysis: FeatureAnalysis;
  duplicateCheck?: DuplicateCheck;
  questions?: ClarificationQuestions;
  spec?: FeatureSpecification;
  agentRunIds: string[];
}
