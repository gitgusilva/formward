# Quick start (classic API)

Install the Formward plugin and use the `v-validate` directive and `$validator` on your components.

```js
import { createApp } from 'vue'
import Formward from 'formward'
import App from './App.vue'

const app = createApp(App)
app.use(Formward, { locale: 'en', inject: true })
app.mount('#app')
```

```vue
<template>
  <form @submit.prevent="submit">
    <input v-model="email" v-validate="'required|email'" name="email" />
    <span v-if="errors.has('email')">{{ errors.first('email') }}</span>
    <button type="submit">Submit</button>
  </form>
</template>

<script setup>
// With inject: true (default), the mixin provides $validator and errors.
// In Composition API: inject('formward-validator') and validator.errors.
</script>
```

With the mixin (when `inject: true`), components get `this.$validator` and `this.errors` (or `inject('formward-validator')` and `validator.errors` in Composition API), and can call `this.$validator.validateAll()` etc.
