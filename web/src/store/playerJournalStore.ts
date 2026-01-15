import { create } from "zustand";
import { apiClient } from "../api/client";
import { storeEvents, CAMPAIGN_CHANGED } from "../lib/storeEvents";
import { logger } from "../utils/logger";

export interface TaggedEntity {
  id?: string;
  name: string;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  campaign_id?: string;
  character_id?: string;
  title: string;
  content?: string;
  session_date?: string;
  session_number?: number;
  tagged_npcs?: TaggedEntity[];
  tagged_locations?: TaggedEntity[];
  tagged_quests?: TaggedEntity[];
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateJournalEntryRequest {
  campaign_id?: string;
  character_id?: string;
  title: string;
  content?: string;
  session_date?: string;
  session_number?: number;
  tagged_npcs?: TaggedEntity[];
  tagged_locations?: TaggedEntity[];
  tagged_quests?: TaggedEntity[];
  is_private?: boolean;
}

interface PlayerJournalState {
  entries: JournalEntry[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchEntries: (campaignId?: string) => Promise<void>;
  createEntry: (entry: CreateJournalEntryRequest) => Promise<JournalEntry>;
  updateEntry: (
    id: string,
    entry: Partial<CreateJournalEntryRequest>,
  ) => Promise<JournalEntry>;
  deleteEntry: (id: string) => Promise<void>;
  clearError: () => void;
  invalidateCache: () => void;
}

export const usePlayerJournalStore = create<PlayerJournalState>((set, get) => ({
  entries: [],
  loading: false,
  error: null,

  fetchEntries: async (campaignId?: string) => {
    set({ loading: true, error: null });
    try {
      const params = campaignId ? `?campaign_id=${campaignId}` : "";
      const response = await apiClient.get(`/player/journal${params}`);
      set({ entries: response.data || [], loading: false });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      set({
        error: err.response?.data?.error || "Failed to fetch journal entries",
        loading: false,
      });
    }
  },

  createEntry: async (entry: CreateJournalEntryRequest) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.post("/player/journal", entry);
      const newEntry = response.data as JournalEntry;
      set((state) => ({
        entries: [newEntry, ...state.entries],
        loading: false,
      }));
      return newEntry;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      set({
        error: err.response?.data?.error || "Failed to create journal entry",
        loading: false,
      });
      throw error;
    }
  },

  updateEntry: async (
    id: string,
    entry: Partial<CreateJournalEntryRequest>,
  ) => {
    set({ loading: true, error: null });
    try {
      const existing = get().entries.find((e) => e.id === id);
      if (!existing) throw new Error("Entry not found");

      const updateData = {
        title: entry.title ?? existing.title,
        content: entry.content ?? existing.content,
        session_date: entry.session_date ?? existing.session_date,
        session_number: entry.session_number ?? existing.session_number,
        tagged_npcs: entry.tagged_npcs ?? existing.tagged_npcs,
        tagged_locations: entry.tagged_locations ?? existing.tagged_locations,
        tagged_quests: entry.tagged_quests ?? existing.tagged_quests,
        is_private: entry.is_private ?? existing.is_private,
      };

      const response = await apiClient.put(`/player/journal/${id}`, updateData);
      const updatedEntry = response.data as JournalEntry;

      set((state) => ({
        entries: state.entries.map((e) => (e.id === id ? updatedEntry : e)),
        loading: false,
      }));
      return updatedEntry;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      set({
        error: err.response?.data?.error || "Failed to update journal entry",
        loading: false,
      });
      throw error;
    }
  },

  deleteEntry: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await apiClient.delete(`/player/journal/${id}`);
      set((state) => ({
        entries: state.entries.filter((e) => e.id !== id),
        loading: false,
      }));
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      set({
        error: err.response?.data?.error || "Failed to delete journal entry",
        loading: false,
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),

  // Clear all data when switching campaigns to prevent stale data
  invalidateCache: () => set({ entries: [], error: null }),
}));

// Subscribe to campaign change events to invalidate cache
storeEvents.on(CAMPAIGN_CHANGED, () => {
  usePlayerJournalStore.getState().invalidateCache();
  logger.debug("[playerJournalStore] Cache invalidated due to campaign change");
});
