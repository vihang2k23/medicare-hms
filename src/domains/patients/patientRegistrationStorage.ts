/** Draft key for the multi-step new-patient registration wizard (localStorage). */
export const PATIENT_REGISTRATION_FORM_STORAGE_KEY = 'medicare_hms_patient_registration_form'

/** Clears persisted registration draft (e.g. after leaving for the patient list). */
export function clearPatientRegistrationDraft(): void {
  try {
    localStorage.removeItem(PATIENT_REGISTRATION_FORM_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
