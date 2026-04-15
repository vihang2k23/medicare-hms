import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { Bell, X } from 'lucide-react'
import type { AppDispatch, RootState } from '../../app/store'
import { removeAlert } from './alertSlice'

// NotificationBell defines the Notification Bell UI surface and its primary interaction flow.
export interface NotificationBellProps {
  /** Close other chrome (e.g. user menu) when opening notifications. */
  onOpen?: () => void
}

// NotificationBell renders the notification bell UI.
export default function NotificationBell({ onOpen }: NotificationBellProps) {
  const dispatch = useDispatch<AppDispatch>()
  const alerts = useSelector((state: RootState) => state.alerts.alerts)
  const count = alerts.length
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handlePointerDown(e: MouseEvent | TouchEvent) {
      const el = rootRef.current
      if (el && !el.contains(e.target as Node)) setOpen(false)
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown, { passive: true })
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => {
            const next = !o
            if (next) onOpen?.()
            return next
          })
        }}
        className="relative p-2.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100/90 dark:text-white dark:hover:text-white dark:hover:bg-slate-800/80 transition-all duration-200 touch-manipulation"
        aria-label="Alerts"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell className="h-5 w-5 pointer-events-none" aria-hidden />
        {count > 0 && (
          <span className="pointer-events-none absolute top-1.5 right-1.5 h-4 min-w-4 px-1 flex items-center justify-center bg-red-500 text-white text-xs font-medium rounded-full tabular-nums">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div
          className="no-print-appt fixed z-[100] top-[calc(4rem+0.5rem)] right-3 sm:right-4 lg:right-8 w-[min(calc(100vw-1.5rem),22rem)] rounded-2xl border border-slate-200/90 bg-white/98 py-2 shadow-2xl shadow-slate-300/40 ring-1 ring-slate-200/60 backdrop-blur-xl dark:border-slate-700/90 dark:bg-slate-900/98 dark:shadow-slate-950/40 dark:ring-slate-700/60 max-h-[min(24rem,calc(100dvh-5.5rem))] flex flex-col"
          role="dialog"
          aria-label="Notifications"
        >
          <div className="flex items-center justify-between gap-2 px-3 pb-2 border-b border-slate-200/80 dark:border-slate-700/80 shrink-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-white"
              aria-label="Close notifications"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="overflow-y-auto overscroll-contain px-2 py-2 min-h-0 flex-1">
            {alerts.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-white px-2 py-4 text-center">No alerts right now.</p>
            ) : (
              <ul className="space-y-1.5">
                {alerts.map((a) => (
                  <li
                    key={a.id}
                    className={`rounded-xl p-2.5 pr-10 relative text-sm ${
                      a.level === 'error'
                        ? 'bg-red-50 dark:bg-red-900/25 text-red-900 dark:text-white'
                        : a.level === 'warning'
                          ? 'bg-amber-50 dark:bg-amber-900/25 text-amber-950 dark:text-white'
                          : 'bg-sky-50 dark:bg-sky-900/20 text-sky-950 dark:text-white'
                    }`}
                  >
                    <p className="font-medium leading-snug pr-1">{a.message}</p>
                    <p className="mt-1 text-[11px] opacity-80">
                      {formatDistanceToNow(a.timestamp, { addSuffix: true })}
                    </p>
                    <button
                      type="button"
                      onClick={() => dispatch(removeAlert(a.id))}
                      className="absolute top-2 right-2 p-1 rounded-lg opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10"
                      aria-label="Dismiss alert"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="shrink-0 border-t border-slate-200/80 dark:border-slate-700/80 px-2 pt-2">
            <Link
              to="/admin"
              onClick={() => setOpen(false)}
              className="block w-full text-center rounded-xl py-2.5 text-sm font-semibold text-sky-700 dark:text-white hover:bg-sky-50 dark:hover:bg-sky-950/50 transition-colors"
            >
              Open admin dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
