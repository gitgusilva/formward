# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2025-03-20

### Fixed

- **ValidationProvider**: revalidation after value changes (including DOM sync / `updated` catch-up); `shouldValidate` when errors persist with model in sync; `applyResult` skips identical payloads to avoid update loops; unmount guards for timers and `$watch` deps.
- **ValidationObserver**: `validate()` waits for `$nextTick` before reading providers; empty `refs` returns `false` instead of vacuous `true`.
- **useStepValidation**: `await nextTick()` (and retry) so `stepObserverRef` is set after step transitions (e.g. wizard Back).

## [1.1.0] - 2025-03-13

### Added

- **Wizard composables** for multi-step forms:
  - `useStepValidation(stepObserverRef)` — validate current step with ValidationObserver/ValidationProvider before advancing.
  - `useStepValidationWithValidator({ validator, currentStep, scopeByStep })` — wizard with directive and `data-vv-scope` per step (no Observer/Provider).
- **Documentation**: `docs/examples.md` index, `docs/examples/` with wizard examples (directive + scope, Observer/Provider, multiple inputs per step).

### Changed

- Removed all "formule" references; project uses only "formward" (options `$_formward`, `$__formwardInject`).
- TypeScript: fixed typecheck in `src/` (Validator `$formule`, `one_of` rule, schema install/Zod/Yup types); tests excluded from `tsconfig` include.

### Fixed

- Schema `installSchema` and Yup adapter types for TypeScript.

[1.1.1]: https://github.com/gitgusilva/formward/releases/tag/v1.1.1
[1.1.0]: https://github.com/gitgusilva/formward/releases/tag/v1.1.0

## [1.0.0] - (existing release)

### Added

- Initial release of **Formward**: Vue 3 form validation, fork of vee-validate 2.x.
- **Directive** `v-validate`: rule strings on inputs, automatic errors and classes.
- **Validator & ErrorBag**: `$validator`, `errors`, `validateAll()`, `Validator.extend()`, scopes.
- **ValidationProvider / ValidationObserver**: scoped validation and form-level state with slots.
- **Built-in rules**: required, email, min, max, between, regex, confirmed, and more (classic rule set).
- **Locales**: English and others; vue-i18n support.
- **Schema support** (optional): use Zod or Yup object schemas as Formward rules.
  - **SchemaProvider**: wrap a form, pass a schema, use `v-validate="'schema:fieldName'"` on inputs.
  - **installSchema()**: programmatic registration and cleanup; `toZodRule`, `toYupRule`, `toYupRuleAsync` from `formward/schema`.
- **withValidation** HOC for wrapping custom inputs with validation.
- **TypeScript** types in `types/`.
- **Documentation**: installation, quick start, API overview, schema support, compatibility, migration.

### Notes

- Peer dependencies: `vue` ^3.0.0; `zod` and `yup` optional for schema support.
- Compatible with vee-validate 2.x API for migration from Vue 2.

[1.0.0]: https://github.com/gitgusilva/formward/releases/tag/v1.0.0
