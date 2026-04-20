import { Country } from 'country-state-city'

/**
 * ISO 3166-1 alpha-2 codes for NPPES `country_code`.
 * CMS: US cannot be the only search criterion; other countries may be used alone.
 */
export const NPI_COUNTRY_OPTIONS: { code: string; label: string }[] = (() => {
  const rows = Country.getAllCountries()
    .map((c) => ({ code: c.isoCode, label: c.name }))
    .sort((a, b) => a.label.localeCompare(b.label))
  return [{ code: '', label: 'Any' }, ...rows]
})()
