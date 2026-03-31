import { State } from 'country-state-city'
import { US_STATE_OPTIONS } from './usStates'

export type NpiRegionOption = { code: string; name: string }

/**
 * Subdivisions for NPPES `state` (US: 2-letter abbreviation; others: ISO subdivision or name from dataset).
 * Returns null when no country is selected — use a free-text state field instead.
 */
export function getNpiRegionOptionsForCountry(countryIso: string): NpiRegionOption[] | null {
  if (!countryIso) return null

  if (countryIso === 'US') {
    return US_STATE_OPTIONS.map((s) => ({ code: s.code, name: s.name }))
  }

  const states = State.getStatesOfCountry(countryIso)
  const anyOpt: NpiRegionOption = { code: '', name: 'Any region' }
  if (states.length === 0) {
    return [anyOpt]
  }

  return [
    anyOpt,
    ...states.map((s) => ({
      code: (s.isoCode || s.name).trim(),
      name: s.name,
    })),
  ]
}
