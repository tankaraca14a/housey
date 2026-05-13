import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/unit/**/*.test.{ts,mjs,js}'],
    globals: false,
  },
});
