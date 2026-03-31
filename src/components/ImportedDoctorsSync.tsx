import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import type { AppDispatch } from '../app/store'
import { fetchInternalDoctors } from '../api/internalDoctorsApi'
import { internalRecordToScheduleDoctor } from '../types/internalDoctor'
import { setImportedScheduleDoctors } from '../features/appointments/appointmentsSlice'

/** Loads NPI-imported doctors from JSON Server into Redux (merges with seeded schedule doctors). */
export default function ImportedDoctorsSync() {
  const dispatch = useDispatch<AppDispatch>()

  useEffect(() => {
    void (async () => {
      try {
        const rows = await fetchInternalDoctors()
        dispatch(setImportedScheduleDoctors(rows.map(internalRecordToScheduleDoctor)))
      } catch {
        /* JSON Server may be offline — demo still runs with seeded doctors only */
      }
    })()
  }, [dispatch])

  return null
}
