import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative base so the build works on GitHub Pages under any repo name.
  base: './',
  plugins: [react()],
  // Generating the world takes a moment (M11); tests that rebuild it many times need longer.
  test: { include: ['src/**/*.test.ts'], testTimeout: 30000 },
});
