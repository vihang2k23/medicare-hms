import BedGrid from '../features/beds/BedGrid'

export default function NurseBeds() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400 mb-2">Ward</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Beds &amp; wards</h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-2 max-w-2xl leading-relaxed">
          Add beds per ward. Drag <strong className="text-slate-700 dark:text-slate-200">available</strong> beds onto
          another ward to transfer; remove empty beds from the bed panel. Admit, discharge, and status changes work
          as before. Ward registry is managed by administration.
        </p>
      </div>
      <BedGrid />
    </div>
  )
}
