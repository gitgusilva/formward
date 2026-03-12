import Resolver from './resolver';
import RuleContainer from './ruleContainer';
import { isEvent, addEventListener, normalizeEvents } from '../utils/events';
import {
  uniqId,
  createFlags,
  assign,
  normalizeRules,
  isNullOrUndefined,
  getDataAttribute,
  toggleClass,
  isTextInput,
  debounce,
  isCallable,
  warn,
  toArray,
  getPath,
  makeDelayObject,
  defineNonReactive,
  merge,
  isObject,
  isCheckboxOrRadioInput,
  includes
} from '../utils';
import type { FieldOptions, FieldMatchOptions, MapObject, Watcher } from '../../types/formward';

/** Default options for a new Field (events, classes, delay, etc.). */
const DEFAULT_OPTIONS = {
  targetOf: null,
  immediate: false,
  persist: false,
  scope: null,
  listen: true,
  name: null,
  rules: {},
  vm: null,
  classes: false,
  validity: true,
  aria: true,
  events: 'input|blur',
  delay: 0,
  classNames: {
    touched: 'touched', // the control has been blurred
    untouched: 'untouched', // the control hasn't been blurred
    valid: 'valid', // model is valid
    invalid: 'invalid', // model is invalid
    pristine: 'pristine', // control has not been interacted with
    dirty: 'dirty' // control has been interacted with
  }
};

/**
 * Represents a single validated field: rules, flags, value getter, DOM/listeners.
 * Created by the directive or validator.attach(); updated on scope/rules change.
 */
export default class Field {
  id: string;
  el: HTMLInputElement | null | undefined;
  updated: boolean;
  dependencies: Array<{ name: string; field: Field }>;
  watchers: Watcher[];
  events: string[];
  rules: Record<string, any>;
  validity: boolean;
  aria: boolean;
  vm: object | null;
  component: object | null;
  ctorConfig: object | null | undefined;
  flags: Record<string, boolean>;
  getter: () => any;
  name: string;
  scope: string | null;
  targetOf: string | null | undefined;
  immediate: boolean;
  classes: boolean;
  classNames: Record<string, string>;
  delay: number | object;
  listen: boolean;
  model: null | { expression: string | null; lazy: boolean };
  _delay: number | object;

  vmId: unknown;
  forceRequired: boolean;
  componentInstance: any;
  initialValue: any;
  _alias: string | null | undefined;
  _bails: boolean;
  _waitingFor: unknown;
  persist: boolean;
  _cancellationToken: { cancelled: boolean } | undefined;

  /**
   * Creates a field with normalized options (rules, events, getter, flags, etc.).
   *
   * @param {FieldOptions | MapObject} [options={}] - Field config (name, rules, scope, getter, el, etc.).
   */
  constructor (options: FieldOptions | MapObject = {}) {
    this.id = uniqId();
    this.el = options.el as HTMLInputElement | undefined;
    this.updated = false;
    this.vmId = (options as MapObject).vmId;
    defineNonReactive(this, 'dependencies', []);
    defineNonReactive(this, 'watchers', []);
    defineNonReactive(this, 'events', []);
    this.delay = 0;
    this.rules = {};
    this.forceRequired = false;
    this._cacheId(options as FieldOptions);
    this.classNames = assign({}, DEFAULT_OPTIONS.classNames);
    options = assign({}, DEFAULT_OPTIONS, options);
    this._delay = !isNullOrUndefined(options.delay) ? options.delay : 0; // cache initial delay
    this.validity = options.validity;
    this.aria = options.aria;
    this.flags = (options as MapObject).flags || createFlags();
    defineNonReactive(this, 'vm', options.vm);
    defineNonReactive(this, 'componentInstance', options.component);
    this.ctorConfig = this.componentInstance ? getPath('$options.$_formward', this.componentInstance) : undefined;
    this.update(options);
    // set initial value.
    this.initialValue = this.value;
    this.updated = false;
    this.persist = !!(options as MapObject).persist;
    this._cancellationToken = undefined;
  }

  get validator (): any {
    const vm = this.vm as { $validator?: any } | null;
    if (!vm || !vm.$validator) {
      return { validate: () => Promise.resolve(true) };
    }
    return vm.$validator;
  }

