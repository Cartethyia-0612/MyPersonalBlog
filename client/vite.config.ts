import path from 'node:path'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: false,
      },
      '/uploads': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: false,
      },
      '/sitemap.xml': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: false,
      },
      '/robots.txt': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: false,
      },
      '^/[A-Za-z0-9-]+\\.txt$': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
})
