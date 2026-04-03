/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_JSON_SERVER_URL?: string
  /** Optional override for NPPES API base (e.g. `/npiregistry/api` behind nginx). */
  readonly VITE_NPI_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
