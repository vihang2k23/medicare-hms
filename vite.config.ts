import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  /** Pre-bundle these so dev server doesn’t serve stale optimize-deps chunks after new installs. */
  optimizeDeps: {
    include: ['lucide-react', 'react-hot-toast'],
  },
})