  get isRequired (): boolean {
    return !!(this.rules as Record<string, unknown>).required || this.forceRequired;
  }

  get isDisabled (): boolean {
    return !!(this.el && this.el.disabled);
  }

  /**
   * Gets the display name (user-friendly name).
   */
  get alias (): string | null | undefined {
    if (this._alias) {
      return this._alias;
    }

    let alias: string | null = null;
    const ctorConfig = this.ctorConfig as { alias?: string | (() => string) } | null;
    if (ctorConfig && ctorConfig.alias) {
      alias = isCallable(ctorConfig.alias) ? (ctorConfig.alias as () => string).call(this.componentInstance) : (ctorConfig.alias as string);
    }

    if (!alias && this.el) {
      alias = getDataAttribute(this.el, 'as');
    }

    if (!alias && this.componentInstance) {
      const inst = this.componentInstance as { $attrs?: Record<string, unknown> };
      return inst.$attrs && (inst.$attrs['data-vv-as'] as string);
    }

    return alias;
  }

  /**
   * Gets the input value.
   */

  get value (): any {
    if (!isCallable(this.getter)) {
      return undefined;
    }

    return this.getter();
  }

  get bails () {
    return this._bails;
  }

  /**
   * If the field rejects false as a valid value for the required rule.
   */

  get rejectsFalse (): boolean {
    const ctorConfig = this.ctorConfig as { rejectsFalse?: boolean } | null;
    if (this.componentInstance && ctorConfig) {
      return !!ctorConfig.rejectsFalse;
    }

    if (!this.el) {
      return false;
    }

    return this.el.type === 'checkbox';
  }

  /**
   * Determines if the instance matches the options provided.
   */
  matches (options: FieldMatchOptions | null): boolean {
    if (!options) {
      return true;
    }

    if (options.id) {
      return this.id === options.id;
    }

    let matchesComponentId = isNullOrUndefined(options.vmId) ? () => true : (id) => id === this.vmId;
    if (!matchesComponentId(options.vmId)) {
      return false;
    }

    if (options.name === undefined && options.scope === undefined) {
      return true;
    }

    if (options.scope === undefined) {
      return this.name === options.name;
    }

    if (options.name === undefined) {
      return this.scope === options.scope;
    }

    return options.name === this.name && options.scope === this.scope;
  }

  /**
   * Caches the field id.
   */
  _cacheId (options: FieldOptions): void {
    if (this.el && !options.targetOf) {
      (this.el as HTMLInputElement & { _formwardId?: string })._formwardId = this.id;
    }
  }

  /**
   * Stores the promise for the current validation run (used to avoid applying stale results).
   *
   * @param {unknown} pendingPromise - Promise for the current validation or null to clear.
   * @returns {void}
   */
  waitFor (pendingPromise: unknown) {
    this._waitingFor = pendingPromise;
  }

  /**
   * Returns whether the field is still waiting on the given promise.
   *
   * @param {unknown} promise - Promise to check.
   * @returns {boolean}
   */
  isWaitingFor (promise: unknown) {
    return this._waitingFor === promise;
  }

