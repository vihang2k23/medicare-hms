import { useAuth } from '../hooks/useAuth'
import QueueBoard from '../features/queue/QueueBoard'

export default function ReceptionistDashboard() {
  const { user } = useAuth()

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-800 mb-4">Receptionist Dashboard</h1>
      <p className="text-gray-600 mb-6">Welcome, {user?.name}.</p>
      <QueueBoard />
    </div>
  )
}
