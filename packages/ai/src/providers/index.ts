// =============================================================================
// ShipFlow AI — AI Provider Abstraction
// =============================================================================

import { z } from "zod";

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface TokenUsageInfo {
  inputTokens: number;
  outputTokens: number;
  cost: number; // cost in USD
  modelName: string;
}

export interface AIProviderResponse<T> {
  object: T;
  usage: TokenUsageInfo;
  rawResponse?: string;
}

export interface AIProviderTextResponse {
  text: string;
  usage: TokenUsageInfo;
  rawResponse?: string;
}

export interface AIProvider {
  providerName: string;
  modelName: string;

  generateText(
    prompt: string,
    systemPrompt?: string,
    messages?: AIMessage[]
  ): Promise<AIProviderTextResponse>;

  generateObject<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    systemPrompt?: string,
    messages?: AIMessage[]
  ): Promise<AIProviderResponse<T>>;
}

import { GoogleAIProvider } from "./google";
import { OpenAIProvider } from "./openai";
import { MockAIProvider } from "./mock";

export function getProvider(preferred?: string): AIProvider {
  if (preferred === "google" && process.env.GEMINI_API_KEY) {
    return new GoogleAIProvider();
  }
  if (preferred === "openai" && process.env.OPENAI_API_KEY) {
    return new OpenAIProvider();
  }

  // Fallbacks based on environment keys
  if (process.env.GEMINI_API_KEY) {
    return new GoogleAIProvider();
  }
  if (process.env.OPENAI_API_KEY) {
    return new OpenAIProvider();
  }

  // If no API keys are present, return the mock provider
  return new MockAIProvider();
}
