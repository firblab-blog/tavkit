import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          
          // State management and utilities
          'zustand-vendor': ['zustand'],
          
          // UI libraries
          'ui-vendor': ['lucide-react', 'dompurify'],
          
          // Markdown rendering (large dependency)
          'markdown-vendor': ['react-markdown', 'remark-gfm'],
          
          // API and networking
          'api-vendor': ['axios'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  server: {
    port: 3000,
    proxy: {
      // Route model-management requests to the AI service
      '/api/v1/models': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/v1\/models/, '/api/v1/models'),
      },
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
