import toast, { Toaster, ToastBar, type Toast } from 'react-hot-toast'
import { X } from 'lucide-react'

function ToastWithClose({ t }: { t: Toast }) {
  return (
    <ToastBar toast={t}>
      {({ icon, message }) => (
        <>
          {icon}
          {message}
          <button
            type="button"
            onClick={() => toast.dismiss(t.id)}
            className="shrink-0 mr-1.5 mt-0.5 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-white dark:hover:text-white dark:hover:bg-slate-700/80 transition-colors"
            aria-label="Close notification"
          >
            <X className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
        </>
      )}
    </ToastBar>
  )
}

/**
 * Global toast host — styles align with Tailwind dark mode (html.dark).
 * Every toast includes a dismiss control (Lucide X).
 */
export default function AppToaster() {
  return (
    <Toaster
      position="top-right"
      containerClassName="!z-[9999] no-print-toast"
      toastOptions={{
        duration: 4000,
        className:
          '!text-sm !font-semibold !rounded-xl !shadow-lg !shadow-slate-300/20 dark:!shadow-slate-950/25 !border !border-slate-200/90 dark:!border-slate-600/80 !bg-white/95 dark:!bg-slate-900/95 !backdrop-blur-md !text-slate-800 dark:!text-white !pr-1 !ring-1 !ring-slate-200/50 dark:!ring-slate-700/50',
        success: {
          iconTheme: {
            primary: '#0ea5e9',
            secondary: '#fff',
          },
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fff',
          },
        },
      }}
    >
      {(t) => <ToastWithClose t={t} />}
    </Toaster>
  )
}
