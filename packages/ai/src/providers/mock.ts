// =============================================================================
// ShipFlow AI — Deterministic Mock Provider
// =============================================================================

import { z } from "zod";
import { AIProvider, AIProviderResponse, AIProviderTextResponse, AIMessage, TokenUsageInfo } from "./index";

export class MockAIProvider implements AIProvider {
  providerName = "Mock";
  modelName = "mock-model";

  async generateText(
    prompt: string,
    systemPrompt?: string,
    messages?: AIMessage[]
  ): Promise<AIProviderTextResponse> {
    const text = `This is a mock text response. Received prompt: "${prompt.substring(0, 100)}..."`;
    return {
      text,
      usage: {
        inputTokens: 10,
        outputTokens: 15,
        cost: 0.0001,
        modelName: this.modelName,
      },
      rawResponse: text,
    };
  }

  async generateObject<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    systemPrompt?: string,
    messages?: AIMessage[]
  ): Promise<AIProviderResponse<T>> {
    const shape = (schema as any).shape;
    let resultObj: any = {};

    // 1. Feature Analysis
    if (shape && "isAmbiguous" in shape) {
      const isAmbiguous = prompt.toLowerCase().includes("ambiguous") || prompt.toLowerCase().includes("vague") || prompt.toLowerCase().includes("incomplete");
      resultObj = {
        isAmbiguous,
        isFeasible: true,
        needsClarification: isAmbiguous,
        missingContext: isAmbiguous ? ["target audience", "performance constraints"] : [],
        complexityEstimate: "MEDIUM",
        primaryCategory: "Integrations",
        initialTitle: "Mock Feature Request",
        initialDescription: prompt,
      };
    }
    // 2. Clarification Questions
    else if (shape && "questions" in shape) {
      resultObj = {
        questions: [
          {
            question: "Who is the primary user role for this feature?",
            options: ["Admin", "Developer", "End User"],
            reason: "The target audience dictates authorization levels required.",
          },
          {
            question: "Should data be updated in real-time or via polling?",
            options: ["Real-time (WebSockets)", "Polling (every 1m)", "On demand"],
            reason: "Affects server resource allocation.",
          }
        ],
      };
    }
    // 3. Duplicate Check
    else if (shape && "hasDuplicates" in shape) {
      const hasDuplicates = prompt.toLowerCase().includes("duplicate");
      resultObj = {
        hasDuplicates,
        potentialDuplicates: hasDuplicates
          ? [
              {
                featureId: "00000000-0000-0000-0000-000000000000",
                similarityScore: 0.92,
                reason: "Highly overlapping descriptions of external integrations.",
              }
            ]
          : [],
      };
    }
    // 4. Feature Specification
    else if (shape && "acceptanceCriteria" in shape) {
      resultObj = {
        title: "Mock Spec: Feature Integration",
        summary: "Detailed specification of the requested feature.",
        userStories: [
          "As a user, I want to trigger mock functions so that I can see the mock pipeline works.",
          "As an administrator, I want to review the generated specifications.",
        ],
        acceptanceCriteria: [
          "Must execute without API keys.",
          "Must persist all mock objects to the database.",
        ],
        technicalRequirements: [
          "Uses MockAIProvider class.",
          "Stores logs in AgentLog schema.",
        ],
        outOfScope: [
          "Connecting to actual AI endpoints in mock mode.",
        ],
        riskAnalysis: {
          isRisky: false,
          score: 0.1,
          risks: [],
        },
      };
    } else {
      // General fallbacks for other schemas
      resultObj = {};
    }

    return {
      object: resultObj as T,
      usage: {
        inputTokens: 50,
        outputTokens: 75,
        cost: 0.0005,
        modelName: this.modelName,
      },
      rawResponse: JSON.stringify(resultObj),
    };
  }
}
