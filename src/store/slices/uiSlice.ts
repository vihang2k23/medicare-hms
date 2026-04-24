import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export type Theme = 'light' | 'dark'

export interface UiState {
  sidebarOpen: boolean
  theme: Theme
  /** Generic key-value for filter panel state per feature */
  activeFilters: Record<string, unknown>
}

function initialSidebarOpen(): boolean {
  if (typeof window === 'undefined') return true
  return window.matchMedia('(min-width: 1024px)').matches
}

const initialState: UiState = {
  sidebarOpen: initialSidebarOpen(),
  theme: 'light',
  activeFilters: {},
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.sidebarOpen = action.payload
    },
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen
    },
    setTheme(state, action: PayloadAction<Theme>) {
      state.theme = action.payload
    },
    setActiveFilters(state, action: PayloadAction<Record<string, unknown>>) {
      state.activeFilters = { ...state.activeFilters, ...action.payload }
    },
  },
})

export const { setSidebarOpen, toggleSidebar, setTheme, setActiveFilters } = uiSlice.actions
export default uiSlice.reducer
