import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.d.ts',
        '**/test-client.js',
        '**/index.ts', // Re-export files
        // Runtime-heavy packages - tested via integration tests
        '**/cli/src/**',
        '**/transport/src/http.ts',
        '**/transport/src/stdio.ts',
        '**/engine/src/hot-reload.ts',
        '**/nodes/src/anthropic/client.ts',
        '**/nodes/src/adapters/anthropic.ts',
        // Pure type definitions (no runtime code)
        '**/core/src/types.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@acphast/core': resolve(__dirname, './packages/core/src'),
      '@acphast/engine': resolve(__dirname, './packages/engine/src'),
      '@acphast/nodes': resolve(__dirname, './packages/nodes/src'),
      '@acphast/transport': resolve(__dirname, './packages/transport/src'),
      '@acphast/session': resolve(__dirname, './packages/session/src'),
      '@acphast/config': resolve(__dirname, './packages/config/src'),
    },
  },
});
