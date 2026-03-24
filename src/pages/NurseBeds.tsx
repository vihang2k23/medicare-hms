import BedGrid from '../features/beds/BedGrid'

export default function NurseBeds() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400 mb-2">Ward</p>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Beds &amp; wards</h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-2 max-w-2xl leading-relaxed">
          Tap a bed to change status, admit a patient, or discharge. Ward cards show availability at a glance.
        </p>
      </div>
      <BedGrid />
    </div>
  )
}
