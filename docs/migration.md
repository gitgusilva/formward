# Migration from vee-validate (2.x)

1. Install from npm: `npm install formward` ([package](https://www.npmjs.com/package/formward)) — remove `vee-validate` if present.
2. Replace imports: `import VeeValidate from 'vee-validate'` → `import Formward from 'formward'`, and `app.use(VeeValidate, ...)` → `app.use(Formward, ...)`.
3. Keep the rest: `v-validate`, `this.errors`, `$validator`, `ValidationProvider`, `ValidationObserver`, `Validator.extend`, rules strings, and locales work the same.

Optional: add schema support with `formward/schema` and use **SchemaProvider** or **installSchema** where you want schema-driven validation.
