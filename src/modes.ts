/**
 * Validation modes: control when validation runs (on which events).
 *
 * Each mode is a function that returns `{ on: eventNames[] }` (e.g. `['input']`, `['blur']`).
 */

/** Result of a mode function: list of DOM event names to attach validation to. */
export interface ModeResult {
  /** Event names to trigger validation (e.g. `'input'`, `'blur'`). */
  on: string[];
}

/**
 * Mode function type. Receives optional context (e.g. current errors) and returns which events to use.
 *
 * @param {Object} [context] - Optional context (e.g. `{ errors }`).
 * @param {Array} [context.errors] - Current validation errors.
 * @returns {ModeResult} Event names to use for validation.
 */
export type ModeFn = (context?: { errors?: unknown[] }) => ModeResult;

/** Validates on every input. */
const aggressive: ModeFn = () => ({
  on: ['input'],
});

/** Validates on change (e.g. blur or commit). */
const lazy: ModeFn = () => ({
  on: ['change'],
});

/** If there are errors, switch to input; otherwise change + blur. */
const eager: ModeFn = ({ errors = [] } = {}) => {
  if (errors && (errors as unknown[]).length) {
    return { on: ['input'] };
  }
  return { on: ['change', 'blur'] };
};

/** No automatic validation (manual only). */
const passive: ModeFn = () => ({
  on: [],
});

/** Built-in validation modes. Use with `Formward.setMode(name, implementation)`. */
export const modes: Record<string, ModeFn> = {
  aggressive,
  eager,
  passive,
  lazy,
};
