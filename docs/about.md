# About this project

**Formward** is published on [npm](https://www.npmjs.com/package/formward) and developed on [GitHub](https://github.com/gitgusilva/formward). It is a fork of [vee-validate](https://github.com/baianat/vee-validate) 2.2.x, adapted for Vue 3 and extended with:

- **Same API as vee-validate 2**: `v-validate`, `$validator`, `errors`, `ValidationProvider` / `ValidationObserver`, `Validator.extend`, rules string, locales.
- **Schema-first validation**: use **Zod** or **Yup** object schemas with the same directive and validator via **SchemaProvider** or **installSchema**.
- **Professional usage**: register a schema once with a provider and use `v-validate="'schema:fieldName'"` in inputs.

The original vee-validate 2 targeted Vue 2; the official vee-validate 4+ uses a different API for Vue 3. This fork keeps the 2.x API so you can stay on the template-based, directive-driven workflow in Vue 3, and optionally adopt Zod/Yup schemas without rewriting your app.

- **Formward:** [npm](https://www.npmjs.com/package/formward) · [GitHub](https://github.com/gitgusilva/formward)
- **Original project**: [vee-validate](https://github.com/baianat/vee-validate) (Baianat)
- **Original docs**: [vee-validate 2 guide](https://baianat.github.io/vee-validate/)
