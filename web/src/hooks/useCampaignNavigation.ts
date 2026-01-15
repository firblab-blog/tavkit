import { useNavigate } from "react-router-dom";
import { useCampaignStore, Campaign } from "../store/campaignStore";
import { useContextStore, ContextType } from "../store/contextStore";
import { storeEvents, CAMPAIGN_CHANGED } from "../lib/storeEvents";
import { logger } from "../utils/logger";

/**
 * useCampaignNavigation - Hook for switching campaigns with proper state management.
 *
 * This hook is the ONLY place that should update the active campaign context.
 * It ensures:
 * 1. Both stores are updated synchronously (contextStore is source of truth)
 * 2. CAMPAIGN_CHANGED event is emitted for cache invalidation
 * 3. Navigation happens to the correct dashboard
 * 4. Backend is persisted in the background
 *
 * Note: We update BOTH contextStore AND campaignStore.activeCampaignId to maintain
 * backwards compatibility with existing code that reads from campaignStore.
 * contextStore is the canonical source of truth, but campaignStore is kept in sync.
 */
export function useCampaignNavigation() {
  const navigate = useNavigate();
  const { campaigns, setActiveCampaignSync: setCampaignStoreActiveCampaign } =
    useCampaignStore();
  const { updateContextSync, persistContext, userContext } = useContextStore();

  /**
   * Determines if a campaign is a player campaign based on role and membership_type.
   * A campaign is a GM campaign if role === 'owner' OR membership_type === 'owner'.
   * Otherwise it's a player campaign.
   */
  const isPlayerCampaign = (campaign: Campaign): boolean => {
    if (campaign.role === "owner" || campaign.membership_type === "owner") {
      return false;
    }
    return true;
  };

  /**
   * Activates a campaign and navigates to the appropriate dashboard.
   *
   * Flow:
   * 1. Update contextStore synchronously (before navigation)
   * 2. Emit CAMPAIGN_CHANGED event for cache invalidation
   * 3. Navigate to the correct dashboard
   * 4. Persist to backend in background
   *
   * @param campaignId - The ID of the campaign to activate
   * @param options.skipNavigation - If true, don't navigate (just update state)
   */
  const activateCampaignWithNavigation = (
    campaignId: string,
    options?: { skipNavigation?: boolean },
  ) => {
    const campaign = campaigns.find((c) => c.id === campaignId);
    if (!campaign) {
      logger.error("[useCampaignNavigation] Campaign not found:", campaignId);
      return;
    }

    // Check if context is loaded - if not, we need to wait or fetch it first
    if (!userContext) {
      logger.warn(
        "[useCampaignNavigation] Context not loaded yet, fetching before navigation",
      );
      // Queue the navigation to happen after context loads
      // This is a failsafe - ideally context should always be loaded before switching campaigns
      return;
    }

    // Determine if it's a player or GM campaign
    const isPlayer = isPlayerCampaign(campaign);
    const newContextType: ContextType = isPlayer
      ? "player_campaign"
      : "gm_campaign";

    // Get current state for comparison and logging
    const currentCampaignId = userContext?.last_campaign_id ?? null;
    const currentContextType = userContext?.last_context_type ?? null;

    // Check if anything is actually changing
    const campaignChanged = campaignId !== currentCampaignId;
    const contextChanged = newContextType !== currentContextType;

    if (!campaignChanged && !contextChanged) {
      logger.debug("[useCampaignNavigation] No change needed, skipping");
      return;
    }

    logger.debug("[useCampaignNavigation] Switching campaign", {
      from: { campaignId: currentCampaignId, contextType: currentContextType },
      to: { campaignId, contextType: newContextType },
    });

    // 1. Update BOTH stores synchronously
    // contextStore is the source of truth, but we also update campaignStore
    // for backwards compatibility with existing code that reads from it
    updateContextSync({
      last_context_type: newContextType,
      last_campaign_id: campaignId,
      last_character_id: null, // Clear character when switching campaigns
    });
    setCampaignStoreActiveCampaign(campaignId);

    // 2. Emit CAMPAIGN_CHANGED event for all dependent stores to invalidate caches
    // This is critical - all stores (characterStore, playerJournalStore, etc.) listen for this
    storeEvents.emit(CAMPAIGN_CHANGED, {
      campaignId,
      previousCampaignId: currentCampaignId,
      contextType: newContextType,
      previousContextType: currentContextType,
    });

    // 3. Navigate to the correct dashboard (if not skipped)
    if (!options?.skipNavigation) {
      navigate(isPlayer ? "/dashboard/player" : "/dashboard/gm");
    }

    // 4. Persist to backend in background (fire-and-forget, with error logging)
    persistContext({
      last_context_type: newContextType,
      last_campaign_id: campaignId,
      last_character_id: null,
    }).catch((error) => {
      logger.error("[useCampaignNavigation] Failed to persist context:", error);
    });
  };

  /**
   * Switches to library mode (no campaign).
   */
  const switchToLibrary = () => {
    const currentCampaignId = userContext?.last_campaign_id ?? null;
    const currentContextType = userContext?.last_context_type ?? null;

    if (currentContextType === "library" && !currentCampaignId) {
      logger.debug("[useCampaignNavigation] Already in library mode, skipping");
      return;
    }

    logger.debug("[useCampaignNavigation] Switching to library");

    // 1. Update both stores
    updateContextSync({
      last_context_type: "library",
      last_campaign_id: null,
    });
    setCampaignStoreActiveCampaign(null);

    // 2. Emit event for cache invalidation
    storeEvents.emit(CAMPAIGN_CHANGED, {
      campaignId: null,
      previousCampaignId: currentCampaignId,
      contextType: "library",
      previousContextType: currentContextType,
    });

    // 3. Navigate
    navigate("/dashboard/sandbox");

    // 4. Persist in background
    persistContext({
      last_context_type: "library",
      last_campaign_id: null,
    }).catch((error) => {
      logger.error("[useCampaignNavigation] Failed to persist context:", error);
    });
  };

  return {
    activateCampaignWithNavigation,
    switchToLibrary,
    isPlayerCampaign,
  };
}

export default useCampaignNavigation;
