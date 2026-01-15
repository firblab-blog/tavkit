import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import { logger } from "../utils/logger";
import { authFetch } from "../utils/authFetch";
import { storeEvents, CAMPAIGN_CHANGED } from "../lib/storeEvents";

export interface SectionSummary {
  section: string;
  summary: string;
  last_updated?: string;
}

export interface CampaignSummary {
  id: string;
  campaign_id: string;
  user_id: string;
  overview?: string;
  setting_summary?: string;
  characters_summary?: string;
  plot_summary?: string;
  tone_summary?: string;
  content_stats?: {
    npcs: number;
    locations: number;
    quests: number;
    monsters: number;
    items: number;
    encounters: number;
    rumors: number;
    campaign_content: number;
  };
  section_summaries?: SectionSummary[];
  version: number;
  created_at: string;
  updated_at: string;
}

export interface CampaignFaction {
  name: string;
  description?: string;
  alignment?: string;
  goals?: string[];
  allies?: string[];
  enemies?: string[];
}

export interface CampaignSetting {
  name?: string;
  description?: string;
  world?: string;
  region?: string;
  locations?: string[];
}

export type CampaignRole = "owner" | "player";

// Membership type indicates how the user is related to a campaign
export type CampaignMembershipType = "owner" | "player_local" | "player_joined";

// Campaign invite code
export interface CampaignInvite {
  id: string;
  campaign_id: string;
  code: string;
  created_by: string;
  uses_remaining?: number;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
}

// Campaign member (player who joined via invite code)
export interface CampaignMember {
  id: string;
  campaign_id: string;
  user_id: string;
  role: string;
  character_id?: string;
  invite_code_used?: string;
  joined_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  game_system: string;
  theme?: string;
  tone?: string;
  setting?: CampaignSetting | string;
  factions?: CampaignFaction[];
  history?: string;
  magic_level?: string;
  tech_level?: string;
  notes?: string;
  role: CampaignRole; // 'owner' = GM campaign, 'player' = playing in someone else's game
  is_active: boolean;
  created_at: string;
  updated_at: string;
  summary?: CampaignSummary;
  // Membership type for distinguishing owned vs joined campaigns
  membership_type?: CampaignMembershipType;
  // For joined campaigns: the GM's display name
  gm_name?: string;
  // For joined campaigns: the character linked to membership
  character_id?: string;
}

export interface CampaignContent {
  id: string;
  campaign_id: string;
  user_id: string;
  section: string;
  subsection: string | null;
  title: string;
  content: string;
  type: "manual" | "imported";
  file_name?: string;
  created_at: string;
  updated_at: string;
  // Full character data for PCs section (allows using CharacterSheet component)
  characterData?: any;
  // Full NPC data for NPCs section (for inventory display)
  npcData?: any;
  // Full location data for Locations section (for treasure display)
  locationData?: any;
}

export interface CampaignCharacterLink {
  id: string;
  campaign_id: string;
  character_id: string;
  character_name?: string;
  character_class?: string;
  character_level?: number;
  created_at?: string;
}

export interface Activity {
  id: string;
  type:
    | "npc"
    | "monster"
    | "location"
    | "tavern"
    | "chase"
    | "session"
    | "quest"
    | "item"
    | "encounter"
    | "dialogue"
    | "rumor"
    | "merchant"
    | "trap"
    | "critter";
  action: string;
  name: string;
  created_at: string;
  content_id: string;
}

interface CampaignState {
  campaigns: Campaign[];
  activeCampaignId: string | null;
  loading: boolean;
  error: string | null;
  lastFetchTime: number | null;
  recentActivity: Activity[];
  activityLoading: boolean;
  activityCampaignId: string | null; // Track which campaign the cached activity belongs to
  activityLastFetchTime: number | null; // Cache timestamp for activity

  // UI state for triggering create modal from outside Campaign Ledger
  shouldOpenCreateModal: boolean;
  setShouldOpenCreateModal: (value: boolean) => void;

  // Global campaign modal state (accessible from anywhere)
  createCampaignModalOpen: boolean;
  editingCampaignId: string | null;
  setCreateCampaignModalOpen: (open: boolean) => void;
  setEditingCampaignId: (id: string | null) => void;
  openCreateCampaignModal: () => void;
  openEditCampaignModal: (campaignId: string) => void;