  /**
   * Updates the field with new options (scope, rules, getter, events, etc.) and re-attaches listeners.
   *
   * @param {FieldOptions | MapObject} options - Partial or full field options.
   * @returns {void}
   */
  update (options: FieldOptions | MapObject) {
    const opts = options as MapObject;
    this.targetOf = opts.targetOf || null;
    this.immediate = opts.immediate ?? this.immediate ?? false;
    this.persist = opts.persist ?? this.persist ?? false;

    if (!isNullOrUndefined(opts.scope) && opts.scope !== this.scope && isCallable(this.validator.update)) {
      this.validator.update(this.id, { scope: opts.scope } as Field);
    }
    this.scope = !isNullOrUndefined(opts.scope) ? opts.scope
      : !isNullOrUndefined(this.scope) ? this.scope : null;
    this.name = (!isNullOrUndefined(opts.name) ? String(opts.name) : opts.name) || this.name || null;
    this.rules = opts.rules !== undefined ? normalizeRules(opts.rules) : this.rules;
    this._bails = opts.bails !== undefined ? opts.bails : this._bails;
    this.model = (opts.model || this.model) as Field['model'];
    this.listen = opts.listen !== undefined ? opts.listen : this.listen;
    this.classes = ((opts.classes || this.classes || false) as boolean) && !this.componentInstance;
    this.classNames = isObject(opts.classNames) ? merge(this.classNames, opts.classNames) : this.classNames;
    this.getter = isCallable(opts.getter) ? opts.getter : this.getter;
    this._alias = opts.alias ?? this._alias;
    this.events = opts.events ? normalizeEvents(opts.events) : this.events;
    this.delay = makeDelayObject(this.events, opts.delay || this.delay, this._delay) as number | object;
    this.updateDependencies();
    this.addActionListeners();

    if (process.env.NODE_ENV !== 'production' && !this.name && !this.targetOf) {
      warn('A field is missing a "name" or "data-vv-name" attribute');
    }

    if (opts.rules !== undefined) {
      this.flags.required = this.isRequired;
    }

    if (Object.keys(opts.rules || {}).length === 0 && this.updated) {
      let resetFlag = this.flags.validated;
      this.validator.validate(`#${this.id}`).then(() => {
        this.flags.validated = resetFlag;
      });
    }

    if (this.flags.validated && opts.rules !== undefined && this.updated) {
      this.validator.validate(`#${this.id}`);
    }

    this.updated = true;
    this.addValueListeners();

    if (!this.el) {
      return;
    }

    this.updateClasses();
    this.updateAriaAttrs();
  }

  /**
   * Resets field flags and errors.
   */
  reset () {
    if (this._cancellationToken) {
      this._cancellationToken.cancelled = true;
      delete this._cancellationToken;
    }

    const defaults = createFlags();
    Object.keys(this.flags).filter(flag => flag !== 'required').forEach(flag => {
      this.flags[flag] = defaults[flag];
    });

    // update initial value
    this.initialValue = this.value;
    this.flags.changed = false;

    this.addValueListeners();
    this.addActionListeners();
    this.updateClasses(true);
    this.updateAriaAttrs();
    this.updateCustomValidity();
  }

  /**
   * Sets the given flags (and negated counterparts) and updates classes/aria/validity.
   *
   * @param {Record<string, boolean>} flags - Flag names to boolean values.
   * @returns {void}
   */
  setFlags (flags: Record<string, boolean>) {
    const negated: Record<string, string> = {
      pristine: 'dirty',
      dirty: 'pristine',
      valid: 'invalid',
      invalid: 'valid',
      touched: 'untouched',
      untouched: 'touched'
    };

    Object.keys(flags).forEach(flag => {
      this.flags[flag] = flags[flag];
      const negKey = negated[flag];
      if (negKey && flags[negKey] === undefined) {
        this.flags[negKey] = !flags[flag];
      }
    });

    if (
      flags.untouched !== undefined ||
      flags.touched !== undefined ||
      flags.dirty !== undefined ||
      flags.pristine !== undefined
    ) {
      this.addActionListeners();
    }
    this.updateClasses();
    this.updateAriaAttrs();
    this.updateCustomValidity();
  }

  /**
   * Rebuilds dependencies for rules that reference other fields (e.g. required_if).
   *
   * @returns {void}
   */
  updateDependencies () {
    // reset dependencies.
    this.dependencies.forEach(d => d.field.destroy());
    this.dependencies = [];

    // we get the selectors for each field.
    const fields = Object.keys(this.rules).reduce((prev, r) => {
      if (RuleContainer.isTargetRule(r)) {
        prev.push({ selector: this.rules[r][0], name: r });
      }

      return prev;
    }, []);

    const vm = this.vm as { $el?: HTMLElement; $refs: Record<string, unknown> } | null;
    if (!fields.length || !vm || !vm.$el) return;

    fields.forEach(({ selector, name }) => {
      const ref = vm.$refs[selector];
      const el = Array.isArray(ref) ? ref[0] : ref;
      if (!el) {
        return;
      }

      const options: any = {
        vm: this.vm,
        classes: this.classes,
        classNames: this.classNames,
        delay: this.delay as number,
        scope: this.scope,
        events: this.events.join('|'),
        immediate: this.immediate,
        targetOf: this.id
      };

      if (isCallable((el as any).$watch)) {
        options.component = el;
        options.el = (el as any).$el;
        const vnode = (el as any).$.vnode || (el as any)._vnode || {};
        options.getter = Resolver.resolveGetter((el as any).$el, vnode, null, el, el) as () => any;
      } else {
        options.el = el as HTMLElement;
        options.getter = Resolver.resolveGetter(el, {} as any, null, null, null) as () => any;
      }

      this.dependencies.push({ name, field: new Field(options) });
    });
  }

