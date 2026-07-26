'use client'
import { useCallback, useTransition } from 'react'

export function useSliceRefetch() {
  const [isPending, startTransition] = useTransition()

  const refetch = useCallback((action: () => Promise<unknown>, onSuccess: (data: unknown) => void) => {
    startTransition(async () => {
      try {
        const result = await action()
        onSuccess(result)
      } catch (error) {
        console.error("Slice refetch failed:", error)
      }
    })
  }, [])

  return { refetch, isPending }
}
