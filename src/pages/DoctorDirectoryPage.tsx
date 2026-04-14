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
  Pencil,
  Phone,
  Stethoscope,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import type { AppDispatch } from '../app/store'
import { NPI_ADDRESS_PURPOSE_OPTIONS } from '../shared/config/npiAddressPurpose'
import { NPI_COUNTRY_OPTIONS } from '../shared/config/npiCountries'
import { getNpiRegionOptionsForCountry } from '../shared/config/npiRegionOptions'
import { NPI_TAXONOMY_FILTERS } from '../shared/config/npiTaxonomies'
import { NPI_TYPE_OPTIONS } from '../shared/config/npiTypeOptions'
import {
  createInternalDoctor,
  deleteInternalDoctor,
  fetchInternalDoctors,
  findInternalDoctorByNpi,
} from '../shared/api/internalDoctorsApi'
import type { NpiProviderCard, NpiRawResult, NpiSearchParams } from '../shared/lib/npiRegistryApi'
import { npiCardToInternalRecord, searchNpiRegistry } from '../shared/lib/npiRegistryApi'
import {
  formatInternalDoctorScheduleSummary,
  internalRecordToScheduleDoctor,
  type InternalDoctorRecord,
} from '../shared/types/internalDoctor'
import {
  addImportedScheduleDoctor,
  removeImportedScheduleDoctor,
  setImportedScheduleDoctors,
} from '../features/appointments/appointmentsSlice'
import { notify } from '../shared/lib/notify'
import { useModalScrollLock } from '../shared/hooks/useModalScrollLock'
import { modalBackdropDim, modalFixedInner, modalFixedRoot } from '../shared/ui/modalOverlayClasses'
import InternalDoctorScheduleModal from '../shared/components/InternalDoctorScheduleModal'

const PAGE_SIZE = 12
const MAX_SKIP = 1000

