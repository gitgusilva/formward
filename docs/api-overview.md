# API overview

| Import | Description |
|--------|-------------|
| `Formward` (default) | Plugin: `app.use(Formward, options)` |
| `Validator` | Rule registration, `validate()`, `verify()`, `extend()` |
| `ValidationProvider` / `ValidationObserver` | Scoped validation components |
| `formward/schema` | `toZodRule`, `toYupRule`, `toYupRuleAsync`, `installSchema`, `SchemaProvider` |

Configuration (same as vee-validate 2): `locale`, `delay`, `events`, `errorBagName`, `fieldsBagName`, `inject`, `mode`, etc.
