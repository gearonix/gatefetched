import react from '@vitejs/plugin-react-swc'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import webfontDownload from 'vite-plugin-webfont-dl'
import tsconfigPaths from 'vite-tsconfig-paths'

const root = resolve(__dirname, '..', '..')

export default defineConfig({
  cacheDir: './node_modules/.vite/socket.io-react',
  plugins: [
    react(),
    tsconfigPaths({ root }),
    webfontDownload([
      'https://fonts.googleapis.com/css2?family=Montserrat&family=Questrial&display=swap'
    ])
  ],
  server: { port: 3000 }
})
