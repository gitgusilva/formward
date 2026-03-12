# Schema support (Zod / Yup)

## Option 1: SchemaProvider (recommended)

Register an object schema for a section of the form and use the directive with rule names `schema:fieldName`.

```vue
<template>
  <SchemaProvider :schema="formSchema">
    <form @submit.prevent="submit">
      <input v-model="form.email" v-validate="'schema:email'" name="email" />
      <span v-if="errors.has('email')">{{ errors.first('email') }}</span>

      <input v-model="form.name" v-validate="'schema:name'" name="name" />
      <span v-if="errors.has('name')">{{ errors.first('name') }}</span>

      <button type="submit">Submit</button>
    </form>
  </SchemaProvider>
</template>

<script setup>
import Formward from 'formward'
import { SchemaProvider } from 'formward/schema'
import { z } from 'zod'

const formSchema = z.object({
  email: z.string().min(1, 'Required').email('Invalid email'),
  name: z.string().min(2, 'At least 2 characters')
})

// Register SchemaProvider as a component (e.g. globally)
// app.component('SchemaProvider', SchemaProvider)
</script>
```

Install Formward and (for Zod) the `zod` package. Use `SchemaProvider` from `formward/schema` and pass a Zod (or Yup) object schema. Inside the provider, use `v-validate="'schema:email'"` (or `'schema:name'`) so the field is validated by the corresponding part of the schema. Errors and `$validator` work as in the classic API.

## Option 2: installSchema (programmatic)

Register and unregister a schema yourself (e.g. in a composable or parent component).

```js
import Formward from 'formward'
import { installSchema } from 'formward/schema'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(2)
})

// After app.use(Formward): get validator from this.$validator or inject('formward-validator')
const validator = this.$validator  // or inject('formward-validator')
const cleanup = installSchema(validator, schema, { prefix: 'schema' })

// In template: v-validate="'schema:email'" and "schema:name"

// On unmount (e.g. in onUnmounted):
cleanup()
```

## Option 3: Single-field rules (toZodRule / toYupRule)

Turn a single Zod or Yup schema into a rule and use it like any other rule.

```js
import Formward from 'formward'
import { toZodRule } from 'formward/schema'
import { z } from 'zod'

const emailSchema = z.string().email()
Formward.Validator.extend('zodEmail', toZodRule(emailSchema))
```

In template: `v-validate="'zodEmail'"`.
