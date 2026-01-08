import { create } from 'zustand'
import { logger } from '../utils/logger'

export type ContainerType = 'internal' | 'external' | 'git' | 'settings'

export interface ContainerInstance {
  id: string
  type: ContainerType
  tool: string
  title: string
  url?: string
  position?: number
  is_active?: boolean
}

interface ContainerState {
  containers: ContainerInstance[]
  activeId: string | null
  isLoading: boolean
  isInitialized: boolean

  openContainer: (container: Omit<ContainerInstance, 'id'>) => Promise<void>
  closeContainer: (id: string) => Promise<void>
  closeAllContainers: () => Promise<void>
  moveContainer: (id: string, direction: 'left' | 'right') => Promise<void>
  setActive: (id: string | null) => Promise<void>
  loadContainers: () => Promise<void>
  syncContainers: () => Promise<void>
}

let nextId = 0
const generateId = () => `container-${++nextId}-${Date.now()}`

// Helper to get CSRF token from cookie
function getCSRFToken(): string | null {
  const match = document.cookie.match(/(?:^|; )csrf_token=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : null
}

// API helpers - uses HttpOnly cookies for auth and CSRF token for state-changing requests
// eslint-disable-next-line no-undef
async function apiCall(endpoint: string, options?: RequestInit) {
  const csrfToken = getCSRFToken()
  const method = options?.method?.toUpperCase() || 'GET'

  logger.debug('[containerStore] API call:', endpoint, 'method:', method)

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options?.headers as Record<string, string>) || {}),
  }

  // Add CSRF token for state-changing requests
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && csrfToken) {
    headers['X-CSRF-Token'] = csrfToken
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
    credentials: 'include', // Send cookies with request
  })

  if (!response.ok) {
    logger.error('[containerStore] API call failed:', response.status, response.statusText)
    throw new Error(`API call failed: ${response.statusText}`)
  }

  return response.json()
}

export const useContainerStore = create<ContainerState>((set, get) => ({
  containers: [],
  activeId: null,
  isLoading: false,
  isInitialized: false,

  loadContainers: async () => {
    if (get().isLoading) return

    set({ isLoading: true })
    try {
      const data = await apiCall('/api/v1/containers')
      const containers = data.containers || []
      const activeContainer = containers.find((c: ContainerInstance) => c.is_active)

      set({
        containers,
        // Only set activeId if there's an explicitly active container
        // Don't default to first container - let homepage show instead
        activeId: activeContainer?.id || null,
        isInitialized: true,
      })
    } catch (error) {
      logger.error('Failed to load containers:', error)
      set({ isInitialized: true })
    } finally {
      set({ isLoading: false })
    }
  },

  syncContainers: async () => {
    const { containers, activeId } = get()

    try {
      await apiCall('/api/v1/containers/bulk', {
        method: 'POST',
        body: JSON.stringify({
          containers: containers.map((c, index) => ({
            type: c.type,
            tool: c.tool,
            title: c.title,
            url: c.url,
            position: index,
            is_active: c.id === activeId,
          })),
        }),
      })
    } catch (error) {
      logger.error('Failed to sync containers:', error)
    }
  },

  openContainer: async (container) => {
    // Check if a container with the same type, tool, and url already exists
    const existingContainer = get().containers.find((c) => {
      const sameType = c.type === container.type
      const sameTool = c.tool === container.tool
      const sameUrl = container.url ? c.url === container.url : true
      return sameType && sameTool && sameUrl
    })

    // If exists, just switch to that tab
    if (existingContainer) {
      set({ activeId: existingContainer.id })
      get()
        .syncContainers()
        .catch((err) => logger.error('Failed to sync containers', err))
      return
    }

    // Otherwise, create a new container
    const id = generateId()
    const newContainer = { ...container, id }

    set((state) => ({
      containers: [...state.containers, newContainer],
      activeId: id,
    }))

    // Sync to backend (fire and forget)
    get()
      .syncContainers()
      .catch((err) => logger.error('Failed to sync containers', err))
  },

  closeContainer: async (id) => {
    set((state) => {
      const remaining = state.containers.filter((c) => c.id !== id)
      return {
        containers: remaining,
        activeId: remaining.length > 0 ? remaining[remaining.length - 1].id : null,
      }
    })

    // Sync to backend (fire and forget)
    get()
      .syncContainers()
      .catch((err) => logger.error('Failed to sync containers', err))
  },

  closeAllContainers: async () => {
    set({ containers: [], activeId: null })
    get()
      .syncContainers()
      .catch((err) => logger.error('Failed to sync containers', err))
  },

  moveContainer: async (id, direction) => {
    set((state) => {
      const index = state.containers.findIndex((c) => c.id === id)
      if (index === -1) return state

      const newIndex = direction === 'left' ? index - 1 : index + 1
      if (newIndex < 0 || newIndex >= state.containers.length) return state

      const newContainers = [...state.containers]
      const [movedContainer] = newContainers.splice(index, 1)
      newContainers.splice(newIndex, 0, movedContainer)

      return { containers: newContainers }
    })

    get()
      .syncContainers()
      .catch((err) => logger.error('Failed to sync containers', err))
  },

  setActive: async (id) => {
    set({ activeId: id })

    // Sync to backend (fire and forget)
    get()
      .syncContainers()
      .catch((err) => logger.error('Failed to sync containers', err))
  },
}))
