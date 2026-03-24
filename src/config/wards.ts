/**
 * Canonical inpatient wards — use these ids and display names everywhere
 * (bed state, nurse/admin UI, dashboard mocks, alerts).
 */
export const WARDS = [
  { id: 'W1', name: 'General Ward' },
  { id: 'W2', name: 'ICU' },
  { id: 'W3', name: 'Pediatrics' },
] as const

export type WardDefinition = (typeof WARDS)[number]
export type WardId = WardDefinition['id']

export function getWardById(id: string): WardDefinition | undefined {
  return WARDS.find((w) => w.id === id)
}

/** Display name for UI; falls back to id if unknown (e.g. after custom data import). */
export function wardDisplayName(id: string): string {
  return getWardById(id)?.name ?? id
}

/** Room-style label, e.g. W1-02 */
export function wardRoomLabel(wardId: string, bedNumber: string): string {
  return `${wardId}-${bedNumber.padStart(2, '0')}`
}
