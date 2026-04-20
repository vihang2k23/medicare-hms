import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Role } from '../../config/roles'

/** Stored in LocalStorage and Redux: { role, name, id, avatar } */
export interface AuthUser {
  id: string
  role: Role
  name: string
  avatar: string
  /** Optional; for compatibility */
  email?: string
}

export interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<AuthUser | null>) {
      state.user = action.payload
      state.isAuthenticated = !!action.payload
    },
    login(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload
      state.isAuthenticated = true
    },
    logout(state) {
      state.user = null
      state.isAuthenticated = false
    },
  },
})

export const { setUser, login, logout } = authSlice.actions
export default authSlice.reducer
