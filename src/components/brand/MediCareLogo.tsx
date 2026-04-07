import { useId } from 'react'

type LogoSize = 'sm' | 'md' | 'lg' | 'xl'

const sizePx: Record<LogoSize, number> = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
}

export interface MediCareLogoProps {
  size?: LogoSize
  /** Extra classes on the SVG root */
  className?: string
  /** Accessible label; set false to mark decorative */
  title?: string | false
}

/**
 * MediCare HMS mark — rounded tile + medical cross (inline SVG, no external asset).
 */
export default function MediCareLogo({ size = 'md', className = '', title = false }: MediCareLogoProps) {
  const rawId = useId()
  const gid = `mc-logo-grad-${rawId.replace(/:/g, '')}`
  const px = sizePx[size]
  const label = title === false ? undefined : title ?? 'MediCare HMS'

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 40 40"
      className={`shrink-0 ${className}`}
      role={label ? 'img' : 'presentation'}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {label ? <title>{label}</title> : null}
      <defs>
        <linearGradient id={gid} x1="8" y1="4" x2="32" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38bdf8" />
          <stop offset="0.45" stopColor="#0ea5e9" />
          <stop offset="1" stopColor="#0284c7" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill={`url(#${gid})`} />
      <rect x="0" y="0" width="40" height="40" rx="11" fill="none" stroke="white" strokeOpacity="0.2" strokeWidth="1" />
      <path
        fill="white"
        d="M18.25 11.5h3.5v7.25H29v3.5h-7.25V29.5h-3.5v-7.25H11v-3.5h7.25V11.5Z"
      />
    </svg>
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
        className={`font-semibold uppercase tracking-[0.16em] text-sky-600 dark:text-sky-400 truncate max-w-[16rem] sm:max-w-none ${
          size === 'compact' ? 'text-[11px] hidden md:block' : 'text-[10px] sm:text-[11px] mt-0.5'
        }`}
      >
        {subtitle}
      </span>
    </div>
  )
}
