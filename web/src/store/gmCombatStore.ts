import { create } from 'zustand'
import { apiClient } from '../api/client'
import { logger } from '../utils/logger'
import { storeEvents, CAMPAIGN_CHANGED } from '../lib/storeEvents'

// Types matching backend models
export interface CombatEncounter {
  id: string
  session_id: string
  campaign_id?: string
  name: string
  current_round: number
  current_turn: number
  status: 'active' | 'paused' | 'completed'
  visibility_mode: 'full' | 'gm_controlled'
  is_active: boolean
  difficulty?: string
  environment?: string
  notes?: string
  created_at: string
}

export interface CombatParticipant {
  id: string
  combat_id: string
  participant_type: 'pc' | 'npc' | 'monster'
  character_id?: string
  npc_id?: string
  monster_id?: string
  owner_user_id?: string
  name: string
  max_hp: number
  current_hp: number
  temp_hp: number
  ac: number
  initiative: number
  initiative_bonus: number
  initiative_roll?: number
  passive_perception?: number
  conditions?: string // JSON array
  concentration_spell?: string
  death_saves?: string // JSON object
  is_surprised: boolean
  has_reaction: boolean
  legendary_actions_used: number
  legendary_actions_max: number
  position: number
  notes?: string
  // Visibility controls
  is_visible_to_players: boolean
  show_hp_to_players: boolean
  show_conditions_to_players: boolean
}

export interface CombatSettings {
  id?: string
  campaign_id: string
  default_visibility: 'full' | 'gm_controlled'
  allow_player_self_join: boolean
  auto_roll_initiative: boolean
  show_monster_names: boolean
  show_monster_hp: boolean
}

export interface CreateCombatRequest {
  name: string
  visibility_mode?: 'full' | 'gm_controlled'
  difficulty?: string
  environment?: string
  notes?: string
}

export interface AddParticipantRequest {
  participant_type: 'pc' | 'npc' | 'monster'
  character_id?: string
  npc_id?: string
  monster_id?: string
  name: string
  max_hp: number
  ac: number
  initiative: number
  initiative_bonus?: number
}

interface GMCombatStoreState {
  // State
  combat: CombatEncounter | null
  participants: CombatParticipant[]
  settings: CombatSettings | null
  loading: boolean
  error: string | null
  wsConnected: boolean

  // WebSocket
  ws: WebSocket | null

  // Actions
  fetchActiveCombat: (campaignId: string) => Promise<void>
  createCombat: (campaignId: string, data: CreateCombatRequest) => Promise<CombatEncounter>
  endCombat: (combatId: string) => Promise<void>
  nextTurn: (combatId: string) => Promise<void>
  addParticipant: (combatId: string, data: AddParticipantRequest) => Promise<void>
  updateParticipant: (
    combatId: string,
    participantId: string,
    updates: Partial<CombatParticipant>
  ) => Promise<void>
  removeParticipant: (combatId: string, participantId: string) => Promise<void>
  fetchSettings: (campaignId: string) => Promise<void>
  updateSettings: (campaignId: string, settings: Partial<CombatSettings>) => Promise<void>

  // WebSocket actions
  connectWebSocket: (combatId: string, token: string) => void
  disconnectWebSocket: () => void

  // Local state
  setParticipants: (participants: CombatParticipant[]) => void
  setCombat: (combat: CombatEncounter | null) => void
  clearError: () => void

  // Cache invalidation
  invalidateCache: () => void
}

