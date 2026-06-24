// =============================================================================
// ShipFlow AI — Google Gemini AI Provider
// =============================================================================

import { z } from "zod";
import { google } from "@ai-sdk/google";
import { generateText, generateObject } from "ai";
import { AIProvider, AIProviderResponse, AIProviderTextResponse, AIMessage, TokenUsageInfo } from "./index";

export class GoogleAIProvider implements AIProvider {
  providerName = "Google";
  modelName = "gemini-1.5-flash";

  private getModel() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY environment variable.");
    }
    // createGoogleGenerativeAI can be used if we need custom options,
    // but the default 'google' instance works perfectly.
    return google(this.modelName);
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    // Gemini 1.5 Flash cost:
    // Input: $0.075 per 1,000,000 tokens
    // Output: $0.30 per 1,000,000 tokens
    const inputCost = (inputTokens / 1_000_000) * 0.075;
    const outputCost = (outputTokens / 1_000_000) * 0.30;
    return inputCost + outputCost;
  }

  async generateText(
    prompt: string,
    systemPrompt?: string,
    messages?: AIMessage[]
  ): Promise<AIProviderTextResponse> {
    const model = this.getModel();

    // Map roles to CoreMessage roles (system, user, assistant)
    const promptMessages: any[] = [];
    if (systemPrompt) {
      promptMessages.push({ role: "system", content: systemPrompt });
    }
    if (messages) {
      for (const msg of messages) {
        promptMessages.push({ role: msg.role, content: msg.content });
      }
    }
    promptMessages.push({ role: "user", content: prompt });

    const result = await generateText({
      model,
      messages: promptMessages,
    });

    const usage: TokenUsageInfo = {
      inputTokens: result.usage.inputTokens || 0,
      outputTokens: result.usage.outputTokens || 0,
      cost: this.calculateCost(result.usage.inputTokens || 0, result.usage.outputTokens || 0),
      modelName: this.modelName,
    };

    return {
      text: result.text,
      usage,
      rawResponse: result.text,
    };
  }

  async generateObject<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    systemPrompt?: string,
    messages?: AIMessage[]
  ): Promise<AIProviderResponse<T>> {
    const model = this.getModel();

    const promptMessages: any[] = [];
    if (systemPrompt) {
      promptMessages.push({ role: "system", content: systemPrompt });
    }
    if (messages) {
      for (const msg of messages) {
        promptMessages.push({ role: msg.role, content: msg.content });
      }
    }
    promptMessages.push({ role: "user", content: prompt });

    const result = await generateObject({
      model,
      schema: schema as any,
      messages: promptMessages,
    });

    const usage: TokenUsageInfo = {
      inputTokens: result.usage.inputTokens || 0,
      outputTokens: result.usage.outputTokens || 0,
      cost: this.calculateCost(result.usage.inputTokens || 0, result.usage.outputTokens || 0),
      modelName: this.modelName,
    };

    return {
      object: result.object as T,
      usage,
      rawResponse: JSON.stringify(result.object),
    };
  }
}
