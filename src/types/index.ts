/**
 * Centralized type definitions for Medicare HMS
 * This file contains all shared types used across the application
 */

// =============================================================================
// AUTHENTICATION TYPES
// =============================================================================

export interface AuthUser {
  id: string
  role: Role
  name: string
  avatar: string
  /** Optional; for compatibility */
  email?: string
}

export interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
}

// =============================================================================
// ROLE & PERMISSION TYPES
// =============================================================================

export const ROLES = ['admin', 'doctor', 'receptionist', 'nurse'] as const
export type Role = (typeof ROLES)[number]

export type SidebarAccent = 'blue' | 'green' | 'purple' | 'orange'

export interface RoleSidebarLink {
  path: string
  label: string
}

export interface RoleConfigItem {
  /** Access level description */
  accessLevel: string
  /** Primary responsibilities (short) */
  description: string
  /** Sidebar links for this role */
  sidebarLinks: RoleSidebarLink[]
  /** Sidebar/nav accent color */
  accent: SidebarAccent
}

// =============================================================================
// APPOINTMENT TYPES
// =============================================================================

export interface ScheduleDoctor {
  id: string
  name: string
  department: string
  workingDays: number[]
  startTime: string
  endTime: string
  slotDurationMinutes: 15 | 20 | 30
  lunchBreakStart?: string
  lunchBreakEnd?: string
  source?: 'seed' | 'npi' | 'manual'
  npi?: string
  credential?: string
  phone?: string
  practiceAddressLine1?: string
  practiceCity?: string
  practiceState?: string
  practicePostalCode?: string
  primaryTaxonomyCode?: string
  primaryTaxonomyDesc?: string
}

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'in-progress'
  | 'completed'
  | 'cancelled'
  | 'no-show'

export interface Appointment {
  id: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  department: string
  date: string
  slotStart: string
  slotEnd: string
  status: AppointmentStatus
  reason?: string
  notes?: string
  createdAt: number
}

// =============================================================================
// PRESCRIPTION TYPES
// =============================================================================

export interface PrescriptionMedicineLine {
  id: string
  /** Display name (usually brand or generic chosen from search). */
  drugName: string
  dosage: string
  frequency: string
  duration?: string
  instructions?: string
  /** Brand / generic names from catalog selection. */
  openfdaBrand?: string[]
  openfdaGeneric?: string[]
  /** Last recall check summary (shown in form + stored for audit). */
  recallAlerts?: PrescriptionRecallSnapshot[]
}

export interface PrescriptionRecallSnapshot {
  recallId: string
  status: string
  classification: string
  reason: string
  productDescription: string
  reportDate: string
}

export type PrescriptionStatus = 'active' | 'completed' | 'cancelled'

export interface Prescription {
  id: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  diagnosis?: string
  notes?: string
  medicines: PrescriptionMedicineLine[]
  status: PrescriptionStatus
  createdAt: number
}

/** Drug label search hit (OpenFDA live or bundled catalog; same UI shape). */
export interface OpenFdaLabelHit {
  id: string
  brandNames: string[]
  genericNames: string[]
  routes: string[]
  labeler?: string
  productType?: string
  drugClass?: string
  indications?: string
  commonStrengths?: string[]
}

// =============================================================================
// QUEUE TYPES
// =============================================================================

export type OpdTokenStatus = 'waiting' | 'in-progress' | 'done' | 'skipped'

export interface OpdQueueToken {
  tokenId: number
  patientName: string
  department: string
  doctorId: string
  /** Denormalized for display (resolved at issue time). */
  doctorName: string
  issuedAt: number
  status: OpdTokenStatus
}

// =============================================================================
// BILLING TYPES
// =============================================================================

export type BillingRecordStatus = 'paid' | 'pending' | 'partial'

export interface BillingRecord {
  id: string
  patientId: string
  amount: number
  currency: string
  type: string
  description: string
  /** ISO date (calendar day) */
  date: string
  status: BillingRecordStatus
  sourceRef?: string
}

// =============================================================================
// UI COMPONENT TYPES
// =============================================================================

export interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'neutral'
  confirmLoading?: boolean
  confirmDisabled?: boolean
  titleId?: string
  onConfirm: () => void | Promise<void>
  onCancel: () => void
}

export type NavbarProps = {
  /**
   * When false, the sidebar burger is never shown (use on /login).
   * When logged out, the burger is hidden regardless of this prop.
   */
  showSidebarToggle?: boolean
}

// =============================================================================
// FORM & VALIDATION TYPES
// =============================================================================

export interface FieldErrorProps {
  error?: string
  className?: string
}

export interface FieldLabelProps {
  label: string
  required?: boolean
  className?: string
}

export interface FormInputProps {
  label?: string
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  error?: string
  required?: boolean
  disabled?: boolean
  type?: 'text' | 'email' | 'password' | 'number' | 'tel'
  className?: string
}

export interface FormTextareaProps {
  label?: string
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  error?: string
  required?: boolean
  disabled?: boolean
  rows?: number
  className?: string
}

// =============================================================================
// DEMO ACCOUNT TYPES
// =============================================================================

export interface DemoLoginEntry {
  id: string
  name: string
  role: Role
  avatar: string
  email?: string
}

// =============================================================================
// NOTIFICATION TYPES
// =============================================================================

export interface NotificationItem {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  timestamp: number
  read: boolean
}

// =============================================================================
// BED MANAGEMENT TYPES
// =============================================================================

export type BedStatus = 'available' | 'occupied' | 'maintenance' | 'reserved'

export interface Bed {
  id: string
  number: string
  ward: string
  status: BedStatus
  patientId?: string
  patientName?: string
  admittedAt?: number
  notes?: string
}

