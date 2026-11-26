import { defineConfig } from 'vitest/config';

// The M9 playtest bot runs on its own (npm run playtest), not with the unit tests.
export default defineConfig({ test: { include: ['tests/playtest/**/*.sim.ts'], testTimeout: 600000 } });
