import { useSearchParams } from "react-router-dom";
import Icon, { IconName } from "../../../../common/Icon";
import CampaignOverviewContent from "./CampaignOverviewContent";
import SessionsContent from "./SessionsContent";
import PlayerCharactersContent from "./PlayerCharactersContent";
import FactionsContent from "./FactionsContent";
import LoreContent from "./LoreContent";
import LocationsContent from "./LocationsContent";
import GMNotesContent from "./GMNotesContent";
import MapsArtContent from "./MapsArtContent";
import MonstersContent from "./MonstersContent";

type ContentSubTab =
  | "overview"
  | "sessions"
  | "pcs"
  | "factions"
  | "lore"
  | "locations"
  | "monsters"
  | "maps-art"
  | "gm-notes";

interface SubTabConfig {
  id: ContentSubTab;
  label: string;
  icon: IconName;
  color: string;
}

const SUB_TABS: SubTabConfig[] = [
  { id: "overview", label: "Overview", icon: "Sparkles", color: "primary" },
  { id: "sessions", label: "Sessions", icon: "Calendar", color: "blue" },
  { id: "pcs", label: "Characters", icon: "User", color: "emerald" },
  { id: "factions", label: "Factions", icon: "Shield", color: "purple" },
  { id: "lore", label: "Lore", icon: "BookOpen", color: "amber" },
  { id: "locations", label: "Locations", icon: "MapPin", color: "cyan" },
  { id: "monsters", label: "Monsters", icon: "Skull", color: "orange" },
  { id: "maps-art", label: "Maps/Art", icon: "Image", color: "indigo" },
  { id: "gm-notes", label: "GM Notes", icon: "FileEdit", color: "rose" },
];

const tabColors: Record<string, string> = {
  primary: "text-primary border-primary",
  blue: "text-blue-400 border-blue-400",
  emerald: "text-emerald-400 border-emerald-400",
  purple: "text-purple-400 border-purple-400",
  amber: "text-amber-400 border-amber-400",
  cyan: "text-cyan-400 border-cyan-400",
  orange: "text-orange-400 border-orange-400",
  indigo: "text-indigo-400 border-indigo-400",
  rose: "text-rose-400 border-rose-400",
};

interface CampaignContentTabProps {
  campaignId: string;
}

/**
 * CampaignContentTab - Browse campaign info sections inline.
 *
 * Shows the key sections including:
 * - Overview (AI summary + campaign metadata)
 * - Sessions, Player Characters, Factions, Lore
 * - Locations, Monsters, Maps/Art, GM Notes
 */
const VALID_SUB_TABS: ContentSubTab[] = [
  "overview",
  "sessions",
  "pcs",
  "factions",
  "lore",
  "locations",
  "monsters",
  "maps-art",
  "gm-notes",
];

export default function CampaignContentTab({
  campaignId,
}: CampaignContentTabProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Get sub-tab from URL, default to 'overview'
  const subTabParam = searchParams.get("subtab");
  const activeSubTab: ContentSubTab = VALID_SUB_TABS.includes(
    subTabParam as ContentSubTab,
  )
    ? (subTabParam as ContentSubTab)
    : "overview";

  const setActiveSubTab = (tab: ContentSubTab) => {
    setSearchParams(
      (prev) => {
        prev.set("subtab", tab);
        return prev;
      },
      { replace: true, preventScrollReset: true },
    );
  };

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 sm:gap-2 border-b border-border pb-1 overflow-x-auto">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`px-3 sm:px-4 py-2 font-medium text-sm rounded-t-lg transition-colors flex items-center gap-1.5 sm:gap-2 whitespace-nowrap
              ${
                activeSubTab === tab.id
                  ? `${tabColors[tab.color]} border-b-2 -mb-[3px]`
                  : "text-text-muted hover:text-text"
              }`}
          >
            <Icon name={tab.icon} className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {activeSubTab === "overview" && (
        <CampaignOverviewContent campaignId={campaignId} />
      )}
      {activeSubTab === "sessions" && (
        <SessionsContent campaignId={campaignId} />
      )}
      {activeSubTab === "pcs" && (
        <PlayerCharactersContent campaignId={campaignId} />
      )}
      {activeSubTab === "factions" && (
        <FactionsContent campaignId={campaignId} />
      )}
      {activeSubTab === "lore" && <LoreContent campaignId={campaignId} />}
      {activeSubTab === "locations" && (
        <LocationsContent campaignId={campaignId} />
      )}
      {activeSubTab === "monsters" && (
        <MonstersContent campaignId={campaignId} />
      )}
      {activeSubTab === "maps-art" && (
        <MapsArtContent campaignId={campaignId} />
      )}
      {activeSubTab === "gm-notes" && (
        <GMNotesContent campaignId={campaignId} />
      )}
    </div>
  );
}
