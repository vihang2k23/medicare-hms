import { useSelector } from 'react-redux'
import type { RootState } from '../store'

// Dashboard defines the Dashboard UI surface and its primary interaction flow.
// Dashboard renders the dashboard UI.
export default function Dashboard() {
  const { user } = useSelector((state: RootState) => state.auth)

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-800 mb-4">Dashboard</h1>
      <p className="text-gray-600">
        {user ? `Welcome, ${user.email}` : 'Welcome to Medicare HMS'}
      </p>
    </div>
  )
}
