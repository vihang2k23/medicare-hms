/**
 * Maps authenticated doctor user id to the schedule `doctorId` used in the
 * appointments slice (same convention as the doctor schedule view).
 */
export const AUTH_USER_TO_SCHEDULE_DOCTOR: Record<string, string> = {
  DOC001: 'D1',
}

export function scheduleDoctorIdForAuthUser(userId: string | undefined): string {
  if (!userId) return 'D1'
  return AUTH_USER_TO_SCHEDULE_DOCTOR[userId] ?? 'D1'
}
