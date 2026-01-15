import { create } from 'zustand'
import { apiClient } from '../api/client'
import { storeEvents, CAMPAIGN_CHANGED } from '../lib/storeEvents'
import { logger } from '../utils/logger'

export type RelationshipType = 'friendly' | 'neutral' | 'hostile' | 'unknown'

export interface NPCEncounter {
  id: string
  user_id: string
  campaign_id?: string
  npc_id?: string
  name: string
  description?: string
  relationship: RelationshipType
  first_met_session?: number
  first_met_location?: string
  last_interaction?: string
  notes?: string
  is_gm_revealed: boolean
  created_at: string
  updated_at: string
}

export interface LocationVisit {
  id: string
  user_id: string
  campaign_id?: string
  location_id?: string
  name: string
  description?: string
  first_visit_session?: number
  notes?: string
  is_gm_revealed: boolean
  created_at: string
  updated_at: string
}

export interface CreateNPCEncounterRequest {
  campaign_id?: string
  npc_id?: string
  name: string
  description?: string
  relationship?: RelationshipType
  first_met_session?: number
  first_met_location?: string
  last_interaction?: string
  notes?: string
}

export interface CreateLocationVisitRequest {
  campaign_id?: string
  location_id?: string
  name: string
  description?: string
  first_visit_session?: number
  notes?: string
}

interface PlayerEncountersState {
  npcs: NPCEncounter[]
  locations: LocationVisit[]
  loadingNPCs: boolean
  loadingLocations: boolean
  error: string | null

  // NPC Actions
  fetchNPCs: (campaignId?: string) => Promise<void>
  createNPC: (npc: CreateNPCEncounterRequest) => Promise<NPCEncounter>
  updateNPC: (id: string, npc: Partial<CreateNPCEncounterRequest>) => Promise<NPCEncounter>
  deleteNPC: (id: string) => Promise<void>

  // Location Actions
  fetchLocations: (campaignId?: string) => Promise<void>
  createLocation: (location: CreateLocationVisitRequest) => Promise<LocationVisit>
  updateLocation: (
    id: string,
    location: Partial<CreateLocationVisitRequest>
  ) => Promise<LocationVisit>
  deleteLocation: (id: string) => Promise<void>

  clearError: () => void
  invalidateCache: () => void
}

