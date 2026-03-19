import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { login } from '../features/auth/authSlice'
import type { AuthUser } from '../features/auth/authSlice'
import { getDefaultDashboard } from '../config/roles'
import Navbar from '../layout/Navbar'

const demoUsers: Array<{ role: AuthUser['role']; name: string; id: string; avatar: string }> = [
  { role: 'admin', name: 'Admin User', id: 'ADM001', avatar: '' },
  { role: 'doctor', name: 'Dr. John', id: 'DOC001', avatar: '' },
  { role: 'receptionist', name: 'Riya', id: 'REC001', avatar: '' },
  { role: 'nurse', name: 'Meena', id: 'NUR001', avatar: '' },
]

export default function Login() {
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const handleLogin = (user: (typeof demoUsers)[0]) => {
    const authUser: AuthUser = {
      id: user.id,
      role: user.role,
      name: user.name,
      avatar: user.avatar,
    }
    dispatch(login(authUser))
    navigate(getDefaultDashboard(user.role))
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Navbar />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="grid grid-cols-2 gap-6 max-w-2xl">
          {demoUsers.map((user) => (
            <button
              key={user.role}
              type="button"
              onClick={() => handleLogin(user)}
              className="p-6 bg-white shadow rounded-lg cursor-pointer hover:scale-105 hover:shadow-lg transition-all text-left"
            >
              <h2 className="text-xl font-bold capitalize text-gray-800">{user.role}</h2>
              <p className="text-gray-600 mt-1">{user.name}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
