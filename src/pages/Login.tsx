import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { login } from '../features/auth/authSlice'
import type { AuthUser } from '../features/auth/authSlice'
import { getDefaultDashboard } from '../config/roles'
import Navbar from '../layout/Navbar'

const demoUsers: Array<{ role: AuthUser['role']; name: string; id: string; avatar: string }> = [
  { role: 'admin', name: 'Admin User', id: 'ADM001', avatar: '' },
  { role: 'doctor', name: 'Dr. Vihang', id: 'DOC001', avatar: '' },
  { role: 'receptionist', name: 'Riya Patel', id: 'REC001', avatar: '' },
  { role: 'nurse', name: 'Meena Patel', id: 'NUR001', avatar: '' },
]

const roleLabels: Record<AuthUser['role'], string> = {
  admin: 'Administrator',
  doctor: 'Doctor',
  receptionist: 'Receptionist',
  nurse: 'Nurse',
}

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
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-900">
      <Navbar />
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              Sign in to MediCare HMS
            </h1>
            <p className="mt-2 text-slate-500 dark:text-slate-400 text-sm">
              Select your role to continue
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {demoUsers.map((user) => (
              <button
                key={user.role}
                type="button"
                onClick={() => handleLogin(user)}
                className="group bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 text-left shadow-sm dark:shadow-none hover:shadow-md dark:hover:bg-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-sky-50 dark:bg-sky-900/40 flex items-center justify-center text-sky-600 dark:text-sky-400 font-semibold text-lg shrink-0 group-hover:bg-sky-100 dark:group-hover:bg-sky-900/60 transition-colors">
                    {user.role.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-800 dark:text-slate-100 text-base">
                      {roleLabels[user.role]}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                      {user.name}
                    </div>
                    <div className="mt-3 text-sky-600 dark:text-sky-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Sign in →
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6">
            Demo accounts · No password required
          </p>
        </div>
      </div>
    </div>
  )
}
