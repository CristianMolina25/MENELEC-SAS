import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      '/web-apps': {
        target: 'http://localhost:9000',
        changeOrigin: true,
        secure: false
      },
      '/sdkjs': {
        target: 'http://localhost:9000',
        changeOrigin: true,
        secure: false
      },
      '/fonts': {
        target: 'http://localhost:9000',
        changeOrigin: true,
        secure: false
      },
      '/spellchecker': {
        target: 'http://localhost:9000',
        changeOrigin: true,
        secure: false
      },
      '/mslogin': {
        target: 'http://localhost:9000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})