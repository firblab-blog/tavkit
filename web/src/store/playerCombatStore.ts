import { create } from 'zustand'
import { apiClient } from '../api/client'
import { storeEvents, CAMPAIGN_CHANGED } from '../lib/storeEvents'
import { logger } from '../utils/logger'

export type ConditionType =
  | 'blinded'
  | 'charmed'
  | 'deafened'
  | 'frightened'
  | 'grappled'
  | 'incapacitated'
  | 'invisible'
  | 'paralyzed'
  | 'petrified'
  | 'poisoned'
  | 'prone'
  | 'restrained'
  | 'stunned'
  | 'unconscious'
  | 'exhaustion'
  | 'concentrating'

export interface ActiveCondition {
  type: ConditionType
  source?: string
  duration?: string
  notes?: string
}

export interface CombatParticipant {
  id: string
  name: string
  initiative: number
  is_current_turn: boolean
  is_player?: boolean
  character_id?: string
  owner_user_id?: string
  current_hp?: number
  max_hp?: number
  conditions?: ActiveCondition[]
}

export interface PlayerCombatState {
  id?: string
  campaign_id?: string
  character_id?: string
  is_in_combat: boolean
  current_hp: number
  max_hp: number
  temp_hp: number
  conditions: ActiveCondition[]
  concentration_spell?: string
  reaction_used: boolean
  initiative?: number
  notes?: string
  // Synced from GM (if available)
  initiative_order?: CombatParticipant[]
  current_round?: number
  is_my_turn?: boolean
}

export interface UpdateCombatRequest {
  is_in_combat?: boolean
  current_hp?: number
  temp_hp?: number
  conditions?: ActiveCondition[]
  concentration_spell?: string
  reaction_used?: boolean
  initiative?: number
  clear_initiative?: boolean
  notes?: string
}

interface PlayerCombatStoreState {
  combat: PlayerCombatState
  loading: boolean
  error: string | null
  lastSync: number | null

  // Actions
  fetchCombatState: (characterId: string) => Promise<void>
  updateCombatState: (characterId: string, updates: UpdateCombatRequest) => Promise<void>
  startCombat: (characterId: string, initiative: number) => Promise<void>
  endCombat: (characterId: string) => Promise<void>
  addCondition: (characterId: string, condition: ActiveCondition) => Promise<void>
  removeCondition: (characterId: string, conditionType: ConditionType) => Promise<void>
  setConcentration: (characterId: string, spell: string | null) => Promise<void>
  toggleReaction: (characterId: string) => Promise<void>
  adjustHP: (characterId: string, amount: number) => Promise<void>
  setTempHP: (characterId: string, amount: number) => Promise<void>
  clearError: () => void
  invalidateCache: () => void

  // Local state helpers
  setLocalCombat: (combat: Partial<PlayerCombatState>) => void
}

const DEFAULT_COMBAT_STATE: PlayerCombatState = {
  is_in_combat: false,
  current_hp: 0,
  max_hp: 0,
  temp_hp: 0,
  conditions: [],
  reaction_used: false,
}

