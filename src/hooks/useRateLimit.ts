import { useCallback, useRef } from 'react'

interface UseRateLimitOptions {
  /** Maximum number of calls allowed within the window */
  maxCalls: number
  /** Time window in milliseconds */
  windowMs: number
}

interface RateLimitState {
  timestamps: number[]
}

/**
 * Hook that enforces a rate limit on a callback function.
 * Prevents the function from being called more than `maxCalls` times
 * within a rolling `windowMs` time window.
 */
export function useRateLimit<T extends (...args: unknown[]) => unknown>(
  fn: T,
  options: UseRateLimitOptions,
): { call: (...args: Parameters<T>) => ReturnType<T> | undefined; remaining: () => number } {
  const { maxCalls, windowMs } = options
  const stateRef = useRef<RateLimitState>({ timestamps: [] })

  const call = useCallback(
    (...args: Parameters<T>): ReturnType<T> | undefined => {
      const now = Date.now()
      const windowStart = now - windowMs

      // Remove timestamps outside the window
      stateRef.current.timestamps = stateRef.current.timestamps.filter(
        (ts) => ts > windowStart,
      )

      if (stateRef.current.timestamps.length >= maxCalls) {
        console.warn(
          `[RateLimit] Exceeded ${maxCalls} calls per ${windowMs}ms window. Call blocked.`,
        )
        return undefined
      }

      stateRef.current.timestamps.push(now)
      return fn(...args) as ReturnType<T>
    },
    [fn, maxCalls, windowMs],
  )

  const remaining = useCallback((): number => {
    const now = Date.now()
    const windowStart = now - windowMs
    stateRef.current.timestamps = stateRef.current.timestamps.filter(
      (ts) => ts > windowStart,
    )
    return Math.max(0, maxCalls - stateRef.current.timestamps.length)
  }, [maxCalls, windowMs])

  return { call, remaining }
}

/**
 * Convenience hook for rate-limiting complaint submissions (e.g., max 5 per minute).
 */
export function useComplaintRateLimit() {
  return useRateLimit(() => {}, {
    maxCalls: 5,
    windowMs: 60_000,
  })
}