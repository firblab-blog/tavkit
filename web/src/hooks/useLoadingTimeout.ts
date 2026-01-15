import { useState, useEffect, useRef } from 'react'

interface UseLoadingTimeoutOptions {
  /** Timeout duration in milliseconds (default: 10000) */
  timeoutMs?: number
  /** Whether loading is currently happening */
  isLoading: boolean
}

interface UseLoadingTimeoutResult {
  /** True if loading has exceeded the timeout duration */
  isTimedOut: boolean
  /** Number of seconds elapsed since loading started */
  elapsedSeconds: number
}

/**
 * Hook to detect when loading operations take longer than expected.
 * Useful for showing "Loading is taking longer than expected" messages.
 *
 * @example
 * const { isTimedOut, elapsedSeconds } = useLoadingTimeout({
 *   isLoading: loading || contextLoading,
 *   timeoutMs: 10000, // 10 seconds
 * })
 *
 * if (isLoading) {
 *   return (
 *     <div>
 *       <Spinner />
 *       {isTimedOut && (
 *         <p>Loading is taking longer than expected ({elapsedSeconds}s)...</p>
 *       )}
 *     </div>
 *   )
 * }
 */
export function useLoadingTimeout({
  isLoading,
  timeoutMs = 10000,
}: UseLoadingTimeoutOptions): UseLoadingTimeoutResult {
  const [isTimedOut, setIsTimedOut] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const startTimeRef = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (isLoading) {
      // Start tracking
      startTimeRef.current = Date.now()
      setIsTimedOut(false)
      setElapsedSeconds(0)

      // Set timeout for the warning
      const timeoutId = setTimeout(() => {
        setIsTimedOut(true)
      }, timeoutMs)

      // Update elapsed seconds every second
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000))
        }
      }, 1000)

      return () => {
        clearTimeout(timeoutId)
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    } else {
      // Reset when loading stops
      startTimeRef.current = null
      setIsTimedOut(false)
      setElapsedSeconds(0)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isLoading, timeoutMs])

  return { isTimedOut, elapsedSeconds }
}
