import { forwardRef, type InputHTMLAttributes, useCallback, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../../utils/cn'
import { fieldInputClass, fieldInputOrangeClass, fieldInputSoftClass } from './fieldStyles'

export type FormInputProps = InputHTMLAttributes<HTMLInputElement> & {
  /** Red border / ring when validation failed */
  invalid?: boolean
  /** default = app-wide sky focus; soft = registration cards; orange = vitals */
  variant?: 'default' | 'soft' | 'orange'
  /**
   * Show an X control to clear the value (controlled inputs with `onChange`).
   * Default: on for text-like types; off for `file`, `hidden`, `checkbox`, etc. Use `false` to disable.
   */
  clearable?: boolean
}

const NON_CLEARABLE_TYPES = new Set([
  'file',
  'hidden',
  'checkbox',
  'radio',
  'button',
  'submit',
  'reset',
  'image',
])

function mergeRefs<T>(a: React.Ref<T> | undefined, b: React.MutableRefObject<T | null>) {
  return (node: T | null) => {
    b.current = node
    if (typeof a === 'function') a(node)
    else if (a && typeof a === 'object' && 'current' in a) {
      ;(a as React.MutableRefObject<T | null>).current = node
    }
  }
}

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(function FormInput(
  { className, invalid, variant = 'default', clearable, type, disabled, readOnly, value, onChange, ...props },
  ref,
) {
  const innerRef = useRef<HTMLInputElement | null>(null)
  const inputType = type ?? 'text'
  const autoClearable = !NON_CLEARABLE_TYPES.has(inputType)
  const effectiveClear =
    clearable === false ? false : clearable === true ? true : autoClearable

  const stringValue = value === undefined || value === null ? '' : String(value)
  const showClear =
    effectiveClear &&
    !disabled &&
    !readOnly &&
    typeof onChange === 'function' &&
    value !== undefined &&
    stringValue.length > 0

  const base =
    variant === 'soft'
      ? fieldInputSoftClass({
          invalid,
          className: cn(showClear && 'pr-10', className),
        })
      : variant === 'orange'
        ? fieldInputOrangeClass({
            invalid,
            className: cn(showClear && 'pr-10', className),
          })
        : fieldInputClass({
            invalid,
            className: cn(showClear && 'pr-10', className),
          })

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!onChange) return
      const el = innerRef.current
      const synthetic = {
        target: el ?? ({ value: '' } as HTMLInputElement),
        currentTarget: el ?? ({ value: '' } as HTMLInputElement),
      } as React.ChangeEvent<HTMLInputElement>
      Object.assign(synthetic.target, { value: '' })
      Object.assign(synthetic.currentTarget, { value: '' })
      onChange(synthetic)
      requestAnimationFrame(() => innerRef.current?.focus())
    },
    [onChange],
  )

  return (
    <div className={cn('relative w-full', showClear && 'isolate')}>
      <input
        ref={mergeRefs(ref, innerRef)}
        type={type}
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
          className="absolute right-2 top-1/2 z-[1] -translate-y-1/2 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleClear}
        >
          <X className="h-4 w-4" strokeWidth={2} aria-hidden />
        </button>
      ) : null}
    </div>
  )
})

export default FormInput
