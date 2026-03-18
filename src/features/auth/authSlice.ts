import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface AuthUser {
  id: string
  email: string
  name?: string
  role?: string
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
