import { useState, useEffect, useRef, useCallback, RefObject } from "react";

interface UseScrollHideOptions {
  /** Minimum scroll distance before triggering hide/show (default: 10) */
  threshold?: number;
  /** Whether the hook is enabled (default: true) */
  enabled?: boolean;
  /** Optional ref to a scroll container. If not provided, will auto-detect or use window */
  scrollRef?: RefObject<HTMLElement | null>;
}

interface UseScrollHideReturn {
  /** Whether the element should be visible */
  isVisible: boolean;
  /** Current scroll direction: 'up' | 'down' | null */
  scrollDirection: "up" | "down" | null;
}

/**
 * Finds the scrollable parent element by looking for overflow-auto or overflow-y-auto
 */
function findScrollableParent(): HTMLElement | null {
  // Common selectors for main scrollable content areas
  const selectors = [
    'main[class*="overflow"]',
    '[class*="overflow-auto"]',
    '[class*="overflow-y-auto"]',
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el instanceof HTMLElement) {
      return el;
    }
  }

  return null;
}

/**
 * Hook for Apple-style hide-on-scroll behavior.
 * Hides element when scrolling down, shows when scrolling up.
 * Uses requestAnimationFrame for smooth 60fps performance.
 *
 * Automatically detects the scrollable container (supports both window and container scrolling).
 */
export function useScrollHide(
  options: UseScrollHideOptions = {},
): UseScrollHideReturn {
  const { threshold = 10, enabled = true, scrollRef } = options;

  const [isVisible, setIsVisible] = useState(true);
  const [scrollDirection, setScrollDirection] = useState<"up" | "down" | null>(
    null,
  );

  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const accumulatedDelta = useRef(0);
  const scrollContainer = useRef<HTMLElement | Window | null>(null);

  const getScrollY = useCallback((): number => {
    const container = scrollContainer.current;
    if (!container) return 0;

    if (container instanceof Window) {
      return window.scrollY;
    }
    return container.scrollTop;
  }, []);

  const updateVisibility = useCallback(() => {
    const currentScrollY = getScrollY();

    // At the very top, always show
    if (currentScrollY <= 0) {
      setIsVisible(true);
      setScrollDirection(null);
      lastScrollY.current = currentScrollY;
      ticking.current = false;
      return;
    }

    const delta = currentScrollY - lastScrollY.current;

    // Accumulate small movements to avoid jitter
    if (Math.abs(delta) < 2) {
      ticking.current = false;
      return;
    }

    // Track accumulated delta for threshold
    if (Math.sign(delta) === Math.sign(accumulatedDelta.current)) {
      accumulatedDelta.current += delta;
    } else {
      // Direction changed, reset accumulator
      accumulatedDelta.current = delta;
    }

    // Only trigger visibility change after threshold is met
    if (Math.abs(accumulatedDelta.current) >= threshold) {
      if (accumulatedDelta.current > 0) {
        // Scrolling down
        setScrollDirection("down");
        setIsVisible(false);
      } else {
        // Scrolling up
        setScrollDirection("up");
        setIsVisible(true);
      }
      accumulatedDelta.current = 0;
    }

    lastScrollY.current = currentScrollY;
    ticking.current = false;
  }, [threshold, getScrollY]);

  const handleScroll = useCallback(() => {
    if (!enabled) return;

    if (!ticking.current) {
      requestAnimationFrame(updateVisibility);
      ticking.current = true;
    }
  }, [enabled, updateVisibility]);

  useEffect(() => {
    if (!enabled) {
      setIsVisible(true);
      return;
    }

    // Determine scroll container
    if (scrollRef?.current) {
      scrollContainer.current = scrollRef.current;
    } else {
      // Auto-detect scrollable container or fall back to window
      const detected = findScrollableParent();
      scrollContainer.current = detected || window;
    }

    const container = scrollContainer.current;

    // Initialize last scroll position
    lastScrollY.current = getScrollY();

    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [enabled, handleScroll, scrollRef, getScrollY]);

  return { isVisible, scrollDirection };
}

export default useScrollHide;
