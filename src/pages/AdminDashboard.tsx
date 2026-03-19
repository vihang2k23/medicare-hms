import { useAuth } from '../hooks/useAuth'
import AlertWidget from '../features/alerts/AlertWidget'

export default function AdminDashboard() {
  const { user } = useAuth()

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-slate-100 mb-4">Admin Dashboard</h1>
      <p className="text-gray-600 dark:text-slate-400 mb-6">Welcome, {user?.name}.</p>
      <AlertWidget />
    </div>
  )
}
