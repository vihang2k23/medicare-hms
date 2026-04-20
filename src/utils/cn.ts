import { twMerge } from 'tailwind-merge'

/** Join class names and resolve conflicting Tailwind utilities (e.g. `px-*` vs `pl-*`). */
export function cn(...parts: Array<string | undefined | null | false>): string {
  return twMerge(parts.filter(Boolean) as string[])
}
