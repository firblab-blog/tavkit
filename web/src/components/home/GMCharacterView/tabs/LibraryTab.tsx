import { useCampaignStore } from "../../../../store/campaignStore";
import { LibraryContentTab } from "./library";

/**
 * LibraryTab - Saved content library view.
 *
 * Shows the full content library with sub-tabs for each content type.
 */
export default function LibraryTab() {
  const { activeCampaignId } = useCampaignStore();

  return (
    <div className="space-y-6">
      {/* Full Library Content Tab - no filter in campaign context, only shows this campaign's content */}
      <LibraryContentTab
        campaignId={activeCampaignId || undefined}
        showCampaignFilter={false}
      />
    </div>
  );
}
