import * as Rules from './rules';
import Formward from './plugin';
import mapFields from './core/mapFields';
import { ValidationProvider, ValidationObserver, withValidation } from './components';
import { assign } from './utils';
import en from '../locale/en';

Object.keys(Rules).forEach(rule => {
  Formward.Validator.extend(rule, Rules[rule].validate, assign({}, Rules[rule].options, { paramNames: Rules[rule].paramNames }));
});

Formward.Validator.localize({ en });
Formward.version = '__VERSION__';
Formward.Rules = Rules;
Formward.mapFields = mapFields;
Formward.ValidationProvider = ValidationProvider;
Formward.ValidationObserver = ValidationObserver;
Formward.withValidation = withValidation;

export default Formward;
