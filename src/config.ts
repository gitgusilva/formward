/**
 * Plugin configuration for Formward.
 *
 * Merged with component `$_formward` and with `setConfig()`. Use `getConfig()` to read, `setConfig()` to update.
 */
import { assign, getPath } from './utils';

/** Full plugin configuration shape. All keys are required after merge with defaults. */
export interface Config {
  /** Current locale for messages (e.g. `'en'`, `'pt_BR'`). */
  locale: string;
  /** Default debounce delay in ms. */
  delay: number;
  /** Name of the errors object on the component (e.g. `'errors'`). */
  errorBagName: string;
  /** Custom dictionary or null to use default. */
  dictionary: Record<string, unknown> | null;
  /** Name of the fields object on the component (e.g. `'fields'`). */
  fieldsBagName: string;
  /** Whether to apply CSS classes to inputs. */
  classes: boolean;
  /** Map of flag names to CSS class names. */
  classNames: Record<string, string> | null;
  /** Pipe-separated event names (e.g. `'input|blur'`). */
  events: string;
  /** Whether to inject $validator/errors/fields into components. */
  inject: boolean;
  /** Whether to stop on first failing rule. */
  fastExit: boolean;
  /** Whether to set aria-invalid/aria-required. */
  aria: boolean;
  /** Whether to set native HTML5 validity. */
  validity: boolean;
  /** Validation mode name (aggressive, lazy, eager, passive). */
  mode: string;
  /** Whether to read min/max/required from HTML attributes. */
  useConstraintAttrs: boolean;
  /** i18n instance (e.g. vue-i18n) or null. */
  i18n: unknown;
  /** Root key for i18n messages (e.g. `'validation'`). */
  i18nRootKey: string;
}

const DEFAULT_CONFIG: Config = {
  locale: 'en',
  delay: 0,
  errorBagName: 'errors',
  dictionary: null,
  fieldsBagName: 'fields',
  classes: false,
  classNames: null,
  events: 'input',
  inject: true,
  fastExit: true,
  aria: true,
  validity: false,
  mode: 'aggressive',
  useConstraintAttrs: true,
  i18n: null,
  i18nRootKey: 'validation',
};

export let currentConfig: Config = assign({}, DEFAULT_CONFIG) as Config;

/**
 * Resolves effective config for a component by merging global config with component's $_formward.
 *
 * @param {Object} ctx - Component context (e.g. `this` or vnode.ctx) with optional `$options.$_formward`.
 * @returns {Config} Merged configuration.
 */
export function resolveConfig(ctx: Record<string, unknown>): Config {
  const selfConfig = getPath('$options.$_formward', ctx, {}) as Partial<Config>;
  return assign({}, currentConfig, selfConfig) as Config;
}

/**
 * Returns the current global plugin configuration.
 *
 * @returns {Config} Current config (locale, delay, events, etc.).
 */
export function getConfig(): Config {
  return currentConfig;
}

/**
 * Merges new options into the global configuration. Does not replace entire config.
 *
 * @param {Partial<Config>} newConf - Partial config to merge (e.g. `{ locale: 'pt_BR' }`).
 * @returns {void}
 */
export function setConfig(newConf: Partial<Config>): void {
  currentConfig = assign({}, currentConfig, newConf) as Config;
}
