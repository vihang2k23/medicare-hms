import dns from 'node:dns'
import { defineConfig, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'

/** Prefer IPv4 when proxying to CMS — broken IPv6 routes often surface as proxy 502. */
dns.setDefaultResultOrder('ipv4first')

const npiRegistryProxy: ProxyOptions = {
  target: 'https://npiregistry.cms.hhs.gov',
  changeOrigin: true,
  secure: true,
  timeout: 60_000,
  proxyTimeout: 60_000,
  rewrite: (path) => path.replace(/^\/npiregistry/, ''),
  configure: (proxy) => {
    proxy.on('proxyReq', (proxyReq) => {
      proxyReq.setHeader('User-Agent', 'MediCare-HMS/1.0 (NPPES dev proxy)')
      proxyReq.setHeader('Accept', 'application/json, */*')
      proxyReq.removeHeader('cookie')
    })
  },
}

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
      '/npiregistry': npiRegistryProxy,
      '/openfda': {
        target: 'https://api.fda.gov',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/openfda/, ''),
      },
    },
  },
})
