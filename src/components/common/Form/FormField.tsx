import { forwardRef, useCallback, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { cn, fieldInputClass, fieldInputOrangeClass, fieldInputSoftClass, FIELD_TEXTAREA_CLASS, FIELD_LABEL_CLASS } from './fieldStyles'
import { validateMaxWords, getWordCountError } from '../../../utils/validation'

export type FormFieldType = 'text' | 'textarea' | 'email' | 'tel' | 'number' | 'date' | 'password' | 'search'

export interface FormFieldProps {
  id: string
  label: string
  type?: FormFieldType
  /** Red border / ring when validation failed */
  invalid?: boolean
  /** default = app-wide sky focus; soft = registration cards; orange = vitals */
  variant?: 'default' | 'soft' | 'orange'
  /**
   * Show an X control to clear the value (controlled inputs with `onChange`).
   * Default: on for text-like types; off for `file`, `hidden`, `checkbox`, etc. Use `false` to disable.
   */
  clearable?: boolean
  /** Label required indicator */
  required?: boolean
  /** Error message from react-hook-form */
  error?: string
  /** react-hook-form register function */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register?: any
  /** Maximum word count for validation (default: 20) */
  maxWords?: number
  /** Display truncation threshold (default: 10 words) */
  displayTruncateAt?: number
  /** Additional class name */
  className?: string
  /** Placeholder text */
  placeholder?: string
  /** Disabled state */
  disabled?: boolean
  /** Read-only state */
  readOnly?: boolean
  /** Number of rows for textarea */
  rows?: number
  /** Controlled input value */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value?: any
  /** Controlled input change handler */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange?: (e: any) => void
  /** Additional HTML attributes */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
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
  'date',
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

const FormField = forwardRef<HTMLInputElement | HTMLTextAreaElement, FormFieldProps>(
  function FormField(
    {
      id,
      label,
      type = 'text',
      invalid = false,
      variant = 'default',
      clearable,
      required = false,
      error,
      register,
      maxWords = 20,
      displayTruncateAt = 10,
      className,
      placeholder,
      disabled = false,
      readOnly = false,
      rows,
      ...props
    },
    ref,
  ) {
    const innerRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
    const [isFocused, setIsFocused] = useState(false)
    const isTextarea = type === 'textarea'
    const inputType = isTextarea ? 'text' : type
    const autoClearable = !NON_CLEARABLE_TYPES.has(inputType)
    const effectiveClear =
      clearable === false ? false : clearable === true ? true : autoClearable

    // Get value from register or props
    let value = props.value
    let onChange = props.onChange
    
    if (register) {
      const registerResult = register(id, {
        validate: (val: string) => {
          if (!val || val.trim().length === 0) return true
          return validateMaxWords(val, maxWords) || getWordCountError(maxWords)
        }
      })
      value = registerResult?.value ?? props.value
      onChange = registerResult?.onChange ?? props.onChange
    }

    const stringValue = value === undefined || value === null ? '' : String(value)
    const showClear =
      effectiveClear &&
      !disabled &&
      !readOnly &&
      typeof onChange === 'function' &&
      value !== undefined &&
      stringValue.length > 0

    // Truncate display value if needed (only when not focused)
    const displayValue = !isFocused && countWords(stringValue) > displayTruncateAt
      ? truncateWords(stringValue, displayTruncateAt)
      : stringValue

    // Count words for validation
    const wordCount = countWords(stringValue)
    const wordCountError = wordCount > maxWords ? getWordCountError(maxWords) : undefined
    const finalError = error || wordCountError

    const base =
      variant === 'soft'
        ? isTextarea
          ? cn(fieldInputSoftClass, (invalid || !!finalError) && 'border-red-300 focus:ring-red-500/25 focus:border-red-400', showClear && 'pr-10', className, 'min-h-[5.5rem] resize-y align-top')
          : cn(fieldInputSoftClass, (invalid || !!finalError) && 'border-red-300 focus:ring-red-500/25 focus:border-red-400', showClear && 'pr-10', className)
        : variant === 'orange'
          ? isTextarea
            ? cn(fieldInputOrangeClass, (invalid || !!finalError) && 'border-red-300 focus:ring-red-500/25 focus:border-red-400', showClear && 'pr-10', className, 'min-h-[6rem] resize-y align-top')
            : cn(fieldInputOrangeClass, (invalid || !!finalError) && 'border-red-300 focus:ring-red-500/25 focus:border-red-400', showClear && 'pr-10', className)
          : isTextarea
            ? cn(FIELD_TEXTAREA_CLASS, (invalid || !!finalError) && 'border-red-300 focus:ring-red-500/25 focus:border-red-400', showClear && 'pr-10', className)
            : cn(fieldInputClass, (invalid || !!finalError) && 'border-red-300 focus:ring-red-500/25 focus:border-red-400', showClear && 'pr-10', className)

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

    // Prevent entering more than maxWords
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const newValue = e.target.value
      const newWordCount = countWords(newValue)
      
      if (newWordCount <= maxWords) {
        onChange?.(e)
      } else {
        // Truncate to maxWords
        const truncatedValue = truncateWords(newValue, maxWords)
        const synthetic = {
          ...e,
          target: { ...e.target, value: truncatedValue },
          currentTarget: { ...e.currentTarget, value: truncatedValue },
        }
        onChange?.(synthetic)
      }
    }, [onChange, maxWords])

    return (
      <div className="w-full">
        <label
          htmlFor={id}
          className={FIELD_LABEL_CLASS}
        >
          {label}
          {required && (
            <>
              <span className="text-red-600 dark:text-red-400 ml-0.5 font-semibold" aria-hidden>
                *
              </span>
              <span className="sr-only"> (required)</span>
            </>
          )}
        </label>
        
        <div className={cn('relative w-full', showClear && 'isolate')}>
          {isTextarea ? (
            <textarea
              id={id}
              ref={mergeRefs(ref as React.Ref<HTMLTextAreaElement>, innerRef as React.MutableRefObject<HTMLTextAreaElement | null>)}
              disabled={disabled}
              readOnly={readOnly}
              value={displayValue}
              onChange={handleChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              rows={rows || 5}
              className={base}
              {...(register ? register(id, {}) : {})}
              {...props}
            />
          ) : (
            <input
              id={id}
              ref={mergeRefs(ref as React.Ref<HTMLInputElement>, innerRef as React.MutableRefObject<HTMLInputElement | null>)}
              type={type}
              disabled={disabled}
              readOnly={readOnly}
              value={displayValue}
              onChange={handleChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              className={base}
              {...(register ? register(id, {}) : {})}
              {...props}
            />
          )}
          {showClear ? (
            <button
              type="button"
              tabIndex={-1}
              aria-label="Clear"
              className={cn(
                "absolute right-2 z-[1] rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white",
                isTextarea ? "top-2" : "top-1/2 -translate-y-1/2"
              )}
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleClear}
            >
              <X className="h-4 w-4" strokeWidth={2} aria-hidden />
            </button>
          ) : null}
        </div>

        {finalError && (
          <p
            id={`${id}-error`}
            role="alert"
            className="text-sm text-red-600 dark:text-red-400 mt-1.5"
          >
            {finalError}
          </p>
        )}

        {wordCount > 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {wordCount} / {maxWords} words
          </p>
        )}
      </div>
    )
  }
)

// Helper functions
function countWords(text: string): number {
  if (!text || text.trim().length === 0) return 0
  return text.trim().split(/\s+/).length
}

function truncateWords(text: string, maxWords: number): string {
  if (!text || text.trim().length === 0) return text
  
  const words = text.trim().split(/\s+/)
  
  if (words.length <= maxWords) return text
  
  const truncated = words.slice(0, maxWords).join(' ')
  return `${truncated}....`
}

export default FormField

// Also export as FormInput for backward compatibility
export { FormField as FormInput }
