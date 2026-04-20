import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/** Values merged into the current location query; `null` / `undefined` / `''` remove the key. */
export type QueryParamPatch = Record<string, string | number | boolean | null | undefined>

/**
 * Read/write URL search params with functional merges (`replace: true`).
 * Use one shared pattern for list filters so links are shareable and the back button restores state.
 */
export function useMergeSearchParams() {
  const [searchParams, setSearchParams] = useSearchParams()

  const merge = useCallback(
    (updates: QueryParamPatch) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [key, raw] of Object.entries(updates)) {
            if (raw === null || raw === undefined || raw === '') next.delete(key)
            else next.set(key, String(raw))
          }
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  return { searchParams, merge }
}
