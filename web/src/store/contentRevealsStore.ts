import { create } from "zustand";
import { apiClient } from "../api/client";
import { storeEvents, CAMPAIGN_CHANGED } from "../lib/storeEvents";
import { logger } from "../utils/logger";

export type RevealLevel = "name_only" | "summary" | "full";
export type ContentType = "npc" | "location" | "quest" | "item" | "monster";

export interface ContentReveal {
  id: string;
  campaign_id: string;
  revealed_by: string;
  content_type: ContentType;
  content_id: string;
  reveal_level: RevealLevel;
  custom_notes?: string;
  revealed_at: string;
  // Joined content data (when fetching reveals)
  content_name?: string;
  content_data?: Record<string, unknown>;
}

export interface CreateRevealRequest {
  content_type: ContentType;
  content_id: string;
  reveal_level: RevealLevel;
  custom_notes?: string;
}

interface ContentRevealsState {
  // For GMs - reveals they've created
  gmReveals: ContentReveal[];
  // For players - reveals shared with them
  playerReveals: ContentReveal[];
  loading: boolean;
  error: string | null;

  // GM Actions
  fetchGMReveals: (campaignId: string) => Promise<void>;
  createReveal: (
    campaignId: string,
    reveal: CreateRevealRequest,
  ) => Promise<ContentReveal>;
  updateReveal: (
    campaignId: string,
    id: string,
    updates: Partial<CreateRevealRequest>,
  ) => Promise<ContentReveal>;
  deleteReveal: (campaignId: string, id: string) => Promise<void>;

  // Player Actions
  fetchPlayerReveals: (campaignId: string) => Promise<void>;

  clearError: () => void;
  invalidateCache: () => void;
}

export const useContentRevealsStore = create<ContentRevealsState>(
  (set, get) => ({
    gmReveals: [],
    playerReveals: [],
    loading: false,
    error: null,

    // GM: Fetch reveals created for a campaign
    fetchGMReveals: async (campaignId: string) => {
      set({ loading: true, error: null });
      try {
        const response = await apiClient.get(
          `/campaigns/${campaignId}/reveals`,
        );
        set({ gmReveals: response.data || [], loading: false });
      } catch (error: unknown) {
        const err = error as { response?: { data?: { error?: string } } };
        set({
          error: err.response?.data?.error || "Failed to fetch reveals",
          loading: false,
        });
      }
    },

    // GM: Create a new reveal
    createReveal: async (campaignId: string, reveal: CreateRevealRequest) => {
      set({ loading: true, error: null });
      try {
        const response = await apiClient.post(
          `/campaigns/${campaignId}/reveals`,
          reveal,
        );
        const newReveal = response.data as ContentReveal;
        set((state) => ({
          gmReveals: [newReveal, ...state.gmReveals],
          loading: false,
        }));
        return newReveal;
      } catch (error: unknown) {
        const err = error as { response?: { data?: { error?: string } } };
        set({
          error: err.response?.data?.error || "Failed to create reveal",
          loading: false,
        });
        throw error;
      }
    },

    // GM: Update a reveal
    updateReveal: async (
      campaignId: string,
      id: string,
      updates: Partial<CreateRevealRequest>,
    ) => {
      set({ loading: true, error: null });
      try {
        const existing = get().gmReveals.find((r) => r.id === id);
        if (!existing) throw new Error("Reveal not found");

        const updateData = {
          reveal_level: updates.reveal_level ?? existing.reveal_level,
          custom_notes: updates.custom_notes ?? existing.custom_notes,
        };

        const response = await apiClient.put(
          `/campaigns/${campaignId}/reveals/${id}`,
          updateData,
        );
        const updatedReveal = response.data as ContentReveal;

        set((state) => ({
          gmReveals: state.gmReveals.map((r) =>
            r.id === id ? updatedReveal : r,
          ),
          loading: false,
        }));
        return updatedReveal;
      } catch (error: unknown) {
        const err = error as { response?: { data?: { error?: string } } };
        set({
          error: err.response?.data?.error || "Failed to update reveal",
          loading: false,
        });
        throw error;
      }
    },

    // GM: Delete a reveal
    deleteReveal: async (campaignId: string, id: string) => {
      set({ loading: true, error: null });
      try {
        await apiClient.delete(`/campaigns/${campaignId}/reveals/${id}`);
        set((state) => ({
          gmReveals: state.gmReveals.filter((r) => r.id !== id),
          loading: false,
        }));
      } catch (error: unknown) {
        const err = error as { response?: { data?: { error?: string } } };
        set({
          error: err.response?.data?.error || "Failed to delete reveal",
          loading: false,
        });
        throw error;
      }
    },

    // Player: Fetch reveals shared with them
    fetchPlayerReveals: async (campaignId: string) => {
      set({ loading: true, error: null });
      try {
        const response = await apiClient.get(
          `/player/campaigns/${campaignId}/revealed`,
        );
        set({ playerReveals: response.data || [], loading: false });
      } catch (error: unknown) {
        const err = error as { response?: { data?: { error?: string } } };
        set({
          error:
            err.response?.data?.error || "Failed to fetch revealed content",
          loading: false,
        });
      }
    },

    clearError: () => set({ error: null }),
    invalidateCache: () =>
      set({ gmReveals: [], playerReveals: [], error: null }),
  }),
);

// Subscribe to campaign change events to invalidate cache
storeEvents.on(CAMPAIGN_CHANGED, () => {
  useContentRevealsStore.getState().invalidateCache();
  logger.debug(
    "[contentRevealsStore] Cache invalidated due to campaign change",
  );
});
