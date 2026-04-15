import BedGrid from '../features/beds/BedGrid'

// AdminBedsPage defines the Admin Beds Page UI surface and its primary interaction flow.
/** Admin route for ward summary and interactive grid management. */
export default function AdminBedsPage() {
  return (
    <div className="space-y-8">
      {/* Intro copy explains admin-only bed transfer and configuration actions. */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-white mb-2">
          Capacity
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Bed management</h1>
        <p className="text-slate-600 dark:text-white text-sm mt-2 max-w-2xl leading-relaxed">
          Configure wards (admin only). Add or remove empty beds; drag <strong className="text-slate-700 dark:text-white">available</strong> beds onto another ward to transfer. Changes sync with the nurse bed view.
        </p>
      </div>
      <BedGrid showWardManagement />
    </div>
  )
}
