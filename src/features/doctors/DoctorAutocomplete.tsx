import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent,
} from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Briefcase, Eye, MapPin, Search, User, X } from 'lucide-react'
import type { AppDispatch, RootState } from '../../store'
import { createInternalDoctor, findInternalDoctorByNpi } from '../../services/internalDoctorsApi'
import { npiCardToInternalRecord } from '../../utils/api'
import { notify } from '../../utils/helpers'
import { internalRecordToScheduleDoctor, type InternalDoctorRecord } from '../../types'
import { addImportedScheduleDoctor } from '../appointments/appointmentsSlice'
import { clearDoctorSearch, searchDoctors, type SearchDoctorsArgs } from './doctorSlice'
import { FieldError, FormInput } from '../../components/ui/form'
import DoctorDetailsModal from './DoctorDetailsModal'
import { providerCardToAutocompleteDoctor, type AutocompleteDoctor } from '../../domains/doctors/npiAutocompleteMap'

// DoctorAutocomplete defines the doctor autocomplete UI surface and its primary interaction flow.

export interface DoctorFormPopulateFields {
  firstName: string
  lastName: string
  city?: string
  state?: string
  country?: string
  contact?: string
  specialty?: string
  postalCode?: string
  address?: string
  address2?: string
  gender?: string
}

export interface DoctorAutocompleteProps {
  onFieldPopulate?: (fields: DoctorFormPopulateFields) => void
  onFormPopulate?: (fields: DoctorFormPopulateFields) => void
  onClearForm?: () => void
  clearTrigger?: number
}

function useDebouncedCallback(fn: (q: string) => void, delayMs: number) {
  const timeoutRef = useRef<number | null>(null)
  return useCallback(
    (q: string) => {
      if (timeoutRef.current != null) window.clearTimeout(timeoutRef.current)
      timeoutRef.current = window.setTimeout(() => fn(q), delayMs)
    },
    [fn, delayMs],
  )
}

function toPopulateFields(d: AutocompleteDoctor): DoctorFormPopulateFields {
  return {
    firstName: d.firstName,
    lastName: d.lastName,
    city: d.city,
    state: d.state,
    country: d.country,
    contact: d.contact,
    specialty: d.specialty,
    postalCode: d.postalCode,
    address: d.address,
    address2: d.address2,
    gender: d.gender,
  }
}

