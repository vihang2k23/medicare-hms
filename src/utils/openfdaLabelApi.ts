/**
 * OpenFDA drug label search — calls the public labeling API directly.
 * @see https://api.fda.gov/drug/label.json
 * @see https://open.fda.gov/apis/drug/label/
 */

import type { OpenFdaLabelHit } from '../domains/prescriptions/types'

const DEFAULT_LABEL_JSON = 'https://api.fda.gov/drug/label.json'

function labelEndpoint(): string {
  const u = import.meta.env.VITE_OPENFDA_DRUG_LABEL_URL?.trim()
  return u && u.length > 0 ? u : DEFAULT_LABEL_JSON
}

function labelUrl(search: string, limit: number): string {
  // encodeURIComponent on the full expression; literal + between clauses matches openFDA label examples.
  const q = `search=${encodeURIComponent(search)}&limit=${encodeURIComponent(String(limit))}`
  return `${labelEndpoint()}?${q}`
}

/** Strip characters that break OpenFDA query syntax. */
function sanitizeTerm(raw: string): string {
  return raw
    .trim()
    .slice(0, 48)
    .replace(/[^\w\s.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Map one OpenFDA label.json result to our catalog hit shape.
 */
function mapResult(row: Record<string, unknown>): OpenFdaLabelHit | null {
  const openfda = row.openfda as Record<string, string[]> | undefined
  if (!openfda) return null
  const brandNames = (openfda.brand_name ?? []).map((s) => String(s).trim()).filter(Boolean)
  const genericNames = (openfda.generic_name ?? []).map((s) => String(s).trim()).filter(Boolean)
  if (brandNames.length === 0 && genericNames.length === 0) return null

  const routes = (openfda.route ?? []).map((s) => String(s).trim()).filter(Boolean)
  const id =
    openfda.spl_id?.[0] ??
    openfda.product_ndc?.[0] ??
    `fda-label-${(brandNames[0] ?? genericNames[0] ?? 'x').replace(/\s+/g, '-').slice(0, 24)}-${String(row.effective_time ?? Date.now()).slice(0, 8)}`

  return {
    id,
    brandNames: brandNames.slice(0, 8),
    genericNames: genericNames.slice(0, 8),
    routes: routes.slice(0, 6),
    labeler: openfda.manufacturer_name?.[0],
    productType: openfda.product_type?.[0],
    drugClass: openfda.pharm_class_epc?.[0],
    indications: undefined,
    commonStrengths: openfda.active_ingred_unit?.slice(0, 4),
  }
}

/**
 * Live search against OpenFDA drug labels (brand / generic prefix match).
 * Returns [] on network/API errors (caller may fall back to static catalog).
 */
export async function searchOpenFdaDrugLabels(query: string, limit = 10): Promise<OpenFdaLabelHit[]> {
  const term = sanitizeTerm(query)
  if (term.length < 2) return []

  const token = term.split(/\s+/).find((t) => t.length >= 2) ?? term
  const safe = token.replace(/"/g, '')
  // Same pattern as openFDA examples, e.g. openfda.brand_name:Para*+openfda.generic_name:Para*
  const search = `openfda.brand_name:${safe}*+openfda.generic_name:${safe}*`

  try {
    const url = labelUrl(search, Math.min(Math.max(limit, 1), 25))
    const res = await fetch(url)
    if (!res.ok) return []
    const json = (await res.json()) as {
      results?: Record<string, unknown>[]
      error?: { message?: string }
    }
    if (json.error?.message) return []

    const out: OpenFdaLabelHit[] = []
    for (const row of json.results ?? []) {
      const hit = mapResult(row)
      if (hit) out.push(hit)
      if (out.length >= limit) break
    }
    return out
  } catch {
    return []
  }
}
