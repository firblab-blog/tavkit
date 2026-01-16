import Icon from "../common/Icon";
import { LibraryContentTab } from "../home/GMCharacterView/tabs/library";

/**
 * SandboxHome - Personal Library landing page.
 *
 * Browse and create content without a campaign.
 * Each content tab has its own "Add" button for creating new items.
 */
export default function SandboxHome() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Icon name="Library" className="w-8 h-8 text-purple-400" />
            <h1 className="text-2xl sm:text-3xl font-bold text-text">
              Personal Library
            </h1>
          </div>
          <p className="text-text-muted">
            Create content without a campaign. Assign to campaigns later using
            the menu on each item.
          </p>
        </div>

        {/* Library Content with Campaign Filter */}
        <LibraryContentTab showCampaignFilter={true} />
      </div>
    </div>
  );
}
