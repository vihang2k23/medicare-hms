import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import type { NpiProviderCard } from '../../lib/npiRegistryApi'
import { hasMinimumNpiSearchCriteria, searchNpiRegistry } from '../../lib/npiRegistryApi'

export interface SearchDoctorsArgs {
  firstName?: string
  lastName?: string
  taxonomy?: string
  city?: string
  state?: string
  skip?: number
  limit?: number
}

export interface DoctorSearchState {
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
  resultCount: number
  providers: NpiProviderCard[]
}

const initialState: DoctorSearchState = {
  status: 'idle',
  error: null,
  resultCount: 0,
  providers: [],
}

function hasAnyTrimmedField(args: SearchDoctorsArgs): boolean {
  return Boolean(
    args.firstName?.trim() ||
      args.lastName?.trim() ||
      args.taxonomy?.trim() ||
      args.city?.trim() ||
      args.state?.trim(),
  )
}

/**
 * NPI Registry search (same behavior as Doctor directory “NPI search”), using
 * {@link searchNpiRegistry} (Vite dev: `/npiregistry/api`; see `vite.config.ts` and `npiRegistryApi.ts`).
 */
export const searchDoctors = createAsyncThunk(
  'doctor/searchDoctors',
  async ({ firstName, lastName, taxonomy, city, state, skip = 0, limit = 10 }: SearchDoctorsArgs) => {
    if (!hasAnyTrimmedField({ firstName, lastName, taxonomy, city, state })) {
      throw new Error('Please provide at least one search criteria (name, specialty, city, or state)')
    }

    const params = {
      providerFirstName: firstName?.trim() || undefined,
      providerLastName: lastName?.trim() || undefined,
      taxonomyDescription: taxonomy?.trim() || undefined,
      city: city?.trim() || undefined,
      state: state?.trim() || undefined,
      countryCode: 'US',
      limit,
      skip,
    }

    if (!hasMinimumNpiSearchCriteria(params)) {
      throw new Error(
        'That combination is not enough for the NPI Registry (for example, state alone or only “United States” is not allowed). Add NPI, name, organization, taxonomy, city, or postal code.',
      )
    }

    return searchNpiRegistry(params)
  },
)

const doctorSlice = createSlice({
  name: 'doctor',
  initialState,
  reducers: {
    clearDoctorSearch(state) {
      state.status = 'idle'
      state.error = null
      state.resultCount = 0
      state.providers = []
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(searchDoctors.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(searchDoctors.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.resultCount = action.payload.resultCount
        state.providers = action.payload.providers
      })
      .addCase(searchDoctors.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message ?? 'NPI search failed'
        state.resultCount = 0
        state.providers = []
      })
  },
})

export const { clearDoctorSearch } = doctorSlice.actions
export default doctorSlice.reducer
