import { Briefcase, MapPin, Phone, User, X } from 'lucide-react'
import { useModalScrollLock } from '../../hooks/useModalScrollLock'
import type { AutocompleteDoctor } from './npiAutocompleteMap'

export interface DoctorDetailsModalProps {
  selectedDoctor: AutocompleteDoctor | null
  open: boolean
  onClose: () => void
  onAddToSystem: (doctor: AutocompleteDoctor) => void
  adding: boolean
}

export default function DoctorDetailsModal({
  selectedDoctor,
  open,
  onClose,
  onAddToSystem,
  adding,
}: DoctorDetailsModalProps) {
  useModalScrollLock(open && !!selectedDoctor)
  if (!open || !selectedDoctor) return null

  const d = selectedDoctor

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden overscroll-none">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-lg max-h-[min(90dvh,36rem)] min-h-0 flex flex-col rounded-2xl border border-slate-200/90 dark:border-slate-600/90 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 p-5 border-b border-slate-200/80 dark:border-slate-700/80">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">{d.fullName}</h2>
            <p className="text-xs font-mono text-sky-600 dark:text-sky-400 mt-1">NPI {d.npi}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-sm text-slate-700 dark:text-slate-200 overflow-y-auto overscroll-contain min-h-0 flex-1 touch-pan-y">
          {d.specialty && (
            <div className="flex items-start gap-2">
              <Briefcase className="h-4 w-4 mt-0.5 text-sky-600 shrink-0" />
              <div>
                <p className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">Specialty</p>
                <p>{d.specialty}</p>
              </div>
            </div>
          )}
          {(d.address || d.city || d.state) && (
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 text-sky-600 shrink-0" />
              <div>
                <p className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">Practice address</p>
                <p>
                  {[d.address, d.address2].filter(Boolean).join(', ')}
                  {(d.city || d.state || d.postalCode) && (
                    <>
                      <br />
                      {[d.city, d.state].filter(Boolean).join(', ')} {d.postalCode ?? ''}
                    </>
                  )}
                </p>
              </div>
            </div>
          )}
          {d.contact && (
            <div className="flex items-start gap-2">
              <Phone className="h-4 w-4 mt-0.5 text-sky-600 shrink-0" />
              <div>
                <p className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">Phone</p>
                <p>{d.contact}</p>
              </div>
            </div>
          )}
          {d.gender && (
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 mt-0.5 text-sky-600 shrink-0" />
              <div>
                <p className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">Sex</p>
                <p className="capitalize">{d.gender}</p>
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 p-5 pt-0 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Close
          </button>
          <button
            type="button"
            disabled={adding}
            onClick={() => onAddToSystem(d)}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50"
          >
            {adding ? 'Adding…' : 'Add to HMS'}
          </button>
        </div>
      </div>
    </div>
  )
}
