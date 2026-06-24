// =============================================================================
// ShipFlow AI — AI Prompt Loader
// =============================================================================

import { prisma } from "@shipflow/db";
import { AgentType } from "@prisma/client";
import { logger } from "@shipflow/logger";

// Standard prompt fallbacks in case the database doesn't have an active version.
const STATIC_FALLBACK_PROMPTS: Record<string, string> = {
  // Step 1: Feature Analysis System Prompt
  "discovery:analysis": `You are the ShipFlow AI Feature Discovery Analyzer.
Analyze the user's raw feature request to determine if it is ambiguous, incomplete, feasible, and what primary category it fits under.
Identify any missing context elements needed for a high-quality product specification.
Return a structured JSON output conforming to the required schema.`,

  // Step 2: Clarification Questions System Prompt
  "discovery:clarification": `You are the ShipFlow AI Feature Discovery Clarifier.
Formulate 1 to 3 targeted clarification questions to resolve the ambiguities/missing context in the user's feature request.
Optionally suggest multiple-choice options to make answering easier.
Return a structured JSON output with the questions.`,

  // Step 3: Duplicate Check System Prompt
  "discovery:duplicate": `You are the ShipFlow AI Duplicate Feature Detector.
Compare the new feature request against the list of existing features in this workspace.
Identify if it is a duplicate or heavily overlaps with any existing feature.
Return a structured JSON output indicating if duplicates exist, matching feature IDs, and similarity scores.`,

  // Step 5: Feature Specification System Prompt
  "discovery:spec": `You are the ShipFlow AI Feature Specification Builder.
Compile the original request, repo context, and any clarification answers into a robust, professional Feature Specification.
Detail user stories, acceptance criteria, technical requirements, out-of-scope items, and risk analysis.
Return a structured JSON output conforming to the specification schema.`
};

export async function loadPrompt(
  key: string,
  agentType: AgentType
): Promise<{ template: string; version: number; source: "database" | "static" }> {
  try {
    // Try to query the active prompt version from database matching this agent type and key in prompt name/metadata
    // Since prisma schema doesn't have a specific 'key' field on PromptVersion, we use naming convention (e.g. name = key)
    const dbPrompt = await prisma.promptVersion.findFirst({
      where: {
        agentType,
        name: key,
        isActive: true,
      },
      orderBy: {
        version: "desc",
      },
    });

    if (dbPrompt) {
      logger.info(`[Prompt Loader] Loaded prompt "${key}" from DB (v${dbPrompt.version})`);
      return {
        template: dbPrompt.template,
        version: dbPrompt.version,
        source: "database",
      };
    }
  } catch (error) {
    logger.warn(`[Prompt Loader] Failed to query prompt "${key}" from database, falling back to static template. Error:`, error);
  }

  // Fallback to static prompt
  const staticPrompt = STATIC_FALLBACK_PROMPTS[key];
  if (!staticPrompt) {
    throw new Error(`No prompt template found for key "${key}" in database or static fallbacks.`);
  }

  return {
    template: staticPrompt,
    version: 1,
    source: "static",
  };
}
