import { Link } from 'react-router-dom'
import { ShieldX } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { getDefaultDashboard } from '../config/roles'

export default function AccessDenied() {
  const { user } = useAuth()
  const dashboardPath = user ? getDefaultDashboard(user.role) : '/'

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 mb-4">
        <ShieldX className="h-8 w-8" aria-hidden />
      </div>
      <h1 className="text-3xl font-semibold text-gray-800 dark:text-slate-100 mb-2">Access Denied</h1>
      <p className="text-gray-600 dark:text-slate-400 mb-6">You do not have permission to view this page.</p>
      <Link to={dashboardPath} className="text-blue-600 dark:text-sky-400 hover:underline">
        Return to Dashboard
      </Link>
    </div>
  )
}
