/**
 * Formward — ESM entry. Vue 3 form validation.
 */
import Formward, { install as installPlugin } from './plugin';
import directive from './directive';
import mixin from './mixin';
import en from '../locale/en';
import * as Rules from './rules';
import mapFields from './core/mapFields';
import Validator from './core/validator';
import ErrorBag from './core/errorBag';
import { assign } from './utils';
import { ValidationProvider, ValidationObserver, withValidation } from './components';

const version = '__VERSION__';

Object.keys(Rules).forEach(rule => {
  Validator.extend(rule, Rules[rule].validate, assign({}, Rules[rule].options, { paramNames: Rules[rule].paramNames }));
});

Validator.localize({ en });

const install = installPlugin;
const configure = (opts) => Formward.configure(opts);
const setMode = (mode, impl) => Formward.setMode(mode, impl);

export {
  install,
  configure,
  setMode,
  directive,
  mixin,
  mapFields,
  Validator,
  ErrorBag,
  Rules,
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

const plugin = {
  install: installPlugin,
  version: Formward.version,
  configure: Formward.configure,
  setMode: Formward.setMode,
  use: Formward.use,
  setI18nDriver: Formward.setI18nDriver,
  Validator: Formward.Validator,
  ErrorBag: Formward.ErrorBag,
  mapFields: Formward.mapFields,
  ValidationProvider: Formward.ValidationProvider,
  ValidationObserver: Formward.ValidationObserver,
  withValidation: Formward.withValidation,
  mixin: Formward.mixin,
  directive: Formward.directive,
  get config () { return Formward.config; },
  get i18nDriver () { return Formward.i18nDriver; },
  emitLocaleChanged: Formward.emitLocaleChanged
};

export default plugin;
