import ErrorBag from './errorBag';
import FieldBag from './fieldBag';
import Dictionary from '../dictionary';
import RuleContainer from './ruleContainer';
import Field from './field';
import { getConfig } from '../config';
import {
  isObject,
  getPath,
  isCallable,
  toArray,
  createError,
  assign,
  find,
  isNullOrUndefined,
  includes,
  normalizeRules,
  isEmptyArray,
  warn
} from '../utils';
import type { MapObject, Rule, ExtendOptions, FieldMatchOptions, FieldOptions, FieldError, VerifyOptions } from '../../types/formward';

/** Result of a single field validation run. */
interface ValidationResult {
  valid: boolean;
  id: string;
  field: string;
  scope?: string | null;
  errors: FieldError[];
  data?: any;
}

/**
 * Core validator: holds errors, fields, runs rules, and integrates with the plugin (locale, events).
 *
 * Use via plugin (inject) or `new Validator(validations, options, $formward)`. Supports attach/detach/validate/verify.
 */
export default class Validator {
  errors: ErrorBag;
  fields: FieldBag;
  fastExit: boolean;
  paused: boolean;
  $formward: any;
  static $formward: any;

  /**
   * Creates a validator instance with optional initial validations and plugin container.
   *
   * @param {MapObject} [validations] - Initial field name → rules map.
   * @param {MapObject} [options] - Options (e.g. fastExit).
   * @param {object | null} [pluginContainer] - Plugin instance ($formward) for locale/nextTick.
   */
  constructor (validations?: MapObject, options?: MapObject, pluginContainer?: object | null) {
    const opts = options ?? { fastExit: true };
    this.errors = new ErrorBag();
    this.fields = new FieldBag();
    this._createFields(validations);
    this.paused = false;
    this.fastExit = !isNullOrUndefined(opts.fastExit) ? opts.fastExit : true;
    this.$formward = pluginContainer ?? {
      _vm: {
        $nextTick: (cb) => isCallable(cb) ? cb() : Promise.resolve(),
        $emit: () => {},
        $off: () => {}
      },
      _eventBus: { off: () => {} },
      _localeChangedHandler: null,
      _localeWatcher: null
    };
  }

  /**
   * @deprecated
   */
  static get rules () {
    if (process.env.NODE_ENV !== 'production') {
      warn('this accessor will be deprecated, use `import { Rules } from "formward"` instead.');
    }

    return RuleContainer.rules;
  }

  /**
   * @deprecated
   */
  get rules () {
    if (process.env.NODE_ENV !== 'production') {
      warn('this accessor will be deprecated, use `import { Rules } from "formward"` instead.');
    }

    return RuleContainer.rules;
  }

  get dictionary () {
    return Dictionary.getDriver();
  }

  static get dictionary () {
    return Dictionary.getDriver();
  }

  get flags (): MapObject {
    return this.fields.items.reduce((acc: MapObject, field) => {
      if (field.scope) {
        acc[`$${field.scope}`] = {
          [field.name]: field.flags
        };

        return acc;
      }

      acc[field.name] = field.flags;

      return acc;
    }, {});
  }

  /**
   * Getter for the current locale.
   */
  get locale (): string {
    return Validator.locale;
  }

  set locale (value: string) {
    Validator.locale = value;
  }

  static get locale () {
    return Dictionary.getDriver().locale;
  }

  /**
   * Setter for the validator locale.
   */
  static set locale (value) {
    const hasChanged = value !== Dictionary.getDriver().locale;
    Dictionary.getDriver().locale = value;
    if (hasChanged && Validator.$formward && Validator.$formward._vm) {
      Validator.$formward._vm.$emit('localeChanged');
    }
  }

  /**
   * Static constructor.
   * @deprecated
   */
  static create (validations?: MapObject, options?: MapObject): Validator {
    if (process.env.NODE_ENV !== 'production') {
      warn('Please use `new` to create new validator instances.');
    }

    return new Validator(validations, options);
  }

