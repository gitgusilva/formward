# Formward

**Vue 3 form validation** — template-based rules, directive, and schema support (Zod, Yup).  
Drop-in compatible API with **vee-validate 2.x** so existing projects keep working without code changes.

[![npm version](https://img.shields.io/npm/v/formward.svg)](https://www.npmjs.com/package/formward)
[![npm downloads](https://img.shields.io/npm/dm/formward.svg)](https://www.npmjs.com/package/formward)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

- **npm:** [formward](https://www.npmjs.com/package/formward)
- **GitHub:** [gitgusilva/formward](https://github.com/gitgusilva/formward)

## Install

```bash
npm install formward
```

Optional for schema support: `npm install zod` and/or `yup`.

## Quick start

```js
import { createApp } from 'vue'
import Formward from 'formward'
import App from './App.vue'

const app = createApp(App)
app.use(Formward, { locale: 'en', inject: true })
app.mount('#app')
```

```vue
<input v-model="email" v-validate="'required|email'" name="email" />
<span v-if="errors.has('email')">{{ errors.first('email') }}</span>
```

## Documentation

Documentation is split into separate files in [`docs/`](docs/):

| Link | Content |
|------|---------|
| [About](docs/about.md) | About the project and the fork |
| [Features](docs/features.md) | Features |
| [Installation](docs/installation.md) | Installation |
| [Quick start](docs/quick-start.md) | Quick start (classic API) |
| [Schema support](docs/schema-support.md) | Schema support (Zod / Yup, SchemaProvider, installSchema) |
| [API overview](docs/api-overview.md) | API overview |
| [Compatibility](docs/compatibility.md) | Compatibility with vee-validate 2 |
| [Migration](docs/migration.md) | Migration from vee-validate |
| [License](docs/license.md) | License |

## License

MIT. See [docs/license.md](docs/license.md).
