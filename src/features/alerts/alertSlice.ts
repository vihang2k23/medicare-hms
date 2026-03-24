import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { WARDS } from '../../config/wards'

const MAX_ALERTS = 20

export type AlertLevel = 'info' | 'warning' | 'error'

export interface SystemAlert {
  id: string
  message: string
  level: AlertLevel
  timestamp: number
}

export interface AlertState {
  alerts: SystemAlert[]
}

const initialState: AlertState = {
  alerts: [
    { id: 'a1', message: 'System check completed', level: 'info', timestamp: Date.now() - 3600000 },
    {
      id: 'a2',
      message: `High bed occupancy in ${WARDS[0].name} (${WARDS[0].id})`,
      level: 'warning',
      timestamp: Date.now() - 1800000,
    },
  ],
}

const alertSlice = createSlice({
  name: 'alerts',
  initialState,
  reducers: {
    addAlert(state, action: PayloadAction<Omit<SystemAlert, 'id' | 'timestamp'>>) {
      const alert: SystemAlert = {
        ...action.payload,
        id: `alert-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        timestamp: Date.now(),
      }
      state.alerts.unshift(alert)
      if (state.alerts.length > MAX_ALERTS) state.alerts = state.alerts.slice(0, MAX_ALERTS)
    },
    removeAlert(state, action: PayloadAction<string>) {
      state.alerts = state.alerts.filter((a) => a.id !== action.payload)
    },
    clearAlerts(state) {
      state.alerts = []
    },
  },
})

export const { addAlert, removeAlert, clearAlerts } = alertSlice.actions
export default alertSlice.reducer
