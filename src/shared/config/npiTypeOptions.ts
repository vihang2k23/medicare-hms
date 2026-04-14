/** NPPES `enumeration_type` — omit for “Any” (both Type 1 and Type 2). */
export const NPI_TYPE_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'NPI-1', label: 'Individual (NPI-1)' },
  { value: 'NPI-2', label: 'Organization (NPI-2)' },
] as const
