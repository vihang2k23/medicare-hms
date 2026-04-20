import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowRight, ClipboardList, HeartPulse, ShieldCheck, Stethoscope, type LucideIcon } from 'lucide-react'
import { login } from '../domains/auth/authSlice'
import type { AuthUser } from '../domains/auth/authSlice'
import { getDefaultDashboard } from '../config/roles'
import { DEMO_DOCTOR_USERS, DEMO_STAFF_USERS, demoEntryToAuthUser } from '../config/demoAccounts'
import { DEFAULT_SCHEDULE_DOCTORS } from '../domains/appointments/appointmentsSlice'
import Navbar from '../layout/Navbar'
import { notify } from '../utils/notify'
import { FieldError } from '../components/ui/form'
import { useAuth } from '../hooks/useAuth'
import { SearchableIdPicker } from '../components/ui/SearchWithDropdown'
import type { ScheduleDoctor } from '../domains/appointments/types'
import MediCareLogo, { MediCareWordmark } from '../components/ui/brand/MediCareLogo'

// Login defines the Login UI surface and its primary interaction flow.
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

// Login renders the login UI.
export default function Login() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const [selectedDoctorId, setSelectedDoctorId] = useState(() => DEMO_DOCTOR_USERS[0]?.id ?? '')
  const [doctorSelectErr, setDoctorSelectErr] = useState<string | null>(null)

  if (isAuthenticated && user) {
    return <Navigate to={getDefaultDashboard(user.role)} replace />
  }

  const handleLogin = (user: (typeof DEMO_STAFF_USERS)[0] | (typeof DEMO_DOCTOR_USERS)[0]) => {
    dispatch(login(demoEntryToAuthUser(user)))
    notify.success(`Welcome, ${user.name}`)
    navigate(getDefaultDashboard(user.role), { replace: true })
  }

  const handleDoctorContinue = () => {
    const doc = DEMO_DOCTOR_USERS.find((d) => d.id === selectedDoctorId)
    if (!doc) {
      setDoctorSelectErr('Select a doctor from the list.')
      return
    }
    setDoctorSelectErr(null)
    handleLogin(doc)
  }

  return (
    <div className="min-h-dvh flex flex-col app-surface-gradient">
      <Navbar showSidebarToggle={false} />
      <div className="relative flex-1 flex items-center justify-center p-4 sm:p-6 md:p-10 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -top-20 right-[10%] h-64 w-64 rounded-full bg-sky-400/25 blur-3xl dark:bg-sky-500/20" />
          <div className="absolute bottom-0 left-[-10%] h-80 w-80 rounded-full bg-violet-400/20 blur-3xl dark:bg-violet-600/15" />
          <div className="absolute top-1/2 left-1/2 h-[min(90vw,36rem)] w-[min(90vw,36rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-200/50 dark:border-sky-500/15" />
        </div>

        <div className="relative w-full max-w-3xl page-enter">
          <div className="flex flex-col items-center text-center mb-10 sm:mb-12">
            <div className="mb-6 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5">
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-2xl bg-sky-400/30 blur-xl scale-110 dark:bg-sky-500/25" aria-hidden />
                <div className="relative rounded-2xl p-1 shadow-xl shadow-sky-500/20 ring-1 ring-white/50 dark:ring-slate-600/40 bg-white/30 dark:bg-slate-900/30 backdrop-blur-sm">
                  <MediCareLogo size="xl" title="MediCare HMS" />
                </div>
              </div>
              <MediCareWordmark
                className="items-center text-center sm:items-start sm:text-left"
                subtitle="Hospital Management System"
              />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-sky-600 dark:text-white mb-3">
              Secure access
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
              Sign in to your workspace
            </h1>
            <p className="mt-3 text-slate-600 dark:text-white text-sm sm:text-base max-w-md mx-auto leading-relaxed">
              Choose staff by role, or pick your name under Doctor. No password required.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200/70 dark:border-slate-700/70 bg-white/50 dark:bg-slate-900/45 backdrop-blur-xl p-5 sm:p-8 shadow-xl shadow-slate-300/25 dark:shadow-black/40 ring-1 ring-white/70 dark:ring-slate-600/25">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {DEMO_STAFF_USERS.map((user) => {
              const RoleIcon = roleIcons[user.role]
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleLogin(user)}
                  className="group text-left rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/75 dark:bg-slate-900/50 backdrop-blur-md p-6 shadow-sm shadow-slate-200/40 dark:shadow-none ring-1 ring-slate-200/50 dark:ring-slate-700/50 transition-all duration-300 hover:shadow-xl hover:shadow-sky-500/10 hover:ring-sky-200/60 dark:hover:ring-sky-500/30 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500/10 to-sky-600/5 dark:from-sky-500/20 dark:to-sky-600/10 flex items-center justify-center text-sky-600 dark:text-white shrink-0 ring-1 ring-sky-200/50 dark:ring-sky-500/20 group-hover:from-sky-500/15 group-hover:to-sky-600/10 transition-colors">
                      <RoleIcon className="h-6 w-6" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="font-bold text-slate-900 dark:text-white text-base tracking-tight">
                        {roleLabels[user.role]}
                      </div>
                      <div className="text-slate-600 dark:text-slate-400 text-sm mt-1 font-medium">{user.name}</div>
                      <div className="mt-4 text-sky-600 dark:text-white text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
                        Continue
                        <ArrowRight className="h-4 w-4" aria-hidden />
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}

            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/75 dark:bg-slate-900/50 backdrop-blur-md p-6 shadow-sm shadow-slate-200/40 dark:shadow-none ring-1 ring-slate-200/50 dark:ring-slate-700/50 sm:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
                <div className="flex items-start gap-4 shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500/10 to-sky-600/5 dark:from-sky-500/20 dark:to-sky-600/10 flex items-center justify-center text-sky-600 dark:text-white ring-1 ring-sky-200/50 dark:ring-sky-500/20">
                    <Stethoscope className="h-6 w-6" aria-hidden />
                  </div>
                  <div className="pt-0.5 min-w-0">
                    <div className="font-bold text-slate-900 dark:text-white text-base tracking-tight">
                      {roleLabels.doctor}
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 font-medium">
                      Select your name, then continue
                    </p>
                  </div>
                </div>
                <div className="flex flex-1 flex-col sm:flex-row gap-3 sm:items-start sm:justify-end min-w-0">
                  <span className="sr-only">Doctor name</span>
                  <div className="flex min-w-0 w-full flex-col sm:max-w-md">
                    <SearchableIdPicker<ScheduleDoctor>
                      id="login-doctor-select"
                      items={DEFAULT_SCHEDULE_DOCTORS}
                      selectedId={selectedDoctorId}
                      onSelectId={(id) => {
                        setSelectedDoctorId(id)
                        if (id) setDoctorSelectErr(null)
                      }}
                      getId={(d) => d.id}
                      getLabel={(d) => `${d.name} · ${d.department}`}
                      filterItem={(d, q) => {
                        const t = q.trim().toLowerCase()
                        if (!t) return true
                        return d.name.toLowerCase().includes(t) || d.department.toLowerCase().includes(t)
                      }}
                      placeholder="Search by name or department…"
                      emptyLabel="Choose doctor"
                      accent="sky"
                      allowClear={false}
                      className="w-full"
                    />
                    <FieldError>{doctorSelectErr}</FieldError>
                  </div>
                  <button
                    type="button"
                    onClick={handleDoctorContinue}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 transition-colors shrink-0"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
            </div>
          </div>
          </div>

          <p className="text-center text-xs font-medium text-slate-600 dark:text-slate-400 mt-8 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-sky-500" aria-hidden />
              MediCare HMS
            </span>
            <span className="text-slate-300 dark:text-white">·</span>
            <span>Role shortcuts</span>
          </p>
        </div>
      </div>
    </div>
  )
}
