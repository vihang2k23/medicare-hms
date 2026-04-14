/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_JSON_SERVER_URL?: string
  /** Optional override for NPPES proxy base (default: `{VITE_JSON_SERVER_URL}/api/npi`). */
  readonly VITE_NPI_API_URL?: string
  /** Override openFDA drug label endpoint (default https://api.fda.gov/drug/label.json). */
  readonly VITE_OPENFDA_DRUG_LABEL_URL?: string
  /** Override openFDA enforcement endpoint (default https://api.fda.gov/drug/enforcement.json). */
  readonly VITE_OPENFDA_DRUG_ENFORCEMENT_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
