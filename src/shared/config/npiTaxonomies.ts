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