const NPI_TAXONOMY_PRESET_VALUES: ReadonlySet<string> = new Set(
  NPI_TAXONOMY_FILTERS.map((f) => f.value as string),
)
const TAXONOMY_SELECT_CUSTOM = '__custom__'

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
            <p className="text-xs text-slate-500 dark:text-white mt-1">{raw.enumeration_type}</p>
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
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white mb-2">
              Credentials &amp; demographics
            </h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 dark:text-white">
              {b.credential && (
                <>
                  <dt className="text-slate-500 dark:text-white">Credential</dt>
                  <dd>{b.credential}</dd>
                </>
              )}
              {b.sex && (
                <>
                  <dt className="text-slate-500 dark:text-white">Sex</dt>
                  <dd>{b.sex}</dd>
                </>
              )}
              {b.enumeration_date && (
                <>
                  <dt className="text-slate-500 dark:text-white">Enumeration date</dt>
                  <dd>{b.enumeration_date}</dd>
                </>
              )}
              {b.last_updated && (
                <>
                  <dt className="text-slate-500 dark:text-white">Last updated</dt>
                  <dd>{b.last_updated}</dd>
                </>
              )}
              {b.sole_proprietor && (
                <>
                  <dt className="text-slate-500 dark:text-white">Sole proprietor</dt>
                  <dd>{b.sole_proprietor}</dd>
                </>
              )}
            </dl>
          </section>

          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white mb-2">
              Taxonomy (specialty)
            </h3>
            <ul className="space-y-2">
              {(raw.taxonomies ?? []).map((t, i) => (
                <li
                  key={`${t.code ?? i}-${i}`}
                  className="rounded-lg border border-slate-200/80 dark:border-slate-700/80 px-3 py-2 text-slate-700 dark:text-white"
                >
                  <span className="font-medium">{t.desc ?? t.code}</span>
                  <span className="text-xs text-slate-500 dark:text-white ml-2 font-mono">{t.code}</span>
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
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white mb-2">
              Addresses
            </h3>
            <ul className="space-y-3">
              {(raw.addresses ?? []).map((a, i) => (
                <li
                  key={i}
                  className="rounded-lg bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-slate-700 dark:text-white"
                >
                  <p className="text-xs font-semibold text-slate-500 dark:text-white mb-1">
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
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white mb-2">
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
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white mb-2">
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

export default function DoctorDirectoryPage() {
  const dispatch = useDispatch<AppDispatch>()
  const [tab, setTab] = useState<'search' | 'internal'>('search')

  const [npiNumber, setNpiNumber] = useState('')
  const [enumerationType, setEnumerationType] = useState<NpiSearchParams['enumerationType']>('')
  const [taxonomyDescription, setTaxonomyDescription] = useState('')
  const [providerFirstName, setProviderFirstName] = useState('')
  const [providerLastName, setProviderLastName] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [authorizedOfficialFirstName, setAuthorizedOfficialFirstName] = useState('')
  const [authorizedOfficialLastName, setAuthorizedOfficialLastName] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [countryCode, setCountryCode] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [addressPurpose, setAddressPurpose] = useState<NpiSearchParams['addressPurpose']>('')
  const [loading, setLoading] = useState(false)
  const [providers, setProviders] = useState<NpiProviderCard[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [profileRaw, setProfileRaw] = useState<NpiRawResult | null>(null)
  const [importingNpi, setImportingNpi] = useState<string | null>(null)

  const [internalList, setInternalList] = useState<InternalDoctorRecord[]>([])
  const [internalLoading, setInternalLoading] = useState(false)
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [scheduleModalRecord, setScheduleModalRecord] = useState<InternalDoctorRecord | null>(null)

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

  useEffect(() => {
    if (tab === 'internal') void loadInternal()
  }, [tab, loadInternal])

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
    setNpiNumber('')
    setEnumerationType('')
    setTaxonomyDescription('')
    setProviderFirstName('')
    setProviderLastName('')
    setOrganizationName('')
    setAuthorizedOfficialFirstName('')
    setAuthorizedOfficialLastName('')
    setCity('')
    setState('')
    setCountryCode('')
    setPostalCode('')
    setAddressPurpose('')
    setProviders([])
    setTotalCount(0)
    setPage(0)
  }

  const runSearch = async (pageIndex: number) => {
    setLoading(true)
    try {
      const skip = pageIndex * PAGE_SIZE
      const { resultCount, providers: list } = await searchNpiRegistry({
        npiNumber: npiNumber || undefined,
        enumerationType: enumerationType || undefined,
        taxonomyDescription: taxonomyDescription || undefined,
        providerFirstName: providerFirstName || undefined,
        providerLastName: providerLastName || undefined,
        organizationName: organizationName || undefined,
        authorizedOfficialFirstName: authorizedOfficialFirstName || undefined,
        authorizedOfficialLastName: authorizedOfficialLastName || undefined,
        city: city || undefined,
        state: state || undefined,
        countryCode: countryCode || undefined,
        postalCode: postalCode || undefined,
        addressPurpose: addressPurpose || undefined,
        limit: PAGE_SIZE,
        skip,
      })
      setProviders(list)
      setTotalCount(resultCount)
      setPage(pageIndex)
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'NPI search failed')
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

  const removeInternal = async (r: InternalDoctorRecord) => {
    if (!window.confirm(`Remove ${r.name} from the internal directory?`)) return
    try {
      await deleteInternalDoctor(r.id)
      dispatch(removeImportedScheduleDoctor(r.id))
      notify.success('Removed from HMS')
      void loadInternal()
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Remove failed')
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
          onClick={() => setTab('search')}
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
          onClick={() => setTab('internal')}
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
            <p className="text-xs text-slate-500 dark:text-white">
              Match the CMS NPI Registry search form. You need at least one real criterion (for example NPI, name,
              organization, taxonomy text, city, or ZIP). <strong className="font-medium text-slate-600 dark:text-white">State alone is not allowed</strong>;{' '}
              <strong className="font-medium text-slate-600 dark:text-white">United States cannot be the only</strong> filter.
              Country uses ISO codes (full list); state or region options follow the country you pick (or type a value when no list is available). Pagination uses{' '}
              <code className="font-mono">limit</code> + <code className="font-mono">skip</code> (max skip 1000; up to 200 rows per request).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-white mb-1">
                  NPI number
                </label>
                <input
                  value={npiNumber}
                  onChange={(e) => setNpiNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit NPI"
                  inputMode="numeric"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-600 bg-white dark:bg-slate-950/50 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-white mb-1">
                  NPI type
                </label>
                <select
                  value={enumerationType}
                  onChange={(e) => setEnumerationType(e.target.value as NpiSearchParams['enumerationType'])}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-600 bg-white dark:bg-slate-950/50 text-sm"
                >
                  {NPI_TYPE_OPTIONS.map((o) => (
                    <option key={o.value || 'any'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-white mb-1">
                  Specialty (taxonomy)
                </label>
                <select
                  value={taxonomySelectValue}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v === '') setTaxonomyDescription('')
                    else if (v === TAXONOMY_SELECT_CUSTOM) setTaxonomyDescription('')
                    else setTaxonomyDescription(v)
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-600 bg-white dark:bg-slate-950/50 text-sm"
                >
                  <option value="">Any specialty</option>
                  {NPI_TAXONOMY_FILTERS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                  <option value={TAXONOMY_SELECT_CUSTOM}>Other (type below)</option>
                </select>
                {taxonomySelectValue === TAXONOMY_SELECT_CUSTOM ? (
                  <input
                    value={taxonomyDescription}
                    onChange={(e) => setTaxonomyDescription(e.target.value)}
                    placeholder="Custom taxonomy description (CMS text match)"
                    className="w-full mt-2 px-3 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-600 bg-white dark:bg-slate-950/50 text-sm"
                  />
                ) : null}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-white">For individuals</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-white mb-1">
                    Provider first name
                  </label>
                  <input
                    value={providerFirstName}
                    onChange={(e) => setProviderFirstName(e.target.value)}
                    placeholder="First name"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-600 bg-white dark:bg-slate-950/50 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-white mb-1">
                    Provider last name
                  </label>
                  <input
                    value={providerLastName}
                    onChange={(e) => setProviderLastName(e.target.value)}
                    placeholder="Last name"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-600 bg-white dark:bg-slate-950/50 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-white">For organizations</p>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-white mb-1">
                    Organization name (LBN, DBA, former LBN, or other name)
                  </label>
                  <input
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="Organization name"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-600 bg-white dark:bg-slate-950/50 text-sm"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-white mb-1">
                      Authorized official first name
                    </label>
                    <input
                      value={authorizedOfficialFirstName}
                      onChange={(e) => setAuthorizedOfficialFirstName(e.target.value)}
                      placeholder="First name"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-600 bg-white dark:bg-slate-950/50 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-white mb-1">
                      Authorized official last name
                    </label>
                    <input
                      value={authorizedOfficialLastName}
                      onChange={(e) => setAuthorizedOfficialLastName(e.target.value)}
                      placeholder="Last name"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-600 bg-white dark:bg-slate-950/50 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-white mb-1">City</label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-600 bg-white dark:bg-slate-950/50 text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-white mb-1">Country</label>
                <select
                  value={countryCode}
                  onChange={(e) => {
                    setCountryCode(e.target.value)
                    setState('')
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-600 bg-white dark:bg-slate-950/50 text-sm"
                >
                  {NPI_COUNTRY_OPTIONS.map((c) => (
                    <option key={c.code || 'any'} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-white mb-1">
                  State / region
                </label>
                {stateIsSelect ? (
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-600 bg-white dark:bg-slate-950/50 text-sm"
                  >
                    {regionOptions!.map((r) => (
                      <option key={r.code || 'any'} value={r.code}>
                        {r.code ? `${r.code} — ${r.name}` : r.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder={
                      countryCode
                        ? 'Subdivision code or name (none in list for this country)'
                        : 'Optional — pick a country for a subdivision list'
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-600 bg-white dark:bg-slate-950/50 text-sm"
                  />
                )}
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-white mb-1">
                  Postal code
                </label>
                <input
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="ZIP / postal code"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-600 bg-white dark:bg-slate-950/50 text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-white mb-1">
                  Address type
                </label>
                <select
                  value={addressPurpose}
                  onChange={(e) => setAddressPurpose(e.target.value as NpiSearchParams['addressPurpose'])}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-600 bg-white dark:bg-slate-950/50 text-sm"
                >
                  {NPI_ADDRESS_PURPOSE_OPTIONS.map((o) => (
                    <option key={o.value || 'any'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-white max-w-3xl leading-relaxed">
              <strong className="font-medium text-slate-600 dark:text-white">Note:</strong> The NPI Registry limits
              searches to the first 2100 results. If you cannot find the NPI you need, refine your criteria.
            </p>

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
                      <p className="text-xs text-slate-500 dark:text-white flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {[p.addressLine1, [p.city, p.state].filter(Boolean).join(', '), p.postalCode]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    )}
                    {p.phone && (
                      <p className="text-xs text-slate-500 dark:text-white flex items-center gap-1.5">
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
            <p className="text-slate-500 dark:text-white text-sm text-center py-12 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
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
                <p className="text-slate-500 dark:text-white text-sm">
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
                        <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setScheduleModalRecord(r)
                              setScheduleModalOpen(true)
                            }}
                            className="inline-flex items-center gap-1 text-violet-600 dark:text-white font-semibold text-xs hover:underline"
                          >
                            <Pencil className="h-3 w-3" />
                            Edit schedule
                          </button>
                          {canShowNpiProfile(r) && (
                            <button
                              type="button"
                              onClick={() => setProfileRaw(r.rawResult as NpiRawResult)}
                              className="text-sky-600 dark:text-white font-semibold text-xs hover:underline"
                            >
                              Profile
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => void removeInternal(r)}
                            className="text-red-600 dark:text-white font-semibold text-xs hover:underline"
                          >
                            Remove
                          </button>
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

      <InternalDoctorScheduleModal
        open={scheduleModalOpen}
        record={scheduleModalRecord}
        onClose={() => {
          setScheduleModalOpen(false)
          setScheduleModalRecord(null)
        }}
        onSaved={() => void loadInternal()}
      />

      {profileRaw && <NpiProfileModal raw={profileRaw} onClose={() => setProfileRaw(null)} />}

      <p className="text-[11px] text-slate-400 dark:text-white max-w-3xl leading-relaxed">
        <Building2 className="inline h-3.5 w-3.5 mr-1 align-text-bottom opacity-70" aria-hidden />
        Issuance of an NPI does not verify licensure or credentials.
      </p>
    </div>
  )
}
