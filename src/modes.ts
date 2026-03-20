/**
 * Validation modes: same as vee-validate 2.2.15 (aggressive, lazy, eager, passive).
 */

export interface ModeResult {
  on: string[];
  debounce?: number;
}

export type ModeFn = (context?: { errors?: unknown[]; value?: unknown; flags?: Record<string, unknown> }) => ModeResult;

const aggressive: ModeFn = () => ({
  on: ['input'],
});

const lazy: ModeFn = () => ({
  on: ['change'],
});

const eager: ModeFn = ({ errors } = {}) => {
  if (errors && (errors as unknown[]).length) {
    return { on: ['input'] };
  }
  return { on: ['change', 'blur'] };
};

const passive: ModeFn = () => ({
  on: [],
});

export const modes: Record<string, ModeFn> = {
  aggressive,
  eager,
  passive,
  lazy,
};
