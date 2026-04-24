import type { ReactNode } from 'react'
import type { Role } from '../types'

export interface RouteConfig {
  path: string
  allowedRoles: Role[]
  element: ReactNode
  label?: string
  children?: RouteConfig[]
}
