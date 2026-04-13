import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/auth': 'http://localhost:3000',
      '/cart': 'http://localhost:3000',
      '/checkout': 'http://localhost:3000',
      '/contact': 'http://localhost:3000',
      '/search': 'http://localhost:3000',
      '/api/blog': 'http://localhost:3000',
      '/images': 'http://localhost:3000',
      '/css': 'http://localhost:3000',
      '/scripts': 'http://localhost:3000',
    }
  }
})
