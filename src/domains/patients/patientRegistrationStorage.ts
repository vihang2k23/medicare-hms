import { PATIENT_REGISTRATION_FORM_STORAGE_KEY } from '../../constants/storageKeys'

/** Clears persisted registration draft (e.g. after leaving for the patient list). */
export function clearPatientRegistrationDraft(): void {
  try {
    localStorage.removeItem(PATIENT_REGISTRATION_FORM_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
