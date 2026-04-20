import type { ReactNode } from 'react'
import type { Role } from './roles'

export interface RouteConfig {
  path: string
  allowedRoles: Role[]
  element: ReactNode
  label?: string
  children?: RouteConfig[]
}
