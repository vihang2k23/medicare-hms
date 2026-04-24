import type { ReactNode } from 'react'
import { cn } from '../../../utils/helpers'

export interface FieldErrorProps {
  id?: string
  children?: ReactNode
  className?: string
  /** `below` = message under the control (default). `above` = between label and control. */
  placement?: 'above' | 'below'
}

/** Inline validation — default placement is under the input; pair with `aria-describedby` when you set `id`. */
export default function FieldError({ id, children, className, placement = 'below' }: FieldErrorProps) {
  if (children == null || children === false || children === '') return null
  return (
    <p
      id={id}
      role="alert"
      className={cn(
        'text-sm text-red-600 dark:text-red-400',
        placement === 'above' ? 'mb-1.5' : 'mt-1.5',
        className,
      )}
    >
      {children}
    </p>
  )
}
