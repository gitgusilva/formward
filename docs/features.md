# Features

- **Directive** `v-validate`: rules on inputs, automatic errors and classes
- **Validator & ErrorBag**: `$validator`, `this.errors`, `validateAll()`, `Validator.extend()`
- **ValidationProvider / ValidationObserver**: scoped validation and form-level state
- **Built-in rules**: required, email, min, max, between, regex, and more (classic rule set)
- **Locales**: English and others; vue-i18n support
- **Schema support** (optional): Zod and Yup object schemas as Formward rules
- **SchemaProvider**: wrap a form, pass a schema, use `v-validate="'schema:fieldName'"` on inputs
- **installSchema()**: programmatic registration of a schema and cleanup on unmount
- **Wizard**: composables for multi-step forms; block "Next" until current step is valid (see [Examples](examples.md))
