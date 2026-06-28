import path from 'node:path'
import { fileURLToPath } from 'node:url'

import devServer, { defaultOptions } from '@hono/vite-dev-server'
import nodeAdapter from '@hono/vite-dev-server/node'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    devServer({
      entry: 'src/server/index.ts',
      adapter: nodeAdapter,
      exclude: [/^(?!\/api(?:\/|$)).*/, ...defaultOptions.exclude],
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
})
