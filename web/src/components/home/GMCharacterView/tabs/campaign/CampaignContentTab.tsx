import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import Icon, { IconName } from "../../../../common/Icon";
import CampaignOverviewContent from "./CampaignOverviewContent";
import SessionsContent from "./SessionsContent";
import PlayerCharactersContent from "./PlayerCharactersContent";
import FactionsContent from "./FactionsContent";
import LoreContent from "./LoreContent";
import GMNotesContent from "./GMNotesContent";
import MapsArtContent from "./MapsArtContent";
import ContentVisibilityModal from "./ContentVisibilityModal";

// Import library content components for dynamic tabs
import NPCsContent from "../library/NPCsContent";
import MonstersContent from "../library/MonstersContent";
import EncountersContent from "../library/EncountersContent";
import DialoguesContent from "../library/DialoguesContent";
import LocationsContent from "../library/LocationsContent";
import QuestsContent from "../library/QuestsContent";
import ItemsContent from "../library/ItemsContent";
import RumorsContent from "../library/RumorsContent";
import TavernsContent from "../library/TavernsContent";
import MerchantsContent from "../library/MerchantsContent";
import TrapsContent from "../library/TrapsContent";
import CrittersContent from "../library/CrittersContent";
import ChasesContent from "../library/ChasesContent";

import {
  GENERATOR_CONTENT_TYPES,
  DEFAULT_VISIBLE_CONTENT_TYPES,
  contentTypeTabColors,
} from "../../../../../constants/contentTypes";
import { getContentTypeVisibility } from "../../../../../api/campaigns";

// Static tabs that always appear
interface SubTabConfig {
  id: string;
  label: string;
  icon: IconName;
  color: string;
  type: "static" | "dynamic";
}

// Static tabs before dynamic content
const STATIC_TABS_BEFORE: SubTabConfig[] = [
  {
    id: "overview",
    label: "Overview",
    icon: "Sparkles",
    color: "primary",
    type: "static",
  },
  {
    id: "sessions",
    label: "Sessions",
    icon: "Calendar",
    color: "blue",
    type: "static",
  },
  {
    id: "pcs",
    label: "Characters",
    icon: "User",
    color: "emerald",
    type: "static",
  },
  {
    id: "factions",
    label: "Factions",
    icon: "Shield",
    color: "purple",
    type: "static",
  },
  {
    id: "lore",
    label: "Lore",
    icon: "BookOpen",
    color: "amber",
    type: "static",
  },
];

// Static tabs after dynamic content
const STATIC_TABS_AFTER: SubTabConfig[] = [
  {
    id: "maps-art",
    label: "Maps/Art",
    icon: "Image",
    color: "indigo",
    type: "static",
  },
  {
    id: "gm-notes",
    label: "GM Notes",
    icon: "FileEdit",
    color: "rose",
    type: "static",
  },
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
  ...contentTypeTabColors,
};

interface CampaignContentTabProps {
  campaignId: string;
}

/**
 * CampaignContentTab - Browse campaign info sections inline.
 *
 * Shows static sections (Overview, Sessions, Characters, Factions, Lore, Maps/Art, GM Notes)
 * plus dynamically configured content type tabs (NPCs, Monsters, Locations, etc.)
 */
