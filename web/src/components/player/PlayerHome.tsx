import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Icon, { IconName } from "../common/Icon";
import { useCharacterStore, Character } from "../../store/characterStore";
import { useContextStore } from "../../store/contextStore";
import { useUISettingsStore } from "../../store/uiSettingsStore";
import { useActiveCampaign } from "../../hooks/useActiveCampaign";
import { useLoadingTimeout } from "../../hooks/useLoadingTimeout";
import CharacterSwitcher from "./CharacterSwitcher";
import CharacterSheet from "../character/CharacterSheet";
import ManualCharacterForm from "../character/ManualCharacterForm";
import ImportCharacter from "../character/ImportCharacter";
import PlayerTabs, { PlayerTabId, MobilePlayerTabBar } from "./PlayerTabs";
import SessionJournal from "./journal/SessionJournal";
import PartyLoot from "./loot/PartyLoot";
import PlayerCombatView from "./combat/PlayerCombatView";
import SpellSlotTracker from "./reference/SpellSlotTracker";
import AbilityTracker from "./reference/AbilityTracker";
import { LibraryContentTab } from "../home/GMCharacterView/tabs/library";
import ChatTab from "../home/GMCharacterView/tabs/ChatTab";
import { getHPBreakdown } from "@/utils/characterStats";

interface ActionCardProps {
  label: string;
  path?: string;
  onClick?: () => void;
  icon: IconName;
  description: string;
  color: "blue" | "purple" | "emerald" | "amber";
}

const iconColors = {
  blue: "text-blue-400",
  purple: "text-purple-400",
  emerald: "text-emerald-400",
  amber: "text-amber-400",
};

function ActionCard({
  label,
  path,
  onClick,
  icon,
  description,
  color,
}: ActionCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (path) {
      navigate(path);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="p-4 rounded-xl bg-background-panel border border-border hover:border-primary/40 transition-all duration-200 text-left hover:scale-105 group"
    >
      <Icon
        name={icon}
        className={`w-8 h-8 ${iconColors[color]} mb-3 group-hover:scale-110 transition-transform`}
      />
      <h3 className="text-text font-semibold mb-1">{label}</h3>
      <p className="text-text-muted text-sm">{description}</p>
    </button>
  );
}

interface PlayerHomeProps {
  /**
   * Context mode determines feature access and navigation paths.
   * - 'gm': Full access to all generators, navigates to /dashboard/gm/*
   * - 'player': Limited generators, navigates to /dashboard/player/*
   */
  contextMode?: "gm" | "player";
}

/**
 * PlayerHome - Character-centric landing page.
 *
 * Features:
 * - Character hero card with stats
 * - Character switcher for multiple characters
 * - Tabbed interface: Overview, Journal, Quests, Encounters, Loot, Combat
 * - Access to generators (limited for players, full for GMs)
 *
 * When used with contextMode='gm', provides the character-centric view
 * while preserving full GM feature access.
 */
// Valid player tabs for URL param validation
const VALID_PLAYER_TABS: PlayerTabId[] = [
  "overview",
  "journal",
  "loot",
  "combat",
  "library",
  "chat",
];

