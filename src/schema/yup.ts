/**
 * Adapter to use Yup schemas as Formward rules.
 * Requires `yup` to be installed (peer dependency).
 *
 * Usage:
 *   import Formward from 'formward';
 *   import { toYupRule } from 'formward/schema';
 *   import * as yup from 'yup';
 *   const schema = yup.string().required().min(2);
 *   Formward.Validator.extend('myYup', toYupRule(schema));
 *   // In template: rules="myYup"
 */
import type { FormwardRuleLike } from './types';

type YupSchema = {
  validateSync: (value: unknown) => unknown;
};

/**
 * Converts a Yup schema into a Formward rule for use with Validator.extend().
 * Uses validateSync; for async Yup schemas use toYupRuleAsync.
 *
 * @param schema - Yup schema (e.g. yup.string(), yup.object().shape({...})).
 * @param options - Optional: custom message when validation fails.
 * @returns Rule object for Validator.extend(ruleName, rule).
 */
export function toYupRule (
  schema: YupSchema,
  options?: { message?: string }
): FormwardRuleLike {
  const fallbackMessage = options?.message ?? 'Validation failed';

  return {
    validate (value: unknown): boolean | { valid: boolean; data: Record<string, unknown> } {
      try {
        schema.validateSync(value);
        return true;
      } catch (err: unknown) {
        const message = err && typeof (err as Error).message === 'string'
          ? (err as Error).message
          : fallbackMessage;
        return {
          valid: false,
          data: { message }
        };
      }
    },
    getMessage (_field: string, _params: unknown[], data: Record<string, unknown>): string {
      return (data?.message as string) ?? fallbackMessage;
    }
  };
}

/**
 * Async version: use when the Yup schema has async tests.
 *
 * @param schema - Yup schema with optional async tests.
 * @param options - Optional: custom message when validation fails.
 * @returns Rule object for Validator.extend(ruleName, rule).
 */
export function toYupRuleAsync (
  schema: YupSchema & { validate: (value: unknown) => Promise<unknown> },
  options?: { message?: string }
): FormwardRuleLike {
  const fallbackMessage = options?.message ?? 'Validation failed';

  return {
    validate (value: unknown) {
      return schema.validate(value).then(
        () => true as const,
        (err: unknown) => {
          const message = err && typeof (err as Error).message === 'string'
            ? (err as Error).message
            : fallbackMessage;
          return { valid: false, data: { message } };
        }
      );
    },
    getMessage (_field: string, _params: unknown[], data: Record<string, unknown>): string {
      return (data?.message as string) ?? fallbackMessage;
    }
  } as FormwardRuleLike;
}
