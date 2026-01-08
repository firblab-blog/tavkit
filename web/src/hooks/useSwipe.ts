import { useRef, useEffect } from 'react'

interface SwipeHandlers {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
}

const SWIPE_THRESHOLD = 50 // Minimum distance for a swipe in pixels
const SWIPE_VELOCITY_THRESHOLD = 0.3 // Minimum velocity in px/ms

export function useSwipe(handlers: SwipeHandlers) {
  const touchStartX = useRef<number>(0)
  const touchStartY = useRef<number>(0)
  const touchStartTime = useRef<number>(0)
  const elementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX
      touchStartY.current = e.touches[0].clientY
      touchStartTime.current = Date.now()
    }

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndX = e.changedTouches[0].clientX
      const touchEndY = e.changedTouches[0].clientY
      const touchEndTime = Date.now()

      const deltaX = touchEndX - touchStartX.current
      const deltaY = touchEndY - touchStartY.current
      const deltaTime = touchEndTime - touchStartTime.current

      const velocityX = Math.abs(deltaX) / deltaTime
      const velocityY = Math.abs(deltaY) / deltaTime

      // Determine if it's a horizontal or vertical swipe
      const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY)

      if (
        isHorizontalSwipe &&
        Math.abs(deltaX) > SWIPE_THRESHOLD &&
        velocityX > SWIPE_VELOCITY_THRESHOLD
      ) {
        if (deltaX > 0) {
          handlers.onSwipeRight?.()
        } else {
          handlers.onSwipeLeft?.()
        }
      } else if (
        !isHorizontalSwipe &&
        Math.abs(deltaY) > SWIPE_THRESHOLD &&
        velocityY > SWIPE_VELOCITY_THRESHOLD
      ) {
        if (deltaY > 0) {
          handlers.onSwipeDown?.()
        } else {
          handlers.onSwipeUp?.()
        }
      }
    }

    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handlers])

  return elementRef
}