export default function PlayerHome({
  contextMode = "player",
}: PlayerHomeProps) {
  const isGMContext = contextMode === "gm";
  const basePath = isGMContext ? "/dashboard/gm" : "/dashboard/player";
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { characters, fetchCharacters, loading, lastFetched, error } =
    useCharacterStore();
  const { userContext, loading: contextLoading } = useContextStore();
  const { activeCampaignId } = useActiveCampaign(); // Single source of truth
  const enabledGenerators = useUISettingsStore(
    (state) => state.enabledGenerators,
  );
  const playerSettings = useUISettingsStore((state) => state.playerSettings);

  const [activeCharacter, setActiveCharacter] = useState<Character | null>(
    null,
  );
  const [showCharacterSheet, setShowCharacterSheet] = useState(false);
  const [showCreateCharacterModal, setShowCreateCharacterModal] =
    useState(false);
  const [createMethod, setCreateMethod] = useState<
    "choose" | "manual" | "import"
  >("choose");

  // Get tab from URL, default to 'overview'
  const tabParam = searchParams.get("tab");
  const activeTab: PlayerTabId = VALID_PLAYER_TABS.includes(
    tabParam as PlayerTabId,
  )
    ? (tabParam as PlayerTabId)
    : "overview";

  // Update URL when tab changes (matches GMCharacterView pattern)
  const setActiveTab = useCallback(
    (tab: PlayerTabId) => {
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

  // Track the campaign ID that the active character belongs to
  // This helps us know when to clear the character vs when to keep showing it
  const [characterCampaignId, setCharacterCampaignId] = useState<string | null>(
    null,
  );

  // Track loading timeout for better UX when loading takes too long
  // Loading state should be true when:
  // 1. Context is loading
  // 2. Characters are actively loading
  // 3. Cache was invalidated (lastFetched is null) but we have context AND no error
  // If there's an error, don't show loading - show the error state instead
  const isCurrentlyLoading =
    contextLoading ||
    loading ||
    (lastFetched === null && userContext !== null && !error);

  const { isTimedOut, elapsedSeconds } = useLoadingTimeout({
    isLoading: Boolean(isCurrentlyLoading),
    timeoutMs: 10000, // Show timeout message after 10 seconds
  });

  // Track the previous campaign ID to detect changes
  const prevCampaignIdRef = useRef<string | null>(null);

  // Reset local state immediately when campaign changes
  // This prevents stale character data from flashing before new data loads
  useEffect(() => {
    if (activeCampaignId !== characterCampaignId) {
      setActiveCharacter(null);
      setShowCharacterSheet(false);
    }
  }, [activeCampaignId, characterCampaignId]);

  // Note: Context is loaded by AppDataProvider at the app root level.
  // Do NOT call fetchContext() here - it would overwrite local context updates
  // made during campaign creation/switching before they're persisted to backend.

  // Fetch characters only after context is loaded (so we have the correct campaign ID)
  // Filter characters by active campaign to only show characters assigned to this campaign
  useEffect(() => {
    // Wait for context to be loaded before fetching characters
    if (contextLoading || !userContext) {
      return;
    }

    // Force refresh when campaign changes to ensure we get fresh data
    const campaignChanged =
      prevCampaignIdRef.current !== null &&
      prevCampaignIdRef.current !== activeCampaignId;
    prevCampaignIdRef.current = activeCampaignId;

    fetchCharacters(campaignChanged, activeCampaignId ?? undefined);
  }, [fetchCharacters, activeCampaignId, contextLoading, userContext]);

  // Set active character from context or first available
  // Only update when characters array changes (after fetch completes)
  useEffect(() => {
    if (characters.length > 0) {
      const contextCharId = userContext?.last_character_id;
      const foundChar = contextCharId
        ? characters.find((c) => c.id === contextCharId)
        : characters[0];
      let char = foundChar || characters[0];

      // Initialize current_hp to total if it equals base max_hp (first time setup)
      // Create a new object to avoid mutating the store
      if (char && char.current_hp === char.max_hp && char.max_hp) {
        const totalHP = getHPBreakdown(
          char.max_hp,
          char.level,
          char.constitution,
        ).total;
        if (totalHP !== char.max_hp) {
          char = { ...char, current_hp: totalHP };
        }
      }

      setActiveCharacter(char);
      setCharacterCampaignId(activeCampaignId);
    } else if (lastFetched && characterCampaignId !== activeCampaignId) {
      // Characters array is empty AND we've fetched AND campaign changed
      // This means the new campaign has no characters - clear the stale one
      setActiveCharacter(null);
      setCharacterCampaignId(activeCampaignId);
    }
  }, [
    characters,
    userContext?.last_character_id,
    lastFetched,
    activeCampaignId,
    characterCampaignId,
  ]);

  // Close modals on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowCharacterSheet(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  // Player generators (limited set)
  const playerGenerators: {
    key: string;
    label: string;
    icon: IconName;
    description: string;
    color: ActionCardProps["color"];
  }[] = [
    {
      key: "npc",
      label: "NPCs",
      icon: "Users",
      description: "Create characters",
      color: "purple",
    },
    {
      key: "location",
      label: "Locations",
      icon: "Map",
      description: "Build places",
      color: "emerald",
    },
    {
      key: "item",
      label: "Items",
      icon: "Package",
      description: "Create treasures",
      color: "amber",
    },
    {
      key: "quest",
      label: "Quests",
      icon: "Scroll",
      description: "Design adventures",
      color: "blue",
    },
  ];

  // GM generators (full set)
  const gmGenerators: {
    key: string;
    label: string;
    icon: IconName;
    description: string;
    color: ActionCardProps["color"];
  }[] = [
    {
      key: "npc",
      label: "NPCs",
      icon: "Users",
      description: "Create characters",
      color: "purple",
    },
    {
      key: "monster",
      label: "Monsters",
      icon: "Skull",
      description: "Create creatures",
      color: "amber",
    },
    {
      key: "encounter",
      label: "Encounters",
      icon: "Swords",
      description: "Plan battles",
      color: "blue",
    },
    {
      key: "location",
      label: "Locations",
      icon: "Map",
      description: "Build places",
      color: "emerald",
    },
    {
      key: "item",
      label: "Items",
      icon: "Package",
      description: "Forge treasures",
      color: "amber",
    },
    {
      key: "quest",
      label: "Quests",
      icon: "Scroll",
      description: "Design adventures",
      color: "blue",
    },
    {
      key: "dialogue",
      label: "Dialogues",
      icon: "MessageSquare",
      description: "Write conversations",
      color: "purple",
    },
    {
      key: "rumor",
      label: "Rumors",
      icon: "MessageCircle",
      description: "Spread whispers",
      color: "emerald",
    },
    {
      key: "tavern",
      label: "Taverns",
      icon: "Beer",
      description: "Generate establishments",
      color: "amber",
    },
    {
      key: "merchant",
      label: "Merchants",
      icon: "Store",
      description: "Create shops",
      color: "blue",
    },
    {
      key: "trap",
      label: "Traps",
      icon: "AlertCircle",
      description: "Design hazards",
      color: "purple",
    },
    {
      key: "critter",
      label: "Critters",
      icon: "Shield",
      description: "Generate companions",
      color: "emerald",
    },
    {
      key: "chase",
      label: "Chases",
      icon: "ArrowRight",
      description: "Create pursuits",
      color: "amber",
    },
  ];

  // Choose generator list based on context mode
  const baseGenerators = isGMContext ? gmGenerators : playerGenerators;

  // Filter to enabled generators - check global settings and player-specific for player mode
  const availableGenerators = baseGenerators
    .filter((g) => {
      const globalEnabled =
        enabledGenerators[g.key as keyof typeof enabledGenerators];
      if (!globalEnabled) return false;

      // For player context, also check player-specific settings
      if (!isGMContext) {
        const playerEnabled =
          playerSettings.enabledPlayerGenerators[
            g.key as keyof typeof playerSettings.enabledPlayerGenerators
          ];
        return playerEnabled;
      }
      return true;
    })
    .map((g) => ({
      ...g,
      path: `${basePath}/generator/${g.key}`,
    }));

  // Loading state - show spinner while fetching context/characters OR before first fetch completes
  // This prevents the flash where characters.length === 0 before data loads
  // But don't show loading forever if there's an error - let the error state handle it
  if (isCurrentlyLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-muted">Loading your adventure...</p>
          {isTimedOut && (
            <div className="mt-4">
              <p className="text-text-muted text-sm">
                Taking longer than expected ({elapsedSeconds}s)...
              </p>
              <button
                onClick={() => {
                  // Force a refetch
                  fetchCharacters(true, activeCampaignId ?? undefined);
                }}
                className="mt-3 px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary text-sm font-medium rounded-lg transition-colors"
              >
                Retry Loading
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Error state - show error message with retry option
  if (error && characters.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <Icon
            name="AlertCircle"
            className="w-12 h-12 text-red-400 mx-auto mb-4"
          />
          <h2 className="text-xl font-bold text-text mb-2">
            Failed to Load Characters
          </h2>
          <p className="text-text-muted mb-6">{error}</p>
          <button
            onClick={() => fetchCharacters(true, activeCampaignId ?? undefined)}
            className="px-6 py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // No characters state - only show AFTER fetch completes (lastFetched is set)
  // Don't show this if we haven't fetched yet (lastFetched is null after invalidation)
  if (characters.length === 0 && lastFetched !== null) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-16">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center mx-auto mb-6">
              <Icon name="User" className="w-10 h-10 text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-text mb-4">
              Welcome, Adventurer!
            </h1>
            <p className="text-text-muted mb-8 max-w-md mx-auto">
              Create your first character to begin your journey. You can import
              from D&D Beyond or create one manually.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => setShowCreateCharacterModal(true)}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors flex items-center gap-2"
              >
                <Icon name="Plus" className="w-5 h-5" />
                Create Character
              </button>
              <button
                onClick={() => navigate("/dashboard")}
                className="px-6 py-3 bg-background-panel hover:bg-background border border-border hover:border-primary/40 text-text rounded-xl transition-colors"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case "journal":
        return <SessionJournal characterId={activeCharacter?.id} />;

      case "loot":
        return <PartyLoot />;

      case "combat":
        return <PlayerCombatView characterId={activeCharacter?.id} />;

      case "library":
        // In campaign context, only show that campaign's content (no filter dropdown)
        return (
          <LibraryContentTab
            campaignId={activeCampaignId ?? undefined}
            showCampaignFilter={false}
          />
        );

      case "chat":
        return <ChatTab campaignId={activeCampaignId ?? ""} />;

      case "overview":
      default:
        return (
          <div className="space-y-6 sm:space-y-8">
            {/* Quick Actions - conditionally rendered based on settings */}
            {playerSettings.showQuickActions && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Icon name="Zap" className="w-5 h-5 text-amber-400" />
                  <h2 className="text-lg font-semibold text-text">
                    Quick Actions
                  </h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <ActionCard
                    label="Character Sheet"
                    onClick={
                      activeCharacter
                        ? () => setShowCharacterSheet(true)
                        : undefined
                    }
                    path={
                      activeCharacter
                        ? undefined
                        : `${basePath}?tab=library&subtab=characters`
                    }
                    icon="FileText"
                    description="View full character details"
                    color="blue"
                  />
                  <ActionCard
                    label="My Characters"
                    path={`${basePath}?tab=library&subtab=characters`}
                    icon="Users"
                    description="Manage all characters"
                    color="purple"
                  />
                  <ActionCard
                    label="Library"
                    onClick={() => setActiveTab("library")}
                    icon="Library"
                    description="Saved content"
                    color="emerald"
                  />
                  <ActionCard
                    label="Session Chat"
                    path={`${basePath}/chat`}
                    icon="MessageCircle"
                    description="AI assistant"
                    color="amber"
                  />
                </div>
              </div>
            )}

            {/* Create Content - conditionally rendered based on settings */}
            {playerSettings.showCreateContent &&
              availableGenerators.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Icon name="Sparkles" className="w-5 h-5 text-purple-400" />
                    <h2 className="text-lg font-semibold text-text">
                      Create Content
                    </h2>
                    {!isGMContext && (
                      <span className="text-text-muted text-sm">
                        (Players can create too!)
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {availableGenerators.map((gen) => (
                      <ActionCard
                        key={gen.key}
                        label={gen.label}
                        path={gen.path}
                        icon={gen.icon}
                        description={gen.description}
                        color={gen.color}
                      />
                    ))}
                  </div>
                </div>
              )}

            {/* Resource Tracking - Spell Slots & Abilities */}
            {activeCharacter && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Icon name="Sparkles" className="w-5 h-5 text-purple-400" />
                  <h2 className="text-lg font-semibold text-text">Resources</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <SpellSlotTracker characterId={activeCharacter.id} />
                  <AbilityTracker characterId={activeCharacter.id} />
                </div>
              </div>
            )}

            {/* Info Card */}
            <div className="bg-background-panel border border-border rounded-xl p-4 flex items-start gap-3">
              <Icon
                name="Info"
                className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5"
              />
              <div>
                <p className="text-text font-medium">
                  {isGMContext ? "Character View Mode" : "Player Mode"}
                </p>
                <p className="text-text-muted text-sm mt-1">
                  {isGMContext
                    ? "Using character-centric view. You have full GM access to all generators and tools. Track your DMPC or switch to Campaign View in Settings > Appearance."
                    : "As a player, you can view your characters, track your adventures with the journal, log NPCs and locations, and access the AI assistant. Use the tabs above to explore all features."}
                </p>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-0">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* Header with Character Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Icon
              name={isGMContext ? "Crown" : "Sword"}
              className="w-8 h-8 text-blue-400"
            />
            <h1 className="text-2xl sm:text-3xl font-bold text-text">
              {isGMContext ? "GM Mode" : "Player Mode"}
            </h1>
            {isGMContext && (
              <span className="px-2 py-0.5 text-xs font-medium bg-purple-500/20 text-purple-400 rounded-full">
                Character View
              </span>
            )}
          </div>
          <CharacterSwitcher
            activeCharacterId={activeCharacter?.id}
            onCharacterSelect={setActiveCharacter}
            onCreateCharacter={() => setShowCreateCharacterModal(true)}
          />
        </div>

        {/* Character Hero Card - conditionally rendered based on settings */}
        {playerSettings.showCharacterStats && activeCharacter && (
          <div
            className={`rounded-2xl p-4 sm:p-6 ${
              playerSettings.useGradientCharacterCard
                ? "bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20"
                : "bg-background-panel border border-border"
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
              {/* Avatar */}
              {activeCharacter.avatar ? (
                <img
                  src={activeCharacter.avatar}
                  alt={activeCharacter.name}
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 flex-shrink-0 ${
                    playerSettings.useGradientCharacterCard
                      ? "border-blue-500/40"
                      : "border-border"
                  }`}
                />
              ) : (
                <div
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center flex-shrink-0 ${
                    playerSettings.useGradientCharacterCard
                      ? "bg-blue-500/20 border-2 border-blue-500/40"
                      : "bg-background border-2 border-border"
                  }`}
                >
                  <Icon
                    name="User"
                    className="w-8 h-8 sm:w-10 sm:h-10 text-blue-400"
                  />
                </div>
              )}

              {/* Character Info */}
              <div className="flex-1 min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold text-text mb-1">
                  {activeCharacter.name}
                </h2>
                <p className="text-text-muted text-sm sm:text-base mb-3">
                  Level {activeCharacter.level} {activeCharacter.race}{" "}
                  {activeCharacter.class_info}
                </p>

                {/* Quick Stats */}
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {activeCharacter.max_hp && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-background/50 rounded-lg text-sm">
                      <Icon
                        name="AlertCircle"
                        className="w-4 h-4 text-red-400"
                      />
                      <span className="text-text font-medium">
                        {activeCharacter.current_hp ??
                          getHPBreakdown(
                            activeCharacter.max_hp,
                            activeCharacter.level,
                            activeCharacter.constitution,
                          ).total}
                        /
                        {
                          getHPBreakdown(
                            activeCharacter.max_hp,
                            activeCharacter.level,
                            activeCharacter.constitution,
                          ).total
                        }{" "}
                        HP
                      </span>
                    </div>
                  )}
                  {activeCharacter.armor_class && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-background/50 rounded-lg text-sm">
                      <Icon name="Shield" className="w-4 h-4 text-blue-400" />
                      <span className="text-text font-medium">
                        AC {activeCharacter.armor_class}
                      </span>
                    </div>
                  )}
                  {activeCharacter.speed && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-background/50 rounded-lg text-sm">
                      <Icon
                        name="ArrowRight"
                        className="w-4 h-4 text-emerald-400"
                      />
                      <span className="text-text font-medium">
                        {activeCharacter.speed} ft
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* View Sheet Button */}
              <button
                onClick={() => setShowCharacterSheet(true)}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2 flex-shrink-0"
              >
                <Icon name="FileText" className="w-4 h-4" />
                <span className="hidden sm:inline">View Sheet</span>
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <PlayerTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        {renderTabContent()}
      </div>

      {/* Mobile Tab Bar */}
      <MobilePlayerTabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Character Sheet Modal */}
      {showCharacterSheet && activeCharacter && (
        <div
          className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCharacterSheet(false);
          }}
        >
          <div className="bg-background-panel border border-border rounded-xl w-full max-w-4xl my-8 relative">
            {/* Modal Header */}
            <div className="sticky top-0 bg-background-panel border-b border-border rounded-t-xl px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <Icon name="FileText" className="w-6 h-6 text-blue-400" />
                <h2 className="text-xl font-bold text-text">Character Sheet</h2>
              </div>
              <button
                onClick={() => setShowCharacterSheet(false)}
                className="p-2 hover:bg-background rounded-lg transition-colors text-text-muted hover:text-text"
              >
                <Icon name="X" className="w-5 h-5" />
              </button>
            </div>
            {/* Character Sheet Content */}
            <div className="max-h-[calc(100vh-12rem)] overflow-y-auto">
              <CharacterSheet
                character={activeCharacter}
                onUpdate={() =>
                  fetchCharacters(true, activeCampaignId ?? undefined)
                }
                onClose={() => setShowCharacterSheet(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Create Character Modal */}
      {showCreateCharacterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-panel border border-border rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {createMethod === "choose" && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-text">
                    Create New Character
                  </h2>
                  <button
                    onClick={() => {
                      setShowCreateCharacterModal(false);
                      setCreateMethod("choose");
                    }}
                    className="text-text-muted hover:text-text transition-colors"
                  >
                    <Icon name="X" className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-text-muted mb-6">
                  Choose how you'd like to add your character:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => setCreateMethod("manual")}
                    className="flex flex-col items-center gap-4 p-6 border-2 border-border hover:border-primary rounded-lg transition-all group"
                  >
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                      <Icon name="FileEdit" className="w-8 h-8 text-primary" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-text mb-2">
                        Create Manually
                      </h3>
                      <p className="text-sm text-text-muted">
                        Build your character from scratch with our step-by-step
                        form
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => setCreateMethod("import")}
                    className="flex flex-col items-center gap-4 p-6 border-2 border-border hover:border-primary rounded-lg transition-all group"
                  >
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                      <Icon name="Upload" className="w-8 h-8 text-primary" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-text mb-2">
                        Import from D&D Beyond
                      </h3>
                      <p className="text-sm text-text-muted">
                        Import an existing character from your D&D Beyond
                        account
                      </p>
                    </div>
                  </button>
                </div>
              </>
            )}

            {createMethod === "manual" && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <button
                    onClick={() => setCreateMethod("choose")}
                    className="flex items-center gap-2 text-text-muted hover:text-text transition-colors"
                  >
                    <Icon name="ArrowLeft" className="w-4 h-4" />
                    Back
                  </button>
                  <h2 className="text-xl font-bold text-text">
                    Create Character Manually
                  </h2>
                  <button
                    onClick={() => {
                      setShowCreateCharacterModal(false);
                      setCreateMethod("choose");
                    }}
                    className="text-text-muted hover:text-text transition-colors"
                  >
                    <Icon name="X" className="w-5 h-5" />
                  </button>
                </div>

                <ManualCharacterForm
                  onSuccess={() => {
                    setShowCreateCharacterModal(false);
                    setCreateMethod("choose");
                    fetchCharacters(true, activeCampaignId ?? undefined);
                  }}
                  onCancel={() => setCreateMethod("choose")}
                  campaignId={activeCampaignId ?? undefined}
                />
              </>
            )}

            {createMethod === "import" && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <button
                    onClick={() => setCreateMethod("choose")}
                    className="flex items-center gap-2 text-text-muted hover:text-text transition-colors"
                  >
                    <Icon name="ArrowLeft" className="w-4 h-4" />
                    Back
                  </button>
                  <h2 className="text-xl font-bold text-text">
                    Import from D&D Beyond
                  </h2>
                  <button
                    onClick={() => {
                      setShowCreateCharacterModal(false);
                      setCreateMethod("choose");
                    }}
                    className="text-text-muted hover:text-text transition-colors"
                  >
                    <Icon name="X" className="w-5 h-5" />
                  </button>
                </div>

                <ImportCharacter
                  onSuccess={() => {
                    setShowCreateCharacterModal(false);
                    setCreateMethod("choose");
                    fetchCharacters(true, activeCampaignId ?? undefined);
                  }}
                  onCancel={() => setCreateMethod("choose")}
                  campaignId={activeCampaignId ?? undefined}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
