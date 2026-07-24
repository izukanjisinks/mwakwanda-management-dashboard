import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/management-dashboard/',
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase'))                return 'firebase'
            if (id.includes('@ceereals/vue-pdf'))       return 'pdf'
            if (id.includes('@internationalized/date'))  return 'datefns'
            if (id.includes('reka-ui'))                 return 'reka-ui'
          }
        },
      },
    },
  },
})
