import { forwardRef, type InputHTMLAttributes } from 'react'
import { fieldInputClass, fieldInputOrangeClass, fieldInputSoftClass } from './fieldStyles'

export type FormInputProps = InputHTMLAttributes<HTMLInputElement> & {
  /** Red border / ring when validation failed */
  invalid?: boolean
  /** default = app-wide sky focus; soft = registration cards; orange = vitals */
  variant?: 'default' | 'soft' | 'orange'
}

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(function FormInput(
  { className, invalid, variant = 'default', ...props },
  ref,
) {
  const base =
    variant === 'soft'
      ? fieldInputSoftClass({ invalid, className })
      : variant === 'orange'
        ? fieldInputOrangeClass({ invalid, className })
        : fieldInputClass({ invalid, className })
  return <input ref={ref} className={base} {...props} />
})

export default FormInput
