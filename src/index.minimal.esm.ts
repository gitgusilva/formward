import Formward from './plugin';
import directive from './directive';
import mixin from './mixin';
import Validator from './core/validator';
import ErrorBag from './core/errorBag';
import mapFields from './core/mapFields';
import { ValidationProvider, ValidationObserver, withValidation } from './components';

const version = '__VERSION__';
const install = Formward.install;
const use = Formward.use;
const setMode = Formward.setMode;

export {
  install,
  use,
  setMode,
  directive,
  mixin,
  mapFields,
  Validator,
  ErrorBag,
  version,
  ValidationProvider,
  ValidationObserver,
  withValidation
};

Formward.version = version;
Formward.mapFields = mapFields;
Formward.ValidationProvider = ValidationProvider;
Formward.ValidationObserver = ValidationObserver;
Formward.withValidation = withValidation;

export default Formward;
