import toast from 'react-hot-toast'

/** Consistent app notifications (react-hot-toast). */
export const notify = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  loading: (message: string) => toast.loading(message),
  dismiss: (id: string) => toast.dismiss(id),
  promise: toast.promise,
}
