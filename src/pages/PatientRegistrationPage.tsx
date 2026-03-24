import { useLocation } from 'react-router-dom'
import PatientRegistrationForm from '../features/patients/PatientRegistrationForm'

export default function PatientRegistrationPage() {
  const location = useLocation()
  const isReceptionist = location.pathname.includes('receptionist')
  const redirectTo = isReceptionist ? '/receptionist' : '/admin/patients'

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-600 dark:text-sky-400 mb-2">Intake</p>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Patient registration</h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-2 max-w-xl leading-relaxed">
          Guided multi-step intake. Records persist through the JSON Server REST API.
        </p>
      </div>
      <PatientRegistrationForm redirectTo={redirectTo} />
    </div>
  )
}
