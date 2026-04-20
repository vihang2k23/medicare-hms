import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'
import { FIELD_TEXTAREA_CLASS, fieldInputOrangeClass, fieldInputSoftClass } from './fieldStyles'

export type FormTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean
  variant?: 'default' | 'soft' | 'orange'
}

const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(function FormTextarea(
  { className, invalid, variant = 'default', ...props },
  ref,
) {
  const base =
    variant === 'soft'
      ? cn(fieldInputSoftClass({ invalid, className }), 'min-h-[5.5rem] resize-y align-top')
      : variant === 'orange'
        ? cn(fieldInputOrangeClass({ invalid, className }), 'min-h-[6rem] resize-y align-top')
        : FIELD_TEXTAREA_CLASS({ invalid, className })
  return <textarea ref={ref} className={base} {...props} />
})

export default FormTextarea
