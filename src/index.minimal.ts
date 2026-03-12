import Formward from './plugin';
import mapFields from './core/mapFields';
import { ValidationProvider, ValidationObserver, withValidation } from './components';

Formward.version = '__VERSION__';
Formward.mapFields = mapFields;
Formward.ValidationProvider = ValidationProvider;
Formward.ValidationObserver = ValidationObserver;
Formward.withValidation = withValidation;

export default Formward;
