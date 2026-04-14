import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import type { AppDispatch } from '../../app/store'
import { fetchInternalDoctors } from '../api/internalDoctorsApi'
import { internalRecordToScheduleDoctor } from '../types/internalDoctor'
import { setImportedScheduleDoctors } from '../../features/appointments/appointmentsSlice'

export default function ImportedDoctorsSync() {
  const dispatch = useDispatch<AppDispatch>()

  useEffect(() => {
    void (async () => {
      try {
        const rows = await fetchInternalDoctors()
        dispatch(setImportedScheduleDoctors(rows.map(internalRecordToScheduleDoctor)))
      } catch {
        /* API offline: keep seeded doctors */
      }
    })()
  }, [dispatch])

  return null
}
