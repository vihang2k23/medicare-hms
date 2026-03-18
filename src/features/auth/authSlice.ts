import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface AuthState {
  user: { id: string; email: string } | null
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
    setUser(state, action: PayloadAction<{ id: string; email: string } | null>) {
      state.user = action.payload
      state.isAuthenticated = !!action.payload
    },
    logout(state) {
      state.user = null
      state.isAuthenticated = false
    },
  },
})

export const { setUser, logout } = authSlice.actions
export default authSlice.reducer
