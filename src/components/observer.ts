import { getCurrentInstance, h } from 'vue';
import { isCallable, values, findIndex, warn, assign } from '../utils';
import { createRenderless } from '../utils/vnode';

function getParentObserver () {
  const instance = getCurrentInstance();
  return instance && instance.parent ? instance.parent.proxy : null;
}

const flagMergingStrategy = {
  pristine: 'every',
  dirty: 'some',
  touched: 'some',
  untouched: 'every',
  valid: 'every',
  invalid: 'some',
  pending: 'some',
  validated: 'every'
};

function mergeFlags (lhs, rhs, strategy) {
  const stratName = flagMergingStrategy[strategy];

  return [lhs, rhs][stratName](f => f);
}

let OBSERVER_COUNTER = 0;

export const ValidationObserver = {
  name: 'ValidationObserver',
  provide () {
    return {
      $_formwardObserver: this
    };
  },
  inject: {
    $_formwardObserver: {
      from: '$_formwardObserver',
      default () {
        const parent = getParentObserver();
        return parent && parent.$_formwardObserver ? parent.$_formwardObserver : null;
      }
    }
  },
  props: {
    tag: {
      type: String,
      default: 'span'
    },
    slim: {
      type: Boolean,
      default: false
    }
  },
  data: () => ({
    vid: `obs_${OBSERVER_COUNTER++}`,
    refs: {},
    observers: [],
    persistedStore: {},
    /** Bumped by providers so merged `ctx` updates when child state is not a Vue dependency of the observer. */
    _ctxVersion: 0
  }),
  computed: {
    ctx () {
      this._ctxVersion;
      const ctx = {
        errors: {},
        validate: (arg) => {
          const promise = this.validate(arg);

          return {
            then (thenable) {
              return promise.then(success => {
                if (success && isCallable(thenable)) {
                  return Promise.resolve(thenable());
                }

                return Promise.resolve(success);
              });
            }
          };
        },
        reset: () => this.reset()
      };

      const items = [
        ...values(this.refs),
        ...Object.keys(this.persistedStore).map(key => {
          return {
            vid: key,
            flags: this.persistedStore[key].flags,
            messages: this.persistedStore[key].errors
          };
        }),
        ...this.observers,
      ];

      const result = items.reduce((acc, provider) => {
        Object.keys(flagMergingStrategy).forEach(flag => {
          const flags = provider.flags || provider.ctx;
          if (!(flag in acc)) {
            acc[flag] = flags[flag];
            return;
          }

          acc[flag] = mergeFlags(acc[flag], flags[flag], flag);
        });

        acc.errors[provider.vid] = provider.messages || values(provider.ctx.errors).reduce((errs, obsErrors) => {
          return errs.concat(obsErrors);
        }, []);

        return acc;
      }, ctx);

      if (items.length === 0) {
        result.invalid = true;
        result.valid = false;
      }

      return result;
    }
  },
  created () {
    if (this.$_formwardObserver) {
      this.$_formwardObserver.subscribe(this, 'observer');
    }
  },
  activated () {
    if (this.$_formwardObserver) {
      this.$_formwardObserver.subscribe(this, 'observer');
    }
  },
  deactivated () {
    if (this.$_formwardObserver) {
      this.$_formwardObserver.unsubscribe(this, 'observer');
    }
  },
  beforeUnmount () {
    if (this.$_formwardObserver) {
      this.$_formwardObserver.unsubscribe(this, 'observer');
    }
  },
  render () {
    const defaultSlot = this.$slots.default || [];
    const slots = isCallable(defaultSlot) ? defaultSlot(this.ctx) : defaultSlot;
    const attrs = this.$attrs || {};
    return this.slim ? createRenderless(h, slots) : h(this.tag, attrs, slots);
  },
  methods: {
    /** @see _ctxVersion */
    notifyUpdate () {
      this._ctxVersion++;
    },
    subscribe (subscriber, kind = 'provider') {
      if (kind === 'observer') {
        this.observers.push(subscriber);
        return;
      }

      this.refs = Object.assign({}, this.refs, { [subscriber.vid]: subscriber });
      if (subscriber.persist && this.persistedStore[subscriber.vid]) {
        this.restoreProviderState(subscriber);
      }
    },
    unsubscribe (subscriber, kind = 'provider') {
      const vid = subscriber?.vid;
      if (kind === 'provider' && vid !== undefined) {
        this.removeProvider(vid);
      }

      if (vid !== undefined) {
        const idx = findIndex(this.observers, o => o.vid === vid);
        if (idx !== -1) {
          this.observers.splice(idx, 1);
        }
      }
    },
    validate ({ silent } = { silent: false }) {
      return this.$nextTick().then(() => {
        const promises = [
          ...values(this.refs).map(ref => ref[silent ? 'validateSilent' : 'validate']().then(r => r.valid)),
          ...this.observers.map(obs => obs.validate({ silent }))
        ];
        if (promises.length === 0) {
          return false;
        }
        return Promise.all(promises).then(results => results.every(r => r));
      });
    },
    reset () {
      this.persistedStore = {};
      return [...values(this.refs), ...this.observers].forEach(ref => ref.reset());
    },
    restoreProviderState (provider) {
      const state = this.persistedStore[provider.vid];
      provider.setFlags(state.flags);
      provider.applyResult(state);
      const next = assign({}, this.persistedStore);
      delete next[provider.vid];
      this.persistedStore = next;
    },
    removeProvider (vid) {
      const provider = this.refs[vid];
      if (provider && provider.persist) {
        /* istanbul ignore else */
        if (process.env.NODE_ENV !== 'production') {
          if (vid.indexOf('_formward_') === 0) {
            warn('Please provide a `vid` prop when using `persist`, there might be unexpected issues otherwise.');
          }
        }

        this.persistedStore = assign({}, this.persistedStore, {
          [vid]: {
            flags: provider.flags,
            errors: provider.messages,
            failedRules: provider.failedRules
          }
        });
      }

      const refs = assign({}, this.refs);
      delete refs[vid];
      this.refs = refs;
    },
  }
};
