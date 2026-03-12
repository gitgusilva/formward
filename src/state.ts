/**
 * Global validator instance (set on plugin install).
 *
 * Used by mixin and directive to obtain the single shared Validator. Type is generic to avoid circular dependency.
 */

/** @type {any} Validator instance type (avoids circular import). */
type ValidatorInstance = any;

let VALIDATOR: ValidatorInstance = null;

/**
 * Returns the current global Validator instance (set when the plugin is installed).
 *
 * @returns {ValidatorInstance} The global Validator or null if not installed.
 */
export function getValidator(): ValidatorInstance {
  return VALIDATOR;
}

/**
 * Sets the global Validator instance. Called by the plugin on install.
 *
 * @param {ValidatorInstance} value - Validator instance to set.
 * @returns {ValidatorInstance} The same instance.
 */
export function setValidator(value: ValidatorInstance): ValidatorInstance {
  VALIDATOR = value;
  return value;
}
