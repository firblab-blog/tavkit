import { create } from "zustand";
import { apiClient } from "../api/client";
import { logger } from "../utils/logger";
import { storeEvents, CAMPAIGN_CHANGED } from "../lib/storeEvents";

// Supporting types for Character
export interface DeathSaves {
  successes: number;
  failures: number;
}

export interface SavingThrowData {
  bonus: number;
  proficient: boolean;
}

export interface SkillData {
  bonus: number;
  proficient: boolean;
  expertise: boolean;
}

export interface CharacterProficiency {
  type: "weapon" | "armor" | "tool" | "skill" | "other";
  name: string;
}

export interface CharacterFeature {
  name: string;
  description: string;
  source?: string;
  level?: number;
}

export interface CharacterTrait {
  name: string;
  description: string;
}

export interface EquipmentItem {
  name: string;
  quantity?: number;
  weight?: number;
  description?: string;
  equipped?: boolean;
}

export interface Weapon {
  name: string;
  damage: string;
  damage_type?: string;
  properties?: string[];
  attack_bonus?: number;
  range?: string;
}

export interface Armor {
  name: string;
  ac_base: number;
  ac_bonus?: number;
  type?: "light" | "medium" | "heavy" | "shield";
  equipped?: boolean;
}

export interface Currency {
  cp?: number;
  sp?: number;
  ep?: number;
  gp?: number;
  pp?: number;
}

export interface SpellSlots {
  level1?: { total: number; used: number };
  level2?: { total: number; used: number };
  level3?: { total: number; used: number };
  level4?: { total: number; used: number };
  level5?: { total: number; used: number };
  level6?: { total: number; used: number };
  level7?: { total: number; used: number };
  level8?: { total: number; used: number };
  level9?: { total: number; used: number };
}

export interface Spell {
  name: string;
  level: number;
  school?: string;
  casting_time?: string;
  range?: string;
  components?: string;
  duration?: string;
  description?: string;
}

export interface Character {
  id: string;
  user_id: string;
  name: string;
  race: string;
  class_info: string;
  level: number;
  background?: string;
  alignment?: string;
  experience?: number;
  // Ability Scores
  strength?: number;
  dexterity?: number;
  constitution?: number;
  intelligence?: number;
  wisdom?: number;
  charisma?: number;
  // Combat Stats
  armor_class?: number;
  initiative?: number;
  speed?: number;
  max_hp?: number;
  current_hp?: number;
  temp_hp?: number;
  hit_dice?: string;
  death_saves?: DeathSaves;
  // Skills & Proficiencies
  proficiency_bonus?: number;
  saving_throws?: Record<string, SavingThrowData>;
  skills?: Record<string, SkillData>;
  proficiencies?: CharacterProficiency[];
  languages?: string[];
  // Features & Traits
  features?: CharacterFeature[];
  traits?: CharacterTrait[];
  // Equipment & Items
  equipment?: EquipmentItem[];
  weapons?: Weapon[];
  armor?: Armor[];
  currency?: Currency;
  // Spellcasting
  spellcasting_ability?: string;
  spell_save_dc?: number;
  spell_attack_bonus?: number;
  spell_slots?: SpellSlots;
  spells_known?: Spell[];
  spells_prepared?: Spell[];
  // Background & Personality
  personality_traits?: string;
  ideals?: string;
  bonds?: string;
  flaws?: string;
  backstory?: string;
  // Additional
  notes?: string;
  appearance?: string;
  avatar?: string;
  created_at: string;
  updated_at: string;
}

interface CharacterState {
  characters: Character[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
  lastCampaignId: string | null; // Track which campaign the cached data is for
  fetchCharacters: (
    forceRefresh?: boolean,
    campaignId?: string | null,
  ) => Promise<void>;
  addCharacter: (character: Character) => void;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  deleteCharacter: (id: string) => void;
  getCharacterById: (id: string) => Character | undefined;
  invalidateCache: () => void;
}

// Cache duration: 30 seconds
const CACHE_DURATION = 30 * 1000;

export const useCharacterStore = create<CharacterState>((set, get) => ({
  characters: [],
  loading: false,
  error: null,
  lastFetched: null,
  lastCampaignId: null,

  fetchCharacters: async (forceRefresh = false, campaignId?: string | null) => {
    const state = get();
    const now = Date.now();

    // Prevent concurrent fetches
    if (state.loading) {
      return;
    }

    // If campaign context changed, force refresh
    const campaignChanged = campaignId !== state.lastCampaignId;

    // Skip fetch if data was fetched recently (within cache duration) unless force refresh or campaign changed
    if (
      !forceRefresh &&
      !campaignChanged &&
      state.lastFetched &&
      now - state.lastFetched < CACHE_DURATION &&
      state.characters.length > 0
    ) {
      return;
    }

    set({ loading: true, error: null });

    try {
      // Build URL with optional campaign_id query parameter
      let url = "/characters";
      if (campaignId) {
        url += `?campaign_id=${campaignId}`;
      }

      const response = await apiClient.get(url);
      const data = response.data;
      set({
        characters: Array.isArray(data) ? data : [],
        loading: false,
        lastFetched: now,
        lastCampaignId: campaignId ?? null,
      });
    } catch (err) {
      logger.error("Failed to fetch characters:", err);
      set({
        error:
          err instanceof Error ? err.message : "Failed to fetch characters",
        loading: false,
        lastFetched: now, // Set even on error to prevent infinite loading state
      });
    }
  },

  addCharacter: (character: Character) => {
    set((state) => ({
      characters: [...state.characters, character],
    }));
  },

  updateCharacter: (id: string, updates: Partial<Character>) => {
    set((state) => ({
      characters: state.characters.map((c) =>
        c.id === id ? { ...c, ...updates } : c,
      ),
    }));
  },

  deleteCharacter: (id: string) => {
    set((state) => ({
      characters: state.characters.filter((c) => c.id !== id),
    }));
  },

  getCharacterById: (id: string) => {
    return get().characters.find((c) => c.id === id);
  },

  invalidateCache: () => {
    // Clear timestamps AND data to prevent showing stale characters
    // This is critical when switching campaigns - the old character data
    // must not be visible while new data loads
    set({ lastFetched: null, lastCampaignId: null, characters: [] });
  },
}));

// Subscribe to campaign change events to invalidate cache
storeEvents.on(CAMPAIGN_CHANGED, () => {
  useCharacterStore.getState().invalidateCache();
  logger.debug("[characterStore] Cache invalidated due to campaign change");
});
