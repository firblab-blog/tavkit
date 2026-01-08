import { create } from 'zustand'
import { logger } from '../utils/logger'

export interface Profile {
  id: string
  user_id: string
  name: string
  description?: string
  containers: any[]
  is_default: boolean
  created_at: string
  updated_at: string
}

interface ProfileState {
  profiles: Profile[]
  isLoading: boolean

  loadProfiles: () => Promise<void>
  createProfile: (name: string, description?: string) => Promise<void>
  deleteProfile: (id: string) => Promise<void>
  loadProfile: (id: string) => Promise<void>
  setDefaultProfile: (id: string) => Promise<void>
}

// eslint-disable-next-line no-undef
async function apiCall(endpoint: string, options?: RequestInit) {
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`)
  }

  return response.json()
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profiles: [],
  isLoading: false,

  loadProfiles: async () => {
    set({ isLoading: true })
    try {
      const data = await apiCall('/api/v1/profiles')
      set({ profiles: data.profiles || [] })
    } catch (error) {
      logger.error('Failed to load profiles:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  createProfile: async (name: string, description?: string) => {
    // Get current containers from container store
    const response = await apiCall('/api/v1/containers')
    const currentContainers = response.containers || []

    // Create profile with current containers
    await apiCall('/api/v1/profiles', {
      method: 'POST',
      body: JSON.stringify({
        name,
        description,
        containers: currentContainers.map((c: any) => ({
          type: c.type,
          tool: c.tool,
          title: c.title,
          url: c.url,
        })),
        is_default: false,
      }),
    })

    // Reload profiles
    await get().loadProfiles()
  },

  deleteProfile: async (id: string) => {
    await apiCall(`/api/v1/profiles/${id}`, {
      method: 'DELETE',
    })

    // Reload profiles
    await get().loadProfiles()
  },

  loadProfile: async (id: string) => {
    await apiCall(`/api/v1/profiles/${id}/load`, {
      method: 'POST',
    })

    // Note: The container store will need to be reloaded after this
  },

  setDefaultProfile: async (id: string) => {
    await apiCall(`/api/v1/profiles/${id}/default`, {
      method: 'PUT',
    })

    // Reload profiles
    await get().loadProfiles()
  },
}))
