# Publicar no Git e no npm

## Repositório Git

- **URL:** `git@github.com:gitgusilva/formward.git`
- **GitHub:** https://github.com/gitgusilva/formward

### Publicar no GitHub

```bash
# Se ainda não inicializou o repositório
git init
git add .
git commit -m "chore: initial formward release"

# Adicionar remote e enviar
git remote add origin git@github.com:gitgusilva/formward.git
git branch -M main
git push -u origin main
```

Para atualizações futuras: `git add .`, `git commit -m "..."`, `git push`.

---

## Pacote npm

- **Nome:** [formward](https://www.npmjs.com/package/formward)
- **npm:** https://www.npmjs.com/package/formward

### Publicar no npm (primeira vez)

1. Criar conta em https://www.npmjs.com (se ainda não tiver).
2. No terminal:

```bash
npm login
# Informar usuário, senha e e-mail do npm

npm run build
npm publish
```

O `package.json` já está com `"publishConfig": { "access": "public" }` para pacote público.

### Atualizar versão e publicar de novo

```bash
# Ajustar versão em package.json (ex.: 2.3.1) ou usar:
npm version patch   # 2.3.0 -> 2.3.1
npm run build
npm publish
```
