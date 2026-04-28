import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import {
  ClipboardCheck,
  HeartPulse,
  ImagePlus,
  MapPin,
  Phone,
  User,
} from 'lucide-react'
import { FieldError, FieldLabel, FormField, FormInput } from '../../components/common'
import {
  isoDateLocalToday,
  patientRegistrationSchema,
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  STEP_FIELD_KEYS,
  patientRecordToFormValues,
  type PatientFormValues,
} from '../../schema/patient.schema'
import type { PatientRecord } from '../../types'
import { createPatient, updatePatient } from '../../services/patientsApi'
import { notify } from '../../utils/helpers'
import { generatePatientId } from './patientId'
import { PATIENT_REGISTRATION_FORM_STORAGE_KEY } from './patientRegistrationStorage'

const defaultValues: PatientFormValues = {
  fullName: '',
  dob: '',
  gender: 'male',
  bloodGroup: 'O+',
  photo: null,
  phone: '',
  email: '',
  address: '',
  city: '',
  state: '',
  pin: '',
  allergies: '',
  chronicConditions: '',
  pastSurgeries: '',
  currentMedications: '',
  emergencyName: '',
  emergencyRelationship: '',
  emergencyPhone: '',
}

const STEPS = ['Personal', 'Contact', 'Medical', 'Emergency', 'Review'] as const

const STEP_ICONS = [User, MapPin, HeartPulse, Phone, ClipboardCheck] as const

const GENDER_PICKER = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
  { id: 'other', label: 'Other' },
] as const

const BLOOD_PICKER = [
  { id: '', label: 'Select' },
  ...(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const).map((b) => ({ id: b, label: b })),
]

const stepSchemas = [step1Schema, step2Schema, step3Schema, step4Schema] as const

interface PatientRegistrationFormProps {
  onSuccess?: () => void
  /** Where to navigate after successful save */
  redirectTo?: string
  /** Step 0: left footer becomes a link here instead of a disabled “Back” */
  exitTo?: string
  exitLabel?: string
  /** When set, form PATCHes this record instead of creating a new one */
  initialRecord?: PatientRecord | null
}

const exitLinkClass =
  'inline-flex items-center justify-center px-5 py-2.5 rounded-xl border-2 border-slate-300/90 dark:border-slate-500 bg-white/90 dark:bg-slate-800/90 text-slate-800 dark:text-white font-semibold text-sm shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors'

