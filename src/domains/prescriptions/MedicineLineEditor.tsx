import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { AlertTriangle, Loader2, Pill, Search, Trash2 } from 'lucide-react'
import type { OpenFdaLabelHit, PrescriptionMedicineLine } from './types'
import {
// MedicineLineEditor defines the Medicine Line Editor UI surface and its primary interaction flow.
  fetchRecallAlertsForLabelHit,
  fetchRecallAlertsForTerms,
  searchDrugLabels,
} from '../../utils/drugCatalog'
import { notify } from '../../utils/notify'
import { FieldError, FIELD_LABEL_CLASS, FormInput } from '../../components/ui/form'

interface MedicineLineEditorProps {
  line: PrescriptionMedicineLine
  onChange: (next: PrescriptionMedicineLine) => void
  onRemove: () => void
  canRemove: boolean
}

// MedicineLineEditor renders the medicine line editor UI.
export default function MedicineLineEditor({ line, onChange, onRemove, canRemove }: MedicineLineEditorProps) {
  const listId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState(line.drugName)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hits, setHits] = useState<OpenFdaLabelHit[]>([])
  const [recallLoading, setRecallLoading] = useState(false)
  const [recallErr, setRecallErr] = useState<string | null>(null)

  useEffect(() => {
    setQuery(line.drugName)
  }, [line.drugName])

  useEffect(() => {
    if (line.drugName.trim()) setRecallErr(null)
  }, [line.drugName])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setHits([])
      return
    }
    setLoading(true)
    try {
      const results = await searchDrugLabels(q)
      setHits(results)
    } catch {
      notify.error('Drug search failed — try another term.')
      setHits([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => {
      void runSearch(query)
    }, 320)
    return () => window.clearTimeout(t)
  }, [query, runSearch])

  const applyHit = async (hit: OpenFdaLabelHit) => {
    const display = hit.brandNames[0] ?? hit.genericNames[0] ?? 'Selected drug'
    const base: PrescriptionMedicineLine = {
      ...line,
      drugName: display,
      openfdaBrand: hit.brandNames,
      openfdaGeneric: hit.genericNames,
      recallAlerts: undefined,
    }
    onChange(base)
    setQuery(display)
    setOpen(false)

    setRecallLoading(true)
    try {
      const alerts = await fetchRecallAlertsForLabelHit(hit)
      onChange({ ...base, recallAlerts: alerts })
    } catch {
      notify.error('Could not load recall information for this drug.')
    } finally {
      setRecallLoading(false)
    }
  }

  const checkRecallsManual = async () => {
    const terms: string[] = []
    if (line.openfdaBrand?.length) terms.push(...line.openfdaBrand)
    if (line.openfdaGeneric?.length) terms.push(...line.openfdaGeneric)
    if (line.drugName.trim()) terms.push(line.drugName.trim())
    const uniq = [...new Set(terms.map((t) => t.trim()).filter(Boolean))]
    if (uniq.length === 0) {
      setRecallErr('Enter or select a drug first.')
      return
    }
    setRecallErr(null)
    setRecallLoading(true)
    try {
      const alerts = await fetchRecallAlertsForTerms(uniq.slice(0, 6))
      onChange({ ...line, recallAlerts: alerts })
      if (alerts.length === 0) notify.success('No recall records matched this drug.')
      else notify.success(`${alerts.length} recall record(s) — review below.`)
    } catch {
      notify.error('Recall lookup failed.')
    } finally {
      setRecallLoading(false)
    }
  }

  const hasRecallRisk = (line.recallAlerts?.length ?? 0) > 0

  return (
    <div
      ref={wrapRef}
      className={`rounded-2xl border p-4 space-y-3 ring-1 transition-colors ${
        hasRecallRisk
          ? 'border-amber-300/90 dark:border-amber-700/80 bg-amber-50/40 dark:bg-amber-950/25 ring-amber-200/60 dark:ring-amber-800/40'
          : 'border-slate-200/80 dark:border-slate-700/80 bg-white/70 dark:bg-slate-900/40 ring-slate-200/40 dark:ring-slate-700/40'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-slate-700 dark:text-white font-semibold text-sm">
          <Pill className="h-4 w-4 text-violet-500 shrink-0" aria-hidden />
          Medicine
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="p-2 rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-200 transition-colors"
            aria-label="Remove medicine line"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="relative">
        <label className={FIELD_LABEL_CLASS}>Drug (catalog)</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 dark:text-slate-400" aria-hidden />
          <FormInput
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              onChange({ ...line, drugName: e.target.value })
              setRecallErr(null)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search catalog (e.g. metformin, paracetamol)…"
            className="!pl-10 !pr-10"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-sky-500" />
          )}
        </div>
        {open && hits.length > 0 && (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-30 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 shadow-xl shadow-slate-900/10 text-sm"
          >
            {hits.map((hit) => {
              const label = hit.brandNames[0] ?? hit.genericNames[0] ?? 'Drug'
              const subParts = [
                hit.drugClass,
                hit.commonStrengths?.slice(0, 2).join(', '),
                hit.routes[0],
              ].filter(Boolean)
              const sub = subParts.join(' · ')
              const hint = hit.indications ? `${hit.indications.slice(0, 72)}${hit.indications.length > 72 ? '…' : ''}` : ''
              return (
                <li key={hit.id} role="option">
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 last:border-0"
                    onClick={() => void applyHit(hit)}
                  >
                    <span className="font-medium text-slate-900 dark:text-white">{label}</span>
                    {sub && <span className="block text-xs text-slate-600 dark:text-slate-400 mt-0.5">{sub}</span>}
                    {hint && <span className="block text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-snug">{hint}</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={FIELD_LABEL_CLASS}>Dosage</label>
          <FormInput
            value={line.dosage}
            onChange={(e) => onChange({ ...line, dosage: e.target.value })}
            placeholder="e.g. 500 mg"
            className="!py-2"
          />
        </div>
        <div>
          <label className={FIELD_LABEL_CLASS}>Frequency</label>
          <FormInput
            value={line.frequency}
            onChange={(e) => onChange({ ...line, frequency: e.target.value })}
            placeholder="e.g. Twice daily"
            className="!py-2"
          />
        </div>
        <div>
          <label className={FIELD_LABEL_CLASS}>Duration</label>
          <FormInput
            value={line.duration ?? ''}
            onChange={(e) => onChange({ ...line, duration: e.target.value })}
            placeholder="e.g. 7 days"
            className="!py-2"
          />
        </div>
      </div>
      <div>
        <label className={FIELD_LABEL_CLASS}>Instructions</label>
        <FormInput
          value={line.instructions ?? ''}
          onChange={(e) => onChange({ ...line, instructions: e.target.value })}
          placeholder="e.g. Take with food"
          className="!py-2"
        />
        <FieldError>{recallErr}</FieldError>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void checkRecallsManual()}
          disabled={recallLoading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-white bg-amber-50/80 dark:bg-amber-950/30 hover:bg-amber-100/80 dark:hover:bg-amber-950/50 disabled:opacity-50"
        >
          {recallLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AlertTriangle className="h-3.5 w-3.5" />}
          Check recalls
        </button>
        <span className="text-[11px] text-slate-600 dark:text-slate-400">Sample scenarios for common drugs.</span>
      </div>

      {line.recallAlerts && line.recallAlerts.length > 0 && (
        <div className="rounded-xl border border-amber-200/90 dark:border-amber-800/60 bg-amber-50/90 dark:bg-amber-950/35 p-3 space-y-2">
          <p className="text-xs font-bold text-amber-900 dark:text-white flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            Sample recalls — verify against live sources
          </p>
          <ul className="space-y-2 text-xs text-amber-950 dark:text-white">
            {line.recallAlerts.map((a) => (
              <li key={a.recallId} className="border-t border-amber-200/60 dark:border-amber-800/40 pt-2 first:border-0 first:pt-0">
                <span className="font-semibold">{a.status}</span>
                <span className="text-amber-800/90 dark:text-white"> · {a.classification}</span>
                <span className="text-slate-600 dark:text-white"> · Report {a.reportDate}</span>
                <p className="mt-1 text-slate-700 dark:text-white">{a.reason}</p>
                <p className="mt-0.5 text-slate-600 dark:text-white line-clamp-2">{a.productDescription}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