  /**
   * Adds a custom validator to the list of validation rules.
   */
  static extend (name: string, validator: Rule | object, options?: ExtendOptions) {
    const opts = options ?? {};
    Validator._guardExtend(name, validator);
    const mergedOpts = (validator as Rule).options || {};
    Validator._merge(name, {
      validator,
      paramNames: (opts.paramNames ?? (validator as Rule).paramNames),
      options: assign({ hasTarget: false, immediate: true }, mergedOpts, opts)
    });
  }

  /**
   * Removes a rule from the list of validators.
   * @deprecated
   */
  static remove (name: string): void {
    if (process.env.NODE_ENV !== 'production') {
      warn('this method will be deprecated, you can still override your rules with `extend`');
    }

    RuleContainer.remove(name);
  }

  /**
   * Adds and sets the current locale for the validator.
  */
  localize (lang: string, dictionary?: MapObject): void {
    Validator.localize(lang, dictionary);
  }

  /**
   * Adds and sets the current locale for the validator.
   */
  static localize (lang: string | MapObject, dictionary?: MapObject) {
    if (isObject(lang)) {
      Dictionary.getDriver().merge(lang);
      return;
    }

    // merge the dictionary.
    if (dictionary) {
      const locale = lang || dictionary.name;
      dictionary = assign({}, dictionary);
      Dictionary.getDriver().merge({
        [locale]: dictionary
      });
    }

    if (lang) {
      // set the locale.
      Validator.locale = lang;
    }
  }

  /**
   * Registers a field to be validated (called by the directive).
   * @param {FieldOptions} fieldOpts - Field config (name, rules, scope, getter, etc.).
   * @returns {Field}
   */
  attach (fieldOpts: FieldOptions & { persist?: boolean; flags?: any; initialValue?: any; vmId?: any }): Field {
    const opts = fieldOpts as any;
    const oldFieldMatcher = { name: opts.name, scope: opts.scope, persist: true };
    const oldField = opts.persist ? this.fields.find(oldFieldMatcher) : null;

    if (oldField) {
      opts.flags = oldField.flags;
      oldField.destroy();
      this.fields.remove(oldField);
    }

    const value = opts.initialValue;
    const field = new Field(fieldOpts as any);
    this.fields.push(field);

    // validate the field initially
    if (field.immediate) {
      this.$formward._vm.$nextTick(() => this.validate(`#${field.id}`, value || field.value, { vmId: opts.vmId } as any));
    } else {
      this._validate(field, value || field.value, { initial: true }).then(result => {
        field.flags.valid = result.valid;
        field.flags.invalid = !result.valid;
      });
    }

    return field;
  }

  /**
   * Sets the flags on a field.
   */
  flag (name: string, flags: Record<string, boolean>, uid?: string | null) {
    const field = this._resolveField(name, undefined, uid);
    if (!field || !flags) {
      return;
    }

    field.setFlags(flags);
  }

  /**
   * Removes a field from the validator.
   */
  detach (name: string | Field, scope?: string | null, uid?: any) {
    const field = typeof name === 'string' ? this._resolveField(name, scope, uid) : name;
    if (!field) return;
    if (!(field as Field).persist) {
      (field as Field).destroy();
      this.errors.remove((field as Field).name, (field as Field).scope, (field as Field).vmId);
      this.fields.remove(field as Field);
    }
  }

  /**
   * Adds a custom validator to the list of validation rules.
   */
  extend (name: string, validator: Rule | MapObject, options?: ExtendOptions) {
    Validator.extend(name, validator as Rule, options);
  }

  /**
   * Resets fields matching the matcher (flags + errors). Waits for nextTick before running.
   *
   * @param {FieldMatchOptions | FieldMatchOptions[]} [matcher] - Optional field matcher(s).
   * @returns {Promise<void>}
   */
  reset (matcher?: FieldMatchOptions | FieldMatchOptions[]) {
    return (this.$formward._vm.$nextTick as () => Promise<any>)().then(() => {
      return (this.$formward._vm.$nextTick as () => Promise<any>)();
    }).then(() => {
      this.fields.filter(matcher as any).forEach((field: Field) => {
        field.waitFor(null);
        field.reset();
        this.errors.remove(field.name, field.scope, matcher && (matcher as any).vmId);
      });
    });
  }

