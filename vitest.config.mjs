/**
 * Vitest config — aligned with project skills (.agents/skills/vitest, vue-testing-best-practices).
 * Use jsdom for DOM/component tests; timeouts tuned for async validation.
 */
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { vitePluginFlow } from 'vite-plugin-flow';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [vitePluginFlow({ pretty: true }), vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
    extensions: ['.mjs', '.js', '.ts', '.json', '.vue'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    testTimeout: 10_000,
    hookTimeout: 10_000,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.ts'],
    exclude: [
      '**/helpers/**',
      '**/*.d.ts',
      '**/setup.ts',
      '**/integration/**',
      'tests/unit/component.ts',
      'tests/unit/directive.ts',
      'tests/unit/mixin.ts',
      'tests/unit/validator.ts',
      'tests/unit/validatorDecorator.ts',
      'tests/unit/resolver.ts',
      'tests/unit/localization/i18n.ts',
      'tests/unit/i18nDrivers.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.*.ts', '**/locale/**', '**/node_modules/**'],
    },
  },
});
