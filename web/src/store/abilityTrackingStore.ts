import { create } from 'zustand'
import { apiClient } from '../api/client'
import { storeEvents, CAMPAIGN_CHANGED } from '../lib/storeEvents'
import { logger } from '../utils/logger'

export type RechargeType = 'short_rest' | 'long_rest' | 'daily' | 'dawn' | 'per_turn'

export type AbilityType =
  | 'spell_slot'
  | 'class_feature'
  | 'racial_ability'
  | 'item_charge'
  | 'custom'

export interface TrackedAbility {
  id: string
  user_id: string
  character_id: string
  ability_name: string
  ability_type: AbilityType
  max_uses: number
  current_uses: number
  recharge_type: RechargeType
  notes?: string
  last_used?: string
  created_at: string
  updated_at: string
}

export interface CreateAbilityRequest {
  ability_name: string
  ability_type: AbilityType
  max_uses: number
  current_uses?: number
  recharge_type: RechargeType
  notes?: string
}

export interface UpdateAbilityRequest {
  ability_name?: string
  max_uses?: number
  current_uses?: number
  recharge_type?: RechargeType
  notes?: string
}

// Spell slot configuration by level
export interface SpellSlotConfig {
  level: number
  max: number
  used: number
}

interface AbilityTrackingStoreState {
  abilities: TrackedAbility[]
  spellSlots: SpellSlotConfig[]
  loading: boolean
  error: string | null

  // Ability actions
  fetchAbilities: (characterId: string) => Promise<void>
  createAbility: (characterId: string, data: CreateAbilityRequest) => Promise<void>
  updateAbility: (
    characterId: string,
    abilityId: string,
    data: UpdateAbilityRequest
  ) => Promise<void>
  deleteAbility: (characterId: string, abilityId: string) => Promise<void>
  useAbility: (characterId: string, abilityId: string) => Promise<void>
  resetAbility: (characterId: string, abilityId: string) => Promise<void>

  // Spell slot actions
  fetchSpellSlots: (characterId: string) => Promise<void>
  useSpellSlot: (characterId: string, level: number) => Promise<void>
  restoreSpellSlot: (characterId: string, level: number) => Promise<void>
  setSpellSlots: (characterId: string, slots: SpellSlotConfig[]) => Promise<void>

  // Rest actions
  shortRest: (characterId: string) => Promise<void>
  longRest: (characterId: string) => Promise<void>

  clearError: () => void
  invalidateCache: () => void
}

