import { create } from "zustand";
import { persist } from "zustand/middleware";
import { logger } from "../utils/logger";
import { authFetch } from "../utils/authFetch";
import { toast } from "../components/common/Toast";

// Context types that define where the user is working
export type ContextType = "gm_campaign" | "player_campaign" | "library";

export interface UserContext {
  id: string;
  user_id: string;
  last_context_type: ContextType | null;
  last_campaign_id: string | null;
  last_character_id: string | null;
  has_completed_onboarding: boolean;
  default_game_system: string | null;
  created_at: string;
  updated_at: string;
}

interface ContextState {
  // Current context from backend
  userContext: UserContext | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchContext: () => Promise<UserContext | null>;
  updateContext: (
    updates: Partial<
      Pick<
        UserContext,
        | "last_context_type"
        | "last_campaign_id"
        | "last_character_id"
        | "default_game_system"
      >
    >,
  ) => Promise<void>;
  // Sync version for immediate state update (no API call) - use before navigation
  updateContextSync: (
    updates: Partial<
      Pick<
        UserContext,
        "last_context_type" | "last_campaign_id" | "last_character_id"
      >
    >,
  ) => void;
  // Background API persist - call after navigation (includes retry with exponential backoff)
  persistContext: (
    updates: Partial<
      Pick<
        UserContext,
        "last_context_type" | "last_campaign_id" | "last_character_id"
      >
    >,
    maxRetries?: number,
  ) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  clearContext: () => void;

  // Helpers
  isOnboardingComplete: () => boolean;
  getLastContextType: () => ContextType | null;
}

const API_URL = import.meta.env.VITE_API_URL || "";

export const useContextStore = create<ContextState>()(
  persist(
    (set, get) => ({
      userContext: null,
      loading: false,
      error: null,

      fetchContext: async () => {
        // Prevent concurrent fetches
        if (get().loading) {
          return get().userContext;
        }
        set({ loading: true, error: null });
        try {
          const response = await authFetch(
            `${API_URL}/api/v1/users/me/context`,
          );

          if (!response.ok) {
            if (response.status === 401) {
              set({ loading: false, error: "Not authenticated" });
              return null;
            }
            throw new Error("Failed to fetch user context");
          }

          const context = await response.json();
          logger.debug("[contextStore] Fetched user context:", context);

          set({ userContext: context, loading: false });
          return context;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          logger.error("[contextStore] Failed to fetch context:", errorMessage);
          set({ error: errorMessage, loading: false });
          return null;
        }
      },

      updateContext: async (updates) => {
        set({ loading: true, error: null });
        try {
          const response = await authFetch(
            `${API_URL}/api/v1/users/me/context`,
            {
              method: "PUT",
              body: JSON.stringify(updates),
            },
          );

          if (!response.ok) {
            throw new Error("Failed to update user context");
          }

          const context = await response.json();
          logger.debug("[contextStore] Updated user context:", context);

          set({ userContext: context, loading: false });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          logger.error(
            "[contextStore] Failed to update context:",
            errorMessage,
          );
          set({ error: errorMessage, loading: false });
          throw error;
        }
      },

      // Sync version - immediate state update without API call
      // Use this BEFORE navigation to ensure destination component has correct state
      updateContextSync: (updates) => {
        set((state) => {
          if (!state.userContext) {
            // If context doesn't exist yet, we can't update it
            // This shouldn't happen in normal flow, but log it for debugging
            logger.warn("[contextStore] updateContextSync called with no existing context");
            return state;
          }
          return {
            userContext: { ...state.userContext, ...updates },
          };
        });
      },

      // Background API persist - call AFTER navigation
      // This persists the context to the backend without blocking
      // Includes retry logic with exponential backoff
      persistContext: async (updates, maxRetries = 3) => {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            const response = await authFetch(
              `${API_URL}/api/v1/users/me/context`,
              {
                method: "PUT",
                body: JSON.stringify(updates),
              },
            );
            if (response.ok) {
              logger.debug("[contextStore] Context persisted successfully");
              return; // Success - exit retry loop
            }
            // Non-ok response, will retry
            logger.warn(
              `[contextStore] Persist attempt ${attempt + 1} failed with status ${response.status}`,
            );
          } catch (error) {
            logger.warn(
              `[contextStore] Persist attempt ${attempt + 1} failed:`,
              error,
            );
          }

          // If not the last attempt, wait with exponential backoff before retrying
          if (attempt < maxRetries - 1) {
            const delay = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }

        // All retries exhausted
        logger.error(
          "[contextStore] Failed to persist context after all retries",
        );
        toast.warning("Your changes may not persist after refresh", 6000);
      },

      completeOnboarding: async () => {
        set({ loading: true, error: null });
        try {
          const response = await authFetch(
            `${API_URL}/api/v1/users/me/onboarding`,
            {
              method: "POST",
            },
          );

          if (!response.ok) {
            throw new Error("Failed to complete onboarding");
          }

          logger.debug("[contextStore] Onboarding completed");

          // Update local state
          const currentContext = get().userContext;
          if (currentContext) {
            set({
              userContext: {
                ...currentContext,
                has_completed_onboarding: true,
              },
              loading: false,
            });
          } else {
            // Fetch full context if we don't have it
            await get().fetchContext();
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          logger.error(
            "[contextStore] Failed to complete onboarding:",
            errorMessage,
          );
          set({ error: errorMessage, loading: false });
          throw error;
        }
      },

      clearContext: () => {
        set({ userContext: null, error: null });
      },

      isOnboardingComplete: () => {
        const context = get().userContext;
        return context?.has_completed_onboarding ?? false;
      },

      getLastContextType: () => {
        const context = get().userContext;
        return context?.last_context_type ?? null;
      },
    }),
    {
      name: "context-storage",
      // Persist context for quick access before API fetch completes
      partialize: (state) => ({
        userContext: state.userContext,
      }),
    },
  ),
);
