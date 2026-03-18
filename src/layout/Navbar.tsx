import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import type { RootState } from '../app/store'
import { logout } from '../features/auth/authSlice'

export default function Navbar() {
  const dispatch = useDispatch()
  const { isAuthenticated } = useSelector((state: RootState) => state.auth)

  return (
    <header className="h-14 bg-gray-900 text-white flex items-center justify-between px-4">
      <span className="font-semibold">Medicare HMS</span>
      <div className="flex items-center gap-4">
        {isAuthenticated ? (
          <button
            type="button"
            onClick={() => dispatch(logout())}
            className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600"
          >
            Logout
          </button>
        ) : (
          <Link to="/login" className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600">
            Login
          </Link>
        )}
      </div>
    </header>
  )
}