export const useAbilityTrackingStore = create<AbilityTrackingStoreState>((set, get) => ({
  abilities: [],
  spellSlots: [],
  loading: false,
  error: null,

  fetchAbilities: async (characterId: string) => {
    set({ loading: true, error: null })
    try {
      const response = await apiClient.get(`/player/abilities/character/${characterId}`)
      set({
        abilities: response.data?.abilities || [],
        spellSlots: response.data?.spell_slots || [],
        loading: false,
      })
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string }; status?: number } }
      if (err.response?.status === 404) {
        set({ abilities: [], spellSlots: [], loading: false })
        return
      }
      set({
        error: err.response?.data?.error || 'Failed to fetch abilities',
        loading: false,
      })
    }
  },

  createAbility: async (characterId: string, data: CreateAbilityRequest) => {
    set({ loading: true, error: null })
    try {
      const response = await apiClient.post(`/player/abilities`, {
        ...data,
        character_id: characterId,
      })
      set((state) => ({
        abilities: [...state.abilities, response.data],
        loading: false,
      }))
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      set({
        error: err.response?.data?.error || 'Failed to create ability',
        loading: false,
      })
      throw error
    }
  },

  updateAbility: async (_characterId: string, abilityId: string, data: UpdateAbilityRequest) => {
    set({ loading: true, error: null })
    try {
      const response = await apiClient.put(`/player/abilities/${abilityId}`, data)
      set((state) => ({
        abilities: state.abilities.map((a) => (a.id === abilityId ? response.data : a)),
        loading: false,
      }))
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      set({
        error: err.response?.data?.error || 'Failed to update ability',
        loading: false,
      })
      throw error
    }
  },

  deleteAbility: async (_characterId: string, abilityId: string) => {
    set({ loading: true, error: null })
    try {
      await apiClient.delete(`/player/abilities/${abilityId}`)
      set((state) => ({
        abilities: state.abilities.filter((a) => a.id !== abilityId),
        loading: false,
      }))
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      set({
        error: err.response?.data?.error || 'Failed to delete ability',
        loading: false,
      })
      throw error
    }
  },

  useAbility: async (_characterId: string, abilityId: string) => {
    const ability = get().abilities.find((a) => a.id === abilityId)
    if (!ability || ability.current_uses >= ability.max_uses) return

    // Optimistic update
    set((state) => ({
      abilities: state.abilities.map((a) =>
        a.id === abilityId ? { ...a, current_uses: a.current_uses + 1 } : a
      ),
    }))

    try {
      await apiClient.post(`/player/abilities/${abilityId}/use`)
    } catch {
      // Revert on error
      set((state) => ({
        abilities: state.abilities.map((a) =>
          a.id === abilityId ? { ...a, current_uses: ability.current_uses } : a
        ),
      }))
    }
  },

  resetAbility: async (_characterId: string, abilityId: string) => {
    const ability = get().abilities.find((a) => a.id === abilityId)
    if (!ability) return

    // Optimistic update
    set((state) => ({
      abilities: state.abilities.map((a) => (a.id === abilityId ? { ...a, current_uses: 0 } : a)),
    }))

    try {
      await apiClient.post(`/player/abilities/${abilityId}/reset`)
    } catch {
      // Revert
      set((state) => ({
        abilities: state.abilities.map((a) =>
          a.id === abilityId ? { ...a, current_uses: ability.current_uses } : a
        ),
      }))
    }
  },

  fetchSpellSlots: async (characterId: string) => {
    // Already fetched with abilities
    await get().fetchAbilities(characterId)
  },

  useSpellSlot: async (characterId: string, level: number) => {
    const slots = get().spellSlots
    const slot = slots.find((s) => s.level === level)
    if (!slot || slot.used >= slot.max) return

    // Optimistic update
    set((state) => ({
      spellSlots: state.spellSlots.map((s) => (s.level === level ? { ...s, used: s.used + 1 } : s)),
    }))

    try {
      await apiClient.post(`/player/abilities/${characterId}/spell-slot/${level}/use`)
    } catch {
      // Revert
      set((state) => ({
        spellSlots: state.spellSlots.map((s) =>
          s.level === level ? { ...s, used: slot.used } : s
        ),
      }))
    }
  },

  restoreSpellSlot: async (characterId: string, level: number) => {
    const slots = get().spellSlots
    const slot = slots.find((s) => s.level === level)
    if (!slot || slot.used <= 0) return

    // Optimistic update
    set((state) => ({
      spellSlots: state.spellSlots.map((s) => (s.level === level ? { ...s, used: s.used - 1 } : s)),
    }))

    try {
      await apiClient.post(`/player/abilities/${characterId}/spell-slot/${level}/restore`)
    } catch {
      // Revert
      set((state) => ({
        spellSlots: state.spellSlots.map((s) =>
          s.level === level ? { ...s, used: slot.used } : s
        ),
      }))
    }
  },

  setSpellSlots: async (characterId: string, slots: SpellSlotConfig[]) => {
    const previousSlots = get().spellSlots

    set({ spellSlots: slots })

    try {
      await apiClient.put(`/player/abilities/${characterId}/spell-slots`, { spell_slots: slots })
    } catch {
      set({ spellSlots: previousSlots })
    }
  },

  shortRest: async (characterId: string) => {
    const previousAbilities = get().abilities
    const previousSlots = get().spellSlots

    // Reset short rest abilities
    set((state) => ({
      abilities: state.abilities.map((a) =>
        a.recharge_type === 'short_rest' ? { ...a, current_uses: 0 } : a
      ),
    }))

    try {
      await apiClient.post(`/player/abilities/character/${characterId}/rest`, {
        recharge_type: 'short_rest',
      })
      // Re-fetch to get updated state
      await get().fetchAbilities(characterId)
    } catch {
      set({ abilities: previousAbilities, spellSlots: previousSlots })
    }
  },

  longRest: async (characterId: string) => {
    const previousAbilities = get().abilities
    const previousSlots = get().spellSlots

    // Reset all abilities and spell slots
    set((state) => ({
      abilities: state.abilities.map((a) => ({ ...a, current_uses: 0 })),
      spellSlots: state.spellSlots.map((s) => ({ ...s, used: 0 })),
    }))

    try {
      await apiClient.post(`/player/abilities/character/${characterId}/rest`, {
        recharge_type: 'long_rest',
      })
      // Re-fetch to get updated state
      await get().fetchAbilities(characterId)
    } catch {
      set({ abilities: previousAbilities, spellSlots: previousSlots })
    }
  },

  clearError: () => set({ error: null }),

  // Clear all data when switching campaigns to prevent stale data
  invalidateCache: () => set({ abilities: [], spellSlots: [], error: null }),
}))

// Subscribe to campaign change events to invalidate cache
storeEvents.on(CAMPAIGN_CHANGED, () => {
  useAbilityTrackingStore.getState().invalidateCache()
  logger.debug('[abilityTrackingStore] Cache invalidated due to campaign change')
})

// Common D&D class features for easy addition
export const COMMON_CLASS_FEATURES: Record<
  string,
  { name: string; maxUses: number; recharge: RechargeType }[]
> = {
  Barbarian: [
    { name: 'Rage', maxUses: 2, recharge: 'long_rest' },
    { name: 'Reckless Attack', maxUses: 0, recharge: 'per_turn' }, // Unlimited
  ],
  Bard: [{ name: 'Bardic Inspiration', maxUses: 3, recharge: 'long_rest' }],
  Cleric: [{ name: 'Channel Divinity', maxUses: 1, recharge: 'short_rest' }],
  Druid: [{ name: 'Wild Shape', maxUses: 2, recharge: 'short_rest' }],
  Fighter: [
    { name: 'Second Wind', maxUses: 1, recharge: 'short_rest' },
    { name: 'Action Surge', maxUses: 1, recharge: 'short_rest' },
  ],
  Gunslinger: [{ name: 'Grit', maxUses: 3, recharge: 'short_rest' }],
  Monk: [{ name: 'Ki Points', maxUses: 3, recharge: 'short_rest' }],
  Paladin: [
    { name: 'Lay on Hands', maxUses: 5, recharge: 'long_rest' },
    { name: 'Channel Divinity', maxUses: 1, recharge: 'short_rest' },
    { name: 'Divine Smite', maxUses: 0, recharge: 'long_rest' }, // Uses spell slots
  ],
  Ranger: [{ name: 'Favored Foe', maxUses: 2, recharge: 'long_rest' }],
  Rogue: [
    { name: 'Sneak Attack', maxUses: 0, recharge: 'per_turn' }, // Once per turn
  ],
  Sorcerer: [{ name: 'Sorcery Points', maxUses: 3, recharge: 'long_rest' }],
  Warlock: [
    // Warlock spell slots recover on short rest - handled separately
  ],
  Wizard: [{ name: 'Arcane Recovery', maxUses: 1, recharge: 'long_rest' }],
}