  /**
   * Updates a field's error scope by id (e.g. after scope change).
   *
   * @param {string} id - Field id.
   * @param {{ scope?: any }} diff - Partial update (e.g. scope).
   * @returns {void}
   */
  update (id: string, diff: { scope?: any }) {
    const field = this._resolveField(`#${id}`);
    if (!field) return;
    this.errors.update(id, diff);
  }

  /**
   * Removes a rule from the list of validators.
   * @deprecated
   */
  remove (name: string) {
    Validator.remove(name);
  }

  /**
   * Validates a field by descriptor (e.g. '#fieldId', 'fieldName', 'scope.fieldName', '*' for all, 'scope.*' for scope).
   * @param {string} fieldDescriptor - Field selector (id with #, name, scope.name, '*', or 'scope.*').
   * @param {*} [value] - Value to validate (defaults to field's current value).
   * @param {Object} [opts] - { silent: boolean, vmId: * }.
   * @returns {Promise<boolean>} Resolves to true if valid.
   */
  validate (fieldDescriptor?: string, value?: any, opts?: { silent?: boolean; vmId?: any }): Promise<boolean> {
    if (this.paused) return Promise.resolve(true);
    const { silent, vmId } = opts ?? {};

    if (isNullOrUndefined(fieldDescriptor)) {
      return this.validateScopes({ silent, vmId });
    }

    if (fieldDescriptor === '*') {
      return this.validateAll(undefined, { silent, vmId });
    }

    // if scope validation was requested.
    if (/^(.+)\.\*$/.test(fieldDescriptor)) {
      const matched = fieldDescriptor.match(/^(.+)\.\*$/)[1];
      return this.validateAll(matched);
    }

    const field = this._resolveField(fieldDescriptor);
    if (!field) {
      return this._handleFieldNotFound(fieldDescriptor);
    }

    if (!silent) field.flags.pending = true;
    if (value === undefined) {
      value = field.value;
    }

    const validationPromise = this._validate(field, value);
    field.waitFor(validationPromise);

    return validationPromise.then(result => {
      if (!silent && field.isWaitingFor(validationPromise)) {
        // allow next validation to mutate the state.
        field.waitFor(null);
        this._handleValidationResults([result], vmId);
      }

      return result.valid;
    });
  }

  /**
   * Pauses the validator.
   */
  pause (): Validator {
    this.paused = true;

    return this;
  }

  /**
   * Resumes the validator.
   */
  resume (): Validator {
    this.paused = false;

    return this;
  }

  /**
   * Validates all fields, or those in a scope, or with given values map.
   * @param {string|MapObject} [values] - Scope string, or object of field names to values.
   * @param {Object} [opts] - { silent: boolean, vmId: * }.
   * @returns {Promise<boolean>} Resolves to true if all valid.
   */
  validateAll (values?: string | MapObject, opts?: { silent?: boolean; vmId?: any }): Promise<boolean> {
    if (this.paused) return Promise.resolve(true);
    const { silent, vmId } = opts ?? {};

    let matcher: any = null;
    let providedValues = false;

    if (typeof values === 'string') {
      matcher = { scope: values, vmId };
    } else if (isObject(values)) {
      matcher = Object.keys(values).map(key => {
        return { name: key, vmId: vmId, scope: null };
      });
      providedValues = true;
    } else if (Array.isArray(values)) {
      matcher = values.map(key => {
        return typeof key === 'object' ? Object.assign({ vmId: vmId }, key) : { name: key, vmId: vmId };
      });
    } else {
      matcher = { scope: null, vmId: vmId };
    }

    return Promise.all(
      this.fields.filter(matcher).map((field: Field) => this._validate(field, providedValues ? (values as Record<string, any>)[field.name] : field.value))
    ).then(results => {
      if (!silent) {
        this._handleValidationResults(results, vmId);
      }

      return results.every(t => t.valid);
    });
  }

  /**
   * Validates all scopes.
   */
  validateScopes (opts?: { silent?: boolean; vmId?: any }): Promise<boolean> {
    const { silent, vmId } = opts ?? {};
    if (this.paused) return Promise.resolve(true);

    return Promise.all(
      this.fields.filter({ vmId }).map(field => this._validate(field, field.value))
    ).then(results => {
      if (!silent) {
        this._handleValidationResults(results, vmId);
      }

      return results.every(t => t.valid);
    });
  }

