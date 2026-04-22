import type { LabelHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../../utils/helpers'
import { FIELD_LABEL_CLASS } from './fieldStyles'

export type FieldLabelProps = LabelHTMLAttributes<HTMLLabelElement> & {
  children: ReactNode
  /** Shows a red asterisk (required field). */
  required?: boolean
}

export default function FieldLabel({ className, children, required, ...rest }: FieldLabelProps) {
  return (
    <label className={cn(FIELD_LABEL_CLASS, className)} {...rest}>
      <span>{children}</span>
      {required ? (
        <>
          <span className="text-red-600 dark:text-red-400 ml-0.5 font-semibold" aria-hidden>
            *
          </span>
          <span className="sr-only"> (required)</span>
        </>
      ) : null}
    </label>
  )
}
