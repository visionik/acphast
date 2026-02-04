import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 30000, // Integration tests may take longer
    hookTimeout: 10000,
    server: {
      deps: {
        inline: ['rxjs'],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'packages/cli/src/**',
        'packages/transport/src/http.ts',
        'packages/transport/src/stdio.ts',
        'packages/nodes/src/anthropic/client.ts',
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
