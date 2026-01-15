import { create } from "zustand";
import { apiClient } from "../api/client";
import { storeEvents, CAMPAIGN_CHANGED } from "../lib/storeEvents";
import { logger } from "../utils/logger";

export type QuestType = "personal" | "main" | "side" | "gm_shared";
export type QuestStatus = "active" | "completed" | "failed" | "abandoned";

export interface QuestObjective {
  text: string;
  completed: boolean;
  notes?: string;
}

export interface QuestTracking {
  id: string;
  user_id: string;
  campaign_id?: string;
  character_id?: string;
  quest_id?: string; // Reference to GM's quest if gm_shared
  title: string;
  description?: string;
  quest_type: QuestType;
  status: QuestStatus;
  objectives?: QuestObjective[];
  priority: number;
  notes?: string;
  started_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateQuestTrackingRequest {
  campaign_id?: string;
  character_id?: string;
  quest_id?: string;
  title: string;
  description?: string;
  quest_type?: QuestType;
  status?: QuestStatus;
  objectives?: QuestObjective[];
  priority?: number;
  notes?: string;
}

interface PlayerQuestState {
  quests: QuestTracking[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchQuests: (campaignId?: string, status?: QuestStatus) => Promise<void>;
  createQuest: (quest: CreateQuestTrackingRequest) => Promise<QuestTracking>;
  updateQuest: (
    id: string,
    quest: Partial<CreateQuestTrackingRequest>,
  ) => Promise<QuestTracking>;
  deleteQuest: (id: string) => Promise<void>;
  toggleObjective: (questId: string, objectiveIndex: number) => Promise<void>;
  completeQuest: (id: string) => Promise<QuestTracking>;
  abandonQuest: (id: string) => Promise<QuestTracking>;
  clearError: () => void;
  invalidateCache: () => void;
}

export const usePlayerQuestStore = create<PlayerQuestState>((set, get) => ({
  quests: [],
  loading: false,
  error: null,

  fetchQuests: async (campaignId?: string, status?: QuestStatus) => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (campaignId) params.append("campaign_id", campaignId);
      if (status) params.append("status", status);
      const queryString = params.toString();
      const response = await apiClient.get(
        `/player/quests${queryString ? `?${queryString}` : ""}`,
      );
      set({ quests: response.data || [], loading: false });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      set({
        error: err.response?.data?.error || "Failed to fetch quests",
        loading: false,
      });
    }
  },

  createQuest: async (quest: CreateQuestTrackingRequest) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.post("/player/quests", quest);
      const newQuest = response.data as QuestTracking;
      set((state) => ({
        quests: [...state.quests, newQuest].sort(
          (a, b) => b.priority - a.priority,
        ),
        loading: false,
      }));
      return newQuest;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      set({
        error: err.response?.data?.error || "Failed to create quest",
        loading: false,
      });
      throw error;
    }
  },

  updateQuest: async (
    id: string,
    quest: Partial<CreateQuestTrackingRequest>,
  ) => {
    set({ loading: true, error: null });
    try {
      const existing = get().quests.find((q) => q.id === id);
      if (!existing) throw new Error("Quest not found");

      const updateData = {
        title: quest.title ?? existing.title,
        description: quest.description ?? existing.description,
        quest_type: quest.quest_type ?? existing.quest_type,
        status: quest.status ?? existing.status,
        objectives: quest.objectives ?? existing.objectives,
        priority: quest.priority ?? existing.priority,
        notes: quest.notes ?? existing.notes,
      };

      const response = await apiClient.put(`/player/quests/${id}`, updateData);
      const updatedQuest = response.data as QuestTracking;

      set((state) => ({
        quests: state.quests.map((q) => (q.id === id ? updatedQuest : q)),
        loading: false,
      }));
      return updatedQuest;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      set({
        error: err.response?.data?.error || "Failed to update quest",
        loading: false,
      });
      throw error;
    }
  },

  deleteQuest: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await apiClient.delete(`/player/quests/${id}`);
      set((state) => ({
        quests: state.quests.filter((q) => q.id !== id),
        loading: false,
      }));
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      set({
        error: err.response?.data?.error || "Failed to delete quest",
        loading: false,
      });
      throw error;
    }
  },

  toggleObjective: async (questId: string, objectiveIndex: number) => {
    const quest = get().quests.find((q) => q.id === questId);
    if (!quest || !quest.objectives) return;

    const updatedObjectives = [...quest.objectives];
    updatedObjectives[objectiveIndex] = {
      ...updatedObjectives[objectiveIndex],
      completed: !updatedObjectives[objectiveIndex].completed,
    };

    await get().updateQuest(questId, { objectives: updatedObjectives });
  },

  completeQuest: async (id: string) => {
    return get().updateQuest(id, {
      status: "completed",
    });
  },

  abandonQuest: async (id: string) => {
    return get().updateQuest(id, {
      status: "abandoned",
    });
  },

  clearError: () => set({ error: null }),

  // Clear all data when switching campaigns to prevent stale data
  invalidateCache: () => set({ quests: [], error: null }),
}));

// Subscribe to campaign change events to invalidate cache
storeEvents.on(CAMPAIGN_CHANGED, () => {
  usePlayerQuestStore.getState().invalidateCache();
  logger.debug("[playerQuestStore] Cache invalidated due to campaign change");
});
