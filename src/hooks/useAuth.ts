import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '../store'
import { logout as logoutAction } from '../domains/auth/authSlice'
import type { AuthUser } from '../domains/auth/authSlice'

export function useAuth() {
  const user = useSelector((state: RootState) => state.auth.user)
  const dispatch = useDispatch()

  const logout = useCallback(() => {
    dispatch(logoutAction())
  }, [dispatch])

  return {
    user: user as AuthUser | null,
    isAuthenticated: !!user,
    role: user?.role ?? null,
    logout,
  }
}
