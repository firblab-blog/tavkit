/**
 * GlobalModals - Renders modals that can be triggered from anywhere in the app.
 *
 * This component is rendered at the app root level and manages modals that need
 * to be accessible without navigation (e.g., Create Campaign from CampaignSwitcher,
 * AI generators from Library tab).
 */
import { useNavigate } from "react-router-dom";
import { useCampaignStore, Campaign } from "../../store/campaignStore";
import { useContextStore, ContextType } from "../../store/contextStore";
import { storeEvents, CAMPAIGN_CHANGED } from "../../lib/storeEvents";
import CampaignModal from "../campaign/CampaignModal";
import GeneratorModal from "../generators/GeneratorModal";
import { logger } from "../../utils/logger";

export default function GlobalModals() {
  const navigate = useNavigate();
  const {
    campaigns,
    createCampaignModalOpen,
    editingCampaignId,
    setCreateCampaignModalOpen,
    setEditingCampaignId,
    addCampaign,
    updateCampaign,
    setActiveCampaignSync,
    persistActiveCampaign,
  } = useCampaignStore();

  const { updateContextSync, persistContext, userContext } = useContextStore();

  // Get the campaign being edited (if any)
  const editingCampaign = editingCampaignId
    ? campaigns.find((c) => c.id === editingCampaignId) || null
    : null;

  const handleClose = () => {
    setCreateCampaignModalOpen(false);
    setEditingCampaignId(null);
  };

  const handleSave = async (campaignData: Partial<Campaign>) => {
    if (editingCampaign) {
      // Editing existing campaign
      await updateCampaign(editingCampaign.id, campaignData);
    } else {
      // Creating new campaign
      if (!campaignData.name?.trim()) {
        logger.error("Campaign name is required");
        return;
      }

      const role = campaignData.role || "owner";
      const newCampaign = await addCampaign({
        name: campaignData.name,
        game_system: campaignData.game_system || "",
        description: campaignData.description,
        theme: campaignData.theme,
        tone: campaignData.tone,
        magic_level: campaignData.magic_level,
        tech_level: campaignData.tech_level,
        history: campaignData.history,
        notes: campaignData.notes,
        role: role,
        is_active: false,
      });

      // Activate the new campaign, update context, and navigate
      if (newCampaign) {
        const contextType: ContextType =
          role === "player" ? "player_campaign" : "gm_campaign";
        const previousCampaignId = userContext?.last_campaign_id ?? null;
        const previousContextType = userContext?.last_context_type ?? null;

        // 1. Update BOTH stores synchronously BEFORE navigation
        // contextStore is the source of truth (useActiveCampaign reads from it)
        // campaignStore is kept in sync for backwards compatibility
        updateContextSync({
          last_context_type: contextType,
          last_campaign_id: newCampaign.id,
          last_character_id: null, // Clear character for new campaign
        });
        setActiveCampaignSync(newCampaign.id);

        // 2. Emit CAMPAIGN_CHANGED event for cache invalidation
        storeEvents.emit(CAMPAIGN_CHANGED, {
          campaignId: newCampaign.id,
          previousCampaignId,
          contextType,
          previousContextType,
        });

        // 3. Navigate to the correct dashboard
        navigate(role === "player" ? "/dashboard/player" : "/dashboard/gm");

        // 4. Persist to backend in background (fire-and-forget)
        persistActiveCampaign(newCampaign.id).catch((err) =>
          logger.error("Failed to persist campaign activation:", err),
        );
        persistContext({
          last_context_type: contextType,
          last_campaign_id: newCampaign.id,
          last_character_id: null,
        }).catch((err) => logger.error("Failed to persist context:", err));
      }
    }

    handleClose();
  };

  return (
    <>
      {/* Campaign Modal */}
      {createCampaignModalOpen && (
        <CampaignModal
          campaign={editingCampaign}
          onClose={handleClose}
          onSave={handleSave}
        />
      )}

      {/* Generator Modal */}
      <GeneratorModal />
    </>
  );
}
