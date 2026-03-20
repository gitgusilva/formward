import { getCurrentInstance, h } from 'vue';
import { getConfig } from '../config';
import { getValidator } from '../state';
import { modes } from '../modes';
import Validator from '../core/validator';
import RuleContainer from '../core/ruleContainer';
import { normalizeEvents, isEvent } from '../utils/events';
import { createFlags, normalizeRules, warn, isCallable, debounce, isNullOrUndefined, assign, isEqual, toArray } from '../utils';
import { findModel, extractVNodes, addVNodeListener, getInputEventName, createRenderless } from '../utils/vnode';

let $validator = null;

let PROVIDER_COUNTER = 0;

function findObserverInAncestors () {
  let instance = getCurrentInstance();
  while (instance) {
    const proxy = instance.proxy;
    if (proxy && proxy.$_formwardObserver) return proxy.$_formwardObserver;
    instance = instance.parent;
  }
  return null;
}

function getParentObserver () {
  const instance = getCurrentInstance();
  return instance && instance.parent ? instance.parent.proxy : null;
}

export const ValidationProvider = {
  $__formwardInject: false,
  inject: {
    $_formwardObserver: {
      from: '$_formwardObserver',
      default () {
        const observer = findObserverInAncestors();
        if (observer) return observer;
        const parent = getParentObserver();
        if (parent && !parent.$_formwardObserver) {
          parent.$_formwardObserver = createObserver();
        }
        return parent && parent.$_formwardObserver;
      }
    }
  },
  props: {
    vid: {
      type: [String, Number],
      default: () => {
        PROVIDER_COUNTER++;

        return `_formward_${PROVIDER_COUNTER}`;
      }
    },
    name: {
      type: String,
      default: null
    },
    mode: {
      type: [String, Function],
      default: () => {
        return getConfig().mode;
      }
    },
    events: {
      type: Array,
      validate: () => {
        /* istanbul ignore next */
        if (process.env.NODE_ENV !== 'production') {
          warn('events prop and config will be deprecated in future version please use the interaction modes instead');
        }

        return true;
      },
      default: () => {
        const events = getConfig().events;
        if (typeof events === 'string') {
          return events.split('|');
        }

        return events;
      }
    },
    rules: {
      type: [Object, String],
      default: null
    },
    immediate: {
      type: Boolean,
      default: false
    },
    persist: {
      type: Boolean,
      default: false
    },
    bails: {
      type: Boolean,
      default: () => getConfig().fastExit
    },
    debounce: {
      type: Number,
      default: () => getConfig().delay || 0
    },
    tag: {
      type: String,
      default: 'span'
    },
    slim: {
      type: Boolean,
      default: false
    }
  },
  watch: {
    rules: {
      deep: true,
      handler (val, oldVal) {
        this._needsValidation = !isEqual(val, oldVal);
      }
    }
  },
  data: () => ({
    messages: [],
    value: undefined,
    initialized: false,
    initialValue: undefined,
    flags: createFlags(),
    failedRules: {},
    forceRequired: false,
    isDeactivated: false,
    id: null
  }),
  computed: {
    isValid () {
      return this.flags.valid;
    },
    fieldDeps () {
      const rules = normalizeRules(this.rules);

      return Object.keys(rules).filter(RuleContainer.isTargetRule).map(rule => {
        const depName = rules[rule][0];
        watchCrossFieldDep(this, depName);

        return depName;
      });
    },
    normalizedEvents () {
      const { on } = computeModeSetting(this);

      return normalizeEvents(on || this.events || []).map(e => {
        if (e === 'input') {
          return this._inputEventName;
        }

        return e;
      });
    },
    isRequired () {
      const rules = normalizeRules(this.rules) as Record<string, unknown>;
      const forceRequired = this.forceRequired;

      const isRequired = rules.required || forceRequired;
      this.flags.required = isRequired;

      return isRequired;
    },
    classes (): Record<string, unknown> {
      const names = getConfig().classNames;
      return Object.keys(this.flags).reduce<Record<string, unknown>>((classes, flag) => {
        const className = (names && (names as Record<string, string>)[flag]) || flag;
        if (isNullOrUndefined(this.flags[flag])) {
          return classes;
        }
        if (className) {
          classes[className] = this.flags[flag];
        }
        return classes;
      }, {});
    }
  },
  render () {
    this.registerField();
    const ctx = createValidationCtx(this);

    const slot = this.$slots.default;
    const slotFn = isCallable(slot) ? slot : null;
    /* istanbul ignore next */
    if (!slotFn) {
      if (process.env.NODE_ENV !== 'production') {
        warn('ValidationProvider expects a scoped slot. Did you forget to add "v-slot" to your slot?');
      }

      const defaultSlot = this.$slots.default;
      const content = isCallable(defaultSlot) ? defaultSlot(ctx) : (defaultSlot || []);
      return h(this.tag, content);
    }

    const nodes = slotFn(ctx);
    extractVNodes(Array.isArray(nodes) ? nodes : [nodes]).forEach(input => {
      addListeners.call(this, input);
    });

    return this.slim ? createRenderless(h, nodes) : h(this.tag, nodes);
  },
  mounted () {
    if (this._formwardWatchers && this.fieldDeps) {
      this.fieldDeps.forEach(depName => watchCrossFieldDep(this, depName, false));
    }
  },
  updated () {
    this.$nextTick(() => {
      if (!this.messages.length || !this.$el || this._formwardUnmounted) {
        return;
      }
      const val = syncValueFromElement(this.$el);
      if (val === undefined) {
        return;
      }
      if (domValueMatchesModel(val, this.value)) {
        return;
      }
      if (this._formwardCatchUpTimer != null) {
        clearTimeout(this._formwardCatchUpTimer);
      }
      this._formwardCatchUpTimer = setTimeout(() => {
        this._formwardCatchUpTimer = null;
        if (this._formwardUnmounted || !this.$el) {
          return;
        }
        const v = syncValueFromElement(this.$el);
        if (v === undefined || domValueMatchesModel(v, this.value)) {
          return;
        }
        this.value = v;
        this.flags.changed = this.initialValue !== v;
        this.validateSilent().then(result => {
          if (this._formwardUnmounted) {
            return;
          }
          this.applyResult(result);
        });
      }, 0);
    });
  },
  beforeUnmount () {
    this._formwardUnmounted = true;
    if (this._formwardCatchUpTimer != null) {
      clearTimeout(this._formwardCatchUpTimer);
      this._formwardCatchUpTimer = null;
    }
    if (this._formwardWatchers) {
      Object.keys(this._formwardWatchers).forEach(key => {
        const unwatch = this._formwardWatchers[key];
        if (isCallable(unwatch)) {
          unwatch();
        }
      });
      this._formwardWatchers = {};
    }
    this._pendingValidation = null;
    this.$_formwardObserver.unsubscribe(this);
  },
  activated () {
    this.$_formwardObserver.subscribe(this);
    this.isDeactivated = false;
  },
  deactivated () {
    this.$_formwardObserver.unsubscribe(this);
    this.isDeactivated = true;
  },
  methods: {
    setFlags (flags) {
      Object.keys(flags).forEach(flag => {
        this.flags[flag] = flags[flag];
      });
    },
    syncValue (e) {
      const value = normalizeValue(e);
      this.value = value;
      this.flags.changed = this.initialValue !== value;
    },
    reset () {
      this.messages = [];
      this._pendingValidation = null;
      this.initialValue = this.value;
      const flags = createFlags();
      this.setFlags(flags);
    },
    validate (...args) {
      if (args.length > 0) {
        this.syncValue(args[0]);
      } else if (this.$el) {
        const val = syncValueFromElement(this.$el);
        if (val !== undefined) {
          this.value = val;
          this.flags.changed = this.initialValue !== val;
        }
      }

      return this.validateSilent().then(result => {
        this.applyResult(result);

        return result;
      });
    },
    validateSilent () {
      this.setFlags({ pending: true });

      return $validator.verify(this.value, this.rules, {
        name: this.name,
        values: createValuesLookup(this),
        bails: this.bails
      }).then(result => {
        this.setFlags({ pending: false });
        if (!this.isRequired) {
          this.setFlags({ valid: result.valid, invalid: !result.valid });
        }

        return result;
      });
    },
    applyResult ({ errors, failedRules }) {
      if (this._formwardUnmounted) {
        return;
      }
      if (isEqual(errors, this.messages) && isEqual(failedRules, this.failedRules)) {
        return;
      }
      this.messages = errors;
      this.failedRules = assign({}, failedRules);
      this.setFlags({
        valid: !errors.length,
        changed: this.value !== this.initialValue,
        invalid: !!errors.length,
        validated: true
      });
      this.$_formwardObserver?.notifyUpdate?.();
    },
    registerField () {
      if (!$validator) {
        $validator = getValidator() || new Validator(null, { fastExit: getConfig().fastExit });
      }

      updateRenderingContextRefs(this);
    }
  }
};