// DoctorAutocomplete renders the doctor autocomplete UI.
export default function DoctorAutocomplete({
  onFieldPopulate,
  onFormPopulate,
  onClearForm,
  clearTrigger,
}: DoctorAutocompleteProps) {
  const dispatch = useDispatch<AppDispatch>()
  const { providers, status } = useSelector((s: RootState) => s.doctor)
  const loading = status === 'loading'

  const [query, setQuery] = useState('')
  const [searchErr, setSearchErr] = useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [adding, setAdding] = useState(false)
  const [isUserTyping, setIsUserTyping] = useState(true)
  const [selectedDoctor, setSelectedDoctor] = useState<AutocompleteDoctor | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (clearTrigger !== undefined) {
      setQuery('')
      setSearchErr(null)
      setShowSuggestions(false)
      setIsUserTyping(true)
      dispatch(clearDoctorSearch())
    }
  }, [clearTrigger, dispatch])

  useEffect(() => {
    const onDown = (e: Event) => {
      const t = e.target
      if (!(t instanceof Node)) return
      if (searchRef.current && !searchRef.current.contains(t)) setShowSuggestions(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const runSearch = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.trim().length < 2 || !isUserTyping) {
        setSearchErr(null)
        setShowSuggestions(false)
        return
      }

      const nameParts = searchQuery.trim().split(/\s+/)
      const searchParams: SearchDoctorsArgs = { limit: 10, skip: 0 }

      if (nameParts.length === 1) {
        searchParams.firstName = nameParts[0]
      } else {
        searchParams.firstName = nameParts[0]
        searchParams.lastName = nameParts.slice(1).join(' ')
      }

      try {
        await dispatch(searchDoctors(searchParams)).unwrap()
        setSearchErr(null)
        setShowSuggestions(true)
      } catch (err) {
        setSearchErr(err instanceof Error ? err.message : 'NPI search failed.')
        setShowSuggestions(false)
      }
    },
    [dispatch, isUserTyping],
  )

  const debouncedSearch = useDebouncedCallback(runSearch, 500)

  useEffect(() => {
    debouncedSearch(query)
  }, [query, debouncedSearch])

  const suggestions: AutocompleteDoctor[] = useMemo(
    () => providers.map((c) => providerCardToAutocompleteDoctor(c)),
    [providers],
  )

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setIsUserTyping(true)
    setSearchErr(null)
    setQuery(e.target.value)
  }, [])

  const handleInputFocus = useCallback(() => {
    if (query.trim().length >= 2 && suggestions.length > 0) setShowSuggestions(true)
  }, [query, suggestions.length])

  const handleDoctorClick = useCallback(
    (doctor: AutocompleteDoctor) => {
      setIsUserTyping(false)
      const fields = toPopulateFields(doctor)
      if (onFormPopulate) onFormPopulate(fields)
      else onFieldPopulate?.(fields)
      setShowSuggestions(false)
      setQuery(doctor.fullName)
    },
    [onFormPopulate, onFieldPopulate],
  )

  const handleClear = useCallback(() => {
    setIsUserTyping(true)
    setSearchErr(null)
    setQuery('')
    setShowSuggestions(false)
    dispatch(clearDoctorSearch())
    onClearForm?.()
  }, [dispatch, onClearForm])

  const handleViewDetails = useCallback((doctor: AutocompleteDoctor, e: MouseEvent) => {
    e.stopPropagation()
    setSelectedDoctor(doctor)
    setDetailsOpen(true)
  }, [])

  const handleCloseModal = useCallback(() => {
    setDetailsOpen(false)
    setSelectedDoctor(null)
  }, [])

  const handleAddToSystem = useCallback(
    async (doctor: AutocompleteDoctor) => {
      setAdding(true)
      try {
        const existing = await findInternalDoctorByNpi(doctor.npi)
        if (existing) {
          notify.error('This provider is already in the HMS directory.')
          return
        }
        const record = npiCardToInternalRecord(doctor.sourceCard)
        await createInternalDoctor(record)
        dispatch(addImportedScheduleDoctor(internalRecordToScheduleDoctor(record)))
        notify.success(`${record.name} added to MediCare HMS`)
        setShowSuggestions(false)
        setQuery('')
        setIsUserTyping(true)
        setDetailsOpen(false)
        setSelectedDoctor(null)
        dispatch(clearDoctorSearch())
      } catch (e) {
        notify.error(e instanceof Error ? e.message : 'Could not add provider')
      } finally {
        setAdding(false)
      }
    },
    [dispatch],
  )

  return (
    <div className="relative" ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 dark:text-slate-400" aria-hidden />
        <FormInput
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder="Search by name (at least 2 characters)…"
          className="!pl-10 !pr-12 !py-3"
          clearable={false}
          autoComplete="off"
          invalid={!!searchErr}
          aria-invalid={searchErr ? true : undefined}
          aria-describedby={searchErr ? 'doctor-autocomplete-search-err' : undefined}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {query ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              title="Clear"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
          {loading ? (
            <div
              className="w-4 h-4 border-2 border-sky-600 border-t-transparent rounded-full animate-spin"
              aria-hidden
            />
          ) : null}
        </div>
      </div>

      <FieldError id="doctor-autocomplete-search-err" className="!mt-1">
        {searchErr}
      </FieldError>

      {showSuggestions && suggestions.length > 0 ? (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl shadow-xl max-h-96 overflow-y-auto">
          <div className="sticky top-0 bg-gradient-to-r from-sky-500/10 to-transparent dark:from-sky-500/15 p-4 border-b border-slate-200 dark:border-slate-600">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">NPI Registry</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  {suggestions.length} match{suggestions.length !== 1 ? 'es' : ''}
                </p>
              </div>
              <span className="text-xs font-medium text-sky-700 dark:text-white bg-sky-100 dark:bg-sky-950/80 px-2 py-1 rounded-full truncate max-w-[40%]">
                {query}
              </span>
            </div>
          </div>

          <ul className="divide-y divide-slate-100 dark:divide-slate-700 list-none m-0 p-0">
            {suggestions.map((doctor) => (
              <li key={doctor.npi}>
                <div
                  role="button"
                  tabIndex={0}
                  className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer transition-colors flex items-start justify-between gap-4"
                  onClick={() => handleDoctorClick(doctor)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleDoctorClick(doctor)
                    }
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-sky-100 dark:bg-sky-950/80 rounded-full flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-sky-600 dark:text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-white truncate">{doctor.fullName}</p>
                        <p className="text-xs font-mono text-sky-600 dark:text-white">NPI {doctor.npi}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 ml-0 sm:ml-12">
                      {doctor.specialty ? (
                        <span className="inline-flex items-center gap-1 bg-sky-600 text-white px-2.5 py-1 rounded-full text-xs font-medium">
                          <Briefcase className="w-3 h-3 shrink-0" />
                          {doctor.specialty}
                        </span>
                      ) : null}
                      {doctor.city ? (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                          <MapPin className="w-3 h-3 shrink-0" />
                          {[doctor.city, doctor.state].filter(Boolean).join(', ')}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleViewDetails(doctor, e)}
                    className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-sky-600 text-sky-600 dark:text-white hover:bg-sky-50 dark:hover:bg-sky-950/50"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Details
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <DoctorDetailsModal
        selectedDoctor={selectedDoctor}
        open={detailsOpen}
        onClose={handleCloseModal}
        onAddToSystem={handleAddToSystem}
        adding={adding}
      />
    </div>
  )
}