export default function CampaignContentTab({
  campaignId,
}: CampaignContentTabProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [visibleContentTypes, setVisibleContentTypes] = useState<string[]>(
    DEFAULT_VISIBLE_CONTENT_TYPES,
  );
  const [loading, setLoading] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Fetch visible content types on mount
  useEffect(() => {
    setLoading(true);
    getContentTypeVisibility(campaignId)
      .then((types) => {
        setVisibleContentTypes(types);
      })
      .catch(() => {
        // Use defaults on error
        setVisibleContentTypes(DEFAULT_VISIBLE_CONTENT_TYPES);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [campaignId]);

  // Build dynamic tabs from visible content types
  const dynamicTabs: SubTabConfig[] = useMemo(() => {
    const tabs: SubTabConfig[] = [];
    for (const typeId of visibleContentTypes) {
      const config = GENERATOR_CONTENT_TYPES.find((t) => t.id === typeId);
      if (config) {
        tabs.push({
          id: typeId,
          label: config.label,
          icon: config.icon,
          color: config.color,
          type: "dynamic",
        });
      }
    }
    return tabs;
  }, [visibleContentTypes]);

  // Combine all tabs
  const allTabs = useMemo(() => {
    return [...STATIC_TABS_BEFORE, ...dynamicTabs, ...STATIC_TABS_AFTER];
  }, [dynamicTabs]);

  // Valid tab IDs for URL validation
  const validTabIds = useMemo(() => allTabs.map((t) => t.id), [allTabs]);

  // Get sub-tab from URL, default to 'overview'
  const subTabParam = searchParams.get("subtab");
  const activeSubTab = validTabIds.includes(subTabParam || "")
    ? subTabParam!
    : "overview";

  const setActiveSubTab = (tab: string) => {
    setSearchParams(
      (prev) => {
        prev.set("subtab", tab);
        return prev;
      },
      { replace: true, preventScrollReset: true },
    );
  };

  // Handle visibility update from modal
  const handleVisibilityUpdate = (types: string[]) => {
    setVisibleContentTypes(types);
    // If current tab is a dynamic tab that was removed, switch to overview
    if (
      !STATIC_TABS_BEFORE.some((t) => t.id === activeSubTab) &&
      !STATIC_TABS_AFTER.some((t) => t.id === activeSubTab) &&
      !types.includes(activeSubTab)
    ) {
      setActiveSubTab("overview");
    }
  };

  // Render content based on active tab
  const renderContent = () => {
    // Static tabs
    switch (activeSubTab) {
      case "overview":
        return <CampaignOverviewContent campaignId={campaignId} />;
      case "sessions":
        return <SessionsContent campaignId={campaignId} />;
      case "pcs":
        return <PlayerCharactersContent campaignId={campaignId} />;
      case "factions":
        return <FactionsContent campaignId={campaignId} />;
      case "lore":
        return <LoreContent campaignId={campaignId} />;
      case "maps-art":
        return <MapsArtContent campaignId={campaignId} />;
      case "gm-notes":
        return <GMNotesContent campaignId={campaignId} />;
    }

    // Dynamic content type tabs (from library components)
    // All library components accept campaignId and showCampaignFilter props
    switch (activeSubTab) {
      case "npcs":
        return (
          <NPCsContent campaignId={campaignId} showCampaignFilter={false} />
        );
      case "monsters":
        return (
          <MonstersContent campaignId={campaignId} showCampaignFilter={false} />
        );
      case "encounters":
        return (
          <EncountersContent
            campaignId={campaignId}
            showCampaignFilter={false}
          />
        );
      case "dialogues":
        return (
          <DialoguesContent
            campaignId={campaignId}
            showCampaignFilter={false}
          />
        );
      case "locations":
        return (
          <LocationsContent
            campaignId={campaignId}
            showCampaignFilter={false}
          />
        );
      case "quests":
        return (
          <QuestsContent campaignId={campaignId} showCampaignFilter={false} />
        );
      case "items":
        return (
          <ItemsContent campaignId={campaignId} showCampaignFilter={false} />
        );
      case "rumors":
        return (
          <RumorsContent campaignId={campaignId} showCampaignFilter={false} />
        );
      case "taverns":
        return (
          <TavernsContent campaignId={campaignId} showCampaignFilter={false} />
        );
      case "merchants":
        return (
          <MerchantsContent
            campaignId={campaignId}
            showCampaignFilter={false}
          />
        );
      case "traps":
        return (
          <TrapsContent campaignId={campaignId} showCampaignFilter={false} />
        );
      case "critters":
        return (
          <CrittersContent campaignId={campaignId} showCampaignFilter={false} />
        );
      case "chases":
        return (
          <ChasesContent campaignId={campaignId} showCampaignFilter={false} />
        );
      default:
        return <CampaignOverviewContent campaignId={campaignId} />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 sm:gap-2 border-b border-border pb-1 overflow-x-auto items-center">
        {allTabs.map((tab) => (
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
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}

        {/* Settings button */}
        <button
          onClick={() => setShowSettingsModal(true)}
          className="ml-auto px-2 py-2 text-text-muted hover:text-text hover:bg-background rounded-lg transition-colors flex items-center gap-1"
          title="Configure visible tabs"
        >
          <Icon name="Settings" className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Icon name="Loader2" className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : (
        renderContent()
      )}

      {/* Settings Modal */}
      <ContentVisibilityModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        campaignId={campaignId}
        onUpdate={handleVisibilityUpdate}
      />
    </div>
  );
}
