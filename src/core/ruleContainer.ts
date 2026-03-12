/**
 * Registry of validation rules (add/get/remove). Used by Validator and Field.
 *
 * Rules are registered via `Validator.extend(name, rule, options)` and looked up by name.
 */

/** Options for a rule (immediate, required behavior, target field). */
export interface RuleEntry {
  /** Validator function `(value, ...params) => boolean | Promise<boolean> | ResultObject`. */
  validate: (value: unknown, ...args: unknown[]) => unknown;
  /** Rule options (immediate, computesRequired, hasTarget, isDate, etc.). */
  options?: { immediate?: boolean; computesRequired?: boolean; hasTarget?: boolean };
  /** Parameter names for message interpolation. */
  paramNames?: string[];
}

const RULES: Record<string, RuleEntry> = {};

/**
 * Central registry for validation rules. Used by Validator and Field to resolve and run rules.
 */
export default class RuleContainer {
  /**
   * Registers a rule by name.
   *
   * @param {string} name - Rule name (e.g. `'required'`, `'email'`).
   * @param {RuleEntry} entry - Rule implementation and options.
   * @returns {void}
   */
  static add(name: string, { validate, options, paramNames }: RuleEntry): void {
    RULES[name] = { validate, options, paramNames };
  }

  /** All registered rules (read-only). */
  static get rules(): Record<string, RuleEntry> {
    return RULES;
  }

  /**
   * Checks if a rule is registered.
   *
   * @param {string} name - Rule name.
   * @returns {boolean}
   */
  static has(name: string): boolean {
    return !!RULES[name];
  }

  /**
   * Returns whether the rule should run immediately (on mount).
   *
   * @param {string} name - Rule name.
   * @returns {boolean}
   */
  static isImmediate(name: string): boolean {
    return !!(RULES[name]?.options?.immediate);
  }

  /**
   * Returns whether the rule computes required state (e.g. required_if).
   *
   * @param {string} name - Rule name.
   * @returns {boolean}
   */
  static isRequireRule(name: string): boolean {
    return !!(RULES[name]?.options?.computesRequired);
  }

  /**
   * Returns whether the rule depends on another field (hasTarget).
   *
   * @param {string} name - Rule name.
   * @returns {boolean}
   */
  static isTargetRule(name: string): boolean {
    return !!(RULES[name]?.options?.hasTarget);
  }

  /**
   * Removes a rule by name.
   *
   * @param {string} ruleName - Rule name.
   * @returns {void}
   */
  static remove(ruleName: string): void {
    delete RULES[ruleName];
  }

  /**
   * Returns parameter names for a rule (for message interpolation).
   *
   * @param {string} ruleName - Rule name.
   * @returns {string[] | undefined}
   */
  static getParamNames(ruleName: string): string[] | undefined {
    return RULES[ruleName]?.paramNames;
  }

  /**
   * Returns options for a rule.
   *
   * @param {string} ruleName - Rule name.
   * @returns {RuleEntry['options']}
   */
  static getOptions(ruleName: string): RuleEntry['options'] {
    return RULES[ruleName]?.options;
  }

  /**
   * Returns the validate function for a rule, or null if not found.
   *
   * @param {string} ruleName - Rule name.
   * @returns {RuleEntry['validate'] | null}
   */
  static getValidatorMethod(ruleName: string): RuleEntry['validate'] | null {
    return RULES[ruleName] ? RULES[ruleName].validate : null;
  }
}
