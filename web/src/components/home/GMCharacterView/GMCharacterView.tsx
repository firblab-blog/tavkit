import { useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useCampaignStore } from "../../../store/campaignStore";
import { useUISettingsStore } from "../../../store/uiSettingsStore";
import { useActiveCampaign } from "../../../hooks/useActiveCampaign";
import { useLoadingTimeout } from "../../../hooks/useLoadingTimeout";
import { IconName } from "../../common/Icon";
import NoCampaignState from "../NoCampaignState";
import CampaignHeroCard from "./components/CampaignHeroCard";
import DMPCCard from "./components/DMPCCard";
import CategoryModal from "./components/CategoryModal";
import GMTabs, { GMTabId, MobileGMTabBar } from "./GMTabs";
import OverviewTab from "./tabs/OverviewTab";
import CampaignTab from "./tabs/CampaignTab";
import SessionTab from "./tabs/SessionTab";
import CombatTab from "./tabs/CombatTab";
import LibraryTab from "./tabs/LibraryTab";
import ChatTab from "./tabs/ChatTab";

type ModalType = "campaign" | "create" | "play" | null;

interface CategoryItem {
  label: string;
  path: string;
  icon: IconName;
  description?: string;
}

/**
 * GMCharacterView - Character View layout for Game Masters.
 *
 * Design: "Embed Lite + Link Deep"
 * - Campaign-focused hero card with DMPC card below
 * - Tabbed interface: Overview, Campaign, Session, Library
 * - Tabs show summaries/previews with deep links to full pages
 * - Workflow buttons (Campaign/Create/Play) open modals
 *
 * This provides the modern tabbed aesthetic while preserving
 * full GM functionality through modals and navigation.
 */
const VALID_GM_TABS: GMTabId[] = [
  "overview",
  "campaign",
  "session",
  "combat",
  "library",
  "chat",
];

