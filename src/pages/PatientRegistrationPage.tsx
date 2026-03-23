import { useLocation } from 'react-router-dom'
import PatientRegistrationForm from '../features/patients/PatientRegistrationForm'

export default function PatientRegistrationPage() {
  const location = useLocation()
  const isReceptionist = location.pathname.includes('receptionist')
  const redirectTo = isReceptionist ? '/receptionist' : '/admin/patients'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-white">Patient registration</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Multi-step form · Data saved via JSON Server REST API
        </p>
      </div>
      <PatientRegistrationForm redirectTo={redirectTo} />
    </div>
  )
}