  /**
   * Removes watchers matching the tag regex (or all if no tag).
   *
   * @param {RegExp | null} [tag] - Optional regex to filter watchers to remove.
   * @returns {void}
   */
  unwatch (tag?: RegExp | null) {
    if (!tag) {
      this.watchers.forEach(w => w.unwatch());
      this.watchers = [];
      return;
    }

    this.watchers.filter(w => tag.test(w.tag)).forEach(w => w.unwatch());
    this.watchers = this.watchers.filter(w => !tag.test(w.tag));
  }

  /**
   * Applies CSS classes to the element(s) based on field flags (valid, invalid, touched, etc.).
   *
   * @param {boolean} [isReset=false] - If true, clears valid/invalid classes.
   * @returns {void}
   */
  updateClasses (isReset = false) {
    if (!this.classes || this.isDisabled) return;
    const applyClasses = (el) => {
      toggleClass(el, this.classNames.dirty, this.flags.dirty);
      toggleClass(el, this.classNames.pristine, this.flags.pristine);
      toggleClass(el, this.classNames.touched, this.flags.touched);
      toggleClass(el, this.classNames.untouched, this.flags.untouched);

      // remove valid/invalid classes on reset.
      if (isReset) {
        toggleClass(el, this.classNames.valid, false);
        toggleClass(el, this.classNames.invalid, false);
      }

      // make sure we don't set any classes if the state is undetermined.
      if (!isNullOrUndefined(this.flags.valid) && this.flags.validated) {
        toggleClass(el, this.classNames.valid, this.flags.valid);
      }

      if (!isNullOrUndefined(this.flags.invalid) && this.flags.validated) {
        toggleClass(el, this.classNames.invalid, this.flags.invalid);
      }
    };

    if (!isCheckboxOrRadioInput(this.el)) {
      applyClasses(this.el);
      return;
    }

    const els = document.querySelectorAll(`input[name="${this.el.name}"]`);
    toArray(els).forEach(applyClasses);
  }

  /**
   * Adds blur/input listeners to update touched/dirty flags and optional CSS classes.
   *
   * @returns {void}
   */
  addActionListeners () {
    // remove previous listeners.
    this.unwatch(/class/);

    if (!this.el) return;

    const onBlur = () => {
      this.flags.touched = true;
      this.flags.untouched = false;
      if (this.classes) {
        toggleClass(this.el, this.classNames.touched, true);
        toggleClass(this.el, this.classNames.untouched, false);
      }

      // only needed once.
      this.unwatch(/^class_blur$/);
    };

    const inputEvent = isTextInput(this.el) ? 'input' : 'change';
    const onInput = () => {
      this.flags.dirty = true;
      this.flags.pristine = false;
      if (this.classes) {
        toggleClass(this.el, this.classNames.pristine, false);
        toggleClass(this.el, this.classNames.dirty, true);
      }

      // only needed once.
      this.unwatch(/^class_input$/);
    };

    if (this.componentInstance) {
      if (isCallable(this.componentInstance.$watch) && this.getter) {
        const unwatchInput = this.componentInstance.$watch(() => this.getter && this.getter(), onInput, { deep: true });
        const unwatchBlur = () => {};
        this.watchers.push({ tag: 'class_input', unwatch: () => unwatchInput && unwatchInput() });
        this.watchers.push({ tag: 'class_blur', unwatch: unwatchBlur });
      } else if (isCallable(this.componentInstance.$once)) {
        this.componentInstance.$once('input', onInput);
        this.componentInstance.$once('blur', onBlur);
        this.watchers.push({
          tag: 'class_input',
          unwatch: () => {
            if (this.componentInstance.$off) this.componentInstance.$off('input', onInput);
          }
        });
        this.watchers.push({
          tag: 'class_blur',
          unwatch: () => {
            if (this.componentInstance.$off) this.componentInstance.$off('blur', onBlur);
          }
        });
      }
      return;
    }

    if (!this.el) return;

    addEventListener(this.el, inputEvent, onInput);
    // Checkboxes and radio buttons on Mac don't emit blur naturally, so we listen on click instead.
    const blurEvent = isCheckboxOrRadioInput(this.el) ? 'change' : 'blur';
    addEventListener(this.el, blurEvent, onBlur);
    this.watchers.push({
      tag: 'class_input',
      unwatch: () => {
        this.el.removeEventListener(inputEvent, onInput);
      }
    });

    this.watchers.push({
      tag: 'class_blur',
      unwatch: () => {
        this.el.removeEventListener(blurEvent, onBlur);
      }
    });
  }