  /**
   * Validates a value against the rules.
   */
  verify (value: any, rules: string | MapObject, options?: VerifyOptions): Promise<{ valid: boolean; errors: string[]; failedRules: Record<string, string> }> {
    const opts = options ?? {};
    const field: any = {
      name: opts.name || '{field}',
      rules: normalizeRules(rules),
      bails: getPath('bails', opts, true),
      forceRequired: false,
      get isRequired () {
        return !!this.rules.required || this.forceRequired;
      }
    };

    const targetRules = Object.keys(field.rules).filter(RuleContainer.isTargetRule);
    if (targetRules.length && opts.values && isObject(opts.values)) {
      field.dependencies = targetRules.map((rule: string) => {
        const [targetKey] = field.rules[rule];

        return {
          name: rule,
          field: { value: (opts.values as Record<string, any>)[(field.rules as any)[rule][0]] }
        };
      });
    }

    return this._validate(field, value).then((result: any) => {
      const errors = [];
      const ruleMap = {};
      result.errors.forEach(e => {
        errors.push(e.msg);
        ruleMap[e.rule] = e.msg;
      });

      return {
        valid: result.valid,
        errors,
        failedRules: ruleMap
      };
    });
  }

  /**
   * Perform cleanup.
   */
  destroy () {
    if (this.$formward._localeChangedHandler && this.$formward._eventBus) {
      this.$formward._eventBus.off('localeChanged', this.$formward._localeChangedHandler);
    }
    if (this.$formward._localeWatcher) {
      this.$formward._localeWatcher();
    }
  }

  /**
   * Creates and attaches fields from a validations map (field name → rules).
   *
   * @param {MapObject} [validations] - Map of field names to rule strings/objects.
   * @returns {void}
   * @internal
   */
  _createFields (validations?: MapObject) {
    if (!validations) return;

    Object.keys(validations).forEach(field => {
      const options = assign({}, { name: field, rules: validations[field] });
      this.attach(options);
    });
  }

  /**
   * Resolves date format for date rules (from validations or dictionary).
   *
   * @param {MapObject} validations - Field rules (may include date_format).
   * @returns {string | null} Date format string or null.
   * @internal
   */
  _getDateFormat (validations: MapObject): string | null {
    let format: string | null = null;
    const v = validations as any;
    if (v.date_format && Array.isArray(v.date_format)) {
      format = v.date_format[0];
    }

    return format || Dictionary.getDriver().getDateFormat(this.locale);
  }

  /**
   * Formats a localized error message for a field and rule (name, params, data).
   *
   * @param {Field} field - Field instance.
   * @param {MapObject} rule - Rule descriptor (name, params, options).
   * @param {MapObject} [data={}] - Additional data for message template.
   * @param {string | null} [targetName] - Display name for target field (e.g. required_if).
   * @returns {string} Formatted message.
   * @internal
   */
  _formatErrorMessage (field: Field, rule: MapObject, data: MapObject = {}, targetName?: string | null) {
    const name = this._getFieldDisplayName(field);
    const params = this._getLocalizedParams(rule, targetName);

    return Dictionary.getDriver().getFieldMessage(this.locale, field.name, rule.name, [name, params, data]);
  }

  /**
   * Converts rule params from object to array using the rule's paramNames (for locale interpolation).
   *
   * @param {*} obj - Params (object or array).
   * @param {string} ruleName - Rule name for paramNames lookup.
   * @returns {*} Array or original value.
   * @internal
   */
  _convertParamObjectToArray (obj, ruleName) {
    if (Array.isArray(obj)) {
      return obj;
    }

    const paramNames = RuleContainer.getParamNames(ruleName);
    if (!paramNames || !isObject(obj)) {
      return obj;
    }

    return paramNames.reduce((prev, paramName) => {
      if (paramName in obj) {
        prev.push(obj[paramName]);
      }

      return prev;
    }, []);
  }