// =============================================================================
// VITALS TYPES
// =============================================================================

export interface VitalsRecord {
  id: string
  patientId: string
  patientName: string
  recordedBy: string
  recordedAt: number
  temperature?: number
  bloodPressureSystolic?: number
  bloodPressureDiastolic?: number
  heartRate?: number
  respiratoryRate?: number
  oxygenSaturation?: number
  weight?: number
  height?: number
  notes?: string
}

// =============================================================================
// DOCTOR TYPES
// =============================================================================

export interface Doctor {
  id: string
  name: string
  department: string
  npi?: string
  credential?: string
  phone?: string
  email?: string
  practiceAddressLine1?: string
  practiceCity?: string
  practiceState?: string
  practicePostalCode?: string
  primaryTaxonomyCode?: string
  primaryTaxonomyDesc?: string
  availability?: {
    workingDays: number[]
    startTime: string
    endTime: string
    slotDurationMinutes: 15 | 20 | 30
  }
}

// =============================================================================
// PATIENT TYPES
// =============================================================================

export interface Patient {
  id: string
  name: string
  dateOfBirth: string
  gender: 'male' | 'female' | 'other'
  phone?: string
  email?: string
  address?: string
  emergencyContact?: {
    name: string
    relationship: string
    phone: string
  }
  medicalHistory?: string
  allergies?: string[]
  currentMedications?: string[]
  createdAt: number
  updatedAt: number
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type LetterShortcutKey = 'n' | 'q' | 'b'

export interface RoleShortcutRow {
  key: LetterShortcutKey
  keysLabel: string
  label: string
  path: string
}

export type Theme = 'light' | 'dark' | 'system'

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasNext: boolean
  hasPrev: boolean
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// =============================================================================
// DEPARTMENT TYPES
// =============================================================================

export interface Department {
  id: string
  name: string
  description?: string
  head?: string
  location?: string
  capacity?: number
}

// =============================================================================
// WARD TYPES
// =============================================================================

export interface Ward {
  id: string
  name: string
  type: string
  capacity: number
  currentOccupancy: number
  location?: string
  notes?: string
}

// =============================================================================
// INTERNAL DOCTOR TYPES
// =============================================================================

/** ISO weekday: Mon = 1 ... Sun = 7 (date-fns `getISODay`). */
export const ISO_WEEKDAY_SHORT: Record<number, string> = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
  7: 'Sun',
}

/** Row persisted in JSON Server (`internalDoctors`) - mirrors schedule fields + NPI snapshot. */
export interface InternalDoctorRecord {
  id: string
  /** Registry NPI, or empty for manual-only providers */
  npi: string
  name: string
  department: string
  workingDays: number[]
  startTime: string
  endTime: string
  slotDurationMinutes: 15 | 20 | 30
  lunchBreakStart?: string
  lunchBreakEnd?: string
  /** From NPI import vs added manually in HMS */
  source?: 'npi' | 'manual'
  credential?: string
  phone?: string
  fax?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  postalCode?: string
  enumerationType?: string
  taxonomyCode?: string
  taxonomyDesc?: string
  /** Full NPPES result object for profile / audit */
  rawResult: unknown
  importedAt: number
}

// =============================================================================
// INTERNAL DOCTOR UTILITIES
// =============================================================================

export function formatInternalDoctorScheduleSummary(r: InternalDoctorRecord): string {
  const days = [...r.workingDays]
    .sort((a, b) => a - b)
    .map((d) => ISO_WEEKDAY_SHORT[d] ?? String(d))
    .join(', ')
  const lunch =
    r.lunchBreakStart && r.lunchBreakEnd
      ? ` · lunch ${r.lunchBreakStart}-${r.lunchBreakEnd}`
      : ''
  return `${days || '---'} · ${r.startTime}-${r.endTime}${lunch} · ${r.slotDurationMinutes}m slots`
}

export function createManualInternalRecord(input: {
  name: string
  department: string
  npi?: string
  phone?: string
  workingDays: number[]
  startTime: string
  endTime: string
  slotDurationMinutes: 15 | 20 | 30
  lunchBreakStart?: string
  lunchBreakEnd?: string
}): InternalDoctorRecord {
  const npiDigits = (input.npi ?? '').replace(/\D/g, '').slice(0, 10)
  return {
    id: `manual-${crypto.randomUUID()}`,
    npi: npiDigits,
    name: input.name.trim(),
    department: input.department.trim(),
    workingDays: input.workingDays,
    startTime: input.startTime,
    endTime: input.endTime,
    slotDurationMinutes: input.slotDurationMinutes,
    lunchBreakStart: input.lunchBreakStart?.trim() || undefined,
    lunchBreakEnd: input.lunchBreakEnd?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    source: 'manual',
    rawResult: {},
    importedAt: Date.now(),
  }
}

export function internalRecordToScheduleDoctor(r: InternalDoctorRecord): ScheduleDoctor {
  const src = r.source ?? (r.id.startsWith('manual-') ? 'manual' : 'npi')
  return {
    id: r.id,
    name: r.name,
    department: r.department,
    workingDays: r.workingDays,
    startTime: r.startTime,
    endTime: r.endTime,
    slotDurationMinutes: r.slotDurationMinutes,
    lunchBreakStart: r.lunchBreakStart,
    lunchBreakEnd: r.lunchBreakEnd,
    source: src === 'manual' ? 'manual' : 'npi',
    npi: r.npi || undefined,
    credential: r.credential,
    phone: r.phone,
    practiceAddressLine1: r.addressLine1,
    practiceCity: r.city,
    practiceState: r.state,
    practicePostalCode: r.postalCode,
    primaryTaxonomyCode: r.taxonomyCode,
    primaryTaxonomyDesc: r.taxonomyDesc,
  }
}