  /**
   * Returns whether the current value differs from the initial value (handles null/empty for inputs).
   *
   * @returns {boolean}
   */
  checkValueChanged () {
    // handle some people initialize the value to null, since text inputs have empty string value.
    if (this.initialValue === null && this.value === '' && isTextInput(this.el)) {
      return false;
    }

    return this.value !== this.initialValue;
  }

  /**
   * Picks the primary input event (input vs change) for the element/component.
   *
   * @returns {string} Event name.
   * @internal
   */
  _determineInputEvent () {
    // if its a custom component, use the customized model event or the input event.
    if (this.componentInstance) {
      return (this.componentInstance.$options.model && this.componentInstance.$options.model.event) || 'input';
    }

    if (this.model && this.model.lazy) {
      return 'change';
    }

    if (isTextInput(this.el)) {
      return 'input';
    }

    return 'change';
  }

  /**
   * Returns the list of events to attach (respects config and component/model).
   *
   * @param {string} defaultInputEvent - Default input event (input or change).
   * @returns {string[]}
   * @internal
   */
  _determineEventList (defaultInputEvent) {
    // if no event is configured, or it is a component or a text input then respect the user choice.
    if (!this.events.length || this.componentInstance || isTextInput(this.el)) {
      return [...this.events].map(evt => {
        if (evt === 'input' && this.model && this.model.lazy) {
          return 'change';
        }

        return evt;
      });
    }

    // force suitable event for non-text type fields.
    return this.events.map(e => {
      if (e === 'input') {
        return defaultInputEvent;
      }

      return e;
    });
  }

  /**
   * Adds value-change listeners (DOM or component) that trigger validation with optional debounce.
   *
   * @returns {void}
   */
  addValueListeners () {
    this.unwatch(/^input_.+/);
    if (!this.listen || !this.el) return;

    const token = { cancelled: false };
    const fn = this.targetOf ? () => {
      const target = this.validator._resolveField(`#${this.targetOf}`);
      if (target && target.flags.validated) {
        this.validator.validate(`#${this.targetOf}`);
      }
    } : (...args) => {
      let valueToValidate = args[0];
      if (args.length === 0 || isEvent(args[0])) {
        if (args.length > 0 && isEvent(args[0]) && args[0].target) {
          valueToValidate = args[0].target.type === 'file' ? toArray(args[0].target.files) : args[0].target.value;
        } else {
          valueToValidate = this.value;
        }
      }

      this.flags.pending = true;
      this._cancellationToken = token;
      this.validator.validate(`#${this.id}`, valueToValidate);
    };

    const inputEvent = this._determineInputEvent();
    let events = this._determineEventList(inputEvent);

    // if on input validation is requested.
    if (includes(events, inputEvent)) {
      let ctx = null;
      let expression = null;
      let watchCtxVm = false;
      // if its watchable from the context vm.
      if (this.model && this.model.expression) {
        ctx = this.vm;
        expression = this.model.expression;
        watchCtxVm = true;
      }

      // watch it from the custom component vm instead.
      if (!expression && this.componentInstance && this.componentInstance.$options.model) {
        ctx = this.componentInstance;
        expression = this.componentInstance.$options.model.prop || 'value';
      }

      if (ctx && expression) {
        const debouncedFn = debounce(fn, this.delay[inputEvent], token);
        const unwatch = ctx.$watch(expression, debouncedFn);
        this.watchers.push({
          tag: 'input_model',
          unwatch: () => {
            (this.vm as any).$nextTick(() => {
              unwatch();
            });
          }
        });

        // filter out input event when we are watching from the context vm.
        if (watchCtxVm) {
          events = events.filter(e => e !== inputEvent);
        }
      }
    }

    // Add events.
    events.forEach(e => {
      const debouncedFn = debounce(fn, this.delay[e], token);

      this._addComponentEventListener(e, debouncedFn);
      this._addHTMLEventListener(e, debouncedFn);
    });
  }

