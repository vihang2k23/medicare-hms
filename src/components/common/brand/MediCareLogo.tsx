// MediCareLogo defines the Medi Care Logo UI surface and its primary interaction flow.
type LogoSize = 'sm' | 'md' | 'lg' | 'xl'

const sizePx: Record<LogoSize, number> = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
}

export interface MediCareLogoProps {
  size?: LogoSize
  /** Extra classes on the img root */
  className?: string
  /** Accessible label; set false to mark decorative */
  title?: string | false
}

/**
 * MediCare HMS mark — rounded tile + medical cross (SVG file, no inline markup).
 */
export default function MediCareLogo({ size = 'md', className = '', title = false }: MediCareLogoProps) {
  const px = sizePx[size]
  const label = title === false ? undefined : title ?? 'MediCare HMS'

  return (
    <img
      src="/logo.svg"
      width={px}
      height={px}
      alt={label ?? ''}
      role={label ? 'img' : 'presentation'}
      aria-hidden={label ? undefined : true}
      className={`shrink-0 ${className}`}
    />
  )
}

/** Wordmark + optional subtitle for nav / auth screens */
export function MediCareWordmark({
  className = '',
  subtitle = 'Hospital Management',
  size = 'default',
}: {
  className?: string
  subtitle?: string
  /** `compact` = top bar; `default` = login / marketing */
  size?: 'compact' | 'default'
}) {
  const titleCls =
    size === 'compact'
      ? 'font-bold text-slate-900 dark:text-white text-base tracking-tight'
      : 'font-bold text-slate-900 dark:text-white text-xl sm:text-2xl tracking-tight'
  return (
    <div className={`flex flex-col leading-tight min-w-0 ${className}`}>
      <span className={titleCls}>MediCare</span>
      <span
        className={`font-semibold uppercase tracking-[0.16em] text-sky-600 dark:text-white truncate max-w-[16rem] sm:max-w-none ${
          size === 'compact' ? 'text-[11px] hidden md:block' : 'text-[10px] sm:text-[11px] mt-0.5'
        }`}
      >
        {subtitle}
      </span>
    </div>
  )
}
