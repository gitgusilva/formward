/**
 * Validates that the value (string or array of strings) ends with the given suffix.
 */
const validate = (value: unknown, params: string[] | { suffix?: string } = []) => {
  const suffix = Array.isArray(params) ? params[0] : (params && (params as { suffix?: string }).suffix);
  if (suffix === undefined || suffix === null) {
    return false;
  }
  const str = String(suffix);

  if (Array.isArray(value)) {
    return value.every((val) => validate(val, [str]));
  }

  const s = String(value);
  return s.length >= str.length && s.indexOf(str, s.length - str.length) !== -1;
};

const paramNames = ['suffix'];

export { validate, paramNames };

export default {
  validate,
  paramNames
};