  // Actions
  fetchCampaigns: (forceRefresh?: boolean) => Promise<void>;
  setCampaigns: (campaigns: Campaign[]) => void;
  addCampaign: (
    campaign: Omit<Campaign, "id" | "created_at" | "updated_at">,
  ) => Promise<Campaign>;
  updateCampaign: (id: string, updates: Partial<Campaign>) => Promise<void>;
  deleteCampaign: (id: string) => Promise<void>;
  setActiveCampaign: (id: string | null) => Promise<void>;
  // Sync version for immediate state update (no API call) - use before navigation
  setActiveCampaignSync: (id: string | null) => void;
  // Background API persist - call after navigation
  persistActiveCampaign: (id: string) => Promise<void>;
  getActiveCampaign: () => Campaign | null;
  getCampaignById: (id: string) => Campaign | null;

  // Activity tracking
  fetchRecentActivity: (campaignId: string) => Promise<void>;
  clearActivity: () => void;

  // Content management
  fetchCampaignContent: (
    campaignId: string,
    section: string,
    subsection?: string | null,
  ) => Promise<CampaignContent[]>;
  createCampaignContent: (
    campaignId: string,
    content: Omit<
      CampaignContent,
      "id" | "campaign_id" | "user_id" | "created_at" | "updated_at"
    >,
  ) => Promise<CampaignContent>;
  updateCampaignContent: (
    campaignId: string,
    contentId: string,
    updates: { title: string; content: string },
  ) => Promise<void>;
  deleteCampaignContent: (
    campaignId: string,
    contentId: string,
  ) => Promise<void>;

  // Campaign character linking (many-to-many)
  fetchCampaignCharacters: (
    campaignId: string,
  ) => Promise<CampaignCharacterLink[]>;
  linkCharacterToCampaign: (
    campaignId: string,
    characterId: string,
  ) => Promise<void>;
  unlinkCharacterFromCampaign: (
    campaignId: string,
    characterId: string,
  ) => Promise<void>;

  // Campaign membership (invite codes and joining)
  generateInviteCode: (
    campaignId: string,
    options?: { usesRemaining?: number; expiresInDays?: number },
  ) => Promise<CampaignInvite>;
  listInviteCodes: (campaignId: string) => Promise<CampaignInvite[]>;
  revokeInviteCode: (campaignId: string, code: string) => Promise<void>;
  joinCampaign: (code: string, characterId?: string) => Promise<Campaign>;
  leaveCampaign: (campaignId: string) => Promise<void>;
  listCampaignMembers: (campaignId: string) => Promise<CampaignMember[]>;
}

// Use relative path for API calls (nginx proxy) or environment variable
const API_URL = import.meta.env.VITE_API_URL || "";

// Debounce time in milliseconds - prevent fetching more than once per 10 seconds
const FETCH_DEBOUNCE_MS = 10000; // 10 seconds - prevents redundant fetches on navigation

// Cache TTL for recent activity (5 minutes) - these 13 API calls are expensive
const ACTIVITY_CACHE_MS = 5 * 60 * 1000;