export const usePlayerEncountersStore = create<PlayerEncountersState>((set, get) => ({
  npcs: [],
  locations: [],
  loadingNPCs: false,
  loadingLocations: false,
  error: null,

  // NPC Actions
  fetchNPCs: async (campaignId?: string) => {
    set({ loadingNPCs: true, error: null })
    try {
      const params = campaignId ? `?campaign_id=${campaignId}` : ''
      const response = await apiClient.get(`/player/npcs-met${params}`)
      set({ npcs: response.data || [], loadingNPCs: false })
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      set({
        error: err.response?.data?.error || 'Failed to fetch NPCs met',
        loadingNPCs: false,
      })
    }
  },

  createNPC: async (npc: CreateNPCEncounterRequest) => {
    set({ loadingNPCs: true, error: null })
    try {
      const response = await apiClient.post('/player/npcs-met', npc)
      const newNPC = response.data as NPCEncounter
      set((state) => ({
        npcs: [...state.npcs, newNPC].sort((a, b) => a.name.localeCompare(b.name)),
        loadingNPCs: false,
      }))
      return newNPC
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      set({
        error: err.response?.data?.error || 'Failed to create NPC encounter',
        loadingNPCs: false,
      })
      throw error
    }
  },

  updateNPC: async (id: string, npc: Partial<CreateNPCEncounterRequest>) => {
    set({ loadingNPCs: true, error: null })
    try {
      const existing = get().npcs.find((n) => n.id === id)
      if (!existing) throw new Error('NPC not found')

      const updateData = {
        name: npc.name ?? existing.name,
        description: npc.description ?? existing.description,
        relationship: npc.relationship ?? existing.relationship,
        first_met_session: npc.first_met_session ?? existing.first_met_session,
        first_met_location: npc.first_met_location ?? existing.first_met_location,
        last_interaction: npc.last_interaction ?? existing.last_interaction,
        notes: npc.notes ?? existing.notes,
      }

      const response = await apiClient.put(`/player/npcs-met/${id}`, updateData)
      const updatedNPC = response.data as NPCEncounter

      set((state) => ({
        npcs: state.npcs.map((n) => (n.id === id ? updatedNPC : n)),
        loadingNPCs: false,
      }))
      return updatedNPC
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      set({
        error: err.response?.data?.error || 'Failed to update NPC encounter',
        loadingNPCs: false,
      })
      throw error
    }
  },

  deleteNPC: async (id: string) => {
    set({ loadingNPCs: true, error: null })
    try {
      await apiClient.delete(`/player/npcs-met/${id}`)
      set((state) => ({
        npcs: state.npcs.filter((n) => n.id !== id),
        loadingNPCs: false,
      }))
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      set({
        error: err.response?.data?.error || 'Failed to delete NPC encounter',
        loadingNPCs: false,
      })
      throw error
    }
  },

  // Location Actions
  fetchLocations: async (campaignId?: string) => {
    set({ loadingLocations: true, error: null })
    try {
      const params = campaignId ? `?campaign_id=${campaignId}` : ''
      const response = await apiClient.get(`/player/locations-visited${params}`)
      set({ locations: response.data || [], loadingLocations: false })
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      set({
        error: err.response?.data?.error || 'Failed to fetch locations visited',
        loadingLocations: false,
      })
    }
  },

  createLocation: async (location: CreateLocationVisitRequest) => {
    set({ loadingLocations: true, error: null })
    try {
      const response = await apiClient.post('/player/locations-visited', location)
      const newLocation = response.data as LocationVisit
      set((state) => ({
        locations: [...state.locations, newLocation].sort((a, b) => a.name.localeCompare(b.name)),
        loadingLocations: false,
      }))
      return newLocation
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      set({
        error: err.response?.data?.error || 'Failed to create location visit',
        loadingLocations: false,
      })
      throw error
    }
  },

  updateLocation: async (id: string, location: Partial<CreateLocationVisitRequest>) => {
    set({ loadingLocations: true, error: null })
    try {
      const existing = get().locations.find((l) => l.id === id)
      if (!existing) throw new Error('Location not found')

      const updateData = {
        name: location.name ?? existing.name,
        description: location.description ?? existing.description,
        first_visit_session: location.first_visit_session ?? existing.first_visit_session,
        notes: location.notes ?? existing.notes,
      }

      const response = await apiClient.put(`/player/locations-visited/${id}`, updateData)
      const updatedLocation = response.data as LocationVisit

      set((state) => ({
        locations: state.locations.map((l) => (l.id === id ? updatedLocation : l)),
        loadingLocations: false,
      }))
      return updatedLocation
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      set({
        error: err.response?.data?.error || 'Failed to update location visit',
        loadingLocations: false,
      })
      throw error
    }
  },

  deleteLocation: async (id: string) => {
    set({ loadingLocations: true, error: null })
    try {
      await apiClient.delete(`/player/locations-visited/${id}`)
      set((state) => ({
        locations: state.locations.filter((l) => l.id !== id),
        loadingLocations: false,
      }))
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      set({
        error: err.response?.data?.error || 'Failed to delete location visit',
        loadingLocations: false,
      })
      throw error
    }
  },

  clearError: () => set({ error: null }),

  // Clear all data when switching campaigns to prevent stale data
  invalidateCache: () => set({ npcs: [], locations: [], error: null }),
}))

// Subscribe to campaign change events to invalidate cache
storeEvents.on(CAMPAIGN_CHANGED, () => {
  usePlayerEncountersStore.getState().invalidateCache()
  logger.debug('[playerEncountersStore] Cache invalidated due to campaign change')
})
