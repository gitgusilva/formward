import { assign } from '../utils';
import ErrorBag from './errorBag';
import FieldBag from './fieldBag';
import type Validator from './validator';
import type Field from './field';

function getInstanceUid (vm: any) {
  return (vm.$ && vm.$.uid) !== undefined ? vm.$.uid : vm._uid;
}

export default class ScopedValidator {
  id: number | string;
  _base: Validator;
  _paused: boolean;
  errors: ErrorBag;

  constructor (base: Validator, vm: any) {
    this.id = getInstanceUid(vm);
    this._base = base;
    this._paused = false;
    this.errors = new ErrorBag(base.errors, this.id);
  }

  get flags () {
    return this._base.fields.items.filter(f => f.vmId === this.id).reduce((acc, field) => {
      if (field.scope) {
        if (!acc[`$${field.scope}`]) {
          acc[`$${field.scope}`] = {};
        }

        acc[`$${field.scope}`][field.name] = field.flags;
      }

      acc[field.name] = field.flags;

      return acc;
    }, {});
  }

  get rules () {
    return this._base.rules;
  }

  get fields () {
    return new FieldBag(this._base.fields.filter({ vmId: this.id }));
  }

  get dictionary () {
    return this._base.dictionary;
  }

  get locale () {
    return this._base.locale;
  }

  set locale (val) {
    this._base.locale = val;
  }

  localize (...args: any[]) {
    return (this._base.localize as (...a: any[]) => any)(...args);
  }

  update (...args: any[]) {
    return (this._base.update as (...a: any[]) => any)(...args);
  }

  attach (opts) {
    const attachOpts = assign({}, opts, { vmId: this.id });

    return this._base.attach(attachOpts);
  }

  pause () {
    this._paused = true;
  }

  resume () {
    this._paused = false;
  }

  remove (ruleName: string) {
    return this._base.remove(ruleName);
  }

  detach (name: string | Field, scope?: string | null) {
    return this._base.detach(name, scope, this.id);
  }

  extend (...args: any[]) {
    return (this._base.extend as (...a: any[]) => any)(...args);
  }

  validate (descriptor, value, opts = {}) {
    if (this._paused) return Promise.resolve(true);

    return this._base.validate(descriptor, value, assign({}, { vmId: this.id }, opts || {}));
  }

  verify (...args: any[]) {
    return (this._base.verify as (...a: any[]) => any)(...args);
  }

  validateAll (values?: any, opts: any = {}) {
    if (this._paused) return Promise.resolve(true);
    return (this._base.validateAll as (v?: any, o?: any) => Promise<boolean>)(values, assign({}, { vmId: this.id }, opts || {}));
  }

  validateScopes (opts = {}) {
    if (this._paused) return Promise.resolve(true);

    return this._base.validateScopes(assign({}, { vmId: this.id }, opts || {}));
  }

  destroy () {
    delete this.id;
    delete this._base;
  }

  reset (matcher) {
    return this._base.reset(Object.assign({}, matcher || {}, { vmId: this.id }));
  }

  flag (...args: any[]) {
    return (this._base.flag as (...a: any[]) => any)(...args, this.id);
  }

  _resolveField (...args: any[]) {
    return (this._base._resolveField as (...a: any[]) => any)(...args);
  }
};
