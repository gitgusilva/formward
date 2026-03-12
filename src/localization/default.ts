/**
 * Default in-memory dictionary for validation messages and attributes.
 *
 * Stores messages per locale; supports merge, getMessage, getAttribute, getFieldMessage, and date format.
 */
import { isCallable, merge } from '../utils';
import type { IDictionary, Locale, MessageGenerator } from '../../types/formward';

let LOCALE = 'en';

/**
 * Default dictionary implementation. Use for simple setups or when not using vue-i18n.
 *
 * @implements {IDictionary}
 */
export default class Dictionary implements IDictionary {
  container: Record<string, Locale> = {} as Record<string, Locale>;

  /**
   * @param {Object} [dictionary={}] - Initial locale data (e.g. `{ en: { messages: {...}, attributes: {... } } }`).
   */
  constructor (dictionary: object = {}) {
    this.container = {};
    this.merge(dictionary as Record<string, any>);
  }

  /** Current locale (e.g. `'en'`, `'pt_BR'`). */
  get locale () {
    return LOCALE;
  }

  set locale (value: string) {
    LOCALE = value || 'en';
  }

  /**
   * Checks if a locale is loaded.
   *
   * @param {string} locale - Locale code.
   * @returns {boolean}
   */
  hasLocale (locale: string): boolean {
    return !!this.container[locale];
  }

  /**
   * Sets the date format for a locale (used by date rules).
   *
   * @param {string} locale - Locale code.
   * @param {string} format - Date format string (e.g. `'dd/MM/yyyy'`).
   * @returns {void}
   */
  setDateFormat (locale: string, format: string) {
    if (!this.container[locale]) {
      this.container[locale] = {};
    }

    this.container[locale].dateFormat = format;
  }

  /**
   * Returns the date format for a locale, or null if not set.
   *
   * @param {string} locale - Locale code.
   * @returns {string | null | undefined}
   */
  getDateFormat (locale: string): string | null | undefined {
    const c = this.container[locale] as { dateFormat?: string } | undefined;
    if (!c || !c.dateFormat) return null;
    return c.dateFormat;
  }

  /**
   * Returns the message for a rule key, interpolated with data. Falls back to _default if key missing.
   *
   * @param {string} locale - Locale code.
   * @param {string} key - Message key (e.g. rule name).
   * @param {Array} data - Interpolation values passed to the message function or used in template.
   * @returns {string}
   */
  getMessage (locale: string, key: string, data: any[]) {
    let message = null;
    if (!this.hasMessage(locale, key)) {
      message = this._getDefaultMessage(locale);
    } else {
      message = (this.container[locale] as { messages?: Record<string, any> }).messages![key];
    }

    return isCallable(message) ? message(...data) : message;
  }

  /**
   * Gets the message for a specific field (custom messages). Falls back to the rule message.
   *
   * @param {string} locale - Locale code.
   * @param {string} field - Field name (for custom[field][key]).
   * @param {string} key - Message key.
   * @param {Array} data - Interpolation data.
   * @returns {string}
   */
  getFieldMessage (locale: string, field: string, key: string, data: any[]) {
    if (!this.hasLocale(locale)) {
      return this.getMessage(locale, key, data);
    }

    const loc = this.container[locale] as { custom?: Record<string, Record<string, any>> };
    const dict = loc.custom && loc.custom[field];
    if (!dict || !dict[key]) {
      return this.getMessage(locale, key, data);
    }

    const message = dict[key];
    return isCallable(message) ? message(...data) : message;
  }

  _getDefaultMessage (locale: string) {
    const loc = this.container[locale] as { messages?: Record<string, any> };
    if (this.hasMessage(locale, '_default')) {
      return loc.messages!._default;
    }
    return (this.container.en as { messages: Record<string, any> }).messages._default;
  }

  getAttribute (locale: string, key: string, fallback: string = '') {
    if (!this.hasAttribute(locale, key)) {
      return fallback;
    }

    return (this.container[locale] as { attributes?: Record<string, string> }).attributes![key];
  }

  hasMessage (locale: string, key: string) {
    const loc = this.container[locale] as { messages?: Record<string, any> };
    return !!(this.hasLocale(locale) && loc.messages && loc.messages[key]);
  }

  hasAttribute (locale: string, key: string) {
    const loc = this.container[locale] as { attributes?: Record<string, string> };
    return !!(this.hasLocale(locale) && loc.attributes && loc.attributes[key]);
  }

  /**
   * Merges a dictionary into the current container (per-locale merge).
   *
   * @param {Record<string, any>} dictionary - Locale-keyed object (e.g. `{ en: { messages: {...} } }`).
   * @returns {void}
   */
  merge (dictionary: Record<string, any>) {
    merge(this.container, dictionary);
  }

  /**
   * Sets a single message for a locale and key.
   *
   * @param {string} locale - Locale code.
   * @param {string} key - Message key (e.g. rule name).
   * @param {MessageGenerator | string} message - Message string or function (field, params, data) => string.
   * @returns {void}
   */
  setMessage (locale: string, key: string, message: MessageGenerator | string) {
    if (!this.hasLocale(locale)) {
      (this.container as any)[locale] = { messages: {}, attributes: {} };
    }
    const loc = this.container[locale] as any;
    if (!loc.messages) loc.messages = {};
    loc.messages[key] = message;
  }

  setAttribute (locale: string, key: string, value: string): string {
    if (!this.hasLocale(locale)) {
      (this.container as any)[locale] = { messages: {}, attributes: {} };
    }
    (this.container[locale] as any).attributes = (this.container[locale] as any).attributes || {};
    (this.container[locale] as any).attributes[key] = value;
    return value;
  }
}
