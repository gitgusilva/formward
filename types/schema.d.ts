/**
 * Public types for formward/schema (Zod, Yup, SchemaProvider, installSchema).
 */

export interface SchemaValidationResult {
  valid: boolean;
  message?: string;
  data?: Record<string, unknown>;
}

export interface FormwardRuleLike {
  validate: (
    value: unknown,
    ...args: unknown[]
  ) =>
    | boolean
    | Promise<boolean>
    | { valid: boolean; data?: Record<string, unknown> }
    | Promise<{ valid: boolean; data?: Record<string, unknown> }>;
  getMessage?: (field: string, params: unknown[], data: Record<string, unknown>) => string;
  options?: { immediate?: boolean; computesRequired?: boolean; hasTarget?: boolean };
  paramNames?: string[];
}

/** Zod-like schema: object with safeParse(value). Used by toZodRule. */
export interface ZodLikeSchema {
  safeParse: (value: unknown) =>
    | { success: true; data: unknown }
    | { success: false; error: { message: string } };
}

/**
 * Converts a Zod schema into a Formward rule for use with Validator.extend().
 * Requires peer dependency `zod` when using Zod schemas.
 */
export function toZodRule (
  schema: ZodLikeSchema,
  options?: { message?: string }
): FormwardRuleLike;

/** Yup-like schema: object with validateSync(value). Used by toYupRule / toYupRuleAsync. */
export interface YupLikeSchema {
  validateSync: (value: unknown) => unknown;
  validate?: (value: unknown) => Promise<unknown>;
}

/**
 * Converts a Yup schema into a Formward rule (sync). Use toYupRuleAsync for schemas with async tests.
 * Requires peer dependency `yup` when using Yup schemas.
 */
export function toYupRule (
  schema: YupLikeSchema,
  options?: { message?: string }
): FormwardRuleLike;

/**
 * Async version of toYupRule for Yup schemas that use async tests.
 */
export function toYupRuleAsync (
  schema: YupLikeSchema,
  options?: { message?: string }
): FormwardRuleLike;

/** Options for installSchema. */
export interface InstallSchemaOptions {
  prefix?: string;
}

/**
 * Registers a Zod or Yup object schema as Formward rules (prefix:fieldName).
 * Returns a cleanup function to unregister the rules.
 */
export function installSchema (
  validator: { extend: (name: string, rule: unknown, options?: unknown) => void; constructor: { remove: (name: string) => void } },
  schema: unknown,
  options?: InstallSchemaOptions
): () => void;

/** Vue component that installs a schema for its children. Use with v-validate="'schema:fieldName'". */
export const SchemaProvider: import('vue').Component;