// PatientRegistrationForm renders the patient registration form UI.
export default function PatientRegistrationForm({
  onSuccess,
  redirectTo = '/admin/patients',
  exitTo,
  exitLabel = '← Back',
  initialRecord = null,
}: PatientRegistrationFormProps) {
  const navigate = useNavigate()

  // Load persisted step
  const getInitialStep = () => {
    if (initialRecord) return 0
    try {
      const stored = localStorage.getItem(PATIENT_REGISTRATION_FORM_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as { step?: number }
        const s = parsed.step ?? 0
        if (typeof s !== 'number' || s < 0 || s >= STEPS.length) return 0
        return s
      }
    } catch {
      // Ignore parse errors
    }
    return 0
  }

  const [step, setStep] = useState<number>(getInitialStep)
  const stepRef = useRef(step)
  stepRef.current = step
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const isEdit = !!initialRecord

  // Load persisted data if no initialRecord
  const getInitialData = () => {
    if (initialRecord) return patientRecordToFormValues(initialRecord)
    try {
      const stored = localStorage.getItem(PATIENT_REGISTRATION_FORM_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return { ...defaultValues, ...parsed.data }
      }
    } catch {
      // Ignore parse errors
    }
    return defaultValues
  }

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientRegistrationSchema),
    defaultValues: getInitialData(),
    mode: 'onChange',
    reValidateMode: 'onChange',
  })

  const {
    register,
    control,
    handleSubmit,
    trigger,
    watch,
    reset,
    formState: { errors },
    setValue,
  } = form

  useEffect(() => {
    if (initialRecord) {
      reset(patientRecordToFormValues(initialRecord))
      setStep(0)
    }
  }, [initialRecord, reset])

  // Persist form data and step to localStorage (subscribe so typing is saved; step via ref).
  // `step` is in deps so Next/Back updates storage even when no field changes (otherwise refresh
  // restores a stale step).
  useEffect(() => {
    if (isEdit) return
    const persist = () => {
      try {
        localStorage.setItem(
          PATIENT_REGISTRATION_FORM_STORAGE_KEY,
          JSON.stringify({
            data: form.getValues(),
            step: stepRef.current,
            timestamp: Date.now(),
          }),
        )
      } catch {
        /* quota / private mode */
      }
    }
    persist()
    /* eslint-disable react-hooks/incompatible-library */
    const sub = watch(() => persist())
    return () => sub.unsubscribe()
    /* eslint-enable react-hooks/incompatible-library */
  }, [watch, isEdit, form, step])

  const next = async () => {
    setSubmitError(null)
    const schema = stepSchemas[step]
    const fields = STEP_FIELD_KEYS[step]
    const slice = form.getValues()
    const data = Object.fromEntries(fields.map((k) => [k, slice[k]])) as Record<string, unknown>
    const parsed = schema.safeParse(data)
    if (!parsed.success) {
      await trigger(fields)
      return
    }
    setStep((s) => s + 1)
  }

  const back = () => {
    setSubmitError(null)
    setStep((s) => Math.max(0, s - 1))
  }

  const onSubmit = async (values: PatientFormValues) => {
    setSubmitting(true)
    setSubmitError(null)
    try {
      if (initialRecord) {
        const record: PatientRecord = {
          ...initialRecord,
          fullName: values.fullName,
          dob: values.dob,
          gender: values.gender,
          bloodGroup: values.bloodGroup,
          phone: values.phone,
          email: values.email,
          address: values.address,
          city: values.city,
          state: values.state,
          pin: values.pin,
          photo: values.photo ?? null,
          allergies: values.allergies ?? '',
          chronicConditions: values.chronicConditions ?? '',
          pastSurgeries: values.pastSurgeries ?? '',
          currentMedications: values.currentMedications ?? '',
          emergencyName: values.emergencyName,
          emergencyRelationship: values.emergencyRelationship,
          emergencyPhone: values.emergencyPhone,
        }
        await updatePatient(initialRecord.id, record)
        onSuccess?.()
        notify.success('Patient record updated')
        navigate(redirectTo, { replace: true })
        return
      }

      const id = await generatePatientId()
      const record: PatientRecord = {
        id,
        fullName: values.fullName,
        dob: values.dob,
        gender: values.gender,
        bloodGroup: values.bloodGroup,
        phone: values.phone,
        email: values.email,
        address: values.address,
        city: values.city,
        state: values.state,
        pin: values.pin,
        photo: values.photo ?? null,
        allergies: values.allergies ?? '',
        chronicConditions: values.chronicConditions ?? '',
        pastSurgeries: values.pastSurgeries ?? '',
        currentMedications: values.currentMedications ?? '',
        emergencyName: values.emergencyName,
        emergencyRelationship: values.emergencyRelationship,
        emergencyPhone: values.emergencyPhone,
        createdAt: Date.now(),
        isActive: true,
      }
      await createPatient(record)
      localStorage.removeItem(PATIENT_REGISTRATION_FORM_STORAGE_KEY)
      onSuccess?.()
      notify.success(`Patient registered · ${id}`)
      navigate(redirectTo, { replace: false, state: { registeredId: id } })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save patient'
      setSubmitError(msg)
      notify.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const photoPreview = watch('photo')

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      setValue('photo', null)
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') setValue('photo', result, { shouldValidate: true })
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between gap-2 sm:gap-0 sm:justify-between text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
          {STEPS.map((label, i) => {
            const Icon = STEP_ICONS[i]!
            const active = i <= step
            return (
              <span
                key={label}
                className={`inline-flex items-center justify-center gap-1 shrink-0 whitespace-nowrap ${active ? 'text-sky-600 dark:text-white' : ''}`}
                title={label}
              >
                <Icon
                  className={`h-5 w-5 sm:h-3.5 sm:w-3.5 shrink-0 ${active ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'}`}
                  aria-hidden
                />
                <span className="hidden sm:inline">{label}</span>
              </span>
            )
          })}
        </div>
        <div className="h-2.5 rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden ring-1 ring-slate-200/50 dark:ring-slate-700/50">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-sky-600 shadow-sm shadow-sky-500/30 transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      <form
        onSubmit={(e) => {
          /* No native submit — avoids Enter key / accidental submit on Review; user must click Save */
          e.preventDefault()
        }}
        className="space-y-6"
      >
        {step === 0 && (
          <div className="space-y-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/85 dark:bg-slate-900/45 backdrop-blur-sm p-6 sm:p-7 shadow-sm shadow-slate-200/30 dark:shadow-none ring-1 ring-slate-200/40 dark:ring-slate-700/40">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <User className="h-5 w-5 text-sky-600 dark:text-sky-400 shrink-0" aria-hidden />
              Personal information
            </h2>
            <div>
              <label htmlFor="patient-reg-fullName" className="block mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                Full name <span className="text-red-600">*</span>
              </label>
              <input
                id="patient-reg-fullName"
                type="text"
                {...register('fullName')}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/25 focus:border-sky-400 outline-none transition-colors"
                placeholder="Enter full name"
                maxLength={100}
              />
              {errors.fullName && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.fullName.message}</p>}
            </div>
            <div>
              <label htmlFor="patient-reg-dob" className="block mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                Date of birth <span className="text-red-600">*</span>
              </label>
              <input
                id="patient-reg-dob"
                type="date"
                min="1900-01-01"
                max={isoDateLocalToday()}
                {...register('dob')}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/25 focus:border-sky-400 outline-none transition-colors"
              />
              {errors.dob && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.dob.message}</p>}
            </div>
            <div>
              <label htmlFor="patient-reg-gender" className="block mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                Gender <span className="text-red-600">*</span>
              </label>
              <select
                id="patient-reg-gender"
                {...register('gender')}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/25 focus:border-sky-400 outline-none transition-colors"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              {errors.gender && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.gender.message}</p>}
            </div>
            <div>
              <label htmlFor="patient-reg-bloodGroup" className="block mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                Blood group <span className="text-red-600">*</span>
              </label>
              <select
                id="patient-reg-bloodGroup"
                {...register('bloodGroup')}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/25 focus:border-sky-400 outline-none transition-colors"
              >
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
              {errors.bloodGroup && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.bloodGroup.message}</p>}
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                Photo (optional)
              </label>
              <input type="file" accept="image/*" onChange={handlePhoto} className="text-sm text-slate-600 dark:text-white" />
              {photoPreview && (
                <img src={photoPreview} alt="" className="mt-2 h-24 w-24 object-cover rounded-lg border border-slate-200 dark:border-slate-600" />
              )}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/85 dark:bg-slate-900/45 backdrop-blur-sm p-6 sm:p-7 shadow-sm shadow-slate-200/30 dark:shadow-none ring-1 ring-slate-200/40 dark:ring-slate-700/40">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <MapPin className="h-5 w-5 text-sky-600 dark:text-sky-400 shrink-0" aria-hidden />
              Contact & address
            </h2>
            <div>
              <label htmlFor="patient-reg-phone" className="block mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                Phone <span className="text-red-600">*</span>
              </label>
              <input
                id="patient-reg-phone"
                type="tel"
                {...register('phone')}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/25 focus:border-sky-400 outline-none transition-colors"
                placeholder="Enter phone number"
                maxLength={15}
              />
              {errors.phone && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.phone.message}</p>}
            </div>
            <div>
              <label htmlFor="patient-reg-email" className="block mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                Email <span className="text-red-600">*</span>
              </label>
              <input
                id="patient-reg-email"
                type="email"
                {...register('email')}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/25 focus:border-sky-400 outline-none transition-colors"
                placeholder="Enter email address"
                maxLength={100}
              />
              {errors.email && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label htmlFor="patient-reg-address" className="block mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                Address <span className="text-red-600">*</span>
              </label>
              <textarea
                id="patient-reg-address"
                {...register('address')}
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/25 focus:border-sky-400 outline-none transition-colors resize-y"
                placeholder="Enter street address"
              />
              {errors.address && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.address.message}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="patient-reg-city" className="block mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                  City <span className="text-red-600">*</span>
                </label>
                <input
                  id="patient-reg-city"
                  {...register('city')}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/25 focus:border-sky-400 outline-none transition-colors"
                  placeholder="Enter city"
                />
                {errors.city && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.city.message}</p>}
              </div>
              <div>
                <label htmlFor="patient-reg-state" className="block mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                  State <span className="text-red-600">*</span>
                </label>
                <input
                  id="patient-reg-state"
                  {...register('state')}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/25 focus:border-sky-400 outline-none transition-colors"
                  placeholder="Enter state"
                />
                {errors.state && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.state.message}</p>}
              </div>
              <div>
                <label htmlFor="patient-reg-pin" className="block mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                  PIN / ZIP <span className="text-red-600">*</span>
                </label>
                <input
                  id="patient-reg-pin"
                  {...register('pin')}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/25 focus:border-sky-400 outline-none transition-colors"
                  placeholder="Enter PIN/ZIP code"
                />
                {errors.pin && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.pin.message}</p>}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/85 dark:bg-slate-900/45 backdrop-blur-sm p-6 sm:p-7 shadow-sm shadow-slate-200/30 dark:shadow-none ring-1 ring-slate-200/40 dark:ring-slate-700/40">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <HeartPulse className="h-5 w-5 text-sky-600 dark:text-sky-400 shrink-0" aria-hidden />
              Medical history
            </h2>
            <div>
              <label htmlFor="patient-reg-allergies" className="block mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                Known allergies
              </label>
              <textarea
                id="patient-reg-allergies"
                {...register('allergies')}
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/25 focus:border-sky-400 outline-none transition-colors resize-y"
                placeholder="None if not applicable"
              />
            </div>
            <div>
              <label htmlFor="patient-reg-chronic" className="block mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                Chronic conditions
              </label>
              <textarea id="patient-reg-chronic" {...register('chronicConditions')} rows={2} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/25 focus:border-sky-400 outline-none transition-colors resize-y" placeholder="None if not applicable" />
            </div>
            <div>
              <label htmlFor="patient-reg-surgeries" className="block mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                Past surgeries
              </label>
              <textarea id="patient-reg-surgeries" {...register('pastSurgeries')} rows={2} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/25 focus:border-sky-400 outline-none transition-colors resize-y" placeholder="None if not applicable" />
            </div>
            <div>
              <label htmlFor="patient-reg-meds" className="block mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                Current medications
              </label>
              <textarea id="patient-reg-meds" {...register('currentMedications')} rows={2} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/25 focus:border-sky-400 outline-none transition-colors resize-y" placeholder="None if not applicable" />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/85 dark:bg-slate-900/45 backdrop-blur-sm p-6 sm:p-7 shadow-sm shadow-slate-200/30 dark:shadow-none ring-1 ring-slate-200/40 dark:ring-slate-700/40">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <Phone className="h-5 w-5 text-sky-600 dark:text-sky-400 shrink-0" aria-hidden />
              Emergency contact
            </h2>
            <div>
              <label htmlFor="patient-reg-emergency-name" className="block mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                Full name <span className="text-red-600">*</span>
              </label>
              <input
                id="patient-reg-emergency-name"
                {...register('emergencyName')}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/25 focus:border-sky-400 outline-none transition-colors"
                placeholder="Enter emergency contact name"
              />
              {errors.emergencyName && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.emergencyName.message}</p>}
            </div>
            <div>
              <label htmlFor="patient-reg-emergency-rel" className="block mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                Relationship <span className="text-red-600">*</span>
              </label>
              <input
                id="patient-reg-emergency-rel"
                {...register('emergencyRelationship')}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/25 focus:border-sky-400 outline-none transition-colors"
                placeholder="e.g. Spouse, Parent, Friend"
              />
              {errors.emergencyRelationship && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.emergencyRelationship.message}</p>}
            </div>
            <div>
              <label htmlFor="patient-reg-emergency-phone" className="block mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                Phone <span className="text-red-600">*</span>
              </label>
              <input
                id="patient-reg-emergency-phone"
                type="tel"
                {...register('emergencyPhone')}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/25 focus:border-sky-400 outline-none transition-colors"
                placeholder="Enter emergency contact phone"
              />
              {errors.emergencyPhone && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.emergencyPhone.message}</p>}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/85 dark:bg-slate-900/45 backdrop-blur-sm p-6 sm:p-7 shadow-sm shadow-slate-200/30 dark:shadow-none ring-1 ring-slate-200/40 dark:ring-slate-700/40 space-y-3 text-sm">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-sky-600 dark:text-sky-400 shrink-0" aria-hidden />
              Review & submit
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-xs mb-4">
              Nothing is saved until you click <strong className="text-slate-700 dark:text-white">{isEdit ? 'Save changes' : 'Register patient'}</strong> below.
            </p>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 dark:text-white">
              <dt className="font-medium text-slate-800 dark:text-white">Patient ID</dt>
              <dd className="text-slate-600 dark:text-slate-400 font-mono text-xs">{isEdit ? initialRecord!.id : 'Assigned on save'}</dd>
              <dt className="font-medium text-slate-800 dark:text-white">Name</dt>
              <dd>{watch('fullName')}</dd>
              <dt className="font-medium text-slate-800 dark:text-white">DOB</dt>
              <dd>{watch('dob')}</dd>
              <dt className="font-medium text-slate-800 dark:text-white">Gender / Blood</dt>
              <dd>
                {watch('gender')} / {watch('bloodGroup')}
              </dd>
              <dt className="font-medium text-slate-800 dark:text-white">Phone / Email</dt>
              <dd>
                {watch('phone')} / {watch('email')}
              </dd>
              <dt className="font-medium text-slate-800 dark:text-white">Address</dt>
              <dd className="sm:col-span-1">
                {watch('address')}, {watch('city')}, {watch('state')} {watch('pin')}
              </dd>
              <dt className="font-medium text-slate-800 dark:text-white">Emergency</dt>
              <dd>
                {watch('emergencyName')} ({watch('emergencyRelationship')}) — {watch('emergencyPhone')}
              </dd>
            </dl>
          </div>
        )}

        {submitError && (
          <FieldError className="!mt-0 mb-3" placement="above">
            {submitError}
          </FieldError>
        )}

        <div className="flex flex-wrap gap-3 justify-between">
          {step === 0 && exitTo ? (
            <Link to={exitTo} className={exitLinkClass}>
              {exitLabel}
            </Link>
          ) : (
            <button
              type="button"
              onClick={back}
              disabled={step === 0}
              className="px-5 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-600 text-slate-700 dark:text-white font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800/80 disabled:opacity-40 transition-colors"
            >
              Back
            </button>
          )}
          <div className="flex gap-3">
            {step < 4 ? (
              <button
                type="button"
                onClick={next}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-500 hover:to-sky-600 text-white font-semibold text-sm shadow-lg shadow-sky-500/25 transition-all"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleSubmit(onSubmit)()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-semibold text-sm shadow-lg shadow-emerald-500/25 disabled:opacity-50 transition-all"
              >
                {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Register patient'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
