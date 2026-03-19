import { useSelector } from 'react-redux'
import type { RootState } from '../../app/store'

export default function BedGrid() {
  const { beds, wardSummary } = useSelector((state: RootState) => state.beds)

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-medium text-gray-800 mb-3">Ward summary</h2>
        {Object.keys(wardSummary).length === 0 ? (
          <p className="text-gray-500 text-sm">No ward data.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(wardSummary).map(([wardId, counts]) => (
              <div key={wardId} className="p-3 bg-gray-50 rounded">
                <div className="font-medium text-gray-800">{wardId}</div>
                <div className="text-sm text-gray-600">
                  Avail: {counts.available} | Occupied: {counts.occupied} | Reserved: {counts.reserved}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-medium text-gray-800 mb-3">Bed grid</h2>
        {beds.length === 0 ? (
          <p className="text-gray-500 text-sm">No beds.</p>
        ) : (
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
            {beds.map((bed) => (
              <div
                key={bed.id}
                className={`p-2 rounded text-center text-sm font-medium ${
                  bed.status === 'available'
                    ? 'bg-green-100 text-green-800'
                    : bed.status === 'occupied'
                      ? 'bg-red-100 text-red-800'
                      : bed.status === 'reserved'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-gray-200 text-gray-700'
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
