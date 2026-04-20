import type { LabelHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { FIELD_LABEL_CLASS } from './fieldStyles'

export type FieldLabelProps = LabelHTMLAttributes<HTMLLabelElement> & {
  children: ReactNode
}

export default function FieldLabel({ className, children, ...rest }: FieldLabelProps) {
  return (
    <label className={cn(FIELD_LABEL_CLASS, className)} {...rest}>
      {children}
    </label>
  )
}
