import { Link } from 'react-router-dom'

export default function AccessDenied() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
      <h1 className="text-3xl font-semibold text-gray-800 mb-2">Access Denied</h1>
      <p className="text-gray-600 mb-6">You do not have permission to view this page.</p>
      <Link to="/" className="text-blue-600 hover:underline">
        Return to Dashboard
      </Link>
    </div>
  )
}
