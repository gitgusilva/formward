# Compatibility with vee-validate 2

- **Same plugin/directive/Validator/ErrorBag API.** You can replace `vee-validate` with `formward` in dependency and imports and keep your existing template and script usage.
- **Same rules and locale format.** Built-in rules and locale files are compatible.
- **Vue 3 only.** This fork is not for Vue 2.

## What stays the same (vee-validate 2 style)

- **Plugin:** `app.use(Formward, { locale, inject, … })`
- **Directive:** `v-validate="'required|email'"`, `name`, `data-vv-scope`, modifiers (`.immediate`, etc.)
- **Mixin:** `$validator`, `errors` (e.g. `errors.has('email')`, `errors.first('email', scope)`)
- **ValidationProvider / ValidationObserver:** same components and scoped-slot API (`v-slot="{ errors }"`)
- **Validator:** `Validator.extend()`, `validate()`, `validateAll()`, rules string, locales
- **withValidation** HOC for wrapping custom inputs

The package is the same *conceptually* as vee-validate 2; only the internals use Vue 3 APIs (e.g. `h` from `vue`, `$slots`, vnode shape, no `$on`/`$off`).

## Vue 3 difference: custom components and the directive

In Vue 2, the directive could listen to a custom component’s events via `$on` (e.g. `input`). Vue 3 removed `$on` from component instances. So when you use `v-validate` on a **custom component**, that component must expose a value that can be watched (e.g. **v-model** or a reactive prop). Native inputs and components using v-model continue to work as before.
