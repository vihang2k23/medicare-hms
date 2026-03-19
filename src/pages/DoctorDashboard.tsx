import { useAuth } from '../hooks/useAuth'

export default function DoctorDashboard() {
  const { user } = useAuth()

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-800 mb-4">Doctor Dashboard</h1>
      <p className="text-gray-600">Welcome, {user?.name}.</p>
    </div>
  )
}
