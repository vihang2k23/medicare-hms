import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import {
  patientRegistrationSchema,
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  STEP_FIELD_KEYS,
  patientRecordToFormValues,
  type PatientFormValues,
} from './patientSchemas'
import type { PatientRecord } from '../../types/patient'
import { createPatient, updatePatient } from '../../api/patientsApi'
import { notify } from '../../lib/notify'
import { generatePatientId } from './patientId'

const defaultValues: PatientFormValues = {
  fullName: '',
  dob: '',
  gender: 'male',
  bloodGroup: '',
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

const stepSchemas = [step1Schema, step2Schema, step3Schema, step4Schema] as const

function inputClass(error?: boolean) {
  return `w-full px-3.5 py-2.5 rounded-xl border text-slate-800 dark:text-slate-100 bg-white/90 dark:bg-slate-900/40 shadow-sm ${
    error ? 'border-red-500 ring-2 ring-red-500/20' : 'border-slate-200/90 dark:border-slate-600/80'
  } focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/50 transition-shadow`
}

interface PatientRegistrationFormProps {
  onSuccess?: () => void
  /** Where to navigate after successful save */
  redirectTo?: string
  /** When set, form PATCHes this record instead of creating a new one */
  initialRecord?: PatientRecord | null
}

export default function PatientRegistrationForm({
  onSuccess,
  redirectTo = '/admin/patients',
  initialRecord = null,
}: PatientRegistrationFormProps) {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const isEdit = !!initialRecord

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientRegistrationSchema),
    defaultValues: initialRecord ? patientRecordToFormValues(initialRecord) : defaultValues,
    mode: 'onTouched',
  })

  const {
    register,
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
        <div className="flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
          {STEPS.map((label, i) => (
            <span key={label} className={i <= step ? 'text-sky-600 dark:text-sky-400' : ''}>
              {label}
            </span>
          ))}
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
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Personal information</h2>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Full name</label>
              <input {...register('fullName')} className={inputClass(!!errors.fullName)} />
              {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Date of birth</label>
              <input type="date" {...register('dob')} className={inputClass(!!errors.dob)} />
              {errors.dob && <p className="text-red-500 text-sm mt-1">{errors.dob.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Gender</label>
              <select {...register('gender')} className={inputClass(!!errors.gender)}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              {errors.gender && <p className="text-red-500 text-sm mt-1">{errors.gender.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Blood group</label>
              <select {...register('bloodGroup')} className={inputClass(!!errors.bloodGroup)}>
                <option value="">Select</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
              {errors.bloodGroup && <p className="text-red-500 text-sm mt-1">{errors.bloodGroup.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Photo (optional)</label>
              <input type="file" accept="image/*" onChange={handlePhoto} className="text-sm text-slate-600 dark:text-slate-300" />
              {photoPreview && (
                <img src={photoPreview} alt="" className="mt-2 h-24 w-24 object-cover rounded-lg border border-slate-200 dark:border-slate-600" />
              )}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/85 dark:bg-slate-900/45 backdrop-blur-sm p-6 sm:p-7 shadow-sm shadow-slate-200/30 dark:shadow-none ring-1 ring-slate-200/40 dark:ring-slate-700/40">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Contact & address</h2>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Phone</label>
              <input {...register('phone')} className={inputClass(!!errors.phone)} />
              {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Email</label>
              <input type="email" {...register('email')} className={inputClass(!!errors.email)} />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Address</label>
              <textarea {...register('address')} rows={2} className={inputClass(!!errors.address)} />
              {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">City</label>
                <input {...register('city')} className={inputClass(!!errors.city)} />
                {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">State</label>
                <input {...register('state')} className={inputClass(!!errors.state)} />
                {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">PIN / ZIP</label>
                <input {...register('pin')} className={inputClass(!!errors.pin)} />
                {errors.pin && <p className="text-red-500 text-sm mt-1">{errors.pin.message}</p>}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/85 dark:bg-slate-900/45 backdrop-blur-sm p-6 sm:p-7 shadow-sm shadow-slate-200/30 dark:shadow-none ring-1 ring-slate-200/40 dark:ring-slate-700/40">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Medical history</h2>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Known allergies</label>
              <textarea {...register('allergies')} rows={2} className={inputClass()} placeholder="None if not applicable" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Chronic conditions</label>
              <textarea {...register('chronicConditions')} rows={2} className={inputClass()} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Past surgeries</label>
              <textarea {...register('pastSurgeries')} rows={2} className={inputClass()} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Current medications</label>
              <textarea {...register('currentMedications')} rows={2} className={inputClass()} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/85 dark:bg-slate-900/45 backdrop-blur-sm p-6 sm:p-7 shadow-sm shadow-slate-200/30 dark:shadow-none ring-1 ring-slate-200/40 dark:ring-slate-700/40">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Emergency contact</h2>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Full name</label>
              <input {...register('emergencyName')} className={inputClass(!!errors.emergencyName)} />
              {errors.emergencyName && <p className="text-red-500 text-sm mt-1">{errors.emergencyName.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Relationship</label>
              <input {...register('emergencyRelationship')} className={inputClass(!!errors.emergencyRelationship)} />
              {errors.emergencyRelationship && (
                <p className="text-red-500 text-sm mt-1">{errors.emergencyRelationship.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Phone</label>
              <input {...register('emergencyPhone')} className={inputClass(!!errors.emergencyPhone)} />
              {errors.emergencyPhone && <p className="text-red-500 text-sm mt-1">{errors.emergencyPhone.message}</p>}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/85 dark:bg-slate-900/45 backdrop-blur-sm p-6 sm:p-7 shadow-sm shadow-slate-200/30 dark:shadow-none ring-1 ring-slate-200/40 dark:ring-slate-700/40 space-y-3 text-sm">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Review & submit</h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs mb-4">
              Nothing is saved until you click <strong className="text-slate-700 dark:text-slate-200">{isEdit ? 'Save changes' : 'Register patient'}</strong> below.
            </p>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
              <dt className="font-medium text-slate-800 dark:text-white">Patient ID</dt>
              <dd className="text-slate-500 font-mono text-xs">{isEdit ? initialRecord!.id : 'Assigned on save'}</dd>
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

        {submitError && <p className="text-red-600 dark:text-red-400 text-sm">{submitError}</p>}

        <div className="flex flex-wrap gap-3 justify-between">
          <button
            type="button"
            onClick={back}
            disabled={step === 0}
            className="px-5 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800/80 disabled:opacity-40 transition-colors"
          >
            Back
          </button>
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