export const useGMCombatStore = create<GMCombatStoreState>((set, get) => ({
  combat: null,
  participants: [],
  settings: null,
  loading: false,
  error: null,
  wsConnected: false,
  ws: null,

  fetchActiveCombat: async (campaignId: string) => {
    set({ loading: true, error: null })
    try {
      const response = await apiClient.get(`/campaigns/${campaignId}/combat/active`)
      const { combat, participants, is_gm } = response.data

      if (!is_gm) {
        set({ error: 'Not authorized as GM', loading: false })
        return
      }

      set({
        combat: combat || null,
        participants: participants || [],
        loading: false,
      })
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: { error?: string } } }
      if (err.response?.status === 404) {
        set({ combat: null, participants: [], loading: false })
        return
      }
      set({
        error: err.response?.data?.error || 'Failed to fetch combat',
        loading: false,
      })
    }
  },

  createCombat: async (campaignId: string, data: CreateCombatRequest) => {
    set({ loading: true, error: null })
    try {
      const response = await apiClient.post(`/campaigns/${campaignId}/combat`, data)
      const combat = response.data.combat
      set({ combat, participants: [], loading: false })
      return combat
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      set({
        error: err.response?.data?.error || 'Failed to create combat',
        loading: false,
      })
      throw error
    }
  },

  endCombat: async (combatId: string) => {
    set({ loading: true, error: null })
    try {
      await apiClient.put(`/combat/${combatId}`, { status: 'completed', is_active: false })
      set({ combat: null, participants: [], loading: false })
      get().disconnectWebSocket()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      set({
        error: err.response?.data?.error || 'Failed to end combat',
        loading: false,
      })
    }
  },

  nextTurn: async (combatId: string) => {
    try {
      const response = await apiClient.post(`/combat/${combatId}/next-turn`)
      const { combat } = response.data
      set({ combat })
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      set({ error: err.response?.data?.error || 'Failed to advance turn' })
    }
  },

  addParticipant: async (combatId: string, data: AddParticipantRequest) => {
    try {
      const response = await apiClient.post(`/combat/${combatId}/participants`, data)
      const newParticipant = response.data.participant
      set((state) => ({
        participants: [...state.participants, newParticipant].sort(
          (a, b) => b.initiative - a.initiative
        ),
      }))
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      set({ error: err.response?.data?.error || 'Failed to add participant' })
      throw error
    }
  },

  updateParticipant: async (
    combatId: string,
    participantId: string,
    updates: Partial<CombatParticipant>
  ) => {
    try {
      await apiClient.put(`/combat/${combatId}/participants/${participantId}`, updates)
      set((state) => ({
        participants: state.participants.map((p) =>
          p.id === participantId ? { ...p, ...updates } : p
        ),
      }))
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      set({ error: err.response?.data?.error || 'Failed to update participant' })
    }
  },

  removeParticipant: async (combatId: string, participantId: string) => {
    try {
      await apiClient.delete(`/combat/${combatId}/participants/${participantId}`)
      set((state) => ({
        participants: state.participants.filter((p) => p.id !== participantId),
      }))
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      set({ error: err.response?.data?.error || 'Failed to remove participant' })
    }
  },

  fetchSettings: async (campaignId: string) => {
    try {
      const response = await apiClient.get(`/campaigns/${campaignId}/combat-settings`)
      set({ settings: response.data.settings })
    } catch {
      // Use defaults if no settings exist
      set({
        settings: {
          campaign_id: campaignId,
          default_visibility: 'full',
          allow_player_self_join: true,
          auto_roll_initiative: false,
          show_monster_names: true,
          show_monster_hp: true,
        },
      })
    }
  },

  updateSettings: async (campaignId: string, updates: Partial<CombatSettings>) => {
    try {
      const current = get().settings
      const newSettings = { ...current, ...updates, campaign_id: campaignId }
      await apiClient.put(`/campaigns/${campaignId}/combat-settings`, newSettings)
      set({ settings: newSettings as CombatSettings })
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      set({ error: err.response?.data?.error || 'Failed to update settings' })
    }
  },

  connectWebSocket: (combatId: string, token: string) => {
    const { ws } = get()
    if (ws) {
      ws.close()
    }

    const protocol = globalThis.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${globalThis.location.host}/ws/combat/${combatId}?token=${token}`

    const socket = new WebSocket(wsUrl)

    socket.onopen = () => {
      set({ wsConnected: true })
    }

    socket.onclose = () => {
      set({ wsConnected: false, ws: null })
    }

    socket.onerror = () => {
      set({ wsConnected: false, error: 'WebSocket connection failed' })
    }

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        handleWSMessage(data, set, get)
      } catch {
        logger.error('Failed to parse WebSocket message')
      }
    }

    set({ ws: socket })
  },

  disconnectWebSocket: () => {
    const { ws } = get()
    if (ws) {
      ws.close()
      set({ ws: null, wsConnected: false })
    }
  },

  setParticipants: (participants: CombatParticipant[]) => set({ participants }),
  setCombat: (combat: CombatEncounter | null) => set({ combat }),
  clearError: () => set({ error: null }),

  invalidateCache: () => {
    // Disconnect WebSocket before clearing state
    const { ws } = get()
    if (ws) {
      ws.close()
    }
    set({
      combat: null,
      participants: [],
      settings: null,
      loading: false,
      error: null,
      wsConnected: false,
      ws: null,
    })
  },
}))

// Subscribe to campaign changes to invalidate cache
storeEvents.on(CAMPAIGN_CHANGED, () => {
  useGMCombatStore.getState().invalidateCache()
})

// WebSocket message handler
function handleWSMessage(
  data: { type: string; payload: unknown },
  set: (partial: Partial<GMCombatStoreState>) => void,
  get: () => GMCombatStoreState
) {
  switch (data.type) {
    case 'combat:state': {
      const payload = data.payload as { combat: CombatEncounter; participants: CombatParticipant[] }
      set({ combat: payload.combat, participants: payload.participants })
      break
    }
    case 'combat:turn_changed': {
      const payload = data.payload as { current_turn: number; current_round: number }
      const combat = get().combat
      if (combat) {
        set({ combat: { ...combat, ...payload } })
      }
      break
    }
    case 'combat:hp_updated': {
      const payload = data.payload as {
        participant_id: string
        current_hp: number
        temp_hp: number
      }
      set({
        participants: get().participants.map((p) =>
          p.id === payload.participant_id
            ? { ...p, current_hp: payload.current_hp, temp_hp: payload.temp_hp }
            : p
        ),
      })
      break
    }
    case 'combat:participant_updated': {
      const payload = data.payload as Partial<CombatParticipant> & { participant_id: string }
      set({
        participants: get().participants.map((p) =>
          p.id === payload.participant_id ? { ...p, ...payload } : p
        ),
      })
      break
    }
    case 'combat:condition_updated': {
      // Refresh participants to get updated conditions
      // In a more advanced implementation, we'd update conditions directly
      break
    }
  }
}
