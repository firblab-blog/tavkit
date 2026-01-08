import { useEffect, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useContainerStore, type ContainerInstance } from '../store/containerStore'
import { logger } from '../utils/logger'

/**
 * Tool slug to container configuration mapping
 * Maps URL-friendly slugs to container opening parameters
 */
const TOOL_ROUTES: Record<string, { type: 'internal' | 'settings'; tool: string; title: string }> =
  {
    // Campaign tools
    'campaign-ledger': { type: 'internal', tool: 'campaign', title: 'Campaign Ledger' },
    characters: { type: 'internal', tool: 'characters', title: "Adventurer's Roster" },
    'chase-manager': { type: 'internal', tool: 'chase-manager', title: 'Chase Manager' },
    'saved-content': { type: 'internal', tool: 'saved', title: 'Saved Content' },

    // Generators
    npc: { type: 'internal', tool: 'npc', title: 'NPC Generator' },
    monster: { type: 'internal', tool: 'monster', title: 'Monster Generator' },
    encounter: { type: 'internal', tool: 'encounter', title: 'Encounter Builder' },
    dialogue: { type: 'internal', tool: 'dialogue', title: 'Dialogue Builder' },
    location: { type: 'internal', tool: 'location', title: 'Location Generator' },
    quest: { type: 'internal', tool: 'quest', title: 'Quest Generator' },
    item: { type: 'internal', tool: 'item', title: 'Item Generator' },
    tavern: { type: 'internal', tool: 'tavern', title: 'Tavern Generator' },
    merchant: { type: 'internal', tool: 'merchant', title: 'Merchant Generator' },
    trap: { type: 'internal', tool: 'trap', title: 'Trap Generator' },
    critter: { type: 'internal', tool: 'critter', title: 'Critter Generator' },
    chase: { type: 'internal', tool: 'chase', title: 'Chase Generator' },
    rumor: { type: 'internal', tool: 'rumor', title: 'Rumor Generator' },

    // Admin tools
    settings: { type: 'settings', tool: 'settings', title: 'Settings' },
    'user-management': { type: 'settings', tool: 'user-management', title: 'User Management' },
  }

/**
 * Reverse mapping: tool identifier to URL slug
 */
const TOOL_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(TOOL_ROUTES).map(([slug, config]) => [config.tool, slug])
)

/**
 * Get URL slug for a container
 */
function getSlugForContainer(container: ContainerInstance): string | null {
  // For internal tools, use the tool-to-slug mapping
  if (container.type === 'internal' || container.type === 'settings') {
    return TOOL_TO_SLUG[container.tool] || null
  }
  // External containers use their tool ID as the slug
  if (container.type === 'external') {
    return `external/${container.tool}`
  }
  return null
}

/**
 * Parse URL path to get tool slug
 * Expects paths like /dashboard/campaign-ledger or /dashboard/external/5etools
 */
function parseToolFromPath(pathname: string): string | null {
  // Remove /dashboard prefix
  const match = pathname.match(/^\/dashboard\/(.+)$/)
  if (!match) return null
  return match[1]
}

/**
 * Hook that synchronizes container state with URL for deep linking
 *
 * Features:
 * - Opening a URL like /dashboard/npc opens the NPC Generator
 * - Switching containers updates the URL
 * - Back/forward browser navigation works
 * - /dashboard shows the home view
 */
