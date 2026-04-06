import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, Loader2, Search, X } from 'lucide-react'

export type SearchAccent = 'sky' | 'orange' | 'violet' | 'emerald'

const accentInput: Record<SearchAccent, string> = {
  sky: 'focus:ring-sky-500/35 focus:border-sky-400/50',
  orange: 'focus:ring-orange-500/35 focus:border-orange-400/50',
  violet: 'focus:ring-violet-500/35 focus:border-violet-400/50',
  emerald: 'focus:ring-emerald-500/35 focus:border-emerald-400/50',
}

export interface SearchableIdPickerProps<T> {
  id?: string
  label?: string
  items: readonly T[]
  selectedId: string
  onSelectId: (id: string) => void
  getId: (item: T) => string
  getLabel: (item: T) => string
  filterItem: (item: T, query: string) => boolean
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  accent?: SearchAccent
  allowClear?: boolean
  emptyLabel?: string
  maxVisible?: number
  className?: string
}

/** Pick one item by id: search narrows a dropdown list (replaces long &lt;select&gt;s). */
export function SearchableIdPicker<T>({
  id,
  label,
  items,
  selectedId,
  onSelectId,
  getId,
  getLabel,
  filterItem,
  placeholder = 'Type to search…',
  disabled,
  loading,
  accent = 'sky',
  allowClear = true,
  emptyLabel = 'Select…',
  maxVisible = 14,
  className = '',
}: SearchableIdPickerProps<T>) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')

  const selected = useMemo(() => items.find((x) => getId(x) === selectedId), [items, selectedId, getId])

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return items.slice(0, maxVisible)
    return items.filter((it) => filterItem(it, q)).slice(0, maxVisible)
  }, [items, q, filterItem, maxVisible])

  const inputDisplay = open ? q : selected ? getLabel(selected) : ''

  const pick = (item: T) => {
    onSelectId(getId(item))
    setQ('')
    setOpen(false)
  }

  const ring = accentInput[accent]

  return (
    <div ref={wrapRef} className={`relative z-[80] ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none z-10" aria-hidden />
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled || loading}
          value={inputDisplay}
          placeholder={open ? placeholder : selected ? undefined : emptyLabel}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            setOpen(true)
            setQ('')
          }}
          className={`relative z-10 w-full pl-10 pr-20 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-600/90 bg-white dark:bg-slate-950/60 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 ${ring} disabled:opacity-60`}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex items-center gap-0.5">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" aria-hidden />}
          {allowClear && selectedId && !loading && (
            <button
              type="button"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Clear selection"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onSelectId('')
                setQ('')
                setOpen(false)
              }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label={open ? 'Close list' : 'Open list'}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setOpen((o) => !o)
              if (!open) setQ('')
            }}
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
        {open && !disabled && !loading && (
          <ul
            className="absolute left-0 right-0 top-full z-[90] mt-1 max-h-60 overflow-auto rounded-xl border border-slate-200/90 dark:border-slate-700/90 bg-white dark:bg-slate-900 py-1 shadow-xl shadow-slate-300/40 dark:shadow-slate-950/60 ring-1 ring-slate-200/60 dark:ring-slate-600/50"
            role="listbox"
          >
          {filtered.length === 0 ? (
            <li className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400">No matches.</li>
          ) : (
            filtered.map((item) => {
              const iid = getId(item)
              const active = iid === selectedId
              return (
                <li key={iid}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                      active
                        ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-100'
                        : 'text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                    }`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(item)}
                  >
                    {getLabel(item)}
                  </button>
                </li>
              )
            })
          )}
          </ul>
        )}
      </div>
    </div>
  )
}

export interface SearchFilterComboboxProps<T> {
  id?: string
  label?: string
  value: string
  onChange: (next: string) => void
  suggestions: readonly T[]
  filterItem: (item: T, query: string) => boolean
  getKey: (item: T) => string
  renderSuggestion: (item: T) => ReactNode
  onPick: (item: T) => void
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  accent?: SearchAccent
  emptyText?: string
  noResultsText?: string
  maxVisible?: number
  className?: string
  hint?: string
}

/** Free-text search with optional picks from a dropdown (filters tables/lists). */
export function SearchFilterCombobox<T>({
  id,
  label,
  value,
  onChange,
  suggestions,
  filterItem,
  getKey,
  renderSuggestion,
  onPick,
  placeholder = 'Search…',
  disabled,
  loading,
  accent = 'sky',
  emptyText = 'Type to filter, or pick a suggestion below.',
  noResultsText = 'No matching suggestions.',
  maxVisible = 10,
  className = '',
  hint,
}: SearchFilterComboboxProps<T>) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const ring = accentInput[accent]

  const filtered = useMemo(() => {
    const t = value.trim()
    if (!t) return suggestions.slice(0, maxVisible)
    return suggestions.filter((s) => filterItem(s, value)).slice(0, maxVisible)
  }, [suggestions, value, filterItem, maxVisible])

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  return (
    <div ref={wrapRef} className={`relative z-[80] ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none z-10" aria-hidden />
        <input
          id={id}
          type="search"
          role="combobox"
          aria-expanded={open}
          autoComplete="off"
          disabled={disabled || loading}
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={`relative z-10 w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-600/90 bg-white dark:bg-slate-950/60 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 ${ring} disabled:opacity-60`}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 z-20 h-4 w-4 animate-spin text-slate-400" aria-hidden />
        )}
        {open && !disabled && !loading && (
          <ul
            className="absolute left-0 right-0 top-full z-[90] mt-1 max-h-56 overflow-auto rounded-xl border border-slate-200/90 dark:border-slate-700/90 bg-white dark:bg-slate-900 py-1 shadow-xl shadow-slate-300/40 dark:shadow-slate-950/60 ring-1 ring-slate-200/60 dark:ring-slate-600/50"
            role="listbox"
          >
            {!value.trim() && (
              <li className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                {emptyText}
              </li>
            )}
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400">{noResultsText}</li>
            ) : (
              filtered.map((item) => (
                <li key={getKey(item)}>
                  <button
                    type="button"
                    role="option"
                    className="w-full text-left px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onPick(item)
                      setOpen(false)
                    }}
                  >
                    {renderSuggestion(item)}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
      {hint && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">{hint}</p>}
    </div>
  )
}
