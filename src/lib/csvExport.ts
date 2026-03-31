/** RFC-style CSV for Excel / Sheets (UTF-8 BOM for Windows). */

export function escapeCsvCell(v: string): string {
  const s = v ?? ''
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function rowsToCsv(rows: string[][]): string {
  return rows.map((r) => r.map(escapeCsvCell).join(',')).join('\r\n')
}

export function downloadCsv(filename: string, rows: string[][]) {
  const bom = '\uFEFF'
  const blob = new Blob([bom + rowsToCsv(rows)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
