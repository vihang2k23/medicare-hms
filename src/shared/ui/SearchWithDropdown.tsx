import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Loader2, Search, X, type LucideIcon } from 'lucide-react'
import { cn } from '../lib/cn'
import { FIELD_CONTROL_CORE, FIELD_LABEL_CLASS, SEARCH_FIELD_FOCUS, type SearchFieldAccent } from './form/fieldStyles'
import { LUCIDE_STROKE_FIELD } from './lucideChrome'

/**
 * Positions a dropdown below an anchor using fixed coordinates (viewport pixels from
 * getBoundingClientRect). The list is portaled to document.body so "fixed" is not warped by
 * transformed ancestors (see .page-enter fadeInUp) or overflow clipping on main content.
 */
function useFixedMenuBelowAnchor(
  active: boolean,
  anchorRef: React.RefObject<HTMLElement | null>,
): CSSProperties | undefined {
  const [style, setStyle] = useState<CSSProperties | undefined>(undefined)

  useLayoutEffect(() => {
    if (!active) return
    const update = () => {
      const el = anchorRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const gap = 6
      const maxH = Math.max(120, window.innerHeight - r.bottom - gap - 12)
      setStyle({
        position: 'fixed',
        top: r.bottom + gap,
        left: r.left,
        width: r.width,
        maxHeight: Math.min(240, maxH),
        zIndex: 9999,
      })
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [active, anchorRef])

  return active ? style : undefined
}

// SearchWithDropdown defines the Search With Dropdown UI surface and its primary interaction flow.
export type SearchAccent = SearchFieldAccent

export interface SearchableIdPickerProps<T> {
  id?: string
  label?: ReactNode
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
  /** Optional native name for forms and tests (e.g. react-hook-form). */
  name?: string
  /** Appends a required-field asterisk to the label. */
  labelRequired?: boolean
  /** Icon inside the input on the left (defaults to Search). */
  inputLeadingIcon?: LucideIcon
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
  name,
  labelRequired,
  inputLeadingIcon,
}: SearchableIdPickerProps<T>) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const anchorRef = useRef<HTMLDivElement>(null)
  const menuPanelRef = useRef<HTMLUListElement>(null)
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const menuStyle = useFixedMenuBelowAnchor(open && !disabled && !loading, anchorRef)

  const selected = useMemo(() => items.find((x) => getId(x) === selectedId), [items, selectedId, getId])

  useEffect(() => {
    function onDown(e: MouseEvent) {
      const t = e.target as Node
      if (wrapRef.current?.contains(t) || menuPanelRef.current?.contains(t)) return
      setOpen(false)
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

  const ring = SEARCH_FIELD_FOCUS[accent]
  const LeadingIcon = inputLeadingIcon ?? Search

  return (
    <div ref={wrapRef} className={`relative z-[80] ${className}`}>
      {label && (
        <label htmlFor={id} className={FIELD_LABEL_CLASS}>
          {label}
          {labelRequired ? (
            <>
              <span className="text-red-600 dark:text-red-400 ml-0.5 font-semibold" aria-hidden>
                *
              </span>
              <span className="sr-only"> (required)</span>
            </>
          ) : null}
        </label>
      )}
      <div ref={anchorRef} className="relative">
        <LeadingIcon
          className={`absolute left-3 top-1/2 z-20 -translate-y-1/2 h-[18px] w-[18px] pointer-events-none ${LUCIDE_STROKE_FIELD}`}
          strokeWidth={2.5}
          aria-hidden
        />
        <input
          id={id}
          name={name}
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
          className={cn(
            FIELD_CONTROL_CORE,
            'relative z-10 py-2.5 pl-10 pr-20',
            ring,
            'disabled:opacity-60',
          )}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex items-center gap-0.5">
          {loading && (
            <Loader2 className={`h-4 w-4 animate-spin ${LUCIDE_STROKE_FIELD}`} strokeWidth={2.5} aria-hidden />
          )}
          {allowClear && selectedId && !loading && (
            <button
              type="button"
              className="p-1.5 rounded-lg text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              aria-label="Clear selection"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onSelectId('')
                setQ('')
                setOpen(false)
              }}
            >
              <X className={`h-4 w-4 ${LUCIDE_STROKE_FIELD}`} strokeWidth={2.5} />
            </button>
          )}
          <button
            type="button"
            className="p-1.5 rounded-lg text-slate-900 hover:bg-slate-100/90 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label={open ? 'Close list' : 'Open list'}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setOpen((o) => !o)
              if (!open) setQ('')
            }}
          >
            <ChevronDown
              className={`h-5 w-5 ${LUCIDE_STROKE_FIELD} transition-transform ${open ? 'rotate-180' : ''}`}
              strokeWidth={2.75}
            />
          </button>
        </div>
        {open &&
          !disabled &&
          !loading &&
          menuStyle &&
          createPortal(
            <ul
              ref={menuPanelRef}
              data-autocomplete-menu=""
              style={menuStyle}
              className="overflow-auto rounded-xl border border-slate-200/90 dark:border-slate-700/90 bg-white dark:bg-slate-900 py-1 shadow-xl shadow-slate-300/40 dark:shadow-slate-950/60 ring-1 ring-slate-200/60 dark:ring-slate-600/50"
              role="listbox"
            >
              {filtered.length === 0 ? (
                <li className="px-3 py-3 text-sm text-slate-600 dark:text-slate-400">No matches.</li>
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
                            ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-white'
                            : 'text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/80'
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
            </ul>,
            document.body,
          )}
      </div>
    </div>
  )
}

export interface SearchFilterComboboxProps<T> {
  id?: string
  label?: ReactNode
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
  /** Icon inside the input on the left (defaults to Search). */
  inputLeadingIcon?: LucideIcon
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
  inputLeadingIcon,
}: SearchFilterComboboxProps<T>) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const anchorRef = useRef<HTMLDivElement>(null)
  const menuPanelRef = useRef<HTMLUListElement>(null)
  const [open, setOpen] = useState(false)
  const ring = SEARCH_FIELD_FOCUS[accent]
  const menuStyle = useFixedMenuBelowAnchor(open && !disabled && !loading, anchorRef)

  const filtered = useMemo(() => {
    const t = value.trim()
    if (!t) return suggestions.slice(0, maxVisible)
    return suggestions.filter((s) => filterItem(s, value)).slice(0, maxVisible)
  }, [suggestions, value, filterItem, maxVisible])

  const LeadingIcon = inputLeadingIcon ?? Search

  useEffect(() => {
    function onDown(e: MouseEvent) {
      const t = e.target as Node
      if (wrapRef.current?.contains(t) || menuPanelRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  return (
    <div ref={wrapRef} className={`relative z-[80] ${className}`}>
      {label && (
        <label htmlFor={id} className={FIELD_LABEL_CLASS}>
          {label}
        </label>
      )}
      <div ref={anchorRef} className="relative">
        <LeadingIcon
          className={`absolute left-3 top-1/2 z-20 -translate-y-1/2 h-[18px] w-[18px] pointer-events-none ${LUCIDE_STROKE_FIELD}`}
          strokeWidth={2.5}
          aria-hidden
        />
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
          className={cn(FIELD_CONTROL_CORE, 'relative z-10 py-2.5 pl-10 pr-10', ring, 'disabled:opacity-60')}
        />
        {loading && (
          <Loader2
            className={`absolute right-3 top-1/2 -translate-y-1/2 z-20 h-4 w-4 animate-spin ${LUCIDE_STROKE_FIELD}`}
            strokeWidth={2.5}
            aria-hidden
          />
        )}
        {open &&
          !disabled &&
          !loading &&
          menuStyle &&
          createPortal(
            <ul
              ref={menuPanelRef}
              data-autocomplete-menu=""
              style={menuStyle}
              className="overflow-auto rounded-xl border border-slate-200/90 dark:border-slate-700/90 bg-white dark:bg-slate-900 py-1 shadow-xl shadow-slate-300/40 dark:shadow-slate-950/60 ring-1 ring-slate-200/60 dark:ring-slate-600/50"
              role="listbox"
            >
              {!value.trim() && (
                <li className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  {emptyText}
                </li>
              )}
              {filtered.length === 0 ? (
                <li className="px-3 py-3 text-sm text-slate-600 dark:text-slate-400">{noResultsText}</li>
              ) : (
                filtered.map((item) => (
                  <li key={getKey(item)}>
                    <button
                      type="button"
                      role="option"
                      className="w-full text-left px-3 py-2.5 text-sm text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
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
            </ul>,
            document.body,
          )}
      </div>
      {hint && <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-snug">{hint}</p>}
    </div>
  )
}
