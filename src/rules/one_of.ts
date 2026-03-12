import { toArray } from '../utils';

/**
 * Validates that the value is one of the allowed values (with paramNames for message interpolation).
 */
const validate = (value: unknown, options: unknown[] | Record<string, unknown> = []) => {
  const list = toArray(options);
  if (!list.length) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.every((val) => validate(val, list));
  }

  return list.some((item) => item == value);
};

const paramNames = ['values'];

export { validate, paramNames };

export default {
  validate,
  paramNames
};
