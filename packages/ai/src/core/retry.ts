// =============================================================================
// ShipFlow AI — Exponential Backoff Retry Utility
// =============================================================================

import { logger } from "@shipflow/logger";

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: {
    maxRetries?: number;
    initialDelayMs?: number;
    factor?: number;
    onRetry?: (error: Error, attempt: number, nextDelayMs: number) => void | Promise<void>;
  } = {}
): Promise<T> {
  const maxRetries = opts.maxRetries ?? 3;
  const initialDelayMs = opts.initialDelayMs ?? 1000;
  const factor = opts.factor ?? 2;

  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      if (attempt > maxRetries) {
        logger.error(`[AI Retry] Max retries of ${maxRetries} exhausted. Final error: ${error?.message || error}`);
        throw error;
      }

      const nextDelayMs = initialDelayMs * Math.pow(factor, attempt - 1);
      logger.warn(
        `[AI Retry] Attempt ${attempt} failed: ${error?.message || error}. Retrying in ${nextDelayMs}ms...`
      );

      if (opts.onRetry) {
        try {
          await opts.onRetry(error, attempt, nextDelayMs);
        } catch (onRetryError) {
          logger.error(`[AI Retry] Error in onRetry callback:`, onRetryError);
        }
      }

      await new Promise((resolve) => setTimeout(resolve, nextDelayMs));
    }
  }
}
