import { US_STATE_OPTIONS } from './usStates'

// =============================================================================
// NPI Type Options
// =============================================================================

/** NPPES `enumeration_type` — omit for "Any" (both Type 1 and Type 2). */
export const NPI_TYPE_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'NPI-1', label: 'Individual (NPI-1)' },
  { value: 'NPI-2', label: 'Organization (NPI-2)' },
] as const

// =============================================================================
// NPI Address Purpose Options
// =============================================================================

/** NPPES `address_purpose` filter (omit for "Any"). */
export const NPI_ADDRESS_PURPOSE_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'LOCATION', label: 'Practice location' },
  { value: 'MAILING', label: 'Mailing' },
  { value: 'PRIMARY', label: 'Primary location' },
  { value: 'SECONDARY', label: 'Secondary location' },
] as const

// =============================================================================
// NPI Country Options
// =============================================================================

/**
 * ISO 3166-1 alpha-2 codes for NPPES `country_code`.
 * CMS: US cannot be the only search criterion; other countries may be used alone.
 * Lazy loaded to avoid bundling country-state-city in main bundle.
 */
export async function getNpiCountryOptions(): Promise<{ code: string; label: string }[]> {
  const { Country } = await import('country-state-city')
  const rows = Country.getAllCountries()
    .map((c: any) => ({ code: c.isoCode, label: c.name }))
    .sort((a: any, b: any) => a.label.localeCompare(b.label))
  return [{ code: '', label: 'Any' }, ...rows]
}

// =============================================================================
// NPI Region Options
// =============================================================================

export type NpiRegionOption = { code: string; name: string }

/**
 * Subdivisions for NPPES `state` (US: 2-letter abbreviation; others: ISO subdivision or name from dataset).
 * Returns null when no country is selected — use a free-text state field instead.
 * Lazy loaded to avoid bundling country-state-city in main bundle.
 */
export async function getNpiRegionOptionsForCountry(countryIso: string): Promise<NpiRegionOption[] | null> {
  if (!countryIso) return null

  if (countryIso === 'US') {
    return US_STATE_OPTIONS.map((s) => ({ code: s.code, name: s.name }))
  }

  const { State } = await import('country-state-city')
  const states = State.getStatesOfCountry(countryIso)
  const anyOpt: NpiRegionOption = { code: '', name: 'Any region' }
  if (states.length === 0) {
    return [anyOpt]
  }

  return [
    anyOpt,
    ...states.map((s: any) => ({
      code: (s.isoCode || s.name).trim(),
      name: s.name,
    })),
  ]
}

// =============================================================================
// NPI Taxonomy Filters
// =============================================================================

/**
 * Common taxonomy_description values for NPPES API 2.1 search (datalist suggestions).
 * CMS matches on description text; users can also type any taxonomy description.
 */
export const NPI_TAXONOMY_FILTERS = [
  { label: 'Family Medicine', value: 'Family Medicine' },
  { label: 'Internal Medicine', value: 'Internal Medicine' },
  { label: 'Cardiology', value: 'Cardiology' },
  { label: 'Pediatrics', value: 'Pediatrics' },
  { label: 'Orthopedic Surgery', value: 'Orthopedic Surgery' },
  { label: 'Emergency Medicine', value: 'Emergency Medicine' },
  { label: 'Psychiatry', value: 'Psychiatry' },
  { label: 'Obstetrics & Gynecology', value: 'Obstetrics' },
  { label: 'Dermatology', value: 'Dermatology' },
  { label: 'Neurology', value: 'Neurology' },
  { label: 'General Practice', value: 'General Practice' },
  { label: 'Nurse Practitioner', value: 'Nurse Practitioner' },
  { label: 'Physician Assistant', value: 'Physician Assistant' },
] as const
