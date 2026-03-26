import { Link } from 'react-router-dom'
import { ShieldX } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { getDefaultDashboard } from '../config/roles'

export default function AccessDenied() {
  const { user } = useAuth()
  const dashboardPath = user ? getDefaultDashboard(user.role) : '/'

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 mb-6 ring-1 ring-red-200/60 dark:ring-red-500/20 shadow-sm">
        <ShieldX className="h-10 w-10" aria-hidden />
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Access denied</h1>
      <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-sm text-sm leading-relaxed">
        Your role does not include permission for this area. Return to your dashboard to continue working.
      </p>
      <Link
        to={dashboardPath}
        className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition-colors shadow-lg shadow-slate-900/10"
      >
        Back to dashboard
      </Link>
    </div>
  )
}
