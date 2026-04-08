import type { OpenFdaLabelHit, PrescriptionRecallSnapshot } from '../features/prescriptions/types'
import { STATIC_DRUG_CATALOG, STATIC_DRUG_RECALLS, type StaticDrugEntry } from '../data/drugCatalogData'

function entryToHit(d: StaticDrugEntry): OpenFdaLabelHit {
  return {
    id: d.id,
    brandNames: d.brandNames,
    genericNames: d.genericNames,
    routes: d.routes,
    labeler: d.labeler,
    productType: d.productType,
    drugClass: d.drugClass,
    indications: d.indications,
    commonStrengths: d.commonStrengths,
  }
}

function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .replace(/[^\w\s.-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2)
}

function buildHay(entry: StaticDrugEntry): string {
  return [
    entry.id,
    ...entry.brandNames,
    ...entry.genericNames,
    entry.drugClass,
    entry.labeler,
    entry.indications,
    ...entry.commonStrengths,
    ...entry.dosageForms,
  ]
    .join(' ')
    .toLowerCase()
}

function entryMatches(entry: StaticDrugEntry, raw: string): boolean {
  const q = raw.trim().toLowerCase()
  if (q.length < 2) return false
  const hay = buildHay(entry)
  if (hay.includes(q)) return true
  const tokens = tokenize(raw)
  if (tokens.length === 0) return false
  if (tokens.length === 1) return hay.includes(tokens[0])
  return tokens.every((t) => hay.includes(t))
}

/** Search bundled drug catalog (substring / multi-token AND). */
export function searchDrugLabels(query: string): Promise<OpenFdaLabelHit[]> {
  const q = query.trim()
  if (q.length < 2) return Promise.resolve([])

  const matches = STATIC_DRUG_CATALOG.filter((e) => entryMatches(e, q))

  const sorted = [...matches].sort((a, b) => {
    const aPrimary = (a.genericNames[0] ?? a.brandNames[0] ?? '').toLowerCase()
    const bPrimary = (b.genericNames[0] ?? b.brandNames[0] ?? '').toLowerCase()
    const q0 = q.toLowerCase()
    const aStarts = aPrimary.startsWith(q0) ? 0 : 1
    const bStarts = bPrimary.startsWith(q0) ? 0 : 1
    if (aStarts !== bStarts) return aStarts - bStarts
    return aPrimary.localeCompare(bPrimary)
  })

  return Promise.resolve(sorted.slice(0, 12).map(entryToHit))
}

function recallsForDrugIds(ids: string[]): PrescriptionRecallSnapshot[] {
  const idSet = new Set(ids)
  const out: PrescriptionRecallSnapshot[] = []
  for (const r of STATIC_DRUG_RECALLS) {
    if (!r.drugIds.some((d) => idSet.has(d))) continue
    out.push({
      recallId: r.recallId,
      status: r.status,
      classification: r.classification,
      reason: r.reason,
      productDescription: r.productDescription,
      reportDate: r.reportDate,
    })
  }

  const ongoingFirst = (a: PrescriptionRecallSnapshot, b: PrescriptionRecallSnapshot) => {
    const rank = (s: string) => {
      const x = s.toLowerCase()
      if (x.includes('ongoing') || x.includes('pending')) return 0
      return 1
    }
    return rank(a.status) - rank(b.status)
  }
  out.sort(ongoingFirst)
  return out.slice(0, 5)
}

/** Recalls tied to known catalog drug ids (e.g. after picking a search row). */
export function fetchRecallAlertsForDrugIds(drugIds: string[]): Promise<PrescriptionRecallSnapshot[]> {
  return Promise.resolve(recallsForDrugIds(drugIds))
}

export function fetchRecallAlertsForTerms(terms: string[]): Promise<PrescriptionRecallSnapshot[]> {
  const cleaned = [...new Set(terms.map((t) => t.trim()).filter((t) => t.length >= 2))].slice(0, 8)
  if (cleaned.length === 0) return Promise.resolve([])

  const ids = new Set<string>()
  for (const entry of STATIC_DRUG_CATALOG) {
    for (const term of cleaned) {
      const t = term.toLowerCase()
      const hit =
        entry.brandNames.some((b) => b.toLowerCase().includes(t)) ||
        entry.genericNames.some((g) => g.toLowerCase().includes(t)) ||
        entry.drugClass.toLowerCase().includes(t)
      if (hit) {
        ids.add(entry.id)
        break
      }
    }
  }
  return Promise.resolve(recallsForDrugIds([...ids]))
}

export function termsFromLabelHit(hit: OpenFdaLabelHit): string[] {
  const out: string[] = []
  for (const b of hit.brandNames) {
    const t = b?.trim()
    if (t) out.push(t)
  }
  for (const g of hit.genericNames) {
    const t = g?.trim()
    if (t) out.push(t)
  }
  return [...new Set(out)]
}
