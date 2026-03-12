/**
 * Adapter to use Zod schemas as Formward rules.
 * Requires `zod` to be installed (peer dependency).
 *
 * Usage:
 *   import Formward from 'formward';
 *   import { toZodRule } from 'formward/schema';
 *   import { z } from 'zod';
 *   const schema = z.string().min(2);
 *   Formward.Validator.extend('myZod', toZodRule(schema));
 *   // In template: rules="myZod"
 */
import type { FormwardRuleLike } from './types';

type ZodSchema = {
  safeParse: (value: unknown) => { success: true; data: unknown } | { success: false; error: { message: string; errors?: unknown[] } };
};

/**
 * Converts a Zod schema into a Formward rule for use with Validator.extend().
 *
 * @param schema - Zod schema (e.g. z.string(), z.object({...})).
 * @param options - Optional: custom message when validation fails.
 * @returns Rule object for Validator.extend(ruleName, rule).
 */
export function toZodRule (
  schema: ZodSchema,
  options?: { message?: string }
): FormwardRuleLike {
  const fallbackMessage = options?.message ?? 'Validation failed';

  return {
    validate (value: unknown): boolean | { valid: boolean; data: Record<string, unknown> } {
      const result = schema.safeParse(value);
      if (result.success) {
        return true;
      }
      const message = result.success === false ? result.error.message : fallbackMessage;
      return {
        valid: false,
        data: { message }
      };
    },
    getMessage (_field: string, _params: unknown[], data: Record<string, unknown>): string {
      return (data?.message as string) ?? fallbackMessage;
    }
  };
}
