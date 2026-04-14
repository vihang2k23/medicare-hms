/**
 * Maps authenticated doctor user id to the schedule `doctorId` used in the
 * appointments slice. Demo doctors use the same id as the schedule (D1, D2, …).
 * Legacy builds used DOC001 — still mapped for any persisted sessions / old data.
 */
const LEGACY_AUTH_TO_SCHEDULE_DOCTOR: Record<string, string> = {
  DOC001: 'D1',
}

export function scheduleDoctorIdForAuthUser(userId: string | undefined): string {
  if (!userId) return 'D1'
  return LEGACY_AUTH_TO_SCHEDULE_DOCTOR[userId] ?? userId
}