  /**
   * Returns localized params for the rule (e.g. target field name for required_if).
   *
   * @param {MapObject} rule - Rule descriptor.
   * @param {string | null} [targetName] - Display name for target.
   * @returns {*} Params array for message interpolation.
   * @internal
   */
  _getLocalizedParams (rule: MapObject, targetName?: string | null) {
    let params = this._convertParamObjectToArray(rule.params, rule.name);
    if (rule.options.hasTarget && params && params[0]) {
      const localizedName = targetName || Dictionary.getDriver().getAttribute(this.locale, params[0], params[0]);
      return [localizedName].concat(params.slice(1));
    }

    return params;
  }

  /**
   * Resolves display name for a field (alias, data-vv-as, or dictionary attribute).
   *
   * @param {Field} field - Field instance.
   * @returns {string} Display name for messages.
   * @internal
   */
  _getFieldDisplayName (field: Field) {
    return field.alias || Dictionary.getDriver().getAttribute(this.locale, field.name, field.name);
  }

  /**
   * Converts params array to object using rule's paramNames; returns unchanged if no paramNames.
   *
   * @param {*} params - Params (array or object).
   * @param {string} ruleName - Rule name for paramNames lookup.
   * @returns {MapObject | any[]} Named params object or original params.
   * @internal
   */
  _convertParamArrayToObj (params: any, ruleName: string): MapObject | any[] {
    const paramNames = RuleContainer.getParamNames(ruleName);
    if (!paramNames) {
      return params;
    }

    if (isObject(params)) {
      // check if the object is either a config object or a single parameter that is an object.
      const hasKeys = paramNames.some(name => Object.keys(params).indexOf(name) !== -1);
      // if it has some of the keys, return it as is.
      if (hasKeys) {
        return params;
      }
      // otherwise wrap the object in an array.
      params = [params];
    }

    // Reduce the paramsNames to a param object.
    return params.reduce((prev, value, idx) => {
      prev[paramNames[idx]] = value;

      return prev;
    }, {});
  }

  /**
   * Runs a single rule against a value; returns result or promise (async rules).
   *
   * @param {Field | any} field - Field descriptor.
   * @param {*} value - Value to validate.
   * @param {MapObject} rule - Rule descriptor (name, params, options).
   * @returns {Promise<ValidationResult> | ValidationResult}
   * @internal
   */
  _test (field: Field | any, value: any, rule: MapObject): Promise<ValidationResult> | ValidationResult {
    const validator = RuleContainer.getValidatorMethod(rule.name);
    let params: any = Array.isArray(rule.params) ? toArray(rule.params) : rule.params;
    if (!params) {
      params = [];
    }

    let targetName: string | null = null;
    if (!validator || typeof validator !== 'function') {
      return Promise.reject(createError(`No such validator '${rule.name}' exists.`));
    }

    if ((rule as any).options?.hasTarget && (field as any).dependencies) {
      const target = find((field as any).dependencies, (d: any) => d.name === rule.name);
      if (target) {
        targetName = target.field.alias;
        params = [target.field.value].concat(params.slice(1));
      }
    } else if (rule.name === 'required' && (field as any).rejectsFalse) {
      params = params.length ? params : [true];
    }

    if ((rule as any).options?.isDate) {
      const dateFormat = this._getDateFormat((field as any).rules);
      if (rule.name !== 'date_format') {
        params.push(dateFormat);
      }
    }

    let result: any = validator(value, this._convertParamArrayToObj(params, rule.name));

    if (isCallable(result?.then)) {
      return result.then((values: any) => {
        let allValid = true;
        let data: any = {};
        if (Array.isArray(values)) {
          allValid = values.every((t: any) => (isObject(t) ? t.valid : t));
        } else {
          allValid = isObject(values) ? values.valid : values;
          data = values.data;
        }
        return {
          valid: allValid,
          id: (field as Field).id,
          field: (field as Field).name,
          scope: (field as Field).scope,
          data: result.data,
          errors: allValid ? [] : [this._createFieldError(field as Field, rule, data, targetName!)]
        };
      });
    }

    if (!isObject(result)) {
      result = { valid: result, data: {} };
    }

    return {
      valid: result.valid,
      id: (field as Field).id,
      field: (field as Field).name,
      scope: (field as Field).scope,
      data: result.data,
      errors: result.valid ? [] : [this._createFieldError(field as Field, rule, result.data, targetName!)]
    };
  }

