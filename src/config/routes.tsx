import type { ReactNode } from 'react'
import type { Role } from '../types'
import type { LucideIcon } from 'lucide-react'

export interface RouteConfig {
  path: string
  allowedRoles: Role[]
  element: ReactNode
  label?: string
  icon?: LucideIcon
  children?: RouteConfig[]
}
