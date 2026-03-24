import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ClipboardList, HeartPulse, ShieldCheck, Stethoscope, type LucideIcon } from 'lucide-react'
import { login } from '../features/auth/authSlice'
import type { AuthUser } from '../features/auth/authSlice'
import { getDefaultDashboard } from '../config/roles'
import Navbar from '../layout/Navbar'
import { notify } from '../lib/notify'

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

const roleIcons: Record<AuthUser['role'], LucideIcon> = {
  admin: ShieldCheck,
  doctor: Stethoscope,
  receptionist: ClipboardList,
  nurse: HeartPulse,
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
    notify.success(`Welcome, ${user.name}`)
    navigate(getDefaultDashboard(user.role))
  }

  return (
    <div className="min-h-screen flex flex-col app-surface-gradient">
      <Navbar />
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-3xl page-enter">
          <div className="text-center mb-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-sky-600 dark:text-sky-400 mb-3">
              Secure access
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
              Sign in to MediCare HMS
            </h1>
            <p className="mt-3 text-slate-600 dark:text-slate-400 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
              Choose your role to open the workspace. Demo environment — no password required.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {demoUsers.map((user) => {
              const RoleIcon = roleIcons[user.role]
              return (
                <button
                  key={user.role}
                  type="button"
                  onClick={() => handleLogin(user)}
                  className="group text-left rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/75 dark:bg-slate-900/50 backdrop-blur-md p-6 shadow-sm shadow-slate-200/40 dark:shadow-none ring-1 ring-slate-200/50 dark:ring-slate-700/50 transition-all duration-300 hover:shadow-xl hover:shadow-sky-500/10 hover:ring-sky-200/60 dark:hover:ring-sky-500/30 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500/10 to-sky-600/5 dark:from-sky-500/20 dark:to-sky-600/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0 ring-1 ring-sky-200/50 dark:ring-sky-500/20 group-hover:from-sky-500/15 group-hover:to-sky-600/10 transition-colors">
                      <RoleIcon className="h-6 w-6" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="font-bold text-slate-900 dark:text-white text-base tracking-tight">
                        {roleLabels[user.role]}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium">{user.name}</div>
                      <div className="mt-4 text-sky-600 dark:text-sky-400 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
                        Continue
                        <ArrowRight className="h-4 w-4" aria-hidden />
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <p className="text-center text-xs font-medium text-slate-400 dark:text-slate-500 mt-10">
            Hospital Management System · Demo accounts
          </p>
        </div>
      </div>
    </div>
  )
}
