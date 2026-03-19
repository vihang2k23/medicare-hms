import { useSelector } from 'react-redux'
import type { RootState } from '../../app/store'

export default function BedGrid() {
  const { beds, wardSummary } = useSelector((state: RootState) => state.beds)

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:border dark:border-slate-700 p-4">
        <h2 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-3">Ward summary</h2>
        {Object.keys(wardSummary).length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400 text-sm">No ward data.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(wardSummary).map(([wardId, counts]) => (
              <div key={wardId} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded">
                <div className="font-medium text-slate-800 dark:text-slate-100">{wardId}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Avail: {counts.available} | Occupied: {counts.occupied} | Reserved: {counts.reserved}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:border dark:border-slate-700 p-4">
        <h2 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-3">Bed grid</h2>
        {beds.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400 text-sm">No beds.</p>
        ) : (
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
            {beds.map((bed) => (
              <div
                key={bed.id}
                className={`p-2 rounded text-center text-sm font-medium ${
                  bed.status === 'available'
                    ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200'
                    : bed.status === 'occupied'
                      ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200'
                      : bed.status === 'reserved'
                        ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200'
                        : 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200'
                }`}
                title={`${bed.wardName} - ${bed.bedNumber}`}
              >
                {bed.bedNumber}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
