/**
 * JSON Server **origin** (no path). REST lives under `/api/...` on that host.
 * - Local dev: `http://localhost:3001`
 * - Same-origin production build: leave `VITE_JSON_SERVER_URL` unset → `''` → browser uses relative `/api/...`
 */
export function getJsonServerBaseUrl(): string {
  const v = (import.meta.env.VITE_JSON_SERVER_URL as string | undefined)?.trim()
  if (v) return v.replace(/\/$/, '')
  if (import.meta.env.DEV) return 'http://localhost:3001'
  return ''
}
