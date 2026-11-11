import fs from 'node:fs'
import path from 'node:path'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

const projectRoot = path.resolve(__dirname, '..')

function readApiPort(): string {
  if (process.env.PORT) return process.env.PORT
  try {
    const envFile = fs.readFileSync(path.join(projectRoot, '.env'), 'utf8')
    const match = /^\s*PORT\s*=\s*["']?(\d+)["']?\s*$/m.exec(envFile)
    return match?.[1] ?? '3000'
  } catch {
    return '3000'
  }
}

const apiTarget = `http://127.0.0.1:${readApiPort()}`

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
        target: apiTarget,
        changeOrigin: false,
      },
      '/uploads': {
        target: apiTarget,
        changeOrigin: false,
      },
      '/sitemap.xml': {
        target: apiTarget,
        changeOrigin: false,
      },
      '/robots.txt': {
        target: apiTarget,
        changeOrigin: false,
      },
      '^/[A-Za-z0-9-]+\\.txt$': {
        target: apiTarget,
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
