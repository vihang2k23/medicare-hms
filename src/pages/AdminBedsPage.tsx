import BedGrid from '../features/beds/BedGrid'

/** Admin route — full ward summary + interactive grid (same Redux state as nurse view). */
export default function AdminBedsPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400 mb-2">
          Capacity
        </p>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Bed management</h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-2 max-w-2xl leading-relaxed">
          Ward-level occupancy, bed status, admissions, and discharges. Changes sync with the nurse ward view
          (shared session state).
        </p>
      </div>
      <BedGrid />
    </div>
  )
}