export function useContainerRouting() {
  const location = useLocation()
  const navigate = useNavigate()
  const { openContainer, setActive, isInitialized } = useContainerStore()

  // Track whether we're currently handling a URL change to avoid loops
  const isHandlingUrlChange = useRef(false)
  // Track the last URL we set to avoid redundant updates
  const lastSetPath = useRef<string | null>(null)
  // Track the last pathname we processed to avoid duplicate handling
  const lastProcessedPath = useRef<string | null>(null)

  /**
   * Handle URL changes (including initial load and browser navigation)
   * Uses getState() to read current state to avoid dependency on state values
   */
  const handleUrlChange = useCallback(async () => {
    if (!isInitialized) return

    const pathname = location.pathname

    // Avoid processing the same path twice
    if (pathname === lastProcessedPath.current) return
    lastProcessedPath.current = pathname

    const toolSlug = parseToolFromPath(pathname)
    logger.debug('[useContainerRouting] URL changed:', pathname, 'slug:', toolSlug)

    isHandlingUrlChange.current = true

    try {
      // Get current state directly from store to avoid stale closures
      const { containers, activeId } = useContainerStore.getState()

      // /dashboard with no tool = show home (close active container display)
      if (!toolSlug) {
        // If there's an active container, just clear the active state
        // Don't close containers - let user switch back
        if (activeId) {
          await setActive(null)
        }
        return
      }

      // Check if it's an external tool route
      if (toolSlug.startsWith('external/')) {
        const externalToolId = toolSlug.replace('external/', '')
        // Find existing external container with this tool ID
        const existingContainer = containers.find(
          (c) => c.type === 'external' && c.tool === externalToolId
        )
        if (existingContainer) {
          if (activeId !== existingContainer.id) {
            await setActive(existingContainer.id)
          }
        }
        // Note: Can't open external containers from URL alone (need URL info)
        // They must be opened via UI first
        return
      }

      // Look up the tool configuration
      const toolConfig = TOOL_ROUTES[toolSlug]
      if (!toolConfig) {
        logger.warn('[useContainerRouting] Unknown tool slug:', toolSlug)
        // Navigate to dashboard home for unknown routes
        navigate('/dashboard', { replace: true })
        return
      }

      // Check if container is already open
      const existingContainer = containers.find(
        (c) => c.type === toolConfig.type && c.tool === toolConfig.tool
      )

      if (existingContainer) {
        // Container exists, just activate it
        if (activeId !== existingContainer.id) {
          await setActive(existingContainer.id)
        }
      } else {
        // Open the container
        await openContainer({
          type: toolConfig.type,
          tool: toolConfig.tool,
          title: toolConfig.title,
        })
      }
    } finally {
      isHandlingUrlChange.current = false
    }
  }, [isInitialized, location.pathname, openContainer, setActive, navigate])

  /**
   * Update URL when active container changes.
   * Uses zustand subscribe to react to state changes without re-running the effect.
   */
  useEffect(() => {
    if (!isInitialized) return

    let lastActiveId: string | null = useContainerStore.getState().activeId

    // Subscribe to all state changes, filter for activeId changes
    const unsubscribe = useContainerStore.subscribe((state) => {
      // Only react to activeId changes
      if (state.activeId === lastActiveId) return
      lastActiveId = state.activeId

      // Don't update URL if we're handling a URL change (would cause loop)
      if (isHandlingUrlChange.current) return

      const { activeId, containers } = state

      // Find the active container
      const activeContainer = containers.find((c) => c.id === activeId)

      let newPath: string
      if (!activeId || !activeContainer) {
        // No active container = dashboard home
        newPath = '/dashboard'
      } else {
        // Get the slug for the active container
        const slug = getSlugForContainer(activeContainer)
        newPath = slug ? `/dashboard/${slug}` : '/dashboard'
      }

      // Only update if the path actually changed
      const currentPath = window.location.pathname
      if (newPath !== currentPath && newPath !== lastSetPath.current) {
        logger.debug('[useContainerRouting] Updating URL to:', newPath)
        lastSetPath.current = newPath
        navigate(newPath, { replace: true })
      }
    })

    return unsubscribe
  }, [isInitialized, navigate])

  /**
   * Handle URL changes on mount and when location.pathname changes
   */
  useEffect(() => {
    handleUrlChange()
    // Only depend on location.pathname to avoid loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, isInitialized])

  return null
}

/**
 * Get the URL path for opening a specific tool
 * Useful for generating links
 */
export function getToolPath(tool: string): string {
  const slug = TOOL_TO_SLUG[tool]
  return slug ? `/dashboard/${slug}` : '/dashboard'
}
