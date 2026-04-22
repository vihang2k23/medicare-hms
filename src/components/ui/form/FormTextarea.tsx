import { forwardRef, type MutableRefObject, type TextareaHTMLAttributes, useCallback, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../../utils/helpers'
import { FIELD_TEXTAREA_CLASS, fieldInputOrangeClass, fieldInputSoftClass } from './fieldStyles'

export type FormTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean
  variant?: 'default' | 'soft' | 'orange'
  /** Show X to clear (controlled textarea with `onChange`). Default true. Set `false` to hide. */
  clearable?: boolean
}

function mergeRefs<T>(a: React.Ref<T> | undefined, b: MutableRefObject<T | null>) {
  return (node: T | null) => {
    b.current = node
    if (typeof a === 'function') a(node)
    else if (a && typeof a === 'object' && 'current' in a) {
      ;(a as MutableRefObject<T | null>).current = node
    }
  }
}

const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(function FormTextarea(
  {
    className,
    invalid,
    variant = 'default',
    clearable = true,
    disabled,
    readOnly,
    value,
    onChange,
    ...props
  },
  ref,
) {
  const innerRef = useRef<HTMLTextAreaElement | null>(null)

  const stringValue = value === undefined || value === null ? '' : String(value)
  const showClear =
    clearable !== false &&
    !disabled &&
    !readOnly &&
    typeof onChange === 'function' &&
    value !== undefined &&
    stringValue.length > 0

  const base =
    variant === 'soft'
      ? cn(fieldInputSoftClass({ invalid, className: cn(showClear && 'pr-10', className) }), 'min-h-[5.5rem] resize-y align-top')
      : variant === 'orange'
        ? cn(fieldInputOrangeClass({ invalid, className: cn(showClear && 'pr-10', className) }), 'min-h-[6rem] resize-y align-top')
        : FIELD_TEXTAREA_CLASS({ invalid, className: cn(showClear && 'pr-10', className) })

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!onChange) return
      onChange({
        target: { value: '' } as HTMLTextAreaElement,
        currentTarget: { value: '' } as HTMLTextAreaElement,
      } as React.ChangeEvent<HTMLTextAreaElement>)
      requestAnimationFrame(() => innerRef.current?.focus())
    },
    [onChange],
  )

  return (
    <div className={cn('relative w-full', showClear && 'isolate')}>
      <textarea
        ref={mergeRefs(ref, innerRef)}
        disabled={disabled}
        readOnly={readOnly}
        value={value}
        onChange={onChange}
        className={base}
        {...props}
      />
      {showClear ? (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Clear"
          className="absolute right-2 top-2 z-[1] rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleClear}
        >
          <X className="h-4 w-4" strokeWidth={2} aria-hidden />
        </button>
      ) : null}
    </div>
  )
})

export default FormTextarea