export function createValidationCtx (ctx) {
  return {
    errors: ctx.messages,
    flags: ctx.flags,
    classes: ctx.classes,
    valid: ctx.isValid,
    failedRules: ctx.failedRules,
    reset: () => ctx.reset(),
    validate: (...args) => ctx.validate(...args),
    aria: {
      'aria-invalid': ctx.flags.invalid ? 'true' : 'false',
      'aria-required': ctx.isRequired ? 'true' : 'false'
    }
  };
}

function normalizeValue (value) {
  if (isEvent(value)) {
    return value.target.type === 'file' ? toArray(value.target.files) : value.target.value;
  }

  return value;
}

function getInputElement (el) {
  if (!el) return null;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT'
    ? el
    : el.querySelector('input, textarea, select');
}

function syncValueFromElement (el) {
  const input = getInputElement(el);
  if (!input) return undefined;
  if (input.type === 'checkbox' || input.type === 'radio') {
    return input.checked;
  }
  if (input.type === 'file') {
    return toArray(input.files);
  }
  return input.value;
}

function domValueMatchesModel (domVal, ctxVal) {
  if (isEqual(domVal, ctxVal)) {
    return true;
  }
  if (domVal != null && ctxVal != null && String(domVal) === String(ctxVal)) {
    return true;
  }
  return false;
}

