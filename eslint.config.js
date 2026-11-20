import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'test-results', 'playwright-report'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    // CLAUDE.md §7: the engine stays pure and deterministic.
    files: ['src/engine/**/*.ts'],
    rules: {
      'no-restricted-globals': ['error', 'Date', 'window', 'document', 'localStorage', 'indexedDB'],
      'no-restricted-properties': ['error', { object: 'Math', property: 'random', message: 'Use the seeded RNG in GameState.' }],
      'no-restricted-imports': ['error', { patterns: ['react', 'react-*', 'maplibre-gl', 'zustand', '**/ui/**', '**/store/**'] }],
    },
  },
);
