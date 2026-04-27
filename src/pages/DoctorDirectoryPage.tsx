import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDispatch } from 'react-redux'
import {
  Building2,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Phone,
  Stethoscope,
  FileText,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import type { AppDispatch } from '../store'
import { NPI_ADDRESS_PURPOSE_OPTIONS } from '../config/npi'
import { NPI_COUNTRY_OPTIONS } from '../config/npi'
import { getNpiRegionOptionsForCountry } from '../config/npi'
import { NPI_TAXONOMY_FILTERS } from '../config/npi'
import { NPI_TYPE_OPTIONS } from '../config/npi'
import {
  createInternalDoctor,
  deleteInternalDoctor,
  fetchInternalDoctors,
  findInternalDoctorByNpi,
  updateInternalDoctor,
} from '../services/internalDoctorsApi'
import type { NpiProviderCard, NpiRawResult, NpiSearchParams } from '../utils/api'
import {
  hasMinimumNpiSearchCriteria,
  searchNpiRegistry,
} from '../utils/api'
import {
  createManualInternalRecord,
  formatInternalDoctorScheduleSummary,
  internalRecordToScheduleDoctor,
  type InternalDoctorRecord,
} from '../types'
import {
  addImportedScheduleDoctor,
  removeImportedScheduleDoctor,
  setImportedScheduleDoctors,
  updateImportedScheduleDoctor,
} from '../store/slices/appointmentsSlice'
import { notify } from '../utils/helpers'
import { npiCardToInternalRecord, NPI_SEARCH_MINIMUM_CRITERIA_MESSAGE } from '../utils/api'
import { useMergeSearchParams, type QueryParamPatch } from '../hooks/useMergeSearchParams'
import { useModalScrollLock } from '../hooks/useModalScrollLock'
import { FieldError, FormInput } from '../components/common'

// =============================================================================
// INLINE MODAL CLASSES (previously in modalOverlayClasses.ts)
// =============================================================================

/** Fixed root: scrollable so tall modals / small viewports can move; overscroll stays in overlay. */
function modalFixedRoot(zClass: string) {
  return `fixed inset-0 ${zClass} overflow-y-auto overscroll-y-contain`
}

/**
 * At least one dynamic viewport tall so flex centering is true vertical center (not stuck to bottom).
 * Use with createPortal -> body for reliable placement under app layout scroll/transform.
 */
const modalFixedInner =
  'relative box-border flex min-h-[100dvh] w-full max-w-full items-center justify-center px-4 py-8 sm:px-6 sm:py-12'

/** Full-bleed dim layer behind the panel (inside scrollable column). */
const modalBackdropDim = 'absolute inset-0 min-h-full min-w-full bg-slate-950/50 backdrop-blur-sm'
import { SearchableIdPicker } from '../components/common'
import { filterLabeledOption } from '../utils/helpers'
import { ConfirmationDialog as ConfirmDialog } from '../components/common'

const PAGE_SIZE = 12
const MAX_SKIP = 1000

const NPI_TAXONOMY_PRESET_VALUES: ReadonlySet<string> = new Set(
  NPI_TAXONOMY_FILTERS.map((f) => f.value as string),
)
const TAXONOMY_SELECT_CUSTOM = '__custom__'

/** NPI registry search filters — stored in the URL query for shareable links (`?npi=&city=` …). */
const DQ = {
  npi: 'npi',
  etype: 'etype',
  tax: 'tax',
  pfn: 'pfn',
  pln: 'pln',
  org: 'org',
  aofn: 'aofn',
  aoln: 'aoln',
  city: 'city',
  state: 'state',
  country: 'country',
  zip: 'zip',
  addr: 'addr',
} as const

type NpiFilterForm = {
  npiNumber: string
  enumerationType: string
  taxonomyDescription: string
  providerFirstName: string
  providerLastName: string
  organizationName: string
  authorizedOfficialFirstName: string
  authorizedOfficialLastName: string
  city: string
  state: string
  countryCode: string
  postalCode: string
  addressPurpose: string
}

const EMPTY_NPI_FILTERS: NpiFilterForm = {
  npiNumber: '',
  enumerationType: '',
  taxonomyDescription: '',
  providerFirstName: '',
  providerLastName: '',
  organizationName: '',
  authorizedOfficialFirstName: '',
  authorizedOfficialLastName: '',
  city: '',
  state: '',
  countryCode: '',
  postalCode: '',
  addressPurpose: '',
}

function readNpiFiltersFromQuery(sp: URLSearchParams): NpiFilterForm {
  return {
    npiNumber: sp.get(DQ.npi) ?? '',
    enumerationType: sp.get(DQ.etype) ?? '',
    taxonomyDescription: sp.get(DQ.tax) ?? '',
    providerFirstName: sp.get(DQ.pfn) ?? '',
    providerLastName: sp.get(DQ.pln) ?? '',
    organizationName: sp.get(DQ.org) ?? '',
    authorizedOfficialFirstName: sp.get(DQ.aofn) ?? '',
    authorizedOfficialLastName: sp.get(DQ.aoln) ?? '',
    city: sp.get(DQ.city) ?? '',
    state: sp.get(DQ.state) ?? '',
    countryCode: sp.get(DQ.country) ?? '',
    postalCode: sp.get(DQ.zip) ?? '',
    addressPurpose: sp.get(DQ.addr) ?? '',
  }
}

function filtersToNpiApiParams(f: NpiFilterForm, pageIndex: number): NpiSearchParams {
  return {
    npiNumber: f.npiNumber.trim() || undefined,
    enumerationType: (f.enumerationType.trim() || undefined) as NpiSearchParams['enumerationType'],
    taxonomyDescription: f.taxonomyDescription.trim() || undefined,
    providerFirstName: f.providerFirstName.trim() || undefined,
    providerLastName: f.providerLastName.trim() || undefined,
    organizationName: f.organizationName.trim() || undefined,
    authorizedOfficialFirstName: f.authorizedOfficialFirstName.trim() || undefined,
    authorizedOfficialLastName: f.authorizedOfficialLastName.trim() || undefined,
    city: f.city.trim() || undefined,
    state: f.state.trim() || undefined,
    countryCode: f.countryCode.trim() || undefined,
    postalCode: f.postalCode.trim() || undefined,
    addressPurpose: (f.addressPurpose.trim() || undefined) as NpiSearchParams['addressPurpose'],
    limit: PAGE_SIZE,
    skip: pageIndex * PAGE_SIZE,
  }
}

function mergeNpiFiltersToQuery(merge: (u: QueryParamPatch) => void, f: NpiFilterForm, pageIndex: number) {
  merge({
    [DQ.npi]: f.npiNumber.trim() || null,
    [DQ.etype]: f.enumerationType.trim() || null,
    [DQ.tax]: f.taxonomyDescription.trim() || null,
    [DQ.pfn]: f.providerFirstName.trim() || null,
    [DQ.pln]: f.providerLastName.trim() || null,
    [DQ.org]: f.organizationName.trim() || null,
    [DQ.aofn]: f.authorizedOfficialFirstName.trim() || null,
    [DQ.aoln]: f.authorizedOfficialLastName.trim() || null,
    [DQ.city]: f.city.trim() || null,
    [DQ.state]: f.state.trim() || null,
    [DQ.country]: f.countryCode.trim() || null,
    [DQ.zip]: f.postalCode.trim() || null,
    [DQ.addr]: f.addressPurpose.trim() || null,
    page: pageIndex === 0 ? null : String(pageIndex),
  })
}

function clearNpiFilterQueryKeys(merge: (u: QueryParamPatch) => void) {
  merge({
    [DQ.npi]: null,
    [DQ.etype]: null,
    [DQ.tax]: null,
    [DQ.pfn]: null,
    [DQ.pln]: null,
    [DQ.org]: null,
    [DQ.aofn]: null,
    [DQ.aoln]: null,
    [DQ.city]: null,
    [DQ.state]: null,
    [DQ.country]: null,
    [DQ.zip]: null,
    [DQ.addr]: null,
    page: null,
  })
}

function parseDoctorSearchPage(sp: URLSearchParams): number {
  const p = sp.get('page')
  if (p == null || p === '') return 0
  const n = parseInt(p, 10)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

function canShowNpiProfile(r: InternalDoctorRecord): boolean {
  if (r.source === 'manual') return false
  const raw = r.rawResult
  return typeof raw === 'object' && raw !== null && 'number' in raw
}

function NpiProfileModal({ raw, onClose }: { raw: NpiRawResult; onClose: () => void }) {
  useModalScrollLock(true)
  const b = raw.basic ?? {}
  const name =
    raw.enumeration_type === 'NPI-2'
      ? b.organization_name ?? 'Organization'
      : [b.first_name, b.middle_name, b.last_name].filter(Boolean).join(' ')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const modal = (
    <div className={modalFixedRoot('z-[100]')}>
      <div className={modalFixedInner}>
        <button type="button" className={modalBackdropDim} aria-label="Close dialog" onClick={onClose} />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="npi-profile-title"
          className="relative z-10 w-full max-w-2xl max-h-[min(90dvh,44rem)] min-h-0 flex flex-col rounded-2xl border border-slate-200/90 dark:border-slate-600/90 bg-white dark:bg-slate-900 shadow-2xl shadow-slate-900/20 dark:shadow-black/40 ring-1 ring-slate-200/60 dark:ring-slate-600/60 overflow-hidden overscroll-contain"
          onClick={(e) => e.stopPropagation()}
        >
        <div className="flex shrink-0 items-start justify-between gap-3 p-5 border-b border-slate-200/80 dark:border-slate-700/80 bg-gradient-to-r from-sky-500/10 to-transparent">
          <div className="min-w-0">
            <h2 id="npi-profile-title" className="text-lg font-bold text-slate-900 dark:text-white truncate">
              {name}
            </h2>
            <p className="text-xs font-mono text-sky-600 dark:text-white mt-1">NPI {raw.number}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{raw.enumeration_type}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] min-h-0 flex-1 space-y-5 text-sm touch-pan-y">
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
              Credentials &amp; demographics
            </h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 dark:text-white">
              {b.credential && (
                <>
                  <dt className="text-slate-600 dark:text-slate-400">Credential</dt>
                  <dd>{b.credential}</dd>
                </>
              )}
              {b.sex && (
                <>
                  <dt className="text-slate-600 dark:text-slate-400">Sex</dt>
                  <dd>{b.sex}</dd>
                </>
              )}
              {b.enumeration_date && (
                <>
                  <dt className="text-slate-600 dark:text-slate-400">Enumeration date</dt>
                  <dd>{b.enumeration_date}</dd>
                </>
              )}
              {b.last_updated && (
                <>
                  <dt className="text-slate-600 dark:text-slate-400">Last updated</dt>
                  <dd>{b.last_updated}</dd>
                </>
              )}
              {b.sole_proprietor && (
                <>
                  <dt className="text-slate-600 dark:text-slate-400">Sole proprietor</dt>
                  <dd>{b.sole_proprietor}</dd>
                </>
              )}
            </dl>
          </section>

          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
              Taxonomy (specialty)
            </h3>
            <ul className="space-y-2">
              {(raw.taxonomies ?? []).map((t, i) => (
                <li
                  key={`${t.code ?? i}-${i}`}
                  className="rounded-lg border border-slate-200/80 dark:border-slate-700/80 px-3 py-2 text-slate-700 dark:text-white"
                >
                  <span className="font-medium">{t.desc ?? t.code}</span>
                  <span className="text-xs text-slate-600 dark:text-slate-400 ml-2 font-mono">{t.code}</span>
                  {t.primary && (
                    <span className="ml-2 text-[10px] font-bold uppercase text-emerald-600 dark:text-white">
                      Primary
                    </span>
                  )}
                  {t.license && (
                    <p className="text-xs text-slate-500 mt-1">License {t.license} ({t.state})</p>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
              Addresses
            </h3>
            <ul className="space-y-3">
              {(raw.addresses ?? []).map((a, i) => (
                <li
                  key={i}
                  className="rounded-lg bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-slate-700 dark:text-white"
                >
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    {a.address_purpose ?? 'Address'}
                  </p>
                  <p>{[a.address_1, a.address_2].filter(Boolean).join(', ')}</p>
                  <p>
                    {a.city}, {a.state} {a.postal_code}
                  </p>
                  {a.telephone_number && <p className="text-xs mt-1">Tel {a.telephone_number}</p>}
                  {a.fax_number && <p className="text-xs">Fax {a.fax_number}</p>}
                </li>
              ))}
            </ul>
          </section>

          {(raw.endpoints?.length ?? 0) > 0 && (
            <section>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                Affiliated organizations &amp; endpoints
              </h3>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-white">
                {raw.endpoints!.map((e, i) => (
                  <li key={i} className="border border-slate-200/80 dark:border-slate-700 rounded-lg p-2">
                    {e.endpoint && <p className="font-mono break-all">{e.endpoint}</p>}
                    {(e.affiliation || e.affiliationLegalBusinessName) && (
                      <p className="mt-1">{e.affiliation ?? e.affiliationLegalBusinessName}</p>
                    )}
                    {e.useDescription && <p className="text-slate-500">{e.useDescription}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(raw.other_names?.length ?? 0) > 0 && (
            <section>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                Other names
              </h3>
              <ul className="list-disc list-inside text-slate-600 dark:text-white text-xs space-y-1">
                {raw.other_names!.map((o, i) => (
                  <li key={i}>
                    {o.organization_name ?? `${o.first_name ?? ''} ${o.last_name ?? ''}`.trim()} ({o.type})
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}

// =============================================================================
// SCHEDULE MODAL (Add/Edit Manual Doctor)
// =============================================================================

const SLOT_DURATION_OPTIONS = [
  { value: 15 as const, label: '15m' },
  { value: 20 as const, label: '20m' },
  { value: 30 as const, label: '30m' },
]

const WEEKDAY_OPTIONS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' },
]

interface ScheduleModalProps {
  record: InternalDoctorRecord | null
  onClose: () => void
  onSave: () => void
}

function ScheduleModal({ record, onClose, onSave }: ScheduleModalProps) {
  useModalScrollLock(true)
  const dispatch = useDispatch<AppDispatch>()
  const isEdit = record !== null

  const [name, setName] = useState(record?.name ?? '')
  const [department, setDepartment] = useState(record?.department ?? '')
  const [npi, setNpi] = useState(record?.npi ?? '')
  const [phone, setPhone] = useState(record?.phone ?? '')
  const [workingDays, setWorkingDays] = useState<number[]>(record?.workingDays ?? [1, 2, 3, 4, 5])
  const [startTime, setStartTime] = useState(record?.startTime ?? '09:00')
  const [endTime, setEndTime] = useState(record?.endTime ?? '17:00')
  const [slotDuration, setSlotDuration] = useState<15 | 20 | 30>(record?.slotDurationMinutes ?? 15)
  const [lunchStart, setLunchStart] = useState(record?.lunchBreakStart ?? '')
  const [lunchEnd, setLunchEnd] = useState(record?.lunchBreakEnd ?? '')

  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!name.trim()) newErrors.name = 'Name is required'
    if (!department.trim()) newErrors.department = 'Department is required'
    if (workingDays.length === 0) newErrors.workingDays = 'Select at least one working day'
    if (!startTime) newErrors.startTime = 'Start time is required'
    if (!endTime) newErrors.endTime = 'End time is required'
    if (startTime && endTime && startTime >= endTime) {
      newErrors.endTime = 'End time must be after start time'
    }
    if (lunchStart && !lunchEnd) newErrors.lunchEnd = 'Lunch end time is required'
    if (!lunchStart && lunchEnd) newErrors.lunchStart = 'Lunch start time is required'
    if (lunchStart && lunchEnd && lunchStart >= lunchEnd) {
      newErrors.lunchEnd = 'Lunch end must be after lunch start'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      if (isEdit && record) {
        const updated: InternalDoctorRecord = {
          ...record,
          name: name.trim(),
          department: department.trim(),
          npi: npi.replace(/\D/g, '').slice(0, 10),
          phone: phone.trim() || undefined,
          workingDays,
          startTime,
          endTime,
          slotDurationMinutes: slotDuration,
          lunchBreakStart: lunchStart.trim() || undefined,
          lunchBreakEnd: lunchEnd.trim() || undefined,
        }
        await updateInternalDoctor(updated)
        dispatch(updateImportedScheduleDoctor(internalRecordToScheduleDoctor(updated)))
        notify.success('Doctor schedule updated')
      } else {
        const newRecord = createManualInternalRecord({
          name: name.trim(),
          department: department.trim(),
          npi: npi.replace(/\D/g, '').slice(0, 10),
          phone: phone.trim() || undefined,
          workingDays,
          startTime,
          endTime,
          slotDurationMinutes: slotDuration,
          lunchBreakStart: lunchStart.trim() || undefined,
          lunchBreakEnd: lunchEnd.trim() || undefined,
        })
        await createInternalDoctor(newRecord)
        dispatch(addImportedScheduleDoctor(internalRecordToScheduleDoctor(newRecord)))
        notify.success('Doctor added to HMS')
      }
      onSave()
      onClose()
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Failed to save doctor')
    } finally {
      setSaving(false)
    }
  }

  const toggleDay = (day: number) => {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    )
  }

  const modal = (
    <div className={modalFixedRoot('z-[100]')}>
      <div className={modalFixedInner}>
        <button type="button" className={modalBackdropDim} aria-label="Close dialog" onClick={onClose} />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="schedule-modal-title"
          className="relative z-10 w-full max-w-2xl max-h-[90dvh] min-h-0 flex flex-col rounded-2xl border border-slate-200/90 dark:border-slate-600/90 bg-white dark:bg-slate-900 shadow-2xl shadow-slate-900/20 dark:shadow-black/40 ring-1 ring-slate-200/60 dark:ring-slate-600/60 overflow-hidden overscroll-contain"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex shrink-0 items-start justify-between gap-3 p-5 border-b border-slate-200/80 dark:border-slate-700/80 bg-gradient-to-r from-violet-500/10 to-transparent">
            <div className="min-w-0">
              <h2 id="schedule-modal-title" className="text-lg font-bold text-slate-900 dark:text-white truncate">
                {isEdit ? 'Edit Schedule' : 'Add Manual Doctor'}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {isEdit ? 'Update working hours and schedule settings' : 'Add a provider manually to the HMS directory'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-5 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] min-h-0 flex-1 space-y-5 text-sm touch-pan-y">
            {/* Basic Info */}
            <section className="space-y-3">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Basic Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <FormInput
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Dr. Jane Smith"
                    invalid={!!errors.name}
                  />
                  {errors.name && <FieldError className="!mt-1">{errors.name}</FieldError>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <FormInput
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Cardiology"
                    invalid={!!errors.department}
                  />
                  {errors.department && <FieldError className="!mt-1">{errors.department}</FieldError>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    NPI Number (optional)
                  </label>
                  <FormInput
                    value={npi}
                    onChange={(e) => setNpi(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit NPI"
                    inputMode="numeric"
                    className="font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Phone (optional)
                  </label>
                  <FormInput
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    inputMode="tel"
                  />
                </div>
              </div>
            </section>

            {/* Working Days */}
            <section className="space-y-3">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Working Days <span className="text-red-500">*</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {WEEKDAY_OPTIONS.map((day) => {
                  const selected = workingDays.includes(day.value)
                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDay(day.value)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selected
                          ? 'bg-violet-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                      }`}
                    >
                      {day.label}
                    </button>
                  )
                })}
              </div>
              {errors.workingDays && <FieldError>{errors.workingDays}</FieldError>}
            </section>

            {/* Working Hours */}
            <section className="space-y-3">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Working Hours
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Start Time <span className="text-red-500">*</span>
                  </label>
                  <FormInput
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    invalid={!!errors.startTime}
                  />
                  {errors.startTime && <FieldError className="!mt-1">{errors.startTime}</FieldError>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    End Time <span className="text-red-500">*</span>
                  </label>
                  <FormInput
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    invalid={!!errors.endTime}
                  />
                  {errors.endTime && <FieldError className="!mt-1">{errors.endTime}</FieldError>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Slot Duration <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SLOT_DURATION_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setSlotDuration(opt.value)}
                        className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                          slotDuration === opt.value
                            ? 'bg-violet-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Lunch Break */}
            <section className="space-y-3">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Lunch Break (optional)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Start
                  </label>
                  <FormInput
                    type="time"
                    value={lunchStart}
                    onChange={(e) => setLunchStart(e.target.value)}
                    invalid={!!errors.lunchStart}
                  />
                  {errors.lunchStart && <FieldError className="!mt-1">{errors.lunchStart}</FieldError>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    End
                  </label>
                  <FormInput
                    type="time"
                    value={lunchEnd}
                    onChange={(e) => setLunchEnd(e.target.value)}
                    invalid={!!errors.lunchEnd}
                  />
                  {errors.lunchEnd && <FieldError className="!mt-1">{errors.lunchEnd}</FieldError>}
                </div>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/50">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-violet-600 text-white hover:bg-violet-500 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Add Doctor'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}

// DoctorDirectoryPage renders the doctor directory page UI.
export default function DoctorDirectoryPage() {
  const dispatch = useDispatch<AppDispatch>()
  const { searchParams, merge } = useMergeSearchParams()
  const tab: 'search' | 'internal' = searchParams.get('tab') === 'internal' ? 'internal' : 'search'

  /** Same pattern as PatientListPage: filters live in the URL query only (no duplicate React state). */
  const npiFilters: NpiFilterForm =
    tab === 'search' ? readNpiFiltersFromQuery(searchParams) : EMPTY_NPI_FILTERS
  const {
    npiNumber,
    enumerationType,
    taxonomyDescription,
    providerFirstName,
    providerLastName,
    organizationName,
    authorizedOfficialFirstName,
    authorizedOfficialLastName,
    city,
    state,
    countryCode,
    postalCode,
    addressPurpose,
  } = npiFilters

  const [loading, setLoading] = useState(false)
  const [npiSearchErr, setNpiSearchErr] = useState<string | null>(null)
  const [providers, setProviders] = useState<NpiProviderCard[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const page = parseDoctorSearchPage(searchParams)
  const [profileRaw, setProfileRaw] = useState<NpiRawResult | null>(null)
  const [importingNpi, setImportingNpi] = useState<string | null>(null)

  const [internalList, setInternalList] = useState<InternalDoctorRecord[]>([])
  const [internalLoading, setInternalLoading] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<InternalDoctorRecord | null>(null)
  const [removeBusy, setRemoveBusy] = useState(false)
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [scheduleModalRecord, setScheduleModalRecord] = useState<InternalDoctorRecord | null>(null)

  const patchNpiFilters = useCallback(
    (patch: Partial<NpiFilterForm>) => {
      setNpiSearchErr(null)
      const base = tab === 'search' ? readNpiFiltersFromQuery(searchParams) : EMPTY_NPI_FILTERS
      const next: NpiFilterForm = { ...base, ...patch }
      mergeNpiFiltersToQuery(merge, next, 0)
    },
    [merge, searchParams, tab],
  )

  const regionOptions = useMemo(() => getNpiRegionOptionsForCountry(countryCode), [countryCode])
  const stateIsSelect = regionOptions !== null && regionOptions.length > 1

  const loadInternal = useCallback(async () => {
    setInternalLoading(true)
    try {
      const rows = await fetchInternalDoctors()
      setInternalList(rows)
      dispatch(setImportedScheduleDoctors(rows.map(internalRecordToScheduleDoctor)))
    } catch {
      notify.error('Could not load internal doctors — is JSON Server running? (`npm run server`)')
      setInternalList([])
    } finally {
      setInternalLoading(false)
    }
  }, [dispatch])

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (tab === 'internal') void loadInternal()
  }, [tab, loadInternal])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    void (async () => {
      try {
        const rows = await fetchInternalDoctors()
        setInternalList(rows)
      } catch {
        /* JSON Server offline — count stays 0 until Internal tab load */
      }
    })()
  }, [])

  const clearNpiSearchForm = () => {
    setProviders([])
    setTotalCount(0)
    setNpiSearchErr(null)
    clearNpiFilterQueryKeys(merge)
  }

  const runSearch = async (pageIndex: number) => {
    setNpiSearchErr(null)
    const f = readNpiFiltersFromQuery(searchParams)
    const params = filtersToNpiApiParams(f, pageIndex)
    if (!hasMinimumNpiSearchCriteria(params)) {
      setNpiSearchErr(NPI_SEARCH_MINIMUM_CRITERIA_MESSAGE)
      setProviders([])
      setTotalCount(0)
      mergeNpiFiltersToQuery(merge, f, 0)
      return
    }
    setLoading(true)
    try {
      const { resultCount, providers: list } = await searchNpiRegistry(params)
      setNpiSearchErr(null)
      setProviders(list)
      setTotalCount(resultCount)
      mergeNpiFiltersToQuery(merge, f, pageIndex)
    } catch (e) {
      setNpiSearchErr(e instanceof Error ? e.message : 'NPI search failed')
      setProviders([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }

  const importProvider = async (card: NpiProviderCard) => {
    setImportingNpi(card.npi)
    try {
      const existing = await findInternalDoctorByNpi(card.npi)
      if (existing) {
        notify.error(`NPI ${card.npi} is already in the HMS directory.`)
        return
      }
      const record = npiCardToInternalRecord(card)
      await createInternalDoctor(record)
      dispatch(addImportedScheduleDoctor(internalRecordToScheduleDoctor(record)))
      notify.success(`${record.name} added to MediCare HMS`)
      void loadInternal()
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Could not import doctor')
    } finally {
      setImportingNpi(null)
    }
  }

  const runRemoveInternal = async () => {
    if (!removeTarget) return
    setRemoveBusy(true)
    try {
      await deleteInternalDoctor(removeTarget.id)
      dispatch(removeImportedScheduleDoctor(removeTarget.id))
      notify.success('Removed from HMS')
      setRemoveTarget(null)
      void loadInternal()
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Remove failed')
    } finally {
      setRemoveBusy(false)
    }
  }

  const canPrev = page > 0
  const canNext =
    providers.length === PAGE_SIZE &&
    page * PAGE_SIZE < MAX_SKIP &&
    (page + 1) * PAGE_SIZE < totalCount

  const taxonomySelectValue = useMemo(() => {
    if (!taxonomyDescription.trim()) return ''
    if (NPI_TAXONOMY_PRESET_VALUES.has(taxonomyDescription)) return taxonomyDescription
    return TAXONOMY_SELECT_CUSTOM
  }, [taxonomyDescription])

  const npiTypeItems = useMemo(
    () => NPI_TYPE_OPTIONS.map((o) => ({ id: o.value, label: o.label })),
    [],
  )

  const taxonomyPickerItems = useMemo(
    () => [
      { id: '', label: 'Any specialty' },
      ...NPI_TAXONOMY_FILTERS.map((o) => ({ id: o.value as string, label: o.label })),
      { id: TAXONOMY_SELECT_CUSTOM, label: 'Other (type below)' },
    ],
    [],
  )

  const countryPickerItems = useMemo(
    () => NPI_COUNTRY_OPTIONS.map((c) => ({ id: c.code, label: c.label })),
    [],
  )

  const addressPurposePickerItems = useMemo(
    () => NPI_ADDRESS_PURPOSE_OPTIONS.map((o) => ({ id: o.value, label: o.label })),
    [],
  )

  const statePickerItems = useMemo(() => {
    if (!regionOptions) return []
    return regionOptions.map((r) => ({
      id: r.code,
      label: r.code ? `${r.code} · ${r.name}` : r.name,
    }))
  }, [regionOptions])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Doctor directory</h1>
        <p className="text-slate-600 dark:text-white text-sm mt-2 max-w-2xl leading-relaxed">
          Search providers, filter by specialty or location, and add them for appointments and the OPD queue.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 p-1 rounded-2xl bg-slate-100/90 dark:bg-slate-800/50 ring-1 ring-slate-200/60 dark:ring-slate-700/60 w-full sm:w-fit">
        <button
          type="button"
          onClick={() => merge({ tab: null })}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            tab === 'search'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-white'
          }`}
        >
          <Stethoscope className="h-4 w-4" />
          Doctor search
        </button>
        <button
          type="button"
          onClick={() => merge({ tab: 'internal' })}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            tab === 'internal'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-white'
          }`}
        >
          <Users className="h-4 w-4" />
          Internal doctors ({internalList.length})
        </button>
      </div>

      {tab === 'search' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/85 dark:bg-slate-900/45 p-5 ring-1 ring-slate-200/40 dark:ring-slate-700/40 space-y-5">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Match the CMS NPI Registry search form. You need at least one real criterion (for example NPI, name,
              organization, taxonomy text, city, or ZIP). <strong className="font-medium text-slate-600 dark:text-white">State alone is not allowed</strong>;{' '}
              <strong className="font-medium text-slate-600 dark:text-white">United States cannot be the only</strong> filter.
              Country uses ISO codes (full list); state or region options follow the country you pick (or type a value when no list is available). Pagination uses{' '}
              <code className="font-mono">limit</code> + <code className="font-mono">skip</code> (max skip 1000; up to 200 rows per request).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  NPI number
                </label>
                <FormInput
                  value={npiNumber}
                  onChange={(e) =>
                    patchNpiFilters({ npiNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })
                  }
                  placeholder="10-digit NPI"
                  inputMode="numeric"
                  className="!py-2.5 font-mono"
                />
              </div>
              <div>
                <SearchableIdPicker<{ id: string; label: string }>
                  id="npi-search-enum-type"
                  label="NPI type"
                  items={npiTypeItems}
                  selectedId={enumerationType ?? ''}
                  onSelectId={(id) =>
                    patchNpiFilters({ enumerationType: id as NpiSearchParams['enumerationType'] })
                  }
                  getId={(o) => o.id}
                  getLabel={(o) => o.label}
                  filterItem={filterLabeledOption}
                  placeholder="Search type…"
                  emptyLabel="NPI type"
                  accent="sky"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <SearchableIdPicker<{ id: string; label: string }>
                  id="npi-search-taxonomy"
                  label="Specialty (taxonomy)"
                  items={taxonomyPickerItems}
                  selectedId={taxonomySelectValue}
                  onSelectId={(id) => {
                    if (id === '') patchNpiFilters({ taxonomyDescription: '' })
                    else if (id === TAXONOMY_SELECT_CUSTOM) patchNpiFilters({ taxonomyDescription: '' })
                    else patchNpiFilters({ taxonomyDescription: id })
                  }}
                  getId={(o) => o.id}
                  getLabel={(o) => o.label}
                  filterItem={filterLabeledOption}
                  placeholder="Search specialty…"
                  emptyLabel="Any specialty"
                  accent="sky"
                />
                {taxonomySelectValue === TAXONOMY_SELECT_CUSTOM ? (
                  <FormInput
                    value={taxonomyDescription}
                    onChange={(e) => patchNpiFilters({ taxonomyDescription: e.target.value })}
                    placeholder="Custom taxonomy description (CMS text match)"
                    className="!py-2.5 mt-2"
                  />
                ) : null}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">For individuals</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Provider first name
                  </label>
                  <FormInput
                    value={providerFirstName}
                    onChange={(e) => patchNpiFilters({ providerFirstName: e.target.value })}
                    placeholder="First name"
                    className="!py-2.5"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Provider last name
                  </label>
                  <FormInput
                    value={providerLastName}
                    onChange={(e) => patchNpiFilters({ providerLastName: e.target.value })}
                    placeholder="Last name"
                    className="!py-2.5"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">For organizations</p>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Organization name (LBN, DBA, former LBN, or other name)
                  </label>
                  <FormInput
                    value={organizationName}
                    onChange={(e) => patchNpiFilters({ organizationName: e.target.value })}
                    placeholder="Organization name"
                    className="!py-2.5"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                      Authorized official first name
                    </label>
                    <FormInput
                      value={authorizedOfficialFirstName}
                      onChange={(e) => patchNpiFilters({ authorizedOfficialFirstName: e.target.value })}
                      placeholder="First name"
                      className="!py-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                      Authorized official last name
                    </label>
                    <FormInput
                      value={authorizedOfficialLastName}
                      onChange={(e) => patchNpiFilters({ authorizedOfficialLastName: e.target.value })}
                      placeholder="Last name"
                      className="!py-2.5"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">City</label>
                <FormInput
                  value={city}
                  onChange={(e) => patchNpiFilters({ city: e.target.value })}
                  placeholder="City"
                  className="!py-2.5"
                />
              </div>
              <div>
                <SearchableIdPicker<{ id: string; label: string }>
                  id="npi-search-country"
                  label="Country"
                  items={countryPickerItems}
                  selectedId={countryCode}
                  onSelectId={(id) => patchNpiFilters({ countryCode: id, state: '' })}
                  getId={(o) => o.id}
                  getLabel={(o) => o.label}
                  filterItem={filterLabeledOption}
                  placeholder="Search country…"
                  emptyLabel="Country"
                  accent="sky"
                />
              </div>
              <div>
                {stateIsSelect ? (
                  <SearchableIdPicker<{ id: string; label: string }>
                    id="npi-search-state"
                    label="State / region"
                    items={statePickerItems}
                    selectedId={state}
                    onSelectId={(id) => patchNpiFilters({ state: id })}
                    getId={(o) => o.id}
                    getLabel={(o) => o.label}
                    filterItem={filterLabeledOption}
                    placeholder="Search state…"
                    emptyLabel="State / region"
                    accent="sky"
                  />
                ) : (
                  <>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                      State / region
                    </label>
                    <FormInput
                      value={state}
                      onChange={(e) => patchNpiFilters({ state: e.target.value })}
                      placeholder={
                        countryCode
                          ? 'Subdivision code or name (none in list for this country)'
                          : 'Optional — pick a country for a subdivision list'
                      }
                      className="!py-2.5"
                    />
                  </>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Postal code
                </label>
                <FormInput
                  value={postalCode}
                  onChange={(e) => patchNpiFilters({ postalCode: e.target.value })}
                  placeholder="ZIP / postal code"
                  className="!py-2.5"
                />
              </div>
              <div>
                <SearchableIdPicker<{ id: string; label: string }>
                  id="npi-search-address-purpose"
                  label="Address type"
                  items={addressPurposePickerItems}
                  selectedId={addressPurpose ?? ''}
                  onSelectId={(id) =>
                    patchNpiFilters({ addressPurpose: id as NpiSearchParams['addressPurpose'] })
                  }
                  getId={(o) => o.id}
                  getLabel={(o) => o.label}
                  filterItem={filterLabeledOption}
                  placeholder="Search address type…"
                  emptyLabel="Address type"
                  accent="sky"
                />
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
              <strong className="font-medium text-slate-600 dark:text-white">Note:</strong> The NPI Registry limits
              searches to the first 2100 results. If you cannot find the NPI you need, refine your criteria.
            </p>

            <FieldError className="!mt-0">{npiSearchErr}</FieldError>

            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="button"
                onClick={clearNpiSearchForm}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-sm font-semibold shadow-sm disabled:opacity-50"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => void runSearch(0)}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-sky-700 text-white text-sm font-semibold shadow-md disabled:opacity-50"
              >
                {loading ? 'Searching…' : 'Search'}
              </button>
            </div>
          </div>

          {loading && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
            </div>
          )}

          {!loading && providers.length > 0 && (
            <>
              <p className="text-sm text-slate-600 dark:text-white">
                Page {page + 1} — showing {providers.length} of {totalCount} match{totalCount === 1 ? '' : 'es'} (API
                window limited by skip rules).
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {providers.map((p) => (
                  <div
                    key={p.npi}
                    className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-900/50 p-4 shadow-sm ring-1 ring-slate-200/40 dark:ring-slate-700/40 flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white leading-tight">{p.displayName}</p>
                        <p className="text-xs font-mono text-sky-600 dark:text-white mt-1">NPI {p.npi}</p>
                        {p.primaryTaxonomyDesc && (
                          <p className="text-sm text-slate-600 dark:text-white mt-2 flex items-start gap-1.5">
                            <Stethoscope className="h-4 w-4 shrink-0 mt-0.5 text-violet-500" aria-hidden />
                            {p.primaryTaxonomyDesc}
                          </p>
                        )}
                      </div>
                    </div>
                    {(p.city || p.state) && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {[p.addressLine1, [p.city, p.state].filter(Boolean).join(', '), p.postalCode]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    )}
                    {p.phone && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {p.phone}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1 mt-auto">
                      <button
                        type="button"
                        onClick={() => setProfileRaw(p.raw)}
                        className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white"
                      >
                        Full profile
                      </button>
                      <button
                        type="button"
                        onClick={() => void importProvider(p)}
                        disabled={importingNpi === p.npi}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
                      >
                        {importingNpi === p.npi ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <UserPlus className="h-3.5 w-3.5" />
                        )}
                        Add to HMS
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  disabled={!canPrev || loading}
                  onClick={() => void runSearch(page - 1)}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-semibold disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <button
                  type="button"
                  disabled={!canNext || loading}
                  onClick={() => void runSearch(page + 1)}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-semibold disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </>
          )}

          {!loading && providers.length === 0 && page === 0 && totalCount === 0 && (
            <p className="text-slate-600 dark:text-slate-400 text-sm text-center py-12 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
              Run a search to load providers from the NPI Registry.
            </p>
          )}
        </div>
      )}

      {tab === 'internal' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600 dark:text-white max-w-2xl">
              Import from <strong className="font-medium text-slate-700 dark:text-white">Doctor search</strong> or add
              a provider manually. Set weekly hours and lunch so slots match your clinic.
            </p>
            <button
              type="button"
              onClick={() => {
                setScheduleModalRecord(null)
                setScheduleModalOpen(true)
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-sky-600 text-white hover:bg-sky-500 shadow-sm"
            >
              <UserPlus className="h-4 w-4" />
              Add manual doctor
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/85 dark:bg-slate-900/45 overflow-hidden ring-1 ring-slate-200/40 dark:ring-slate-700/40">
            {internalLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
              </div>
            ) : internalList.length === 0 ? (
              <div className="p-10 text-center space-y-4">
                <CalendarClock className="h-10 w-10 mx-auto text-slate-300 dark:text-white" aria-hidden />
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  No doctors in HMS yet. Add one manually or import from the registry.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setScheduleModalRecord(null)
                    setScheduleModalOpen(true)
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white"
                >
                  <UserPlus className="h-4 w-4" />
                  Add manual doctor
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left min-w-[900px]">
                  <thead className="bg-slate-50/90 dark:bg-slate-900/70 text-slate-600 dark:text-white border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-3 font-bold text-[11px] uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 font-bold text-[11px] uppercase tracking-wider">NPI</th>
                      <th className="px-4 py-3 font-bold text-[11px] uppercase tracking-wider">Department</th>
                      <th className="px-4 py-3 font-bold text-[11px] uppercase tracking-wider">Weekly schedule</th>
                      <th className="px-4 py-3 font-bold text-[11px] uppercase tracking-wider">Location</th>
                      <th className="px-4 py-3 font-bold text-[11px] uppercase tracking-wider">Phone</th>
                      <th className="px-4 py-3 font-bold text-[11px] uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {internalList.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{r.name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-sky-600 dark:text-white">
                          {r.npi || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-white">{r.department}</td>
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-white max-w-[220px] leading-snug">
                          {formatInternalDoctorScheduleSummary(r)}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-white">
                          {[r.city, r.state].filter(Boolean).join(', ') || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-white">{r.phone ?? '—'}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex flex-wrap items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setScheduleModalRecord(r)
                                setScheduleModalOpen(true)
                              }}
                              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-violet-600 dark:text-white hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors"
                              title="Edit schedule"
                              aria-label={`Edit schedule for ${r.name}`}
                            >
                              <CalendarClock className="h-4 w-4" aria-hidden />
                            </button>
                            {canShowNpiProfile(r) && (
                              <button
                                type="button"
                                onClick={() => setProfileRaw(r.rawResult as NpiRawResult)}
                                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sky-600 dark:text-white hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors"
                                title="NPI profile"
                                aria-label={`View NPI profile for ${r.name}`}
                              >
                                <FileText className="h-4 w-4" aria-hidden />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setRemoveTarget(r)}
                              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-600 dark:text-white hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                              title="Remove from directory"
                              aria-label={`Remove ${r.name} from directory`}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      
      <ConfirmDialog
        open={removeTarget !== null}
        title="Remove from directory?"
        description={
          removeTarget ? (
            <>
              Remove{' '}
              <span className="font-semibold text-slate-800 dark:text-white">{removeTarget.name}</span> from the internal
              MediCare HMS directory?
            </>
          ) : null
        }
        confirmLabel="Remove"
        variant="danger"
        confirmLoading={removeBusy}
        onCancel={() => !removeBusy && setRemoveTarget(null)}
        onConfirm={() => void runRemoveInternal()}
      />

      {profileRaw && <NpiProfileModal raw={profileRaw} onClose={() => setProfileRaw(null)} />}

      {scheduleModalOpen && (
        <ScheduleModal
          record={scheduleModalRecord}
          onClose={() => setScheduleModalOpen(false)}
          onSave={() => void loadInternal()}
        />
      )}

      <p className="text-[11px] text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
        <Building2 className="inline h-3.5 w-3.5 mr-1 align-text-bottom opacity-70" aria-hidden />
        Issuance of an NPI does not verify licensure or credentials.
      </p>
    </div>
  )
}
