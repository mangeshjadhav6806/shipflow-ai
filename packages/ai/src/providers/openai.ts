// =============================================================================
// ShipFlow AI — OpenAI GPT AI Provider
// =============================================================================

import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import { generateText, generateObject } from "ai";
import { AIProvider, AIProviderResponse, AIProviderTextResponse, AIMessage, TokenUsageInfo } from "./index";

export class OpenAIProvider implements AIProvider {
  providerName = "OpenAI";
  modelName = "gpt-4o-mini";

  private getModel() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing OPENAI_API_KEY environment variable.");
    }
    return openai(this.modelName);
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    // GPT-4o-mini cost:
    // Input: $0.150 per 1,000,000 tokens
    // Output: $0.600 per 1,000,000 tokens
    const inputCost = (inputTokens / 1_000_000) * 0.150;
    const outputCost = (outputTokens / 1_000_000) * 0.600;
    return inputCost + outputCost;
  }

  async generateText(
    prompt: string,
    systemPrompt?: string,
    messages?: AIMessage[]
  ): Promise<AIProviderTextResponse> {
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
