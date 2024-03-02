import react from '@vitejs/plugin-react-swc'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

const root = resolve(__dirname, '..', '..')

export default defineConfig({
  cacheDir: './node_modules/.vite/sse-simple',
  root: resolve(__dirname, 'client'),
  plugins: [react(), tsconfigPaths({ root })]
})
