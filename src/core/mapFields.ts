import { assign, includes } from '../utils';
import type { MapObject } from '../../types/formward';

const normalize = (fields: any[] | object): object => {
  if (Array.isArray(fields)) {
    return fields.reduce((prev: Record<string, string>, curr) => {
      if (includes(curr, '.')) {
        prev[curr.split('.')[1]] = curr;
      } else {
        prev[curr] = curr;
      }
      return prev;
    }, {});
  }
  return fields as object;
};

const combine = (lhs: MapObject, rhs: MapObject): MapObject => {
  const mapper: Record<string, (a: any, b: any) => boolean> = {
    pristine: (a, b) => a && b,
    dirty: (a, b) => a || b,
    touched: (a, b) => a || b,
    untouched: (a, b) => a && b,
    valid: (a, b) => a && b,
    invalid: (a, b) => a || b,
    pending: (a, b) => a || b,
    required: (a, b) => a || b,
    validated: (a, b) => a && b
  };

  return Object.keys(mapper).reduce((flags: MapObject, flag) => {
    (flags as any)[flag] = mapper[flag]((lhs as any)[flag], (rhs as any)[flag]);
    return flags;
  }, {});
};

const mapScope = (scope: MapObject, deep: boolean = true): MapObject | null => {
  return Object.keys(scope).reduce<MapObject | null>((flags, field) => {
    if (!flags) {
      flags = assign({}, (scope as any)[field]);
      return flags;
    }
    const isScope = field.indexOf('$') === 0;
    if (deep && isScope) {
      return combine(mapScope((scope as any)[field], deep)!, flags);
    } else if (!deep && isScope) {
      return flags;
    }
    flags = combine(flags, (scope as any)[field]);
    return flags;
  }, null);
};

/**
 * Maps fields to computed functions.
 */
const mapFields = (fields?: Array<any> | Object): Object | Function => {
  if (!fields) {
    return function () {
      return mapScope(this.$validator.flags);
    };
  }

  const normalized = normalize(fields) as Record<string, string>;
  return Object.keys(normalized).reduce((prev: Record<string, () => any>, curr) => {
    const field = normalized[curr];
    prev[curr] = function mappedField (this: any) {
      if (this.$validator.flags[field]) {
        return this.$validator.flags[field];
      }
      if (normalized[curr] === '*') {
        return mapScope(this.$validator.flags, false);
      }
      const index = field.indexOf('.');
      if (index <= 0) {
        return {};
      }
      const parts = field.split('.');
      let scope: any = parts[0];
      scope = this.$validator.flags[`$${scope}`];
      const name = parts.slice(1).join('.');

      if (name === '*' && scope) {
        return mapScope(scope);
      }
      if (scope && scope[name]) {
        return scope[name];
      }
      return {};
    };
    return prev;
  }, {});
};

export default mapFields;