export const useCampaignStore = create<CampaignState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        campaigns: [],
        activeCampaignId: null,
        loading: false,
        error: null,
        lastFetchTime: null,
        shouldOpenCreateModal: false,
        setShouldOpenCreateModal: (value) =>
          set({ shouldOpenCreateModal: value }),
        recentActivity: [],
        activityLoading: false,
        activityCampaignId: null,
        activityLastFetchTime: null,

        // Global campaign modal state
        createCampaignModalOpen: false,
        editingCampaignId: null,
        setCreateCampaignModalOpen: (open) =>
          set({ createCampaignModalOpen: open }),
        setEditingCampaignId: (id) => set({ editingCampaignId: id }),
        openCreateCampaignModal: () =>
          set({ createCampaignModalOpen: true, editingCampaignId: null }),
        openEditCampaignModal: (campaignId) =>
          set({ createCampaignModalOpen: true, editingCampaignId: campaignId }),

        // Fetch campaigns from backend
        fetchCampaigns: async (forceRefresh = false) => {
          // Debounce: if we fetched recently, skip this call (unless force refresh)
          const now = Date.now();
          const lastFetch = get().lastFetchTime;
          if (
            !forceRefresh &&
            lastFetch &&
            now - lastFetch < FETCH_DEBOUNCE_MS
          ) {
            logger.debug(
              "[campaignStore] Skipping fetchCampaigns - called too soon after last fetch",
            );
            return;
          }

          // Prevent concurrent fetches
          if (get().loading) {
            logger.debug(
              "[campaignStore] Skipping fetchCampaigns - already loading",
            );
            return;
          }

          set({ loading: true, error: null, lastFetchTime: now });
          try {
            logger.debug("[campaignStore] fetchCampaigns - using cookie auth");

            const response = await authFetch(`${API_URL}/api/v1/campaigns`);

            if (!response.ok) {
              if (response.status === 401) {
                set({ loading: false, error: "Not authenticated" });
                return;
              }
              throw new Error("Failed to fetch campaigns");
            }

            const data = await response.json();
            const campaigns = data.campaigns || [];

            // Fetch summaries for all campaigns in parallel
            const summaryPromises = campaigns.map(
              async (campaign: Campaign) => {
                try {
                  const summaryResponse = await authFetch(
                    `${API_URL}/api/v1/campaigns/${campaign.id}/summary`,
                  );
                  if (summaryResponse.ok) {
                    const summaryData = await summaryResponse.json();
                    return { ...campaign, summary: summaryData.summary };
                  }
                  return campaign;
                } catch (err) {
                  logger.warn(
                    `Failed to fetch summary for campaign ${campaign.id}:`,
                    err,
                  );
                  return campaign;
                }
              },
            );
            const campaignsWithSummaries = await Promise.all(summaryPromises);

            // Find the active campaign
            const activeCampaign = campaignsWithSummaries.find(
              (c: Campaign) => c.is_active,
            );

            set({
              campaigns: campaignsWithSummaries,
              activeCampaignId: activeCampaign?.id || null,
              loading: false,
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : "Unknown error",
              loading: false,
            });
          }
        },

        setCampaigns: (campaigns) => set({ campaigns }),

        // Create campaign on backend
        addCampaign: async (campaignData) => {
          set({ loading: true, error: null });
          try {
            logger.debug("[campaignStore] addCampaign - data:", campaignData);

            const response = await authFetch(`${API_URL}/api/v1/campaigns`, {
              method: "POST",
              body: JSON.stringify(campaignData),
            });

            if (!response.ok) {
              throw new Error("Failed to create campaign");
            }

            const campaign = await response.json();

            logger.debug(
              "[campaignStore] Backend response after creation:",
              campaign,
            );
            logger.debug(
              "[campaignStore] Campaign name from backend:",
              campaign.name,
            );

            // Add membership_type based on the role we created with
            // This ensures the campaign shows up in the correct section immediately
            const campaignWithMembership = {
              ...campaign,
              membership_type:
                campaignData.role === "player" ? "player_local" : "owner",
            };

            set((state) => ({
              campaigns: [...state.campaigns, campaignWithMembership],
              activeCampaignId: campaign.is_active
                ? campaign.id
                : state.activeCampaignId,
              loading: false,
            }));

            logger.debug(
              "[campaignStore] Updated campaigns array:",
              get().campaigns,
            );

            return campaignWithMembership;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : "Unknown error",
              loading: false,
            });
            throw error;
          }
        },

        // Update campaign on backend
        updateCampaign: async (id, updates) => {
          set({ loading: true, error: null });
          try {
            const response = await authFetch(
              `${API_URL}/api/v1/campaigns/${id}`,
              {
                method: "PUT",
                body: JSON.stringify(updates),
              },
            );

            if (!response.ok) {
              throw new Error("Failed to update campaign");
            }

            set((state) => ({
              campaigns: state.campaigns.map((c) =>
                c.id === id ? { ...c, ...updates } : c,
              ),
              activeCampaignId: updates.is_active ? id : state.activeCampaignId,
              loading: false,
            }));
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : "Unknown error",
              loading: false,
            });
            throw error;
          }
        },

        // Delete campaign from backend
        deleteCampaign: async (id) => {
          set({ loading: true, error: null });
          try {
            const response = await authFetch(
              `${API_URL}/api/v1/campaigns/${id}`,
              {
                method: "DELETE",
              },
            );

            if (!response.ok) {
              throw new Error("Failed to delete campaign");
            }

            set((state) => ({
              campaigns: state.campaigns.filter((c) => c.id !== id),
              activeCampaignId:
                state.activeCampaignId === id ? null : state.activeCampaignId,
              loading: false,
            }));
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : "Unknown error",
              loading: false,
            });
            throw error;
          }
        },

        // Set active campaign on backend (async - waits for API)
        setActiveCampaign: async (id) => {
          if (!id) {
            set({ activeCampaignId: null });
            return;
          }

          set({ loading: true, error: null });
          try {
            const response = await authFetch(
              `${API_URL}/api/v1/campaigns/${id}/activate`,
              {
                method: "PUT",
              },
            );

            if (!response.ok) {
              throw new Error("Failed to activate campaign");
            }

            set((state) => ({
              campaigns: state.campaigns.map((c) => ({
                ...c,
                is_active: c.id === id,
              })),
              activeCampaignId: id,
              loading: false,
            }));
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : "Unknown error",
              loading: false,
            });
            throw error;
          }
        },

        // Sync version - immediate state update without API call
        // Use this BEFORE navigation to ensure destination component has correct state
        setActiveCampaignSync: (id) => {
          set((state) => ({
            campaigns: state.campaigns.map((c) => ({
              ...c,
              is_active: c.id === id,
            })),
            activeCampaignId: id,
          }));
        },

        // Background API persist - call AFTER navigation
        // This persists the campaign activation to the backend without blocking
        persistActiveCampaign: async (id) => {
          if (!id) return;
          try {
            const response = await authFetch(
              `${API_URL}/api/v1/campaigns/${id}/activate`,
              {
                method: "PUT",
              },
            );
            if (!response.ok) {
              logger.error(
                "[campaignStore] Failed to persist campaign activation",
              );
            }
          } catch (error) {
            logger.error(
              "[campaignStore] Failed to persist campaign activation:",
              error,
            );
            // Don't throw - this is background sync, UI should not be affected
          }
        },

        getActiveCampaign: () => {
          const state = get();
          if (!state.activeCampaignId) return null;
          return (
            state.campaigns.find((c) => c.id === state.activeCampaignId) || null
          );
        },

        getCampaignById: (id) => {
          const state = get();
          return state.campaigns.find((c) => c.id === id) || null;
        },

        // Fetch recent activity for campaign (uses aggregated backend endpoint)
        fetchRecentActivity: async (campaignId) => {
          const state = get();
          const now = Date.now();

          // Skip if already loading (deduplication)
          if (state.activityLoading) {
            logger.debug(
              "[campaignStore] fetchRecentActivity skipped - already loading",
            );
            return;
          }

          // Use cache if we have valid cached data for this campaign
          if (
            state.activityCampaignId === campaignId &&
            state.activityLastFetchTime &&
            now - state.activityLastFetchTime < ACTIVITY_CACHE_MS &&
            state.recentActivity.length > 0
          ) {
            logger.debug(
              "[campaignStore] fetchRecentActivity using cached data",
            );
            return;
          }

          set({ activityLoading: true });
          try {
            // Use the aggregated backend endpoint instead of 13 separate API calls
            const response = await authFetch(
              `${API_URL}/api/v1/campaigns/${campaignId}/activity`,
            );

            if (!response.ok) {
              throw new Error("Failed to fetch campaign activity");
            }

            const data = await response.json();
            const activity: Activity[] = data.activity || [];

            logger.debug("Activity feed fetched from backend:", {
              campaignId,
              activityCount: activity.length,
            });

            set({
              recentActivity: activity,
              activityLoading: false,
              activityCampaignId: campaignId,
              activityLastFetchTime: Date.now(),
            });
          } catch (error) {
            logger.error("Failed to fetch recent activity:", error);
            set({ recentActivity: [], activityLoading: false });
          }
        },

        clearActivity: () =>
          set({
            recentActivity: [],
            activityCampaignId: null,
            activityLastFetchTime: null,
          }),

        // Fetch campaign content
        fetchCampaignContent: async (
          campaignId,
          section,
          subsection = null,
        ) => {
          try {
            let url = `${API_URL}/api/v1/campaigns/${campaignId}/content?section=${encodeURIComponent(section)}`;
            if (subsection) {
              url += `&subsection=${encodeURIComponent(subsection)}`;
            }

            const response = await authFetch(url);

            if (!response.ok) {
              throw new Error("Failed to fetch content");
            }

            const data = await response.json();
            return data.content || [];
          } catch (error) {
            logger.error("Failed to fetch campaign content:", error);
            throw error;
          }
        },

        // Create campaign content
        createCampaignContent: async (campaignId, contentData) => {
          try {
            const response = await authFetch(
              `${API_URL}/api/v1/campaigns/${campaignId}/content`,
              {
                method: "POST",
                body: JSON.stringify(contentData),
              },
            );

            if (!response.ok) {
              throw new Error("Failed to create content");
            }

            return await response.json();
          } catch (error) {
            logger.error("Failed to create campaign content:", error);
            throw error;
          }
        },

        // Update campaign content
        updateCampaignContent: async (campaignId, contentId, updates) => {
          try {
            const response = await authFetch(
              `${API_URL}/api/v1/campaigns/${campaignId}/content/${contentId}`,
              {
                method: "PUT",
                body: JSON.stringify(updates),
              },
            );

            if (!response.ok) {
              throw new Error("Failed to update content");
            }
          } catch (error) {
            logger.error("Failed to update campaign content:", error);
            throw error;
          }
        },

        // Delete campaign content
        deleteCampaignContent: async (campaignId, contentId) => {
          try {
            const response = await authFetch(
              `${API_URL}/api/v1/campaigns/${campaignId}/content/${contentId}`,
              {
                method: "DELETE",
              },
            );

            if (!response.ok) {
              throw new Error("Failed to delete content");
            }
          } catch (error) {
            logger.error("Failed to delete campaign content:", error);
            throw error;
          }
        },

        // Fetch campaign characters (linked via many-to-many)
        fetchCampaignCharacters: async (campaignId) => {
          try {
            const response = await authFetch(
              `${API_URL}/api/v1/campaigns/${campaignId}/characters`,
            );

            if (!response.ok) {
              throw new Error("Failed to fetch campaign characters");
            }

            const data = await response.json();
            return data.characters || [];
          } catch (error) {
            logger.error("Failed to fetch campaign characters:", error);
            throw error;
          }
        },

        // Link character to campaign
        linkCharacterToCampaign: async (campaignId, characterId) => {
          try {
            const response = await authFetch(
              `${API_URL}/api/v1/campaigns/${campaignId}/characters/${characterId}`,
              {
                method: "POST",
              },
            );

            if (!response.ok) {
              throw new Error("Failed to link character to campaign");
            }
          } catch (error) {
            logger.error("Failed to link character to campaign:", error);
            throw error;
          }
        },

        // Unlink character from campaign
        unlinkCharacterFromCampaign: async (campaignId, characterId) => {
          try {
            const response = await authFetch(
              `${API_URL}/api/v1/campaigns/${campaignId}/characters/${characterId}`,
              {
                method: "DELETE",
              },
            );

            if (!response.ok) {
              throw new Error("Failed to unlink character from campaign");
            }
          } catch (error) {
            logger.error("Failed to unlink character from campaign:", error);
            throw error;
          }
        },

        // Generate invite code for a campaign
        generateInviteCode: async (campaignId, options = {}) => {
          try {
            const response = await authFetch(
              `${API_URL}/api/v1/campaigns/${campaignId}/invites`,
              {
                method: "POST",
                body: JSON.stringify({
                  uses_remaining: options.usesRemaining,
                  expires_in_days: options.expiresInDays,
                }),
              },
            );

            if (!response.ok) {
              throw new Error("Failed to generate invite code");
            }

            return await response.json();
          } catch (error) {
            logger.error("Failed to generate invite code:", error);
            throw error;
          }
        },

        // List invite codes for a campaign
        listInviteCodes: async (campaignId) => {
          try {
            const response = await authFetch(
              `${API_URL}/api/v1/campaigns/${campaignId}/invites`,
            );

            if (!response.ok) {
              throw new Error("Failed to list invite codes");
            }

            const data = await response.json();
            return data.invites || [];
          } catch (error) {
            logger.error("Failed to list invite codes:", error);
            throw error;
          }
        },

        // Revoke an invite code
        revokeInviteCode: async (campaignId, code) => {
          try {
            const response = await authFetch(
              `${API_URL}/api/v1/campaigns/${campaignId}/invites/${code}`,
              {
                method: "DELETE",
              },
            );

            if (!response.ok) {
              throw new Error("Failed to revoke invite code");
            }
          } catch (error) {
            logger.error("Failed to revoke invite code:", error);
            throw error;
          }
        },

        // Join a campaign via invite code
        joinCampaign: async (code, characterId) => {
          try {
            const response = await authFetch(
              `${API_URL}/api/v1/campaigns/join`,
              {
                method: "POST",
                body: JSON.stringify({
                  code,
                  character_id: characterId,
                }),
              },
            );

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.error || "Failed to join campaign");
            }

            const data = await response.json();
            const campaign = data.campaign;

            // Add the joined campaign to the store with membership_type
            if (campaign) {
              campaign.membership_type = "player_joined";
              set((state) => ({
                campaigns: [...state.campaigns, campaign],
              }));
            }

            return campaign;
          } catch (error) {
            logger.error("Failed to join campaign:", error);
            throw error;
          }
        },

        // Leave a campaign
        leaveCampaign: async (campaignId) => {
          try {
            const response = await authFetch(
              `${API_URL}/api/v1/campaigns/${campaignId}/leave`,
              {
                method: "DELETE",
              },
            );

            if (!response.ok) {
              throw new Error("Failed to leave campaign");
            }

            // Remove the campaign from the store
            set((state) => ({
              campaigns: state.campaigns.filter((c) => c.id !== campaignId),
              activeCampaignId:
                state.activeCampaignId === campaignId
                  ? null
                  : state.activeCampaignId,
            }));
          } catch (error) {
            logger.error("Failed to leave campaign:", error);
            throw error;
          }
        },

        // List members of a campaign
        listCampaignMembers: async (campaignId) => {
          try {
            const response = await authFetch(
              `${API_URL}/api/v1/campaigns/${campaignId}/members`,
            );

            if (!response.ok) {
              throw new Error("Failed to list campaign members");
            }

            const data = await response.json();
            return data.members || [];
          } catch (error) {
            logger.error("Failed to list campaign members:", error);
            throw error;
          }
        },
      }),
      {
        name: "campaign-storage",
        // Only persist the activeCampaignId, fetch campaigns from server on load
        partialize: (state) => ({ activeCampaignId: state.activeCampaignId }),
      },
    ),
  ),
);

