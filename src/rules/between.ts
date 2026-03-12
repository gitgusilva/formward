const validate = (value: any, params: { min?: any; max?: any } = {}) => {
  const { min, max } = params;
  if (Array.isArray(value)) {
    return value.every(val => validate(val, { min, max }));
  }

  return Number(min) <= value && Number(max) >= value;
};

const paramNames = ['min', 'max'];

export {
  validate,
  paramNames
};

export default {
  validate,
  paramNames
};
