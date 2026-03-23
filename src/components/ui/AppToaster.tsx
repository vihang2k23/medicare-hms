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
            className="shrink-0 mr-1.5 mt-0.5 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-700/80 transition-colors"
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
      containerClassName="!z-[9999]"
      toastOptions={{
        duration: 4000,
        className:
          '!text-sm !font-medium !shadow-lg !border !border-slate-200 dark:!border-slate-600 !bg-white dark:!bg-slate-800 !text-slate-800 dark:!text-slate-100 !pr-1',
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
