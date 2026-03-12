# Quick start (classic API)

Same as vee-validate 2: install the plugin and use the directive and `$validator`.

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
// With inject: true (default), components receive $validator and errors via the mixin.
</script>
```

Using the mixin (with `inject: true`), child components get `this.$validator` and `this.errors` and can call `this.$validator.validateAll()` etc.
