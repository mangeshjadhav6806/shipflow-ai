// =============================================================================
// ShipFlow AI — Zod Output Validator
// =============================================================================

import { z } from "zod";

export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: string[],
    public rawData: unknown
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export function validateOutput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const formattedErrors = result.error.errors.map(
      (err) => `${err.path.join(".")}: ${err.message}`
    );
    throw new ValidationError(
      `AI response failed schema validation. Errors: ${formattedErrors.join(", ")}`,
      formattedErrors,
      data
    );
  }
  return result.data;
}