// Emit event when active campaign changes so dependent stores can invalidate their caches
// This decouples campaignStore from all the player/character stores
useCampaignStore.subscribe(
  (state) => state.activeCampaignId,
  (newId, prevId) => {
    if (newId !== prevId && prevId !== null) {
      // Emit event for dependent stores to handle cache invalidation
      storeEvents.emit(CAMPAIGN_CHANGED, {
        campaignId: newId,
        previousCampaignId: prevId,
      });
      logger.debug(
        "[campaignStore] Campaign changed, emitted CAMPAIGN_CHANGED event",
        {
          from: prevId,
          to: newId,
        },
      );
    }
  },
);

// Sync activeCampaignId from contextStore when context changes
// This ensures that on page refresh or direct navigation, the campaignStore
// stays in sync with the backend's user context
// Import is at runtime to avoid circular dependency issues
import("./contextStore").then(({ useContextStore }) => {
  let prevContextCampaignId: string | null | undefined = undefined;
  useContextStore.subscribe((state) => {
    const contextCampaignId = state.userContext?.last_campaign_id;
    // Skip if campaign hasn't changed in context
    if (contextCampaignId === prevContextCampaignId) return;
    prevContextCampaignId = contextCampaignId;

    const currentCampaignId = useCampaignStore.getState().activeCampaignId;
    // Only sync if context has a campaign and it differs from current
    if (contextCampaignId && contextCampaignId !== currentCampaignId) {
      logger.debug(
        "[campaignStore] Syncing activeCampaignId from contextStore",
        {
          from: currentCampaignId,
          to: contextCampaignId,
        },
      );
      useCampaignStore.getState().setActiveCampaignSync(contextCampaignId);
    }
  });
});
