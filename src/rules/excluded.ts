import { validate as includes } from './included';

const validate = (...args: any[]) => {
  return !(includes as (...a: any[]) => boolean)(...args);
};

export {
  validate
};

export default {
  validate
};
