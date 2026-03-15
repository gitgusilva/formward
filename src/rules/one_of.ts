/**
 * Validates that the value is one of the allowed values (with paramNames for message interpolation).
 */
function normalizeOptions (options: unknown[] | Record<string, unknown>): unknown[] {
  if (Array.isArray(options)) return options;
  return Object.values(options as Record<string, unknown>);
}

const validate = (value: unknown, options: unknown[] | Record<string, unknown> = []) => {
  const list = normalizeOptions(options);
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
