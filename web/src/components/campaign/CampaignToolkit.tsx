import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../common/Icon";
import {
  useCampaignStore,
  type CampaignContent,
} from "../../store/campaignStore";
import { useUISettingsStore } from "../../store/uiSettingsStore";
import { useAuthStore } from "../../store/authStore";
import { useContextStore, ContextType } from "../../store/contextStore";
import { useCampaignNavigation } from "../../hooks/useCampaignNavigation";
import type { Campaign } from "../../store/campaignStore";
import type { IconName } from "../common/Icon";
import CampaignModal from "./CampaignModal";
import CampaignSummary from "./CampaignSummary";
import SectionContent from "./SectionContent";
import { logger } from "@/utils/logger";
import { authFetch } from "@/utils/authFetch";

logger.debug(
  "[CampaignToolkit] Module loaded - BUILD TIMESTAMP:",
  new Date().toISOString(),
);

interface CampaignSection {
  id: string;
  name: string;
  icon: IconName;
  description: string;
  subsections?: string[];
}

const getCampaignSections = (): CampaignSection[] => {
  return [
    {
      id: "summary",
      name: "Campaign Summary",
      icon: "Sparkles",
      description: "AI-generated campaign overview and context",
    },
    {
      id: "artificers-toolkit",
      name: "Artificer's Toolkit",
      icon: "Sparkles",
      description: "AI-powered generators",
      subsections: [
        "npcs",
        "monsters",
        "encounters",
        "dialogues",
        "locations",
        "quests",
        "items",
        "rumors",
        "taverns",
        "merchants",
        "traps",
        "critters",
        "chases",
      ],
    },
    {
      id: "overview",
      name: "Campaign Overview",
      icon: "BookMarked",
      description: "Campaign pitch, themes, and core concepts",
    },
    {
      id: "sessions",
      name: "Sessions",
      icon: "Calendar",
      description: "Session notes, planning, and transcripts",
    },
    {
      id: "pcs",
      name: "Player Characters",
      icon: "User",
      description: "Party members and their backgrounds",
    },
    {
      id: "factions",
      name: "Factions",
      icon: "Shield",
      description: "Organizations, guilds, and power groups",
    },
    {
      id: "lore",
      name: "Lore",
      icon: "BookOpen",
      description: "World lore, canon, and history",
    },
    {
      id: "maps",
      name: "Maps",
      icon: "MapPin",
      description: "Battle maps and world maps",
    },
    {
      id: "handouts",
      name: "Handouts",
      icon: "FileText",
      description: "Player handouts and props",
    },
    {
      id: "props",
      name: "Props",
      icon: "Box",
      description: "Physical and digital props",
    },
    {
      id: "art",
      name: "Art",
      icon: "Image",
      description: "Character art, location art, story visuals",
    },
    {
      id: "statblocks",
      name: "Stat Blocks",
      icon: "Swords",
      description: "Monster and NPC statistics",
    },
    {
      id: "soundscapes",
      name: "Soundscapes",
      icon: "Music",
      description: "Music and ambient sounds",
    },
    {
      id: "gm-notes",
      name: "GM Notes",
      icon: "FileEdit",
      description: "Session transcripts, lore sheets, continuity",
    },
    {
      id: "tracking",
      name: "Tracking",
      icon: "ListChecks",
      description: "Quest progress, faction status, relationships",
    },
  ];
};

