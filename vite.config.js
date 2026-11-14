import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// GitHub Actions sets VITE_BASE to /<repository-name>/.
// Local development falls back to the domain root.
const base = process.env.VITE_BASE || '/'

export default defineConfig({
  base,
  plugins: [vue()],
  build: {
    outDir: 'dist',
    sourcemap: false
  },
  server: {
    port: 5173
  }
})