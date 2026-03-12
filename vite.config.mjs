import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { vitePluginFlow } from 'vite-plugin-flow';

const __dirname = dirname(fileURLToPath(import.meta.url));
const target = process.env.VITE_BUILD_TARGET || 'esm';

const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));
const version = process.env.VERSION || pkg.version;

const isUmd = target === 'umd' || target === 'umd-minimal';
const isUmdMinimal = target === 'umd-minimal';
const isEsm = target.startsWith('esm');
const esmEntry = target === 'esm-minimal' ? 'minimal' : target === 'esm-rules' ? 'rules' : target === 'esm-schema' ? 'schema' : 'main';

export default defineConfig({
  plugins: [
    vitePluginFlow({ pretty: true }),
  ],
  define: {
    __VERSION__: JSON.stringify(version),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: target === 'umd' || target === 'esm',
    lib: isUmd
      ? {
          entry: isUmdMinimal
            ? resolve(__dirname, 'src/index.minimal.ts')
            : resolve(__dirname, 'src/index.ts'),
          name: 'Formward',
          formats: ['umd'],
        }
      : isEsm
        ? {
            entry: esmEntry === 'minimal'
              ? resolve(__dirname, 'src/index.minimal.esm.ts')
              : esmEntry === 'rules'
                ? resolve(__dirname, 'src/rules/index.ts')
                : esmEntry === 'schema'
                  ? resolve(__dirname, 'src/schema/index.ts')
                  : resolve(__dirname, 'src/index.esm.ts'),
            formats: ['es'],
          }
        : undefined,
    minify: 'esbuild',
    rollupOptions: {
      external: isEsm && esmEntry === 'schema' ? ['vue', 'mitt', 'zod'] : ['vue', 'mitt'],
      output: isUmd
        ? {
            globals: { vue: 'Vue', mitt: 'mitt' },
            entryFileNames: isUmdMinimal ? 'formward.minimal.js' : 'formward.js',
          }
        : isEsm
        ? {
            globals: { vue: 'Vue', mitt: 'mitt', zod: 'zod' },
              entryFileNames: esmEntry === 'main' ? 'formward.esm.js' : esmEntry === 'minimal' ? 'formward.minimal.esm.js' : esmEntry === 'schema' ? 'schema.esm.js' : 'rules.esm.js',
              inlineDynamicImports: true,
            }
          : undefined,
    },
    commonjsOptions: {
      include: [/node_modules\/validator/, /node_modules\/mitt/],
    },
  },
});