function shouldValidate (ctx, model) {
  if (!ctx._ignoreImmediate && ctx.immediate) {
    return true;
  }

  if (ctx.value !== model.value) {
    return true;
  }

  if (ctx._needsValidation) {
    return true;
  }

  if (!ctx.initialized && model.value === undefined) {
    return true;
  }

  if (
    ctx.messages.length > 0 &&
    ctx.flags.validated &&
    ctx.value === model.value
  ) {
    return true;
  }

  return false;
}

function computeModeSetting (ctx) {
  const compute = isCallable(ctx.mode) ? ctx.mode : modes[ctx.mode];

  return compute({
    errors: ctx.messages,
    value: ctx.value,
    flags: ctx.flags
  });
}

export function onRenderUpdate (model) {
  if (!this.initialized) {
    this.initialValue = model.value;
  }

  const validateNow = shouldValidate(this, model);
  this._needsValidation = false;
  this.value = model.value;
  this._ignoreImmediate = true;

  if (!validateNow) {
    return;
  }

  this.validateSilent().then(this.immediate || this.flags.validated ? result => {
    if (!this._formwardUnmounted) {
      this.applyResult(result);
    }
  } : x => x);
}

export function createCommonHandlers (ctx) {
  const onInput = (e: unknown) => {
    ctx.syncValue(e);
    ctx.setFlags({ dirty: true, pristine: false });
    ctx.$formwardHandler?.(e);
  };

  const onBlur = (e?: unknown) => {
    ctx.setFlags({ touched: true, untouched: false });
    ctx.$formwardHandler?.(e);
  };

  let onValidate = ctx.$formwardHandler;
  const mode = computeModeSetting(ctx);

  if (!onValidate || ctx.$formwardDebounce !== ctx.debounce) {
    onValidate = debounce(
      (e?: unknown) => {
        const runValidation = () => {
          const target = e && typeof e === 'object' && (e as Event).target
            ? (e as Event).target as HTMLInputElement
            : null;
          if (target && typeof target.value !== 'undefined') {
            const val = target.type === 'checkbox' || target.type === 'radio'
              ? target.checked
              : target.type === 'file'
                ? toArray(target.files)
                : target.value;
            ctx.value = val;
            ctx.flags.changed = ctx.initialValue !== val;
          } else if (ctx.$el) {
            const val = syncValueFromElement(ctx.$el);
            if (val !== undefined) {
              ctx.value = val;
              ctx.flags.changed = ctx.initialValue !== val;
            }
          }
          const pendingPromise = ctx.validateSilent();
          ctx._pendingValidation = pendingPromise;
          pendingPromise.then(result => {
            if (ctx._formwardUnmounted) {
              return;
            }
            if (pendingPromise === ctx._pendingValidation) {
              ctx.applyResult(result);
              ctx._pendingValidation = null;
            }
          });
        };
        if (e && typeof e === 'object' && (e as Event).target) {
          runValidation();
          ctx.$nextTick(() => {
            if (ctx.$el) {
              const val = syncValueFromElement(ctx.$el);
              if (val !== undefined) {
                ctx.value = val;
                ctx.flags.changed = ctx.initialValue !== val;
              }
            }
            const pending = ctx.validateSilent();
            ctx._pendingValidation = pending;
            pending.then(result => {
              if (ctx._formwardUnmounted) {
                return;
              }
              if (pending === ctx._pendingValidation) {
                ctx.applyResult(result);
                ctx._pendingValidation = null;
              }
            });
          });
        } else {
          ctx.$nextTick(runValidation);
        }
      },
      mode.debounce ?? ctx.debounce
    );

    ctx.$formwardHandler = onValidate;
    ctx.$formwardDebounce = ctx.debounce;
  }

  return { onInput, onBlur, onValidate };
}