export default function GMCharacterView() {
  const { loading, lastFetchTime } = useCampaignStore();
  const { activeCampaign } = useActiveCampaign(); // Single source of truth
  const enabledGenerators = useUISettingsStore(
    (state) => state.enabledGenerators,
  );
  const gmSettings = useUISettingsStore((state) => state.gmSettings);
  const [searchParams, setSearchParams] = useSearchParams();

  // Get tab from URL, default to 'overview'
  const tabParam = searchParams.get("tab");
  const activeTab: GMTabId = VALID_GM_TABS.includes(tabParam as GMTabId)
    ? (tabParam as GMTabId)
    : "overview";

  const setActiveTab = useCallback(
    (tab: GMTabId) => {
      setSearchParams(
        (prev) => {
          prev.set("tab", tab);
          return prev;
        },
        { replace: true, preventScrollReset: true },
      );
    },
    [setSearchParams],
  );

  const [openModal, setOpenModal] = useState<ModalType>(null);

  // Memoized modal handlers
  const openCampaignModal = useCallback(() => setOpenModal("campaign"), []);
  const openCreateModal = useCallback(() => setOpenModal("create"), []);
  const openPlayModal = useCallback(() => setOpenModal("play"), []);
  const closeModal = useCallback(() => setOpenModal(null), []);

  // Note: Campaigns are loaded by AppDataProvider at the app root level.
  // No need to call fetchCampaigns() here - it's already done.

  // Track loading timeout for better UX when loading takes too long
  const isCurrentlyLoading = loading || !lastFetchTime;
  const { isTimedOut, elapsedSeconds } = useLoadingTimeout({
    isLoading: Boolean(isCurrentlyLoading),
    timeoutMs: 10000, // Show timeout message after 10 seconds
  });

  // Loading state - show spinner to prevent flash
  if (isCurrentlyLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-muted">Loading campaign...</p>
          {isTimedOut && (
            <p className="text-text-muted text-sm mt-2">
              Taking longer than expected ({elapsedSeconds}s)...
            </p>
          )}
        </div>
      </div>
    );
  }

  // No campaign state
  if (!activeCampaign) {
    return <NoCampaignState />;
  }

  // Campaign tools modal items
  const campaignItems: CategoryItem[] = [
    {
      label: "Campaign Overview",
      path: "/dashboard/gm?tab=campaign&subtab=overview",
      icon: "BookOpen",
      description: "View campaign details",
    },
    {
      label: "Guild Roster",
      path: "/dashboard/gm/characters",
      icon: "Users",
      description: "Manage characters",
    },
    {
      label: "Item Vault",
      path: "/dashboard/gm/items",
      icon: "Package",
      description: "Browse items",
    },
    {
      label: "Saved Content",
      path: "/dashboard/gm/saved",
      icon: "BookMarked",
      description: "View saved content",
    },
  ];

  // All GM generators
  const allGenerators: {
    key: string;
    label: string;
    icon: IconName;
    description: string;
  }[] = [
    {
      key: "npc",
      label: "NPCs",
      icon: "Users",
      description: "Generate characters",
    },
    {
      key: "monster",
      label: "Monsters",
      icon: "Skull",
      description: "Create creatures",
    },
    {
      key: "encounter",
      label: "Encounters",
      icon: "Swords",
      description: "Plan battles",
    },
    {
      key: "location",
      label: "Locations",
      icon: "Map",
      description: "Build places",
    },
    {
      key: "item",
      label: "Items",
      icon: "Package",
      description: "Forge treasures",
    },
    {
      key: "quest",
      label: "Quests",
      icon: "Scroll",
      description: "Design adventures",
    },
    {
      key: "dialogue",
      label: "Dialogues",
      icon: "MessageSquare",
      description: "Write conversations",
    },
    {
      key: "rumor",
      label: "Rumors",
      icon: "MessageCircle",
      description: "Spread whispers",
    },
    {
      key: "tavern",
      label: "Taverns",
      icon: "Beer",
      description: "Generate establishments",
    },
    {
      key: "merchant",
      label: "Merchants",
      icon: "Store",
      description: "Create shops",
    },
    {
      key: "trap",
      label: "Traps",
      icon: "AlertCircle",
      description: "Design hazards",
    },
    {
      key: "critter",
      label: "Critters",
      icon: "Shield",
      description: "Generate companions",
    },
    {
      key: "chase",
      label: "Chases",
      icon: "ArrowRight",
      description: "Create pursuits",
    },
  ];

  const createItems: CategoryItem[] = allGenerators
    .filter((g) => enabledGenerators[g.key as keyof typeof enabledGenerators])
    .map(({ label, key, icon, description }) => ({
      label,
      path: `/dashboard/gm/generator/${key}`,
      icon,
      description,
    }));

  // Session tools modal items
  const playItems: CategoryItem[] = [
    {
      label: "Combat Tracker",
      path: "/dashboard/gm/combat",
      icon: "Swords",
      description: "Run combat encounters",
    },
    {
      label: "Chase Manager",
      path: "/dashboard/gm/chase",
      icon: "ArrowRight",
      description: "Track pursuits",
    },
    {
      label: "Session Chat",
      path: "/dashboard/gm/chat",
      icon: "MessageCircle",
      description: "AI assistant",
    },
    {
      label: "Social Encounter",
      path: "/dashboard/gm/social",
      icon: "Users",
      description: "Run social scenes",
    },
    {
      label: "Tavern Session",
      path: "/dashboard/gm/tavern-session",
      icon: "Beer",
      description: "Manage tavern visits",
    },
    {
      label: "Shopping",
      path: "/dashboard/gm/shopping",
      icon: "Store",
      description: "Run shopping sessions",
    },
  ];

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case "campaign":
        return <CampaignTab campaignId={activeCampaign.id} />;

      case "session":
        return <SessionTab campaignId={activeCampaign.id} />;

      case "combat":
        return <CombatTab campaignId={activeCampaign.id} />;

      case "library":
        return <LibraryTab />;

      case "chat":
        return <ChatTab campaignId={activeCampaign.id} />;

      case "overview":
      default:
        return (
          <OverviewTab
            campaign={activeCampaign}
            gmSettings={gmSettings}
            onOpenCampaignModal={openCampaignModal}
            onOpenCreateModal={openCreateModal}
            onOpenPlayModal={openPlayModal}
          />
        );
    }
  };

  // Track if hero should be visible (only on overview tab)
  const showHero = activeTab === "overview";

  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-0">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* Campaign Hero Section - Animated collapse when switching tabs */}
        <div
          className={`transition-[max-height,opacity,margin] duration-300 ease-out overflow-hidden ${
            showHero
              ? "max-h-[500px] opacity-100"
              : "max-h-0 opacity-0 -mb-4 sm:-mb-6"
          }`}
        >
          <div className="space-y-4 sm:space-y-6">
            {/* Campaign Hero Card */}
            <CampaignHeroCard campaign={activeCampaign} />

            {/* DMPC Card */}
            <DMPCCard campaignId={activeCampaign.id} />
          </div>
        </div>

        {/* Tabs */}
        <GMTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        {renderTabContent()}
      </div>

      {/* Category Modals */}
      <CategoryModal
        isOpen={openModal === "campaign"}
        onClose={closeModal}
        title="Campaign Tools"
        subtitle="Tavern Toolkit"
        color="emerald"
        items={campaignItems}
      />
      <CategoryModal
        isOpen={openModal === "create"}
        onClose={closeModal}
        title="Create Content"
        subtitle="Artificer's Toolkit"
        color="purple"
        items={createItems}
      />
      <CategoryModal
        isOpen={openModal === "play"}
        onClose={closeModal}
        title="Session Tools"
        subtitle="Run Your Game"
        color="amber"
        items={playItems}
      />

      {/* Mobile Tab Bar */}
      <MobileGMTabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