export const usePlayerCombatStore = create<PlayerCombatStoreState>((set, get) => ({
  combat: DEFAULT_COMBAT_STATE,
  loading: false,
  error: null,
  lastSync: null,

  fetchCombatState: async (characterId: string) => {
    set({ loading: true, error: null })
    try {
      const response = await apiClient.get(`/player/combat?character_id=${characterId}`)
      set({
        combat: response.data || DEFAULT_COMBAT_STATE,
        loading: false,
        lastSync: Date.now(),
      })
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string }; status?: number } }
      // 404 is okay - no combat state exists yet
      if (err.response?.status === 404) {
        set({ combat: DEFAULT_COMBAT_STATE, loading: false, lastSync: Date.now() })
        return
      }
      set({
        error: err.response?.data?.error || 'Failed to fetch combat state',
        loading: false,
      })
    }
  },

  updateCombatState: async (characterId: string, updates: UpdateCombatRequest) => {
    set({ loading: true, error: null })
    try {
      const response = await apiClient.put(`/player/combat/${characterId}`, updates)
      set({
        combat: response.data || get().combat,
        loading: false,
        lastSync: Date.now(),
      })
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      set({
        error: err.response?.data?.error || 'Failed to update combat state',
        loading: false,
      })
      throw error
    }
  },

  startCombat: async (characterId: string, initiative: number) => {
    const { updateCombatState } = get()
    set((state) => ({
      combat: { ...state.combat, is_in_combat: true, initiative, reaction_used: false },
    }))
    try {
      await updateCombatState(characterId, { initiative })
    } catch {
      // Revert on error
      set((state) => ({ combat: { ...state.combat, is_in_combat: false } }))
    }
  },

  endCombat: async (characterId: string) => {
    set((state) => ({
      combat: {
        ...state.combat,
        is_in_combat: false,
        initiative: undefined,
        concentration_spell: undefined,
        reaction_used: false,
        conditions: state.combat.conditions.filter((c) => c.type !== 'concentrating'),
      },
    }))
    try {
      await get().updateCombatState(characterId, {
        is_in_combat: false,
        clear_initiative: true,
        concentration_spell: '',
        reaction_used: false,
      })
    } catch {
      // State already updated optimistically
    }
  },

  addCondition: async (characterId: string, condition: ActiveCondition) => {
    const currentConditions = get().combat.conditions
    if (currentConditions.find((c) => c.type === condition.type)) return

    const newConditions = [...currentConditions, condition]
    set((state) => ({
      combat: { ...state.combat, conditions: newConditions },
    }))

    try {
      await get().updateCombatState(characterId, { conditions: newConditions })
    } catch {
      // Revert
      set((state) => ({
        combat: { ...state.combat, conditions: currentConditions },
      }))
    }
  },

  removeCondition: async (characterId: string, conditionType: ConditionType) => {
    const currentConditions = get().combat.conditions
    const newConditions = currentConditions.filter((c) => c.type !== conditionType)

    // If removing concentration, also clear the spell
    const updates: UpdateCombatRequest = { conditions: newConditions }
    if (conditionType === 'concentrating') {
      updates.concentration_spell = undefined
    }

    set((state) => ({
      combat: {
        ...state.combat,
        conditions: newConditions,
        concentration_spell:
          conditionType === 'concentrating' ? undefined : state.combat.concentration_spell,
      },
    }))

    try {
      await get().updateCombatState(characterId, updates)
    } catch {
      set((state) => ({
        combat: { ...state.combat, conditions: currentConditions },
      }))
    }
  },

  setConcentration: async (characterId: string, spell: string | null) => {
    const currentSpell = get().combat.concentration_spell
    const currentConditions = get().combat.conditions

    let newConditions = currentConditions
    if (spell && !currentConditions.find((c) => c.type === 'concentrating')) {
      newConditions = [
        ...currentConditions,
        { type: 'concentrating' as ConditionType, source: spell },
      ]
    } else if (!spell) {
      newConditions = currentConditions.filter((c) => c.type !== 'concentrating')
    }

    set((state) => ({
      combat: {
        ...state.combat,
        concentration_spell: spell || undefined,
        conditions: newConditions,
      },
    }))

    try {
      await get().updateCombatState(characterId, {
        concentration_spell: spell || undefined,
        conditions: newConditions,
      })
    } catch {
      set((state) => ({
        combat: {
          ...state.combat,
          concentration_spell: currentSpell,
          conditions: currentConditions,
        },
      }))
    }
  },

  toggleReaction: async (characterId: string) => {
    const current = get().combat.reaction_used
    set((state) => ({
      combat: { ...state.combat, reaction_used: !current },
    }))

    try {
      await get().updateCombatState(characterId, { reaction_used: !current })
    } catch {
      set((state) => ({
        combat: { ...state.combat, reaction_used: current },
      }))
    }
  },

  adjustHP: async (characterId: string, amount: number) => {
    const { current_hp, max_hp, temp_hp } = get().combat

    let newCurrentHP = current_hp
    let newTempHP = temp_hp

    if (amount < 0) {
      // Damage: temp HP absorbs first
      const damage = Math.abs(amount)
      if (newTempHP > 0) {
        const tempAbsorbed = Math.min(newTempHP, damage)
        newTempHP -= tempAbsorbed
        newCurrentHP = Math.max(0, newCurrentHP - (damage - tempAbsorbed))
      } else {
        newCurrentHP = Math.max(0, newCurrentHP - damage)
      }
    } else {
      // Healing: can't exceed max
      newCurrentHP = Math.min(max_hp, newCurrentHP + amount)
    }

    set((state) => ({
      combat: { ...state.combat, current_hp: newCurrentHP, temp_hp: newTempHP },
    }))

    try {
      await get().updateCombatState(characterId, { current_hp: newCurrentHP, temp_hp: newTempHP })
    } catch {
      set((state) => ({
        combat: { ...state.combat, current_hp, temp_hp },
      }))
    }
  },

  setTempHP: async (characterId: string, amount: number) => {
    const current = get().combat.temp_hp
    set((state) => ({
      combat: { ...state.combat, temp_hp: Math.max(0, amount) },
    }))

    try {
      await get().updateCombatState(characterId, { temp_hp: Math.max(0, amount) })
    } catch {
      set((state) => ({
        combat: { ...state.combat, temp_hp: current },
      }))
    }
  },

  clearError: () => set({ error: null }),

  // Clear all data when switching campaigns to prevent stale data
  invalidateCache: () => set({ combat: DEFAULT_COMBAT_STATE, error: null, lastSync: null }),

  setLocalCombat: (combat: Partial<PlayerCombatState>) => {
    set((state) => ({
      combat: { ...state.combat, ...combat },
    }))
  },
}))

