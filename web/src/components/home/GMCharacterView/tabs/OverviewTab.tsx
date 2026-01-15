import { Campaign } from "../../../../store/campaignStore";
import WorkflowButton from "../components/WorkflowButton";
import QuickStatsBar from "../../QuickStatsBar/QuickStatsBar";
import RecentActivity from "../../RecentActivity/RecentActivity";
import QuickActions from "../../QuickActions/QuickActions";

interface OverviewTabProps {
  campaign: Campaign;
  gmSettings: {
    showQuickStats: boolean;
    showRecentActivity: boolean;
    showExternalTools: boolean;
  };
  onOpenCampaignModal: () => void;
  onOpenCreateModal: () => void;
  onOpenPlayModal: () => void;
}

/**
 * OverviewTab - Dashboard hub for GM Character View.
 *
 * Contains:
 * - Three workflow buttons (Campaign/Create/Play) opening modals
 * - Quick Stats Bar (content counts)
 * - Recent Activity + External Tools (two-column layout)
 */
export default function OverviewTab({
  campaign,
  gmSettings,
  onOpenCampaignModal,
  onOpenCreateModal,
  onOpenPlayModal,
}: OverviewTabProps) {
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Three Workflow Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <WorkflowButton
          title="CAMPAIGN"
          subtitle="Tavern Toolkit"
          description="Manage your campaign data, characters, and saved content"
          icon="BookOpen"
          color="emerald"
          onClick={onOpenCampaignModal}
        />
        <WorkflowButton
          title="CREATE"
          subtitle="Artificer's Toolkit"
          description="Generate content for upcoming sessions with AI-powered generators"
          icon="Sparkles"
          color="purple"
          onClick={onOpenCreateModal}
        />
        <WorkflowButton
          title="PLAY"
          subtitle="Session Tools"
          description="Track live sessions with interactive managers for combat, chases, and more"
          icon="Play"
          color="amber"
          onClick={onOpenPlayModal}
        />
      </div>

      {/* Quick Stats Bar */}
      {gmSettings.showQuickStats && <QuickStatsBar campaignId={campaign.id} />}

      {/* Two Column: Recent Activity + External Tools */}
      {(gmSettings.showRecentActivity || gmSettings.showExternalTools) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {gmSettings.showRecentActivity && (
            <RecentActivity campaignId={campaign.id} />
          )}
          {gmSettings.showExternalTools && <QuickActions />}
        </div>
      )}
    </div>
  );
}
