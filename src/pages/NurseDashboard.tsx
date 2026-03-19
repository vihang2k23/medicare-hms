import { useAuth } from '../hooks/useAuth'
import BedGrid from '../features/beds/BedGrid'

export default function NurseDashboard() {
  const { user } = useAuth()

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-800 mb-4">Nurse Dashboard</h1>
      <p className="text-gray-600 mb-6">Welcome, {user?.name}.</p>
      <BedGrid />
    </div>
  )
}
