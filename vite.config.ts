import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  esbuild: {
    target: 'es2020',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Group vendor libraries
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor'
            }
            if (id.includes('redux') || id.includes('@reduxjs')) {
              return 'redux-vendor'
            }
            if (id.includes('lucide-react') || id.includes('react-hot-toast')) {
              return 'ui-vendor'
            }
            if (id.includes('react-hook-form') || id.includes('@hookform/resolvers') || id.includes('zod')) {
              return 'form-vendor'
            }
            if (id.includes('recharts')) {
              return 'chart-vendor'
            }
            if (id.includes('date-fns')) {
              return 'date-vendor'
            }
            if (id.includes('country-state-city')) {
              return 'geo-vendor'
            }
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  /** Pre-bundle these so dev server doesn't serve stale optimize-deps chunks after new installs. */
  optimizeDeps: {
    include: ['lucide-react', 'react-hot-toast'],
  },
})
