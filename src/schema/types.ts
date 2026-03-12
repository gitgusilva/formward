/**
 * Generic result from a schema validation (Zod, Yup, etc.).
 * Used by adapters to normalize different libraries to Formward Rule format.
 */
export interface SchemaValidationResult {
  valid: boolean;
  message?: string;
  data?: Record<string, unknown>;
}

/**
 * Rule shape compatible with Validator.extend(name, rule).
 * Same as Formward Rule: validate + optional getMessage for dictionary.
 */
export interface FormwardRuleLike {
  validate: (value: unknown, ...args: unknown[]) => boolean | Promise<boolean> | { valid: boolean; data?: Record<string, unknown> } | Promise<{ valid: boolean; data?: Record<string, unknown> }>;
  getMessage?: (field: string, params: unknown[], data: Record<string, unknown>) => string;
  options?: { immediate?: boolean; computesRequired?: boolean; hasTarget?: boolean };
  paramNames?: string[];
}