  /**
   * Attaches validation to component (e.g. $watch or $on for input event).
   *
   * @param {string} evt - Event name.
   * @param {Function} validate - Validation callback.
   * @returns {void}
   * @internal
   */
  _addComponentEventListener (evt, validate) {
    if (!this.componentInstance) return;

    if (isCallable(this.componentInstance.$watch) && this.getter) {
      const unwatch = this.componentInstance.$watch(() => this.getter && this.getter(), validate, { deep: true });
      this.watchers.push({
        tag: 'input_vue',
        unwatch: () => unwatch && unwatch()
      });
    } else if (isCallable(this.componentInstance.$on)) {
      this.componentInstance.$on(evt, validate);
      this.watchers.push({
        tag: 'input_vue',
        unwatch: () => {
          if (this.componentInstance.$off) this.componentInstance.$off(evt, validate);
        }
      });
    }
  }

  /**
   * Attaches validation listener to the HTML element (and sibling radios/checkboxes if applicable).
   *
   * @param {string} evt - Event name.
   * @param {Function} validate - Validation callback.
   * @returns {void}
   * @internal
   */
  _addHTMLEventListener (evt, validate) {
    if (!this.el || this.componentInstance) return;

    // listen for the current element.
    const addListener = (el) => {
      addEventListener(el, evt, validate);
      this.watchers.push({
        tag: 'input_native',
        unwatch: () => {
          el.removeEventListener(evt, validate);
        }
      });
    };

    addListener(this.el);
    if (!isCheckboxOrRadioInput(this.el)) {
      return;
    }

    const els = document.querySelectorAll(`input[name="${this.el.name}"]`);
    toArray(els).forEach(el => {
      // skip if it is added by v-validate and is not the current element.
      if (el._formwardId && el !== this.el) {
        return;
      }

      addListener(el);
    });
  }

  /**
   * Sets aria-required and aria-invalid on the element(s) from field state.
   *
   * @returns {void}
   */
  updateAriaAttrs () {
    if (!this.aria || !this.el || !isCallable(this.el.setAttribute)) return;

    const applyAriaAttrs = (el) => {
      el.setAttribute('aria-required', this.isRequired ? 'true' : 'false');
      el.setAttribute('aria-invalid', this.flags.invalid ? 'true' : 'false');
    };

    if (!isCheckboxOrRadioInput(this.el)) {
      applyAriaAttrs(this.el);
      return;
    }

    const els = document.querySelectorAll(`input[name="${this.el.name}"]`);
    toArray(els).forEach(applyAriaAttrs);
  }

  /**
   * Sets the native HTML5 custom validity message on the element from the first error or empty.
   *
   * @returns {void}
   */
  updateCustomValidity () {
    if (!this.validity || !this.el || !isCallable(this.el.setCustomValidity) || !this.validator.errors) return;

    this.el.setCustomValidity(this.flags.valid ? '' : (this.validator.errors.firstById(this.id) || ''));
  }

  /**
   * Removes all watchers and dependency fields; cancels pending validation.
   *
   * @returns {void}
   */
  destroy () {
    // ignore the result of any ongoing validation.
    if (this._cancellationToken) {
      this._cancellationToken.cancelled = true;
    }

    this.unwatch();
    this.dependencies.forEach(d => d.field.destroy());
    this.dependencies = [];
  }
}