  /**
   * Registers a rule in RuleContainer and optional message in Dictionary.
   *
   * @param {string} name - Rule name.
   * @param {{ validator: Rule | any; options: any; paramNames: any }} opts - Rule implementation and options.
   * @returns {void}
   * @internal
   */
  static _merge (name: string, { validator, options, paramNames }: { validator: Rule | any; options: any; paramNames: any }) {
    const validate = isCallable(validator) ? validator : (validator as any).validate;
    if ((validator as any).getMessage) {
      Dictionary.getDriver().setMessage(Validator.locale, name, (validator as any).getMessage);
    }

    RuleContainer.add(name, {
      validate,
      options,
      paramNames
    });
  }

  /**
   * Ensures extend() receives a callable or object with validate method.
   *
   * @param {string} name - Rule name.
   * @param {Rule | object} validator - Validator function or object.
   * @throws {Error} If validator is invalid.
   * @internal
   */
  static _guardExtend (name: string, validator: Rule | object) {
    if (isCallable(validator)) {
      return;
    }

    if (!isCallable((validator as any).validate)) {
      throw createError(
        `Extension Error: The validator '${name}' must be a function or have a 'validate' method.`
      );
    }
  }

  /**
   * Builds a FieldError object with message and regenerate function.
   *
   * @param {Field} field - Field instance.
   * @param {MapObject} rule - Rule descriptor.
   * @param {MapObject} data - Rule result data.
   * @param {string} [targetName] - Target field display name.
   * @returns {FieldError}
   * @internal
   */
  _createFieldError (field: Field, rule: MapObject, data: MapObject, targetName?: string): FieldError {
    return {
      id: field.id,
      vmId: field.vmId,
      field: field.name,
      msg: this._formatErrorMessage(field, rule, data, targetName),
      rule: rule.name,
      scope: field.scope,
      regenerate: () => {
        return this._formatErrorMessage(field, rule, data, targetName);
      }
    };
  }

  /**
   * Resolves a field by descriptor (#id), name+scope, or scope.name.
   *
   * @param {string} name - Field descriptor (#id, name, or scope.name).
   * @param {string | null} [scope] - Optional scope when name is simple.
   * @param {*} [uid] - Optional vmId for scoping.
   * @returns {Field | null | undefined}
   * @internal
   */
  _resolveField (name: string, scope?: string | null, uid?: any): Field | null | undefined {
    if (name[0] === '#') {
      return this.fields.findById(name.slice(1));
    }

    if (!isNullOrUndefined(scope)) {
      return this.fields.find({ name, scope, vmId: uid });
    }

    if (includes(name, '.')) {
      const [fieldScope, ...fieldName] = name.split('.');
      const field = this.fields.find({ name: fieldName.join('.'), scope: fieldScope, vmId: uid });
      if (field) {
        return field;
      }
    }

    return this.fields.find({ name, scope: null, vmId: uid });
  }

  /**
   * Returns a rejected promise when validate() is called for a non-existent field.
   *
   * @param {string} name - Field descriptor.
   * @param {string | null} [scope] - Optional scope.
   * @returns {Promise<never>}
   * @internal
   */
  _handleFieldNotFound (name: string, scope?: string | null) {
    const fullName = isNullOrUndefined(scope) ? name : `${!isNullOrUndefined(scope) ? scope + '.' : ''}${name}`;

    return Promise.reject(createError(
      `Validating a non-existent field: "${fullName}". Use "attach()" first.`
    ));
  }

  /**
   * Applies validation results: updates errors bag and field flags (pending, valid, validated).
   *
   * @param {ValidationResult[]} results - Results from _validate.
   * @param {*} [vmId] - Optional component id for error vmId.
   * @returns {void}
   * @internal
   */
  _handleValidationResults (results, vmId) {
    const matchers = results.map(result => ({ id: result.id }));
    this.errors.removeById(matchers.map(m => m.id));
    // remove by name and scope to remove any custom errors added.
    results.forEach(result => {
      this.errors.remove(result.field, result.scope, vmId);
    });
    const allErrors = results.reduce((prev, curr) => {
      curr.errors.forEach(e => {
        if (vmId != null) e.vmId = vmId;
        prev.push(e);
      });

      return prev;
    }, []);

    this.errors.add(allErrors);

    // handle flags.
    this.fields.filter(matchers).forEach(field => {
      const result = find(results, r => r.id === field.id);
      field.setFlags({
        pending: false,
        valid: result.valid,
        validated: true
      });
    });
  }

