/** JSON Server base URL (run `npm run server` — default port 3001). */
export function getJsonServerBaseUrl(): string {
  return import.meta.env.VITE_JSON_SERVER_URL ?? 'http://localhost:3001'
}
