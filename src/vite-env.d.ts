/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_JSON_SERVER_URL?: string
  /** Optional override for NPPES proxy base (default: `{VITE_JSON_SERVER_URL}/api/npi`). */
  readonly VITE_NPI_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
