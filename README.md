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

const app = createApp(App)
app.use(Formward, { locale: 'en', inject: true })
app.mount('#app')
```

```vue
<input v-model="email" v-validate="'required|email'" name="email" />
<span v-if="errors.has('email')">{{ errors.first('email') }}</span>
```

## Documentation

Documentação em arquivos separados em [`docs/`](docs/):

| Link | Conteúdo |
|------|----------|
| [About](docs/about.md) | Sobre o projeto e o fork de vee-validate |
| [Features](docs/features.md) | Funcionalidades |
| [Installation](docs/installation.md) | Instalação |
| [Quick start](docs/quick-start.md) | Início rápido (API clássica) |
| [Schema support](docs/schema-support.md) | Schemas com Zod / Yup (SchemaProvider, installSchema) |
| [API overview](docs/api-overview.md) | Visão geral da API |
| [Compatibility](docs/compatibility.md) | Compatibilidade com vee-validate 2 |
| [Migration](docs/migration.md) | Migração a partir de vee-validate |
| [License](docs/license.md) | Licença |

## License

MIT. Ver [docs/license.md](docs/license.md).
