import { create } from 'zustand'
import { apiClient } from '../api/client'
import { storeEvents, CAMPAIGN_CHANGED } from '../lib/storeEvents'
import { logger } from '../utils/logger'

export interface PartyLootItem {
  id: string
  campaign_id: string
  item_id?: string
  name: string
  description?: string
  quantity: number
  value?: string
  claimed_by?: string
  claimed_by_name?: string
  source?: string
  session_acquired?: number
  notes?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface CreatePartyLootRequest {
  item_id?: string
  name: string
  description?: string
  quantity?: number
  value?: string
  source?: string
  session_acquired?: number
  notes?: string
}

export interface ClaimLootRequest {
  claimed_by: string
  claimed_by_name: string
}

interface PartyLootState {
  items: PartyLootItem[]
  loading: boolean
  error: string | null

  // Actions
  fetchLoot: (campaignId: string) => Promise<void>
  createLoot: (campaignId: string, item: CreatePartyLootRequest) => Promise<PartyLootItem>
  updateLoot: (
    campaignId: string,
    id: string,
    item: Partial<CreatePartyLootRequest>
  ) => Promise<PartyLootItem>
  deleteLoot: (campaignId: string, id: string) => Promise<void>
  claimLoot: (campaignId: string, id: string, claim: ClaimLootRequest) => Promise<PartyLootItem>
  unclaimLoot: (campaignId: string, id: string) => Promise<PartyLootItem>
  clearError: () => void
  invalidateCache: () => void
}

export const usePartyLootStore = create<PartyLootState>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  fetchLoot: async (campaignId: string) => {
    set({ loading: true, error: null })
    try {
      const response = await apiClient.get(`/campaigns/${campaignId}/party-loot`)
      set({ items: response.data || [], loading: false })
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      set({
        error: err.response?.data?.error || 'Failed to fetch party loot',
        loading: false,
      })
    }
  },

  createLoot: async (campaignId: string, item: CreatePartyLootRequest) => {
    set({ loading: true, error: null })
    try {
      const response = await apiClient.post(`/campaigns/${campaignId}/party-loot`, item)
      const newItem = response.data as PartyLootItem
      set((state) => ({
        items: [newItem, ...state.items],
        loading: false,
      }))
      return newItem
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      set({
        error: err.response?.data?.error || 'Failed to add loot',
        loading: false,
      })
      throw error
    }
  },

  updateLoot: async (campaignId: string, id: string, item: Partial<CreatePartyLootRequest>) => {
    set({ loading: true, error: null })
    try {
      const existing = get().items.find((i) => i.id === id)
      if (!existing) throw new Error('Item not found')

      const updateData = {
        name: item.name ?? existing.name,
        description: item.description ?? existing.description,
        quantity: item.quantity ?? existing.quantity,
        value: item.value ?? existing.value,
        source: item.source ?? existing.source,
        session_acquired: item.session_acquired ?? existing.session_acquired,
        notes: item.notes ?? existing.notes,
      }

      const response = await apiClient.put(`/campaigns/${campaignId}/party-loot/${id}`, updateData)
      const updatedItem = response.data as PartyLootItem

      set((state) => ({
        items: state.items.map((i) => (i.id === id ? updatedItem : i)),
        loading: false,
      }))
      return updatedItem
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      set({
        error: err.response?.data?.error || 'Failed to update loot',
        loading: false,
      })
      throw error
    }
  },

  deleteLoot: async (campaignId: string, id: string) => {
    set({ loading: true, error: null })
    try {
      await apiClient.delete(`/campaigns/${campaignId}/party-loot/${id}`)
      set((state) => ({
        items: state.items.filter((i) => i.id !== id),
        loading: false,
      }))
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      set({
        error: err.response?.data?.error || 'Failed to delete loot',
        loading: false,
      })
      throw error
    }
  },

  claimLoot: async (campaignId: string, id: string, claim: ClaimLootRequest) => {
    set({ loading: true, error: null })
    try {
      const response = await apiClient.put(`/campaigns/${campaignId}/party-loot/${id}/claim`, claim)
      const updatedItem = response.data as PartyLootItem

      set((state) => ({
        items: state.items.map((i) => (i.id === id ? updatedItem : i)),
        loading: false,
      }))
      return updatedItem
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      set({
        error: err.response?.data?.error || 'Failed to claim loot',
        loading: false,
      })
      throw error
    }
  },

  unclaimLoot: async (campaignId: string, id: string) => {
    set({ loading: true, error: null })
    try {
      const response = await apiClient.put(`/campaigns/${campaignId}/party-loot/${id}/claim`, {
        claimed_by: null,
        claimed_by_name: null,
      })
      const updatedItem = response.data as PartyLootItem

      set((state) => ({
        items: state.items.map((i) => (i.id === id ? updatedItem : i)),
        loading: false,
      }))
      return updatedItem
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      set({
        error: err.response?.data?.error || 'Failed to unclaim loot',
        loading: false,
      })
      throw error
    }
  },

  clearError: () => set({ error: null }),

  // Clear all data when switching campaigns to prevent stale data
  invalidateCache: () => set({ items: [], error: null }),
}))

// Subscribe to campaign change events to invalidate cache
storeEvents.on(CAMPAIGN_CHANGED, () => {
  usePartyLootStore.getState().invalidateCache()
  logger.debug('[partyLootStore] Cache invalidated due to campaign change')
})
