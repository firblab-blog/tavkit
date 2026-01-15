import { useState, useEffect, useCallback } from "react";

interface UseMobileSidebarOptions {
  /** Breakpoint in pixels (default: 1024 for lg) */
  breakpoint?: number;
  /** Whether the hook is enabled (default: true) */
  enabled?: boolean;
}

interface UseMobileSidebarReturn {
  /** Whether viewport is considered mobile */
  isMobile: boolean;
  /** Whether the drawer is open */
  isDrawerOpen: boolean;
  /** Open the drawer */
  openDrawer: () => void;
  /** Close the drawer */
  closeDrawer: () => void;
  /** Toggle the drawer */
  toggleDrawer: () => void;
  /** Set drawer open state directly */
  setIsDrawerOpen: (open: boolean) => void;
}

/**
 * useMobileSidebar - Hook for managing mobile drawer/sidebar behavior.
 *
 * Provides:
 * - Mobile detection based on viewport width
 * - Drawer visibility state
 * - Body scroll lock when drawer is open
 * - Escape key handler
 * - Auto-close drawer when switching to desktop
 *
 * @example
 * ```tsx
 * const { isMobile, isDrawerOpen, toggleDrawer, closeDrawer } = useMobileSidebar()
 *
 * return (
 *   <>
 *     {isMobile && (
 *       <button onClick={toggleDrawer}>Menu</button>
 *     )}
 *     {isMobile && isDrawerOpen && (
 *       <div className="backdrop" onClick={closeDrawer} />
 *     )}
 *     <aside className={isMobile && !isDrawerOpen ? 'hidden' : ''}>
 *       Sidebar content
 *     </aside>
 *   </>
 * )
 * ```
 */
export function useMobileSidebar(
  options: UseMobileSidebarOptions = {},
): UseMobileSidebarReturn {
  const { breakpoint = 1024, enabled = true } = options;

  const [isMobile, setIsMobile] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    if (!enabled) return;

    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [breakpoint, enabled]);

  // Close drawer when switching to desktop
  useEffect(() => {
    if (!isMobile) {
      setIsDrawerOpen(false);
    }
  }, [isMobile]);

  // Prevent body scroll when drawer open on mobile
  useEffect(() => {
    if (isMobile && isDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobile, isDrawerOpen]);

  // Handle Escape key to close drawer
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsDrawerOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isDrawerOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isDrawerOpen, handleEscape]);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);
  const toggleDrawer = useCallback(() => setIsDrawerOpen((prev) => !prev), []);

  return {
    isMobile,
    isDrawerOpen,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    setIsDrawerOpen,
  };
}

export default useMobileSidebar;