  /**
   * Determines if validation should be skipped for this field/value (e.g. optional empty, disabled).
   *
   * @param {*} field - Field descriptor.
   * @param {*} value - Current value.
   * @returns {boolean}
   * @internal
   */
  _shouldSkip (field, value) {
    // field is configured to run through the pipeline regardless
    if (field.bails === false) {
      return false;
    }

    // disabled fields are skipped if useConstraintAttrs is enabled in config
    if (field.isDisabled && getConfig().useConstraintAttrs) {
      return true;
    }

    // skip if the field is not required and has an empty value.
    return !field.isRequired && (isNullOrUndefined(value) || value === '' || isEmptyArray(value));
  }

  /**
   * Determines if validation should stop on first failing rule (fastExit or field.bails).
   *
   * @param {*} field - Field descriptor.
   * @returns {boolean}
   * @internal
   */
  _shouldBail (field) {
    // if the field was configured explicitly.
    if (field.bails !== undefined) {
      return field.bails;
    }

    return this.fastExit;
  }

  /**
   * Runs all applicable rules for a field and aggregates results (respects fastExit, require rules).
   *
   * @param {Field | any} field - Field descriptor.
   * @param {*} value - Value to validate.
   * @param {{ initial?: boolean }} [opts] - Options (e.g. initial run for immediate rules only).
   * @returns {Promise<ValidationResult>}
   * @internal
   */
  _validate (field: Field | any, value: any, opts: { initial?: boolean } = {}): Promise<ValidationResult> {
    const { initial } = opts;
    let requireRules = Object.keys(field.rules).filter(RuleContainer.isRequireRule);

    field.forceRequired = false;
    requireRules.forEach(rule => {
      const ruleOptions = RuleContainer.getOptions(rule);
      const result: any = this._test(field, value, { name: rule, params: field.rules[rule], options: ruleOptions });

      if (isCallable(result?.then)) { throw createError('Require rules cannot be async'); }
      if (!isObject(result)) { throw createError('Require rules has to return an object (see docs)'); }

      if (result.data?.required === true) {
        field.forceRequired = true;
      }
    });

    if (this._shouldSkip(field, value)) {
      return Promise.resolve({ valid: true, id: field.id, field: field.name, scope: field.scope, errors: [] });
    }

    const promises = [];
    const errors = [];
    let isExitEarly = false;
    if (isCallable(field.checkValueChanged)) {
      field.flags.changed = field.checkValueChanged();
    }

    // use of '.some()' is to break iteration in middle by returning true
    Object.keys(field.rules).filter(rule => {
      if (!initial || !RuleContainer.has(rule)) return true;

      return RuleContainer.isImmediate(rule);
    }).some(rule => {
      const ruleOptions = RuleContainer.getOptions(rule);
      const result: ValidationResult | Promise<ValidationResult> = this._test(field, value, { name: rule, params: field.rules[rule], options: ruleOptions });
      if (isCallable((result as any).then)) {
        promises.push(result as Promise<ValidationResult>);
      } else {
        const res = result as ValidationResult;
        if (!res.valid && this._shouldBail(field)) {
          errors.push(...res.errors);
          isExitEarly = true;
        } else {
          promises.push(Promise.resolve(res));
        }
      }
      return isExitEarly;
    });

    if (isExitEarly) {
      return Promise.resolve({ valid: false, errors, id: field.id, field: field.name, scope: field.scope });
    }

    return Promise.all(promises).then(results => {
      return results.reduce((prev, v) => {
        if (!v.valid) {
          prev.errors.push(...v.errors);
        }

        prev.valid = prev.valid && v.valid;

        return prev;
      }, { valid: true, errors, id: field.id, field: field.name, scope: field.scope });
    });
  }
}
