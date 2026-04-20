/** NPPES `address_purpose` filter (omit for “Any”). */
export const NPI_ADDRESS_PURPOSE_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'LOCATION', label: 'Practice location' },
  { value: 'MAILING', label: 'Mailing' },
  { value: 'PRIMARY', label: 'Primary location' },
  { value: 'SECONDARY', label: 'Secondary location' },
] as const
