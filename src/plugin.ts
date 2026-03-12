import { reactive, watch } from 'vue';
import dictionary from './dictionary';
import mixin from './mixin';
import directive from './directive';
import { warn, isCallable } from './utils';
import Validator from './core/validator';
import ErrorBag from './core/errorBag';
import I18nDictionary from './localization/i18n';
import { detectPassiveSupport } from './utils/events';
import { setConfig, getConfig, type Config } from './config';
import { setValidator } from './state';
import { modes } from './modes';
import { eventBus } from './eventBus';

let app: any;
let pendingPlugins: Array<{ plugin: (ctx: any, options?: any) => any; options: any }> | null = null;
let pluginInstance: Formward | null = null;

/**
 * Main Formward plugin class for Vue 3.
 * Provides Validator, ErrorBag, directive, mixin, and install.
 *
 * @example
 * import Formward from 'valform';
 * app.use(Formward, { locale: 'pt_BR', inject: true });
 */
class Formward {
  static version: string;
  static Validator: typeof Validator;
  static ErrorBag: typeof ErrorBag;
  static mapFields: any;
  static ValidationProvider: any;
  static ValidationObserver: any;
  static withValidation: any;
  static Rules: any;
  static mixin: any;
  static directive: any;

  _vm: any;
  _validator: Validator;
  _eventBus: any;
  _localeWatcher: any;
  _localeChangedHandler: any;

  /**
   * Creates the plugin instance and initializes config, validator, and i18n.
   *
   * @param {Object} [config] - Plugin options (locale, delay, events, fieldsBagName, errorBagName, inject, fastExit, etc.).
   */
  constructor (config?: Record<string, unknown>) {
    this.configure(config);
    pluginInstance = this;
    this._eventBus = eventBus;
    this._validator = setValidator(
      new Validator(null, { fastExit: config && config.fastExit }, this)
    );
    this._initVM(this.config);
    this._initI18n(this.config);
  }

  /**
   * Registers a custom i18n driver for message localization.
   *
   * @param {string} driver - Driver name (e.g. `'i18n'` for vue-i18n).
   * @param {*} instance - Driver instance implementing the dictionary interface.
   * @returns {void}
   */
  static setI18nDriver (driver: string, instance: unknown): void {
    dictionary.setDriver(driver, instance);
  }

  /**
   * Merges options into the global plugin configuration.
   *
   * @param {Partial<Config>} cfg - Partial config (locale, delay, events, etc.).
   * @returns {void}
   */
  static configure (cfg: Record<string, unknown>) {
    setConfig(cfg);
  }

  /**
   * Registers a validation mode (when to run validation: aggressive, lazy, eager, passive).
   *
   * @param {string} mode - Mode name.
   * @param {Function} [implementation] - Function returning `{ on: eventNames[] }`. Omit to only set current mode.
   * @returns {void}
   * @throws {Error} If implementation is provided and not a function.
   */
  static setMode (mode: string, implementation?: (context?: { errors?: unknown[] }) => { on: string[] }) {
    setConfig({ mode });
    if (!implementation) {
      return;
    }

    if (!isCallable(implementation)) {
      throw new Error('A mode implementation must be a function');
    }

    modes[mode] = implementation;
  }

  /**
   * Registers a Formward plugin. Receives `{ Validator, ErrorBag, Rules }` and optional options.
   *
   * @param {Function} plugin - Callback `(ctx, options)` invoked after install.
   * @param {*} [options] - Options passed to the plugin callback.
   * @returns {void}
   */
  static use (plugin: (ctx: any, options?: any) => any, options?: any) {
    const opts = options ?? {};
    if (!isCallable(plugin)) {
      return warn('The plugin must be a callable function');
    }

    if (!pluginInstance) {
      if (!pendingPlugins) {
        pendingPlugins = [];
      }
      pendingPlugins.push({ plugin, options: opts });
      return;
    }

    plugin({ Validator, ErrorBag, Rules: Validator.rules }, opts);
  }

  /**
   * Vue 3 plugin install. Called when using `app.use(Formward, opts)`.
   *
   * @param {import('vue').App} _app - Vue app instance.
   * @param {Object} [opts] - Plugin options (locale, inject, events, etc.).
   * @returns {void}
   */
  static install (_app: any, opts?: Record<string, unknown>) {
    install(_app, opts);
  }

  /** Current i18n driver instance (dictionary) for message localization. */
  get i18nDriver (): any {
    return dictionary.getDriver();
  }

  /** Current i18n driver (static). */
  static get i18nDriver () {
    return dictionary.getDriver();
  }

  /** Current global plugin configuration. */
  get config () {
    return getConfig();
  }

  /** Current global plugin configuration (static). */
  static get config () {
    return getConfig();
  }

  /** @internal Initializes reactive VM with errors and fields. */
  _initVM (_config: any) {
    this._vm = reactive({
      errors: this._validator.errors,
      fields: this._validator.fields
    });
  }

  /** @internal Sets up i18n driver and locale change handling. */
  _initI18n (config: any) {
    const { dictionary: dictConfig, i18n, i18nRootKey, locale } = config;
    const i18nAny = i18n as any;
    const onLocaleChanged = () => {
      if (dictConfig) {
        this.i18nDriver.merge(dictConfig);
      }
      this._validator.errors.regenerate();
    };

    if (i18nAny) {
      Formward.setI18nDriver('i18n', new I18nDictionary(i18nAny, (i18nRootKey as string) || 'validation'));
      const localeRef = i18nAny.global?.locale ?? null;
      if (localeRef) {
        this._localeWatcher = watch(localeRef, onLocaleChanged);
      } else if (i18nAny._vm && typeof i18nAny._vm.$watch === 'function') {
        i18nAny._vm.$watch('locale', onLocaleChanged);
      }
    } else if (typeof window !== 'undefined') {
      this._eventBus.on('localeChanged', onLocaleChanged);
      this._localeChangedHandler = onLocaleChanged;
    }

    if (dictConfig) {
      this.i18nDriver.merge(dictConfig);
    }

    if (locale && !i18nAny) {
      this._validator.localize(locale as string);
    }
  }

  /**
   * Merges options into global config (instance method).
   *
   * @param {Object} cfg - Partial config.
   * @returns {void}
   */
  configure (cfg: Record<string, unknown>) {
    setConfig(cfg as Partial<Config>);
  }

  /** Emits `localeChanged` on the event bus (e.g. after changing locale). */
  static emitLocaleChanged () {
    eventBus.emit('localeChanged');
  }
}

Formward.mixin = mixin;
Formward.directive = directive;
Formward.Validator = Validator;
Formward.ErrorBag = ErrorBag;

/**
 * Standalone install function for Vue 3.
 * Registers mixin, directive, and creates the global validator. Prefer `app.use(Formward, opts)`.
 */
function install (_app: any, opts?: Record<string, unknown>) {
  if (app && _app === app) {
    if (process.env.NODE_ENV !== 'production') {
      warn('already installed, app.use(Formward) should only be called once.');
    }
    return;
  }

  app = _app;
  pluginInstance = new Formward(opts);
  Validator.$formule = pluginInstance;

  _app.provide('formward-validator', pluginInstance._validator);
  detectPassiveSupport();

  _app.mixin(mixin);
  _app.directive('validate', directive);
  if (pendingPlugins) {
    pendingPlugins.forEach(({ plugin, options }) => {
      Formward.use(plugin, options);
    });
    pendingPlugins = null;
  }
}

export default Formward;
export { install };
