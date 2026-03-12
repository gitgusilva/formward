# Features

- **Directive** `v-validate`: rules on inputs, automatic errors and classes
- **Validator & ErrorBag**: `$validator`, `this.errors`, `validateAll()`, `Validator.extend()`
- **ValidationProvider / ValidationObserver**: scoped validation and form-level state
- **Built-in rules**: required, email, min, max, between, regex, etc. (same as vee-validate 2)
- **Locales**: English and others; vue-i18n support
- **Schema support** (optional): Zod and Yup object schemas as Formward rules
- **SchemaProvider**: wrap a form, pass a schema, use `v-validate="'schema:fieldName'"` on inputs
- **installSchema()**: programmatic registration of a schema and cleanup on unmount
