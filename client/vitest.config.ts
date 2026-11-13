import path from 'node:path'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  define: {
    __APP_VERSION__: JSON.stringify('test-build'),
    __BUILD_TIME__: JSON.stringify('2026-01-01T00:00:00.000Z'),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    testTimeout: 10_000,
  },
})
