/**
 * Registers an object schema (Zod or Yup) as Formward rules so you can use
 * the directive and validator with rule names like "schema:email", "schema:name".
 *
 * Used by SchemaProvider or called manually for programmatic setup.
 */
import { toZodRule } from './zod';
import type { ZodSchemaLike } from './zod';
import { toYupRule, toYupRuleAsync } from './yup';
import type { FormwardRuleLike } from './types';

type ValidatorInstance = {
  extend: (name: string, rule: FormwardRuleLike | ((value: unknown, ...args: unknown[]) => unknown), options?: unknown) => void;
  constructor: { remove: (name: string) => void };
};

function isZodObject (schema: unknown): schema is { shape: Record<string, ZodSchemaLike> } {
  return !!(
    schema &&
    typeof schema === 'object' &&
    'shape' in schema &&
    typeof (schema as Record<string, unknown>).shape === 'object'
  );
}

function isYupObject (schema: unknown): schema is { fields: Record<string, { validateSync: (v: unknown) => unknown }> } {
  return !!(
    schema &&
    typeof schema === 'object' &&
    'fields' in schema &&
    typeof (schema as Record<string, unknown>).fields === 'object'
  );
}

export interface InstallSchemaOptions {
  /** Rule name prefix (default: `'schema'`). Results in rules like `schema:email`. */
  prefix?: string;
}

/**
 * Installs an object schema as Formward rules. Each field becomes a rule named `prefix:fieldName`.
 * Returns a cleanup function to unregister the rules (e.g. on component unmount).
 *
 * @param validator - Formward validator instance (e.g. from inject('valform-validator') or this.$validator).
 * @param schema - Zod object schema (z.object({...})) or Yup object schema (yup.object().shape({...})).
 * @param options - Optional prefix (default `'schema'`).
 * @returns Cleanup function that removes the registered rules.
 */
export function installSchema (
  validator: ValidatorInstance,
  schema: unknown,
  options: InstallSchemaOptions = {}
): () => void {
  const prefix = options.prefix ?? 'schema';
  const ruleNames: string[] = [];
  const ValidatorClass = validator.constructor as { remove: (name: string) => void };

  if (isZodObject(schema)) {
    const shape = schema.shape;
    for (const key of Object.keys(shape)) {
      const ruleName = `${prefix}:${key}`;
      validator.extend(ruleName, toZodRule(shape[key]));
      ruleNames.push(ruleName);
    }
  } else if (isYupObject(schema)) {
    const fields = schema.fields as Record<string, { validateSync: (v: unknown) => unknown; validate?: (v: unknown) => Promise<unknown> }>;
    for (const key of Object.keys(fields)) {
      const ruleName = `${prefix}:${key}`;
      const fieldSchema = fields[key];
      const rule = fieldSchema.validate ? toYupRuleAsync(fieldSchema as any) : toYupRule(fieldSchema);
      validator.extend(ruleName, rule);
      ruleNames.push(ruleName);
    }
  } else {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[formward] installSchema: expected Zod object (z.object({...})) or Yup object (yup.object().shape({...}))');
    }
    return () => {};
  }

  return function cleanup () {
    ruleNames.forEach(name => ValidatorClass.remove(name));
  };
}
