import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  /** Pre-bundle these so dev server doesn’t serve stale optimize-deps chunks after new installs. */
  optimizeDeps: {
    include: ['lucide-react', 'react-hot-toast'],
  },
  server: {
    proxy: {
      // Browser CORS workaround for local dev — production calls CMS URL directly.
      '/npiregistry': {
        target: 'https://npiregistry.cms.hhs.gov',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/npiregistry/, ''),
      },
    },
  },
})