export default function CampaignToolkit() {
  const navigate = useNavigate();
  const { updateContext } = useContextStore();
  const { activateCampaignWithNavigation, isPlayerCampaign } =
    useCampaignNavigation();
  const defaultCampaignSections = getCampaignSections();
  const { hiddenSections, enabledGenerators } = useUISettingsStore();

  // Filter out hidden sections
  const visibleSections = defaultCampaignSections.filter(
    (section) => !hiddenSections.includes(section.id),
  );

  const [campaignSections, setCampaignSections] =
    useState<CampaignSection[]>(visibleSections);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(),
  );
  const [sectionContextMenu, setSectionContextMenu] = useState<{
    x: number;
    y: number;
    kind: "section" | "subsection" | "entry";
    id: string;
    parentId?: string;
  } | null>(null);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>("summary");
  const [selectedSubsection, setSelectedSubsection] = useState<string | null>(
    null,
  );
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [sectionEntries, setSectionEntries] = useState<CampaignContent[]>([]);
  const [campaignContext, setCampaignContext] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [aiTimeoutSeconds, setAiTimeoutSeconds] = useState(120); // Default 120s

  // Mobile drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const { showCampaignSummary } = useUISettingsStore();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const {
    campaigns,
    activeCampaignId,
    loading,
    error,
    lastFetchTime,
    fetchCampaigns,
    addCampaign,
    updateCampaign,
    deleteCampaign,
    setActiveCampaign,
    shouldOpenCreateModal,
    setShouldOpenCreateModal,
  } = useCampaignStore();

  const activeCampaign =
    campaigns.find((c) => c.id === activeCampaignId) || null;

  // Map subsection IDs to generator keys
  const subsectionToGenerator: Record<string, keyof typeof enabledGenerators> =
    {
      npcs: "npc",
      monsters: "monster",
      encounters: "encounter",
      dialogues: "dialogue",
      locations: "location",
      quests: "quest",
      items: "item",
      rumors: "rumor",
      taverns: "tavern",
      merchants: "merchant",
      traps: "trap",
      critters: "critter",
      chases: "chase",
    };

  // Filter subsections based on enabled generators
  const filterSubsections = (subsections: string[] | undefined): string[] => {
    if (!subsections) return [];
    return subsections.filter((sub) => {
      const generatorKey = subsectionToGenerator[sub];
      return generatorKey ? enabledGenerators[generatorKey] : true;
    });
  };

  // When campaigns, active campaign, or hidden sections change, load section order and filter by visibility
  useEffect(() => {
    const active = campaigns.find((c) => c.id === activeCampaignId);
    if (!active) {
      const filtered = defaultCampaignSections.filter(
        (s) => !hiddenSections.includes(s.id),
      );
      setCampaignSections(filtered);
      return;
    }

    try {
      if (active.setting) {
        const settingObj =
          typeof active.setting === "string"
            ? JSON.parse(active.setting)
            : active.setting;
        // Sections order
        if (settingObj && Array.isArray(settingObj.sections_order)) {
          const order: string[] = settingObj.sections_order;
          const ordered = order
            .map((id) => defaultCampaignSections.find((s) => s.id === id))
            .filter(Boolean) as CampaignSection[];
          // Append any missing default sections that weren't present in saved order
          const missing = defaultCampaignSections.filter(
            (s) => !order.includes(s.id),
          );

          // Special handling: insert artificers-toolkit right after summary if it's missing
          let sectionsWithSubsections: CampaignSection[];
          if (missing.some((s) => s.id === "artificers-toolkit")) {
            const summaryIndex = ordered.findIndex((s) => s.id === "summary");
            const artificersToolkit = missing.find(
              (s) => s.id === "artificers-toolkit",
            )!;
            const otherMissing = missing.filter(
              (s) => s.id !== "artificers-toolkit",
            );

            if (summaryIndex >= 0) {
              // Insert artificers-toolkit right after summary
              sectionsWithSubsections = [
                ...ordered.slice(0, summaryIndex + 1),
                artificersToolkit,
                ...ordered.slice(summaryIndex + 1),
                ...otherMissing,
              ];
            } else {
              sectionsWithSubsections = [...ordered, ...missing];
            }
          } else {
            sectionsWithSubsections = [...ordered, ...missing];
          }

          // Apply subsections order if present
          if (
            settingObj.subsections_order &&
            typeof settingObj.subsections_order === "object"
          ) {
            sectionsWithSubsections = sectionsWithSubsections.map((sec) => {
              const key = sec.id;
              const subsOrder = settingObj.subsections_order[key];
              if (
                Array.isArray(subsOrder) &&
                sec.subsections &&
                sec.subsections.length > 0
              ) {
                const orderedSubs = subsOrder
                  .map((name: string) =>
                    sec.subsections!.find((s) => s === name),
                  )
                  .filter(Boolean) as string[];
                const missingSubs = sec.subsections!.filter(
                  (s) => !subsOrder.includes(s),
                );
                return {
                  ...sec,
                  subsections: [...orderedSubs, ...missingSubs],
                };
              }
              return sec;
            });
          }

          // Filter by hidden sections
          const filtered = sectionsWithSubsections.filter(
            (s) => !hiddenSections.includes(s.id),
          );
          setCampaignSections(filtered);
          return;
        }
      }
    } catch {
      logger.warn(
        "Failed to parse campaign setting for sections_order/subsections_order",
        e,
      );
    }

    const filtered = defaultCampaignSections.filter(
      (s) => !hiddenSections.includes(s.id),
    );
    setCampaignSections(filtered);
  }, [campaigns, activeCampaignId, hiddenSections]);

  // Reset selectedSection if it becomes hidden
  useEffect(() => {
    if (selectedSection && hiddenSections.includes(selectedSection)) {
      // Set to the first visible section
      const firstVisible = campaignSections[0];
      if (firstVisible) {
        setSelectedSection(firstVisible.id);
        setSelectedSubsection(null);
        setSelectedEntryId(null);
      }
    }
  }, [hiddenSections, selectedSection, campaignSections]);

  // Clear section entries when section changes to prevent stale data
  useEffect(() => {
    setSectionEntries([]);
  }, [selectedSection, selectedSubsection]);

  // Close section context menu on outside click
  useEffect(() => {
    const handleClick = () => setSectionContextMenu(null);
    if (sectionContextMenu) {
      document.addEventListener("click", handleClick);
      return () => document.removeEventListener("click", handleClick);
    }
  }, [sectionContextMenu]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Check if we should open the create modal (triggered from topbar CampaignSwitcher)
  useEffect(() => {
    if (shouldOpenCreateModal) {
      setEditingCampaign(null);
      setShowCampaignModal(true);
      setShouldOpenCreateModal(false);
    }
  }, [shouldOpenCreateModal, setShouldOpenCreateModal]);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Close drawer when switching to desktop
  useEffect(() => {
    if (!isMobile) {
      setIsDrawerOpen(false);
    }
  }, [isMobile]);

  // Prevent body scroll when drawer open on mobile
  useEffect(() => {
    if (isMobile && isDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobile, isDrawerOpen]);

  // Handle Escape key to close drawer
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isDrawerOpen) {
        setIsDrawerOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isDrawerOpen]);

  // Fetch AI timeout setting from admin settings
  useEffect(() => {
    const fetchAITimeout = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/v1/settings`,
        );
        if (response.ok) {
          const data = await response.json();
          if (data.ai_timeout_seconds && data.ai_timeout_seconds > 0) {
            setAiTimeoutSeconds(data.ai_timeout_seconds);
          }
        }
      } catch (err) {
        logger.warn("Failed to fetch AI timeout setting, using default:", err);
      }
    };
    fetchAITimeout();
  }, []);

  // Fetch campaign context/summary when active campaign changes
  useEffect(() => {
    if (activeCampaignId && showCampaignSummary && isAuthenticated) {
      fetchCampaignContext();
    } else {
      setCampaignContext(null);
    }
  }, [activeCampaignId, showCampaignSummary, isAuthenticated]);

  const fetchCampaignContext = async (forceRegenerate = false) => {
    if (!activeCampaignId || !isAuthenticated) return;

    setLoadingSummary(true);
    try {
      const url = forceRegenerate
        ? `${import.meta.env.VITE_API_URL}/api/v1/campaigns/${activeCampaignId}/context?regenerate=true`
        : `${import.meta.env.VITE_API_URL}/api/v1/campaigns/${activeCampaignId}/context`;

      // Only use long timeout for regenerate requests (AI generation)
      // Non-regenerate requests are fast cache reads and don't need a custom timeout
      const fetchOptions: RequestInit = {};

      let controller: AbortController | undefined;
      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      if (forceRegenerate) {
        // AI generation can take a while - use configured timeout + buffer
        const timeoutMs = (aiTimeoutSeconds + 30) * 1000;
        controller = new AbortController();
        timeoutId = setTimeout(() => controller!.abort(), timeoutMs);
        fetchOptions.signal = controller.signal;
      }

      try {
        const response = await authFetch(url, fetchOptions);

        if (timeoutId) clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          logger.debug("Campaign context data received:", {
            summaryAvailable: data.summary_available,
            hasSummary: !!data.summary,
            summaryKeys: data.summary ? Object.keys(data.summary) : [],
            overview: data.summary?.overview?.substring(0, 100),
          });
          setCampaignContext(data);
        } else {
          logger.error(
            "Failed to fetch campaign context:",
            response.status,
            response.statusText,
          );
        }
      } catch (fetchErr) {
        if (timeoutId) clearTimeout(timeoutId);
        if (fetchErr instanceof Error && fetchErr.name === "AbortError") {
          logger.error("Campaign summary generation timed out");
        }
        throw fetchErr;
      }
    } catch (err) {
      logger.error("Failed to fetch campaign context:", err);
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleCreateCampaign = () => {
    setEditingCampaign(null);
    setShowCampaignModal(true);
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setShowCampaignModal(true);
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (
      confirm(
        "Are you sure you want to delete this campaign? This action cannot be undone.",
      )
    ) {
      await deleteCampaign(campaignId);
    }
  };

  const handleActivateCampaign = async (campaignId: string) => {
    await activateCampaignWithNavigation(campaignId);
  };

  return (
    <div className="h-full flex flex-col bg-background overflow-x-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-background-panel px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button - Only show on mobile when campaign is active */}
            {isMobile &&
              activeCampaignId &&
              campaigns.find((c) => c.id === activeCampaignId) && (
                <button
                  onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                  className="p-2 hover:bg-tavern-dark rounded transition-colors lg:hidden"
                  aria-label="Open navigation menu"
                  aria-expanded={isDrawerOpen}
                >
                  <svg
                    className="w-6 h-6 text-text"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </button>
              )}
            <div>
              <h1 className="text-2xl font-bold text-text flex items-center gap-2">
                <Icon name="BookMarked" className="w-8 h-8 text-primary" />
                {activeCampaign
                  ? activeCampaign.name || "Untitled Campaign"
                  : "Campaign Ledger"}
              </h1>
              <p className="text-sm text-text-muted mt-1">
                {activeCampaign
                  ? "Manage your campaign content and files"
                  : "Manage your campaign worlds and adventures"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {activeCampaignId &&
              campaigns.find((c) => c.id === activeCampaignId) && (
                <button
                  onClick={() => setActiveCampaign(null)}
                  className="px-4 py-2 bg-tavern-dark hover:bg-tavern-purple text-tavern-cream font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  <Icon name="ChevronLeft" className="w-4 h-4" />
                  <span className="hidden sm:inline">All Campaigns</span>
                </button>
              )}
            <button
              onClick={handleCreateCampaign}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <Icon name="Plus" className="w-5 h-5" />
              <span className="hidden sm:inline">New Campaign</span>
            </button>
          </div>
        </div>
      </div>

      {/* Campaign Viewer or Campaign Grid */}
      {activeCampaignId && campaigns.find((c) => c.id === activeCampaignId) ? (
        // Campaign Viewer Layout (matches SavedContent/GuildRoster pattern)
        <div className="flex-1 flex overflow-hidden">
          {/* Backdrop - Mobile only */}
          {isMobile && isDrawerOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-40 transition-opacity lg:hidden"
              onClick={() => setIsDrawerOpen(false)}
              aria-label="Close navigation"
            />
          )}

          {/* Sidebar */}
          <aside
            className={`
              ${isMobile ? "fixed top-0 left-0 h-full w-80 z-50 transform transition-transform duration-300 ease-in-out" : "w-64 flex-shrink-0"}
              ${isMobile && !isDrawerOpen ? "-translate-x-full" : "translate-x-0"}
              bg-background-panel border-r border-border overflow-y-auto
            `}
            role="navigation"
            aria-label="Main navigation"
          >
            <div className="p-4">
              <nav className="space-y-6">
                {/* AI Tools Group */}
                <div>
                  <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Icon name="Sparkles" className="w-3 h-3" />
                    AI Tools
                  </h3>
                  <div className="space-y-1">
                    {/* Summary Section (always first, never collapsible) */}
                    {campaignSections
                      .filter(
                        (section) =>
                          section.id === "summary" ||
                          section.id === "artificers-toolkit",
                      )
                      .map((section) => {
                        const isCurrentSection = selectedSection === section.id;
                        const sectionHasSubsections =
                          section.subsections && section.subsections.length > 0;
                        const isExpanded = expandedSections.has(section.id);

                        return (
                          <div key={section.id}>
                            <button
                              onClick={() => {
                                // If section has subsections, toggle expansion
                                if (sectionHasSubsections) {
                                  setExpandedSections((prev) => {
                                    const next = new Set<string>();
                                    if (!prev.has(section.id)) {
                                      next.add(section.id);
                                    }
                                    return next;
                                  });
                                }
                                setSectionEntries([]); // Clear entries immediately
                                setSelectedSection(section.id);
                                setSelectedSubsection(null);
                                setSelectedEntryId(null);
                                if (isMobile) setIsDrawerOpen(false);
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                setSectionContextMenu({
                                  x: e.clientX,
                                  y: e.clientY,
                                  kind: "section",
                                  id: section.id,
                                });
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                                isCurrentSection && !selectedEntryId
                                  ? "bg-primary text-tavern-darkest"
                                  : "text-tavern-mauve hover:bg-tavern-dark hover:text-tavern-light"
                              }`}
                            >
                              <Icon name={section.icon} className="w-4 h-4" />
                              <span className="text-sm font-medium">
                                {section.name}
                              </span>
                            </button>

                            {/* Subsections (for Artificer's Toolkit) */}
                            {section.subsections &&
                              section.subsections.length > 0 &&
                              isExpanded && (
                                <div className="ml-6 mt-1 space-y-1">
                                  {filterSubsections(section.subsections).map(
                                    (sub) => {
                                      const subsectionLabels: Record<
                                        string,
                                        { name: string; icon: IconName }
                                      > = {
                                        npcs: { name: "NPCs", icon: "Users" },
                                        monsters: {
                                          name: "Monsters",
                                          icon: "Skull",
                                        },
                                        encounters: {
                                          name: "Encounters",
                                          icon: "Swords",
                                        },
                                        dialogues: {
                                          name: "Dialogues",
                                          icon: "MessageCircle",
                                        },
                                        locations: {
                                          name: "Locations",
                                          icon: "Map",
                                        },
                                        quests: {
                                          name: "Quests",
                                          icon: "Scroll",
                                        },
                                        items: {
                                          name: "Items",
                                          icon: "Package",
                                        },
                                        rumors: {
                                          name: "Rumors",
                                          icon: "MessageSquare",
                                        },
                                        taverns: {
                                          name: "Taverns",
                                          icon: "Beer",
                                        },
                                        merchants: {
                                          name: "Merchants",
                                          icon: "Package",
                                        },
                                        traps: {
                                          name: "Traps",
                                          icon: "AlertCircle",
                                        },
                                        critters: {
                                          name: "Critters",
                                          icon: "Shield",
                                        },
                                        chases: {
                                          name: "Chases",
                                          icon: "Sparkles",
                                        },
                                      };
                                      const label = subsectionLabels[sub] || {
                                        name: sub,
                                        icon: "Sparkles" as IconName,
                                      };
                                      const isSubsectionSelected =
                                        selectedSection === sub;

                                      return (
                                        <button
                                          key={sub}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSectionEntries([]); // Clear entries immediately
                                            setSelectedSection(sub);
                                            setSelectedSubsection(null);
                                            setSelectedEntryId(null);
                                            if (isMobile)
                                              setIsDrawerOpen(false);
                                          }}
                                          className={`w-full text-left px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 text-xs ${
                                            isSubsectionSelected
                                              ? "bg-primary/70 text-tavern-darkest"
                                              : "text-tavern-mauve hover:bg-tavern-dark hover:text-tavern-light"
                                          }`}
                                        >
                                          <Icon
                                            name={label.icon}
                                            className="w-3 h-3"
                                          />
                                          <span>{label.name}</span>
                                        </button>
                                      );
                                    },
                                  )}
                                </div>
                              )}
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Campaign Content Group */}
                <div>
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Icon name="BookMarked" className="w-3 h-3" />
                    Campaign Info
                  </h3>
                  <div className="space-y-1">
                    {campaignSections
                      .filter((section) =>
                        [
                          "overview",
                          "sessions",
                          "pcs",
                          "factions",
                          "lore",
                        ].includes(section.id),
                      )
                      .map((section) => {
                        const isCurrentSection = selectedSection === section.id;
                        const sectionHasEntries =
                          isCurrentSection && sectionEntries.length > 0;
                        const sectionHasSubsections =
                          section.subsections && section.subsections.length > 0;
                        const isExpanded = expandedSections.has(section.id);

                        return (
                          <div key={section.id}>
                            <button
                              onClick={() => {
                                // If section has subsections, just toggle expansion and collapse others
                                if (sectionHasSubsections) {
                                  setExpandedSections((prev) => {
                                    const next = new Set<string>();
                                    // If this section was not expanded, expand it (and collapse all others)
                                    // If it was expanded, collapse it (leaving all collapsed)
                                    if (!prev.has(section.id)) {
                                      next.add(section.id);
                                    }
                                    return next;
                                  });
                                } else {
                                  // If clicking the already-selected section, toggle collapse
                                  if (isCurrentSection) {
                                    setExpandedSections((prev) => {
                                      const next = new Set<string>();
                                      if (!prev.has(section.id)) {
                                        next.add(section.id);
                                      }
                                      return next;
                                    });
                                  } else {
                                    // Selecting a new section - select AND auto-expand, collapse others
                                    setSectionEntries([]); // Clear entries immediately
                                    setSelectedSection(section.id);
                                    setSelectedSubsection(null);
                                    setSelectedEntryId(null);
                                    setExpandedSections(new Set([section.id]));
                                    if (isMobile) setIsDrawerOpen(false);
                                  }
                                }
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                setSectionContextMenu({
                                  x: e.clientX,
                                  y: e.clientY,
                                  kind: "section",
                                  id: section.id,
                                });
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                                isCurrentSection &&
                                !selectedEntryId &&
                                !sectionHasSubsections
                                  ? "bg-primary text-tavern-darkest"
                                  : "text-tavern-mauve hover:bg-tavern-dark hover:text-tavern-light"
                              }`}
                            >
                              <Icon name={section.icon} className="w-4 h-4" />
                              <span className="text-sm font-medium">
                                {section.name}
                              </span>
                            </button>

                            {/* Entry List */}
                            {isCurrentSection &&
                              sectionHasEntries &&
                              isExpanded && (
                                <div className="ml-6 mt-1 space-y-1">
                                  {sectionEntries.map((entry) => (
                                    <button
                                      key={entry.id}
                                      onClick={() => {
                                        setSelectedEntryId(entry.id);
                                        setSelectedSubsection(null);
                                        if (isMobile) setIsDrawerOpen(false);
                                      }}
                                      onContextMenu={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const orderKey = selectedSubsection
                                          ? `${section.id}:${selectedSubsection}`
                                          : section.id;
                                        setSectionContextMenu({
                                          x: e.clientX,
                                          y: e.clientY,
                                          kind: "entry",
                                          id: entry.id,
                                          parentId: orderKey,
                                        });
                                      }}
                                      className={`w-full text-left px-3 py-1.5 rounded-lg transition-colors text-xs truncate ${
                                        selectedEntryId === entry.id
                                          ? "bg-primary/70 text-tavern-darkest"
                                          : "text-tavern-mauve hover:bg-tavern-dark hover:text-tavern-light"
                                      }`}
                                      title={entry.title}
                                    >
                                      {entry.title}
                                    </button>
                                  ))}
                                </div>
                              )}

                            {/* Subsections (if any) */}
                            {section.subsections &&
                              section.subsections.length > 0 &&
                              isExpanded && (
                                <div className="ml-6 mt-1 space-y-1">
                                  {filterSubsections(section.subsections).map(
                                    (sub) => {
                                      const subsectionLabels: Record<
                                        string,
                                        { name: string; icon: IconName }
                                      > = {
                                        npcs: { name: "NPCs", icon: "Users" },
                                        monsters: {
                                          name: "Monsters",
                                          icon: "Skull",
                                        },
                                        encounters: {
                                          name: "Encounters",
                                          icon: "Swords",
                                        },
                                        dialogues: {
                                          name: "Dialogues",
                                          icon: "MessageCircle",
                                        },
                                        locations: {
                                          name: "Locations",
                                          icon: "Map",
                                        },
                                        quests: {
                                          name: "Quests",
                                          icon: "Scroll",
                                        },
                                        items: {
                                          name: "Items",
                                          icon: "Package",
                                        },
                                        rumors: {
                                          name: "Rumors",
                                          icon: "MessageSquare",
                                        },
                                        taverns: {
                                          name: "Taverns",
                                          icon: "Beer",
                                        },
                                        merchants: {
                                          name: "Merchants",
                                          icon: "Package",
                                        },
                                        traps: {
                                          name: "Traps",
                                          icon: "AlertCircle",
                                        },
                                        critters: {
                                          name: "Critters",
                                          icon: "Shield",
                                        },
                                        chases: {
                                          name: "Chases",
                                          icon: "Sparkles",
                                        },
                                      };
                                      const subsectionInfo = subsectionLabels[
                                        sub
                                      ] || {
                                        name: sub,
                                        icon: "FileText" as IconName,
                                      };

                                      return (
                                        <button
                                          key={sub}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSectionEntries([]); // Clear entries immediately
                                            setSelectedSection(sub);
                                            setSelectedSubsection(null);
                                            setSelectedEntryId(null);
                                            if (isMobile)
                                              setIsDrawerOpen(false);
                                          }}
                                          className={`w-full text-left px-3 py-1.5 rounded-lg transition-colors text-xs flex items-center gap-2 ${
                                            selectedSection === sub
                                              ? "bg-primary/50 text-tavern-darkest"
                                              : "text-tavern-mauve hover:bg-tavern-dark hover:text-tavern-light"
                                          }`}
                                        >
                                          <Icon
                                            name={subsectionInfo.icon}
                                            className="w-3 h-3"
                                          />
                                          {subsectionInfo.name}
                                        </button>
                                      );
                                    },
                                  )}
                                </div>
                              )}
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Media & Resources Group */}
                <div>
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Icon name="Image" className="w-3 h-3" />
                    Media & Resources
                  </h3>
                  <div className="space-y-1">
                    {campaignSections
                      .filter((section) =>
                        [
                          "maps",
                          "handouts",
                          "props",
                          "art",
                          "soundscapes",
                        ].includes(section.id),
                      )
                      .map((section) => {
                        const isCurrentSection = selectedSection === section.id;
                        const sectionHasSubsections =
                          section.subsections && section.subsections.length > 0;

                        return (
                          <div key={section.id}>
                            <button
                              onClick={() => {
                                if (sectionHasSubsections) {
                                  setExpandedSections((prev) => {
                                    const next = new Set<string>();
                                    if (!prev.has(section.id)) {
                                      next.add(section.id);
                                    }
                                    return next;
                                  });
                                } else {
                                  if (isCurrentSection) {
                                    setExpandedSections((prev) => {
                                      const next = new Set<string>();
                                      if (!prev.has(section.id)) {
                                        next.add(section.id);
                                      }
                                      return next;
                                    });
                                  } else {
                                    setSectionEntries([]); // Clear entries immediately
                                    setSelectedSection(section.id);
                                    setSelectedSubsection(null);
                                    setSelectedEntryId(null);
                                    setExpandedSections(new Set([section.id]));
                                    if (isMobile) setIsDrawerOpen(false);
                                  }
                                }
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                                isCurrentSection &&
                                !selectedEntryId &&
                                !sectionHasSubsections
                                  ? "bg-primary text-tavern-darkest"
                                  : "text-tavern-mauve hover:bg-tavern-dark hover:text-tavern-light"
                              }`}
                            >
                              <Icon name={section.icon} className="w-4 h-4" />
                              <span className="text-sm font-medium">
                                {section.name}
                              </span>
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* GM Tools Group */}
                <div>
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Icon name="FileEdit" className="w-3 h-3" />
                    GM Tools
                  </h3>
                  <div className="space-y-1">
                    {campaignSections
                      .filter((section) =>
                        ["statblocks", "gm-notes", "tracking"].includes(
                          section.id,
                        ),
                      )
                      .map((section) => {
                        const isCurrentSection = selectedSection === section.id;
                        const sectionHasSubsections =
                          section.subsections && section.subsections.length > 0;

                        return (
                          <div key={section.id}>
                            <button
                              onClick={() => {
                                if (sectionHasSubsections) {
                                  setExpandedSections((prev) => {
                                    const next = new Set<string>();
                                    if (!prev.has(section.id)) {
                                      next.add(section.id);
                                    }
                                    return next;
                                  });
                                } else {
                                  if (isCurrentSection) {
                                    setExpandedSections((prev) => {
                                      const next = new Set<string>();
                                      if (!prev.has(section.id)) {
                                        next.add(section.id);
                                      }
                                      return next;
                                    });
                                  } else {
                                    setSectionEntries([]); // Clear entries immediately
                                    setSelectedSection(section.id);
                                    setSelectedSubsection(null);
                                    setSelectedEntryId(null);
                                    setExpandedSections(new Set([section.id]));
                                    if (isMobile) setIsDrawerOpen(false);
                                  }
                                }
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                                isCurrentSection &&
                                !selectedEntryId &&
                                !sectionHasSubsections
                                  ? "bg-primary text-tavern-darkest"
                                  : "text-tavern-mauve hover:bg-tavern-dark hover:text-tavern-light"
                              }`}
                            >
                              <Icon name={section.icon} className="w-4 h-4" />
                              <span className="text-sm font-medium">
                                {section.name}
                              </span>
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </nav>
            </div>
          </aside>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {selectedSection === "summary" ? (
                <CampaignSummary
                  campaignContext={campaignContext}
                  loadingSummary={loadingSummary}
                  onRegenerate={() => fetchCampaignContext(false)}
                  campaignId={activeCampaignId || undefined}
                />
              ) : (
                <SectionContent
                  campaign={campaigns.find((c) => c.id === activeCampaignId)!}
                  section={(() => {
                    // Check if selectedSection is a top-level section
                    const topLevel = campaignSections.find(
                      (s) => s.id === selectedSection,
                    );
                    if (topLevel) return topLevel;

                    // Otherwise, create a virtual section object for the subsection
                    const subsectionLabels: Record<
                      string,
                      { name: string; icon: IconName; description: string }
                    > = {
                      npcs: {
                        name: "NPCs",
                        icon: "Users",
                        description: "Non-player characters and their details",
                      },
                      monsters: {
                        name: "Monsters",
                        icon: "Skull",
                        description: "Creatures and adversaries",
                      },
                      encounters: {
                        name: "Encounters",
                        icon: "Swords",
                        description: "Combat encounters and challenges",
                      },
                      dialogues: {
                        name: "Dialogues",
                        icon: "MessageCircle",
                        description: "NPC conversations and interactions",
                      },
                      locations: {
                        name: "Locations",
                        icon: "Map",
                        description: "Cities, dungeons, and points of interest",
                      },
                      quests: {
                        name: "Quests",
                        icon: "Scroll",
                        description: "Main and side quests, objectives",
                      },
                      items: {
                        name: "Items",
                        icon: "Package",
                        description: "Magic items, artifacts, and treasures",
                      },
                      rumors: {
                        name: "Rumors",
                        icon: "MessageSquare",
                        description: "Plot hooks and gossip",
                      },
                      taverns: {
                        name: "Taverns",
                        icon: "Beer",
                        description:
                          "Inns, taverns, and drinking establishments",
                      },
                      merchants: {
                        name: "Merchants",
                        icon: "Package",
                        description: "Shops, traders, and merchants",
                      },
                      traps: {
                        name: "Traps",
                        icon: "AlertCircle",
                        description: "Traps, hazards, and puzzles",
                      },
                      critters: {
                        name: "Critters",
                        icon: "Shield",
                        description: "Creatures, companions, and wildlife",
                      },
                      chases: {
                        name: "Chases",
                        icon: "Sparkles",
                        description: "Chase and pursuit sequences",
                      },
                    };
                    const info = subsectionLabels[selectedSection] || {
                      name: selectedSection,
                      icon: "FileText" as IconName,
                      description: "",
                    };
                    return { id: selectedSection, ...info };
                  })()}
                  subsection={selectedSubsection}
                  selectedEntryId={selectedEntryId}
                  onEntriesLoad={setSectionEntries}
                  onSelectEntry={setSelectedEntryId}
                />
              )}
            </div>
          </div>
        </div>
      ) : (
        // Campaign Grid (when no campaign is active)
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="max-w-6xl mx-auto">
              {/* Loading/Error States */}
              {loading && (
                <div className="text-center py-12 text-tavern-mauve">
                  Loading campaigns...
                </div>
              )}
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg mb-4">
                  {error}
                </div>
              )}

              {!loading && lastFetchTime && campaigns.length === 0 ? (
                // Empty state - only show after initial fetch completes
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Icon
                    name="BookMarked"
                    className="w-20 h-20 text-tavern-mauve mb-4"
                  />
                  <h3 className="text-2xl font-bold text-tavern-light mb-2">
                    No Campaigns Yet
                  </h3>
                  <p className="text-tavern-mauve max-w-md mb-6">
                    Create your first campaign to start organizing NPCs,
                    locations, quests, and more.
                  </p>
                  <button
                    onClick={handleCreateCampaign}
                    className="px-6 py-3 bg-primary hover:bg-primary-dark text-tavern-darkest font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Icon name="Plus" className="w-5 h-5" />
                    <span>Create Your First Campaign</span>
                  </button>
                </div>
              ) : (
                // Campaign selector grid
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {campaigns.map((campaign) => (
                    <div
                      key={campaign.id}
                      className={`bg-background-panel border rounded-lg p-5 transition-all hover:shadow-lg ${
                        campaign.id === activeCampaignId
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-border"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-bold text-tavern-light flex items-center gap-2">
                          {campaign.name || "Untitled Campaign"}
                          {/* Role Badge */}
                          {isPlayerCampaign(campaign) ? (
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-blue-500/20 text-blue-400">
                              {campaign.membership_type === "player_joined"
                                ? "Joined"
                                : "Player"}
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-amber-500/20 text-amber-400">
                              GM
                            </span>
                          )}
                          {campaign.id === activeCampaignId && (
                            <span className="px-2 py-0.5 text-xs bg-primary text-tavern-darkest rounded-full font-semibold">
                              Active
                            </span>
                          )}
                        </h3>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditCampaign(campaign)}
                            className="p-1.5 hover:bg-tavern-dark rounded transition-colors"
                            title="Edit"
                          >
                            <Icon
                              name="Edit"
                              className="w-4 h-4 text-tavern-mauve"
                            />
                          </button>
                          <button
                            onClick={() => handleDeleteCampaign(campaign.id)}
                            className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
                            title="Delete"
                          >
                            <Icon
                              name="Trash2"
                              className="w-4 h-4 text-red-400"
                            />
                          </button>
                        </div>
                      </div>

                      <p className="text-sm text-tavern-mauve mb-3 line-clamp-2">
                        {campaign.description || "No description"}
                      </p>

                      <div className="space-y-2 text-xs text-tavern-mauve mb-4">
                        {campaign.game_system && (
                          <div className="flex items-center gap-2">
                            <Icon name="Dice5" className="w-3 h-3" />
                            <span>{campaign.game_system}</span>
                          </div>
                        )}
                        {campaign.theme && (
                          <div className="flex items-center gap-2">
                            <Icon name="Sparkles" className="w-3 h-3" />
                            <span>{campaign.theme}</span>
                          </div>
                        )}
                        {campaign.tone && (
                          <div className="flex items-center gap-2">
                            <Icon name="Music" className="w-3 h-3" />
                            <span>{campaign.tone}</span>
                          </div>
                        )}
                      </div>

                      {campaign.id !== activeCampaignId && (
                        <button
                          onClick={() => handleActivateCampaign(campaign.id)}
                          className="w-full px-4 py-2 bg-tavern-dark hover:bg-primary hover:text-tavern-darkest text-tavern-cream font-medium rounded-lg transition-colors text-sm"
                        >
                          Set as Active
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Campaign Modal */}
      {showCampaignModal && (
        <CampaignModal
          campaign={editingCampaign}
          onClose={() => setShowCampaignModal(false)}
          onSave={async (campaignData) => {
            if (editingCampaign) {
              await updateCampaign(editingCampaign.id, campaignData);
            } else {
              // Validate required fields
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

              // If player campaign, update context and navigate to player dashboard
              if (role === "player" && newCampaign) {
                await setActiveCampaign(newCampaign.id);
                await updateContext({
                  last_context_type: "player_campaign" as ContextType,
                  last_campaign_id: newCampaign.id,
                });
                setShowCampaignModal(false);
                navigate("/dashboard/player");
                return;
              }
            }
            setShowCampaignModal(false);
          }}
        />
      )}

      {/* Section Context Menu (global, rendered outside of ternary to avoid JSX nesting issues) */}
      {sectionContextMenu && (
        <div
          className="fixed bg-background-panel border border-border rounded-lg shadow-xl py-1 z-50"
          style={{ left: sectionContextMenu.x, top: sectionContextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={async () => {
              if (!sectionContextMenu) return;
              // Section move up
              if (sectionContextMenu.kind === "section") {
                const idx = campaignSections.findIndex(
                  (s) => s.id === sectionContextMenu.id,
                );
                if (idx > 0) {
                  const newSections = [...campaignSections];
                  const [item] = newSections.splice(idx, 1);
                  newSections.splice(idx - 1, 0, item);
                  setCampaignSections(newSections);

                  // Persist to campaign.setting.sections_order
                  const active = campaigns.find(
                    (c) => c.id === activeCampaignId,
                  );
                  if (active) {
                    const currentSetting =
                      active.setting && typeof active.setting === "string"
                        ? JSON.parse(active.setting)
                        : active.setting || {};
                    const updatedSetting = {
                      ...currentSetting,
                      sections_order: newSections.map((s) => s.id),
                    };
                    try {
                      await updateCampaign(active.id, {
                        ...active,
                        setting: updatedSetting,
                      });
                    } catch {
                      logger.error("Failed to persist section order", e);
                    }
                  }
                }
              } else if (sectionContextMenu.kind === "entry") {
                // Entry move up
                const idx = sectionEntries.findIndex(
                  (e) => e.id === sectionContextMenu.id,
                );
                if (idx > 0) {
                  const newEntries = [...sectionEntries];
                  const [item] = newEntries.splice(idx, 1);
                  newEntries.splice(idx - 1, 0, item);
                  setSectionEntries(newEntries);

                  // Persist to campaign.setting.entries_order
                  const active = campaigns.find(
                    (c) => c.id === activeCampaignId,
                  );
                  if (active) {
                    const currentSetting =
                      active.setting && typeof active.setting === "string"
                        ? JSON.parse(active.setting)
                        : active.setting || {};
                    const entries_order = {
                      ...(currentSetting.entries_order || {}),
                    };
                    entries_order[sectionContextMenu.parentId!] =
                      newEntries.map((e) => e.id);
                    const updatedSetting = { ...currentSetting, entries_order };
                    try {
                      await updateCampaign(active.id, {
                        ...active,
                        setting: updatedSetting,
                      });
                    } catch {
                      logger.error("Failed to persist entry order", e);
                    }
                  }
                }
              } else {
                // Subsection move up
                const parentId = sectionContextMenu.parentId!;
                const parentIdx = campaignSections.findIndex(
                  (s) => s.id === parentId,
                );
                if (parentIdx >= 0) {
                  const parent = campaignSections[parentIdx];
                  const subs = parent.subsections
                    ? [...parent.subsections]
                    : [];
                  const subIdx = subs.findIndex(
                    (x) => x === sectionContextMenu.id,
                  );
                  if (subIdx > 0) {
                    const [item] = subs.splice(subIdx, 1);
                    subs.splice(subIdx - 1, 0, item);
                    const newSections = [...campaignSections];
                    newSections[parentIdx] = { ...parent, subsections: subs };
                    setCampaignSections(newSections);

                    // Persist subsections order into campaign.setting.subsections_order
                    const active = campaigns.find(
                      (c) => c.id === activeCampaignId,
                    );
                    if (active) {
                      const currentSetting =
                        active.setting && typeof active.setting === "string"
                          ? JSON.parse(active.setting)
                          : active.setting || {};
                      const subsections_order = {
                        ...(currentSetting.subsections_order || {}),
                      };
                      subsections_order[parentId] = subs;
                      const updatedSetting = {
                        ...currentSetting,
                        subsections_order,
                      };
                      try {
                        await updateCampaign(active.id, {
                          ...active,
                          setting: updatedSetting,
                        });
                        await fetchCampaigns(); // Refetch to reload section order from database
                      } catch {
                        logger.error("Failed to persist subsection order", e);
                      }
                    }
                  }
                }
              }
              setSectionContextMenu(null);
            }}
            disabled={
              sectionContextMenu.kind === "section"
                ? campaignSections.findIndex(
                    (s) => s.id === sectionContextMenu.id,
                  ) === 0
                : sectionContextMenu.kind === "entry"
                  ? (() => {
                      const idx = sectionEntries.findIndex(
                        (e) => e.id === sectionContextMenu.id,
                      );
                      logger.debug("Move Up - Entry check:", {
                        entryId: sectionContextMenu.id,
                        foundIndex: idx,
                        sectionEntriesLength: sectionEntries.length,
                        disabled: idx === 0,
                      });
                      return idx === 0;
                    })()
                  : sectionContextMenu.kind === "subsection"
                    ? (() => {
                        const parentId = sectionContextMenu.parentId!;
                        const parent = campaignSections.find(
                          (s) => s.id === parentId,
                        );
                        if (!parent || !parent.subsections) return true;
                        return (
                          parent.subsections.findIndex(
                            (x) => x === sectionContextMenu.id,
                          ) === 0
                        );
                      })()
                    : true
            }
            className="w-full px-4 py-2 text-left text-sm hover:bg-tavern-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Icon name="ArrowLeft" className="w-4 h-4" />
            <span>Move Up</span>
          </button>

          <button
            onClick={async () => {
              if (!sectionContextMenu) return;
              if (sectionContextMenu.kind === "section") {
                const idx = campaignSections.findIndex(
                  (s) => s.id === sectionContextMenu.id,
                );
                if (idx >= 0 && idx < campaignSections.length - 1) {
                  const newSections = [...campaignSections];
                  const [item] = newSections.splice(idx, 1);
                  newSections.splice(idx + 1, 0, item);
                  setCampaignSections(newSections);

                  const active = campaigns.find(
                    (c) => c.id === activeCampaignId,
                  );
                  if (active) {
                    const currentSetting =
                      active.setting && typeof active.setting === "string"
                        ? JSON.parse(active.setting)
                        : active.setting || {};
                    const updatedSetting = {
                      ...currentSetting,
                      sections_order: newSections.map((s) => s.id),
                    };
                    try {
                      await updateCampaign(active.id, {
                        ...active,
                        setting: updatedSetting,
                      });
                    } catch {
                      logger.error("Failed to persist section order", e);
                    }
                  }
                }
              } else if (sectionContextMenu.kind === "entry") {
                // Entry move down
                const idx = sectionEntries.findIndex(
                  (e) => e.id === sectionContextMenu.id,
                );
                if (idx >= 0 && idx < sectionEntries.length - 1) {
                  const newEntries = [...sectionEntries];
                  const [item] = newEntries.splice(idx, 1);
                  newEntries.splice(idx + 1, 0, item);
                  setSectionEntries(newEntries);

                  // Persist to campaign.setting.entries_order
                  const active = campaigns.find(
                    (c) => c.id === activeCampaignId,
                  );
                  if (active) {
                    const currentSetting =
                      active.setting && typeof active.setting === "string"
                        ? JSON.parse(active.setting)
                        : active.setting || {};
                    const entries_order = {
                      ...(currentSetting.entries_order || {}),
                    };
                    entries_order[sectionContextMenu.parentId!] =
                      newEntries.map((e) => e.id);
                    const updatedSetting = { ...currentSetting, entries_order };
                    try {
                      await updateCampaign(active.id, {
                        ...active,
                        setting: updatedSetting,
                      });
                    } catch {
                      logger.error("Failed to persist entry order", e);
                    }
                  }
                }
              } else {
                const parentId = sectionContextMenu.parentId!;
                const parentIdx = campaignSections.findIndex(
                  (s) => s.id === parentId,
                );
                if (parentIdx >= 0) {
                  const parent = campaignSections[parentIdx];
                  const subs = parent.subsections
                    ? [...parent.subsections]
                    : [];
                  const subIdx = subs.findIndex(
                    (x) => x === sectionContextMenu.id,
                  );
                  if (subIdx >= 0 && subIdx < subs.length - 1) {
                    const [item] = subs.splice(subIdx, 1);
                    subs.splice(subIdx + 1, 0, item);
                    const newSections = [...campaignSections];
                    newSections[parentIdx] = { ...parent, subsections: subs };
                    setCampaignSections(newSections);

                    const active = campaigns.find(
                      (c) => c.id === activeCampaignId,
                    );
                    if (active) {
                      const currentSetting =
                        active.setting && typeof active.setting === "string"
                          ? JSON.parse(active.setting)
                          : active.setting || {};
                      const subsections_order = {
                        ...(currentSetting.subsections_order || {}),
                      };
                      subsections_order[parentId] = subs;
                      const updatedSetting = {
                        ...currentSetting,
                        subsections_order,
                      };
                      try {
                        await updateCampaign(active.id, {
                          ...active,
                          setting: updatedSetting,
                        });
                        await fetchCampaigns(); // Refetch to reload section order from database
                      } catch {
                        logger.error("Failed to persist subsection order", e);
                      }
                    }
                  }
                }
              }
              setSectionContextMenu(null);
            }}
            disabled={
              sectionContextMenu.kind === "section"
                ? campaignSections.findIndex(
                    (s) => s.id === sectionContextMenu.id,
                  ) ===
                  campaignSections.length - 1
                : sectionContextMenu.kind === "entry"
                  ? (() => {
                      const idx = sectionEntries.findIndex(
                        (e) => e.id === sectionContextMenu.id,
                      );
                      logger.debug("Move Down - Entry check:", {
                        entryId: sectionContextMenu.id,
                        foundIndex: idx,
                        sectionEntriesLength: sectionEntries.length,
                        disabled: idx === sectionEntries.length - 1,
                      });
                      return idx === sectionEntries.length - 1;
                    })()
                  : sectionContextMenu.kind === "subsection"
                    ? (() => {
                        const parentId = sectionContextMenu.parentId!;
                        const parent = campaignSections.find(
                          (s) => s.id === parentId,
                        );
                        if (!parent || !parent.subsections) return true;
                        return (
                          parent.subsections.findIndex(
                            (x) => x === sectionContextMenu.id,
                          ) ===
                          parent.subsections.length - 1
                        );
                      })()
                    : true
            }
            className="w-full px-4 py-2 text-left text-sm hover:bg-tavern-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Icon name="ArrowRight" className="w-4 h-4" />
            <span>Move Down</span>
          </button>

          {/* Delete removed — only Move Up / Move Down supported */}
        </div>
      )}
    </div>
  );
}
