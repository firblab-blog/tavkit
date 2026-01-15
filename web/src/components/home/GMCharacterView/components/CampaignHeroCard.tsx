import { useSearchParams } from "react-router-dom";
import { Campaign } from "../../../../store/campaignStore";
import NextSession from "../../CampaignHero/NextSession";

interface CampaignHeroCardProps {
  campaign: Campaign;
}

/**
 * CampaignHeroCard - Polished hero card displaying campaign info and next session.
 *
 * Features:
 * - Clickable campaign name (navigates to Campaign tab overview)
 * - Game system and theme subtitle
 * - NextSession scheduler component
 * - Gradient background with subtle glow effects
 */
export default function CampaignHeroCard({ campaign }: CampaignHeroCardProps) {
  const [, setSearchParams] = useSearchParams();

  const handleCampaignClick = () => {
    // Navigate to Campaign tab's overview section
    setSearchParams({ tab: "campaign", subtab: "overview" }, { replace: true });
  };

  return (
    <div className="relative bg-gradient-to-br from-background-panel to-background rounded-xl sm:rounded-2xl border border-primary/30 p-4 sm:p-8 shadow-2xl overflow-visible">
      {/* Decorative background glow */}
      <div className="absolute inset-0 bg-gradient-radial from-primary/10 via-transparent to-transparent opacity-50 rounded-xl sm:rounded-2xl pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 space-y-4 sm:space-y-6">
        {/* Campaign Title */}
        <div className="text-center">
          <button onClick={handleCampaignClick} className="group inline-block">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-text group-hover:text-primary transition-colors duration-200">
              {campaign.name}
            </h1>
          </button>
          <p className="text-sm sm:text-base text-text-muted mt-2">
            {campaign.game_system || "D&D 5e"}
            {campaign.theme && ` · ${campaign.theme}`}
          </p>
        </div>

        {/* Next Session */}
        <NextSession campaignId={campaign.id} />
      </div>
    </div>
  );
}
