import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  // On CI, failures also appear as annotations on the run, readable without the full log.
  reporter: (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.CI ? [['github'], ['list']] : 'list',
  use: { baseURL: 'http://localhost:4173' },
  webServer: { command: 'npm run build && npm run preview -- --port 4173 --strictPort', port: 4173, reuseExistingServer: true },
});
