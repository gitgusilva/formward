/**
 * vue-i18n (and compatible) driver for Formward message localization.
 *
 * Uses a root key (e.g. `validation`) under which messages and attributes are stored. Integrates with vue-i18n's t/te/mergeLocaleMessage.
 */
import { warn, isCallable, isObject, merge, getPath, isNullOrUndefined } from '../utils';
import type { IDictionary, Locale } from '../../types/formward';

/** Recursively normalizes locale values (objects and callables) for merge. */
const normalizeValue = (value: any): any => {
  if (isObject(value)) {
    return Object.keys(value).reduce((prev: Record<string, any>, key) => {
      prev[key] = normalizeValue(value[key]);
      return prev;
    }, {});
  }
  if (isCallable(value)) {
    return value('{0}', ['{1}', '{2}', '{3}']);
  }
  return value;
};

/** Builds a normalized locale object for vue-i18n merge. */
const normalizeFormat = (locale: Locale): Record<string, any> => {
  const dictionary: Record<string, any> = {};
  if (locale.messages) dictionary.messages = normalizeValue(locale.messages);
  if (locale.custom) dictionary.custom = normalizeValue(locale.custom);
  if (locale.attributes) dictionary.attributes = locale.attributes;
  if (!isNullOrUndefined(locale.dateFormat)) dictionary.dateFormat = locale.dateFormat;
  return dictionary;
};

/**
 * Dictionary implementation that delegates to vue-i18n (or compatible) for messages and attributes.
 *
 * Use with `Formward.setI18nDriver('i18n', new I18nDictionary(i18n, 'validation'))`.
 *
 * @implements {IDictionary}
 */
export default class I18nDictionary implements IDictionary {
  rootKey: string;
  i18n: any;

  /**
   * @param {*} i18n - vue-i18n instance (or compatible with t, te, mergeLocaleMessage, setDateTimeFormat, getDateTimeFormat).
   * @param {string} rootKey - Root key for messages (e.g. `'validation'` → `validation.messages.*`).
   */
  constructor (i18n: any, rootKey: string) {
    this.i18n = i18n;
    this.rootKey = rootKey;
  }

  /** Current locale from i18n (read-only; set via i18n). */
  get locale (): string {
    return this.i18n.locale;
  }

  set locale (value: string) {
    warn('Cannot set locale from the validator when using vue-i18n, use i18n.locale setter instead');
  }

  /**
   * Returns the date format for a locale (delegates to i18n.getDateTimeFormat).
   *
   * @param {string} locale - Locale code.
   * @returns {string}
   */
  getDateFormat (locale: string): string {
    return this.i18n.getDateTimeFormat(locale || this.locale);
  }

  /**
   * Sets the date format for a locale (delegates to i18n.setDateTimeFormat).
   *
   * @param {string} locale - Locale code.
   * @param {string} value - Format string.
   * @returns {void}
   */
  setDateFormat (locale: string, value: string) {
    this.i18n.setDateTimeFormat(locale || this.locale, value);
  }

  /**
   * Returns the message for a rule key, with fallback to fallbackLocale and _default.
   *
   * @param {string} _ - Locale (unused; uses i18n's current locale).
   * @param {string} key - Message key (e.g. rule name).
   * @param {Array} data - Interpolation data.
   * @returns {string}
   */
  getMessage (_: string, key: string, data: any[]): string {
    const path = `${this.rootKey}.messages.${key}`;
    let dataOptions = data;

    if (Array.isArray(data)) {
      dataOptions = [].concat.apply([], data);
    }

    if (this.i18n.te(path)) {
      return this.i18n.t(path, dataOptions);
    }

    // fallback to the fallback message
    if (this.i18n.te(path, this.i18n.fallbackLocale)) {
      return this.i18n.t(path, this.i18n.fallbackLocale, dataOptions);
    }

    // fallback to the root message
    return this.i18n.t(`${this.rootKey}.messages._default`, dataOptions);
  }

  /**
   * Returns the attribute label for a key (e.g. field name → "Email").
   *
   * @param {string} _ - Locale (unused).
   * @param {string} key - Attribute key.
   * @param {string} [fallback=''] - Value if not found.
   * @returns {string}
   */
  getAttribute (_: string, key: string, fallback: string = ''): string {
    const path = `${this.rootKey}.attributes.${key}`;
    if (this.i18n.te(path)) {
      return this.i18n.t(path);
    }

    return fallback;
  }

  /**
   * Returns the message for a field-specific custom key, or falls back to rule message.
   *
   * @param {string} _ - Locale (unused).
   * @param {string} field - Field name.
   * @param {string} key - Message key.
   * @param {Array} data - Interpolation data.
   * @returns {string}
   */
  getFieldMessage (_: string, field: string, key: string, data: any[]) {
    const path = `${this.rootKey}.custom.${field}.${key}`;
    if (this.i18n.te(path)) {
      return this.i18n.t(path, data);
    }

    return this.getMessage(_, key, data);
  }

  /**
   * Merges locale data into vue-i18n (mergeLocaleMessage + setDateTimeFormat per locale).
   *
   * @param {Record<string, Locale>} dictionary - Locale-keyed locale objects.
   * @returns {void}
   */
  merge (dictionary: Record<string, Locale>) {
    Object.keys(dictionary).forEach(localeKey => {
      const clone = merge({}, getPath(`${localeKey}.${this.rootKey}`, this.i18n.messages, {}));
      // Merge cloned locale with new one
      const locale = merge(clone, normalizeFormat(dictionary[localeKey]));
      this.i18n.mergeLocaleMessage(localeKey, { [this.rootKey]: locale });
      if (locale.dateFormat) {
        this.i18n.setDateTimeFormat(localeKey, locale.dateFormat);
      }
    });
  }

  /**
   * Sets a single message for a locale/key by merging into i18n.
   *
   * @param {string} locale - Locale code.
   * @param {string} key - Message key.
   * @param {(() => string) | string} value - Message string or function.
   * @returns {void}
   */
  setMessage (locale: string, key: string, value: () => string | string) {
    this.merge({
      [locale]: {
        messages: {
          [key]: value
        }
      }
    });
  }

  /**
   * Sets an attribute label for a locale/key and returns the value.
   *
   * @param {string} locale - Locale code.
   * @param {string} key - Attribute key.
   * @param {string} value - Attribute value.
   * @returns {string} The value set.
   */
  setAttribute (locale: string, key: string, value: string): string {
    this.merge({
      [locale]: {
        attributes: {
          [key]: value
        }
      }
    } as any);
    return value;
  }
}
