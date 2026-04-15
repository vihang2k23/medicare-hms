/** Default string filter for `{ id, label }` option rows used with SearchableIdPicker. */
export function filterLabeledOption<T extends { id: string; label: string }>(
  item: T,
  query: string,
): boolean {
  const t = query.trim().toLowerCase()
  if (!t) return true
  return item.label.toLowerCase().includes(t) || item.id.toLowerCase().includes(t)
}
