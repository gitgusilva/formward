# API overview

| Import | Description |
|--------|-------------|
| `Formward` (default) | Plugin: `app.use(Formward, options)` |
| `Validator` | Rule registration, `validate()`, `verify()`, `extend()` |
| `ValidationProvider` / `ValidationObserver` | Scoped validation components |
| `formward/schema` | `toZodRule`, `toYupRule`, `toYupRuleAsync`, `installSchema`, `SchemaProvider` |

Configuration: `locale`, `delay`, `events`, `errorBagName`, `fieldsBagName`, `inject`, `mode`, and more.
