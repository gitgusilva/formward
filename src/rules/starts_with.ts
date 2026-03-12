/**
 * Validates that the value (string or array of strings) starts with the given prefix.
 */
const validate = (value: unknown, params: string[] | { prefix?: string } = []) => {
  const prefix = Array.isArray(params) ? params[0] : (params && (params as { prefix?: string }).prefix);
  if (prefix === undefined || prefix === null) {
    return false;
  }
  const str = String(prefix);

  if (Array.isArray(value)) {
    return value.every((val) => validate(val, [str]));
  }

  return String(value).indexOf(str) === 0;
};

const paramNames = ['prefix'];

export { validate, paramNames };

export default {
  validate,
  paramNames
};
