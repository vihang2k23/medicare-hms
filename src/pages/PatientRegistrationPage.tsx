import { Link, useLocation } from 'react-router-dom'
import PatientRegistrationForm from '../features/patients/PatientRegistrationForm'

// PatientRegistrationPage defines the Patient Registration Page UI surface and its primary interaction flow.
const headerBackBtnClass =
  'inline-flex shrink-0 items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-slate-300/90 dark:border-slate-500 bg-white/90 dark:bg-slate-800/90 text-slate-800 dark:text-white font-semibold text-sm shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors'

// PatientRegistrationPage renders the patient registration page UI.
export default function PatientRegistrationPage() {
  const location = useLocation()
  const isReceptionist = location.pathname.includes('receptionist')
  const redirectTo = isReceptionist ? '/receptionist' : '/admin/patients'
  const backLabel = isReceptionist ? '← Back to reception' : '← Back to patients'

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-600 dark:text-white mb-2">Intake</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Patient registration
          </h1>
          <p className="text-slate-600 dark:text-white text-sm mt-2 max-w-xl leading-relaxed">
            Guided multi-step intake. Records persist through the JSON Server REST API.
          </p>
        </div>
        <Link to={redirectTo} className={headerBackBtnClass}>
          {backLabel}
        </Link>
      </div>
      <PatientRegistrationForm
        redirectTo={redirectTo}
        exitTo={redirectTo}
        exitLabel={backLabel}
      />
    </div>
  )
}