function addListeners (node) {
  const model = findModel(node);
  this._inputEventName = this._inputEventName || getInputEventName(node, model);

  onRenderUpdate.call(this, model);

  const { onInput, onBlur, onValidate } = createCommonHandlers(this);
  addVNodeListener(node, this._inputEventName, onInput);
  addVNodeListener(node, 'blur', onBlur);

  this.normalizedEvents.forEach(evt => {
    addVNodeListener(node, evt, onValidate);
  });

  this.initialized = true;
}

function createValuesLookup (ctx) {
  const providers = ctx.$_formwardObserver.refs;

  return ctx.fieldDeps.reduce((acc, depName) => {
    if (!providers[depName]) {
      return acc;
    }

    acc[depName] = providers[depName].value;

    return acc;
  }, {});
}

function updateRenderingContextRefs (ctx) {
  if (isNullOrUndefined(ctx.id) && ctx.id === ctx.vid) {
    ctx.id = PROVIDER_COUNTER;
    PROVIDER_COUNTER++;
  }

  const { id, vid } = ctx;
  if (ctx.isDeactivated || (id === vid && ctx.$_formwardObserver.refs[id])) {
    return;
  }

  if (id !== vid && ctx.$_formwardObserver.refs[id] === ctx) {
    ctx.$_formwardObserver.unsubscribe({ vid: id });
  }

  ctx.$_formwardObserver.subscribe(ctx);
  ctx.id = vid;
}

function createObserver () {
  return {
    refs: {},
    subscribe (ctx) {
      this.refs[ctx.vid] = ctx;
    },
    unsubscribe (ctx) {
      delete this.refs[ctx.vid];
    }
  };
}

function watchCrossFieldDep (ctx, depName, withHooks = true) {
  const providers = ctx.$_formwardObserver.refs;
  if (!ctx._formwardWatchers) {
    ctx._formwardWatchers = {};
  }

  if (!providers[depName] && withHooks) {
    return;
  }

  if (!isCallable(ctx._formwardWatchers[depName]) && providers[depName]) {
    ctx._formwardWatchers[depName] = providers[depName].$watch('value', () => {
      if (ctx.flags.validated) {
        ctx._needsValidation = true;
        ctx.validate();
      }
    });
  }
}