// Subscribe to campaign change events to invalidate cache
storeEvents.on(CAMPAIGN_CHANGED, () => {
  usePlayerCombatStore.getState().invalidateCache()
  logger.debug('[playerCombatStore] Cache invalidated due to campaign change')
})

// Condition descriptions for reference
export const CONDITION_INFO: Record<ConditionType, { name: string; description: string }> = {
  blinded: {
    name: 'Blinded',
    description:
      "Can't see. Auto-fail checks requiring sight. Attacks have disadvantage, attacks against have advantage.",
  },
  charmed: {
    name: 'Charmed',
    description: "Can't attack the charmer. Charmer has advantage on social checks.",
  },
  deafened: {
    name: 'Deafened',
    description: "Can't hear. Auto-fail checks requiring hearing.",
  },
  frightened: {
    name: 'Frightened',
    description:
      "Disadvantage on checks and attacks while source is in sight. Can't willingly move closer.",
  },
  grappled: {
    name: 'Grappled',
    description: 'Speed becomes 0. Ends if grappler is incapacitated or moved out of reach.',
  },
  incapacitated: {
    name: 'Incapacitated',
    description: "Can't take actions or reactions.",
  },
  invisible: {
    name: 'Invisible',
    description:
      'Impossible to see without magic. Attacks have advantage, attacks against have disadvantage.',
  },
  paralyzed: {
    name: 'Paralyzed',
    description:
      "Incapacitated, can't move or speak. Auto-fail Str/Dex saves. Attacks have advantage, hits within 5ft are crits.",
  },
  petrified: {
    name: 'Petrified',
    description:
      'Transformed to stone. Incapacitated, unaware. Resistant to all damage. Immune to poison/disease.',
  },
  poisoned: {
    name: 'Poisoned',
    description: 'Disadvantage on attack rolls and ability checks.',
  },
  prone: {
    name: 'Prone',
    description:
      'Can only crawl. Disadvantage on attacks. Attacks within 5ft have advantage, beyond have disadvantage.',
  },
  restrained: {
    name: 'Restrained',
    description:
      'Speed 0. Attacks have disadvantage. Attacks against have advantage. Dex saves at disadvantage.',
  },
  stunned: {
    name: 'Stunned',
    description:
      "Incapacitated, can't move, speak only falteringly. Auto-fail Str/Dex saves. Attacks have advantage.",
  },
  unconscious: {
    name: 'Unconscious',
    description:
      'Incapacitated, drops items, falls prone. Auto-fail Str/Dex saves. Attacks have advantage, hits within 5ft are crits.',
  },
  exhaustion: {
    name: 'Exhaustion',
    description: 'Cumulative levels causing increasing penalties. 6 levels = death.',
  },
  concentrating: {
    name: 'Concentrating',
    description: 'Maintaining a spell. Con save on damage, DC 10 or half damage taken.',
  },
}
