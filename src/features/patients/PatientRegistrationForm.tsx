import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { FieldError, FormInput, FormTextarea } from '../../shared/ui/form'
import { SearchableIdPicker } from '../../shared/ui/SearchWithDropdown'
import { filterLabeledOption } from '../../shared/ui/labeledOptionFilter'
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
import type { PatientRecord } from '../../shared/types/patient'
import { createPatient, updatePatient } from '../../shared/api/patientsApi'
import { notify } from '../../shared/lib/notify'
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
  const [step, setStep] = useState(0)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const isEdit = !!initialRecord

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientRegistrationSchema),
    defaultValues: initialRecord ? patientRecordToFormValues(initialRecord) : defaultValues,
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
        <div className="flex gap-3 sm:gap-0 sm:justify-between text-xs font-medium text-slate-600 dark:text-slate-400 mb-2 overflow-x-auto pb-1 -mx-1 px-1 scroll-pl-1">
          {STEPS.map((label, i) => (
            <span
              key={label}
              className={`shrink-0 whitespace-nowrap ${i <= step ? 'text-sky-600 dark:text-white' : ''}`}
            >
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
              <label className="block text-sm font-medium text-slate-600 dark:text-white mb-1">Full name</label>
              <FormInput {...register('fullName')} invalid={!!errors.fullName} variant="soft" />
              <FieldError>{errors.fullName?.message}</FieldError>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-white mb-1">Date of birth</label>
              <FormInput type="date" {...register('dob')} invalid={!!errors.dob} variant="soft" />
              <FieldError>{errors.dob?.message}</FieldError>
            </div>
            <div>
              <Controller
                name="gender"
                control={control}
                render={({ field }) => (
                  <SearchableIdPicker<(typeof GENDER_PICKER)[number]>
                    id="patient-reg-gender"
                    name="gender"
                    label="Gender"
                    items={GENDER_PICKER}
                    selectedId={field.value}
                    onSelectId={field.onChange}
                    getId={(x) => x.id}
                    getLabel={(x) => x.label}
                    filterItem={filterLabeledOption}
                    allowClear={false}
                    accent="sky"
                    emptyLabel="Pick gender"
                    placeholder="Search…"
                    className={errors.gender ? 'ring-2 ring-red-500/20 rounded-xl' : ''}
                  />
                )}
              />
              <FieldError>{errors.gender?.message}</FieldError>
            </div>
            <div>
              <Controller
                name="bloodGroup"
                control={control}
                render={({ field }) => (
                  <SearchableIdPicker<(typeof BLOOD_PICKER)[number]>
                    id="patient-reg-bloodGroup"
                    name="bloodGroup"
                    label="Blood group"
                    items={BLOOD_PICKER}
                    selectedId={field.value}
                    onSelectId={field.onChange}
                    getId={(x) => x.id}
                    getLabel={(x) => x.label}
                    filterItem={filterLabeledOption}
                    allowClear={false}
                    accent="sky"
                    emptyLabel="Select"
                    placeholder="Search…"
                    className={errors.bloodGroup ? 'ring-2 ring-red-500/20 rounded-xl' : ''}
                  />
                )}
              />
              <FieldError>{errors.bloodGroup?.message}</FieldError>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-white mb-1">Photo (optional)</label>
              <input type="file" accept="image/*" onChange={handlePhoto} className="text-sm text-slate-600 dark:text-white" />
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
              <label className="block text-sm font-medium text-slate-600 dark:text-white mb-1">Phone</label>
              <FormInput {...register('phone')} invalid={!!errors.phone} variant="soft" />
              <FieldError>{errors.phone?.message}</FieldError>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-white mb-1">Email</label>
              <FormInput type="email" {...register('email')} invalid={!!errors.email} variant="soft" />
              <FieldError>{errors.email?.message}</FieldError>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-white mb-1">Address</label>
              <FormTextarea {...register('address')} rows={2} invalid={!!errors.address} variant="soft" />
              <FieldError>{errors.address?.message}</FieldError>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-white mb-1">City</label>
                <FormInput {...register('city')} invalid={!!errors.city} variant="soft" />
                <FieldError>{errors.city?.message}</FieldError>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-white mb-1">State</label>
                <FormInput {...register('state')} invalid={!!errors.state} variant="soft" />
                <FieldError>{errors.state?.message}</FieldError>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-white mb-1">PIN / ZIP</label>
                <FormInput {...register('pin')} invalid={!!errors.pin} variant="soft" />
                <FieldError>{errors.pin?.message}</FieldError>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/85 dark:bg-slate-900/45 backdrop-blur-sm p-6 sm:p-7 shadow-sm shadow-slate-200/30 dark:shadow-none ring-1 ring-slate-200/40 dark:ring-slate-700/40">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Medical history</h2>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-white mb-1">Known allergies</label>
              <FormTextarea {...register('allergies')} rows={2} variant="soft" placeholder="None if not applicable" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-white mb-1">Chronic conditions</label>
              <FormTextarea {...register('chronicConditions')} rows={2} variant="soft" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-white mb-1">Past surgeries</label>
              <FormTextarea {...register('pastSurgeries')} rows={2} variant="soft" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-white mb-1">Current medications</label>
              <FormTextarea {...register('currentMedications')} rows={2} variant="soft" />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/85 dark:bg-slate-900/45 backdrop-blur-sm p-6 sm:p-7 shadow-sm shadow-slate-200/30 dark:shadow-none ring-1 ring-slate-200/40 dark:ring-slate-700/40">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Emergency contact</h2>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-white mb-1">Full name</label>
              <FormInput {...register('emergencyName')} invalid={!!errors.emergencyName} variant="soft" />
              <FieldError>{errors.emergencyName?.message}</FieldError>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-white mb-1">Relationship</label>
              <FormInput {...register('emergencyRelationship')} invalid={!!errors.emergencyRelationship} variant="soft" />
              <FieldError>{errors.emergencyRelationship?.message}</FieldError>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-white mb-1">Phone</label>
              <FormInput {...register('emergencyPhone')} invalid={!!errors.emergencyPhone} variant="soft" />
              <FieldError>{errors.emergencyPhone?.message}</FieldError>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/85 dark:bg-slate-900/45 backdrop-blur-sm p-6 sm:p-7 shadow-sm shadow-slate-200/30 dark:shadow-none ring-1 ring-slate-200/40 dark:ring-slate-700/40 space-y-3 text-sm">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Review & submit</h2>
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
