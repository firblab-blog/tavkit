import { useState, useEffect } from "react";
import Icon, { IconName } from "./common/Icon";
import SavedContentDetail from "./SavedContentDetail";
import AssignCampaignModal from "./common/AssignCampaignModal";
import { useCampaignStore } from "../store/campaignStore";
import {
  useUISettingsStore,
  type ContentType as UIContentType,
} from "../store/uiSettingsStore";
import { apiClient } from "@/api/client";
import { logger } from "@/utils/logger";

type ContentType =
  | "npcs"
  | "monsters"
  | "encounters"
  | "dialogues"
  | "locations"
  | "quests"
  | "items"
  | "rumors"
  | "taverns"
  | "merchants"
  | "traps"
  | "critters"
  | "chases";

interface SavedNPC {
  id: string;
  name: string;
  campaign_id?: string | null;
  race?: string;
  class?: string;
  personality?: string;
  backstory?: string;
  stats?: any;
  ai_generated?: boolean;
  ai_provider?: string;
  created_at: string;
}

interface SavedMonster {
  id: string;
  name: string;
  campaign_id?: string | null;
  cr: number;
  stats?: any;
  lore?: string;
  tactics?: string;
  ai_generated?: boolean;
  created_at: string;
}

interface SavedEncounter {
  id: string;
  name?: string;
  campaign_id?: string | null;
  difficulty: string;
  party_level: number;
  party_size: number;
  description?: string;
  environment?: any;
  creatures?: any;
  treasure?: any;
  xp_total?: number;
  xp_per_player?: number;
  notes?: string;
  ai_generated?: boolean;
  created_at: string;
}

interface SavedDialogue {
  id: string;
  character_name: string;
  campaign_id?: string | null;
  scene_setting?: string;
  mood?: string;
  dialogue_tree?: any;
  skill_checks?: any;
  information?: any;
  potential_quests?: any;
  ai_generated?: boolean;
  created_at: string;
}

interface SavedLocation {
  id: string;
  name: string;
  campaign_id?: string | null;
  type: string;
  theme?: string;
  description?: string;
  features?: any;
  secrets?: any;
  factions?: any;
  npcs?: any;
  encounters?: any;
  map?: string;
  parent_id?: string;
  ai_generated?: boolean;
  ai_provider?: string;
  created_at: string;
  updated_at: string;
}

interface SavedQuest {
  id: string;
  title: string;
  campaign_id?: string | null;
  type: string;
  category?: string;
  description?: string;
  objectives?: any;
  rewards?: any;
  complications?: any;
  npcs_involved?: any;
  locations_involved?: any;
  faction_alignment?: string;
  party_level?: number;
  status: string;
  moral_ambiguity?: boolean;
  combat_intensity?: string;
  time_limit?: string;
  ai_generated?: boolean;
  ai_provider?: string;
  created_at: string;
  updated_at: string;
}

interface SavedItem {
  id: string;
  name: string;
  campaign_id?: string | null;
  type: string;
  rarity?: string;
  description?: string;
  properties?: any;
  origin?: string;
  requires_attunement?: boolean;
  curse?: string;
  value?: any;
  ai_generated?: boolean;
  ai_provider?: string;
  created_at: string;
  updated_at: string;
}

interface SavedRumor {
  id: string;
  text: string;
  campaign_id?: string | null;
  source?: string;
  veracity: string;
  leads_to?: string;
  related_id?: string;
  context?: string;
  foreshadowing?: boolean;
  tags?: any;
  revealed: boolean;
  ai_generated?: boolean;
  ai_provider?: string;
  created_at: string;
  updated_at: string;
}

interface SavedTavern {
  id: string;
  name: string;
  campaign_id?: string | null;
  type: string;
  quality?: string;
  size?: string;
  atmosphere?: string;
  menu?: any;
  rooms?: any;
  services?: any;
  staff?: any;
  patrons?: any;
  special_notes?: string;
  ai_generated?: boolean;
  ai_provider?: string;
  created_at: string;
  updated_at: string;
}

interface SavedMerchant {
  id: string;
  name: string;
  campaign_id?: string | null;
  shop_type: string;
  quality?: string;
  size?: string;
  atmosphere?: string;
  description?: string;
  location?: string;
  owner_name?: string;
  owner_personality?: string;
  inventory?: any;
  services?: any;
  special_items?: any;
  special_notes?: string;
  ai_generated?: boolean;
  ai_provider?: string;
  created_at: string;
  updated_at: string;
}

interface SavedTrap {
  id: string;
  name: string;
  campaign_id?: string | null;
  trap_type: string;
  difficulty?: string;
  party_level?: number;
  environment?: string;
  description?: string;
  trigger?: string;
  effect?: string;
  damage?: string;
  detection?: any;
  solution_paths?: any;
  complications?: any;
  rewards?: any;
  scaling?: any;
  dm_notes?: string;
  ai_generated?: boolean;
  ai_provider?: string;
  created_at: string;
  updated_at: string;
}

interface SavedCritter {
  id: string;
  name: string;
  campaign_id?: string | null;
  species?: string;
  critter_type: string;
  size: string;
  temperament?: string;
  habitat?: string;
  description?: string;
  behavior?: string;
  stats?: any;
  special_abilities?: any;
  uses?: any;
  training_difficulty?: string;
  diet?: string;
  lifespan?: string;
  interesting_facts?: any;
  encounter_notes?: string;
  ai_generated?: boolean;
  ai_provider?: string;
  created_at: string;
  updated_at: string;
}

interface SavedChase {
  id: string;
  name: string;
  campaign_id?: string | null;
  chase_type: string;
  terrain: string;
  difficulty: string;
  description?: string;
  setting?: string;
  participants?: any;
  starting_conditions?: string;
  obstacles?: any;
  complications?: any;
  shortcuts?: any;
  chase_phases?: any;
  ending_conditions?: any;
  rewards?: any;
  special_rules?: string;
  environmental_factors?: any;
  ai_generated?: boolean;
  ai_provider?: string;
  created_at: string;
  updated_at: string;
}

export default function SavedContent() {
  const [activeTab, setActiveTab] = useState<ContentType>("npcs");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [npcs, setNpcs] = useState<SavedNPC[]>([]);
  const [monsters, setMonsters] = useState<SavedMonster[]>([]);
  const [encounters, setEncounters] = useState<SavedEncounter[]>([]);
  const [dialogues, setDialogues] = useState<SavedDialogue[]>([]);
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [quests, setQuests] = useState<SavedQuest[]>([]);
  const [items, setItems] = useState<SavedItem[]>([]);
  const [rumors, setRumors] = useState<SavedRumor[]>([]);
  const [taverns, setTaverns] = useState<SavedTavern[]>([]);
  const [merchants, setMerchants] = useState<SavedMerchant[]>([]);
  const [traps, setTraps] = useState<SavedTrap[]>([]);
  const [critters, setCritters] = useState<SavedCritter[]>([]);
  const [chases, setChases] = useState<SavedChase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Assign campaign modal state
  const [assignModalItem, setAssignModalItem] = useState<{
    type: ContentType;
    id: string;
    name: string;
    currentCampaignId?: string | null;
  } | null>(null);

  // Mobile drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const { campaigns } = useCampaignStore();
  const librarySettings = useUISettingsStore((state) => state.librarySettings);

  // Note: Campaigns are loaded by AppDataProvider at the app root level.
  // No need to call fetchCampaigns() here - it's already done.

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

  const fetchContent = async (type: ContentType) => {
    setLoading(true);
    setError("");

    try {
      // Build URL with optional campaign_id query parameter
      // "library" is a special value meaning campaign_id IS NULL (Personal Library)
      let url = `/${type}`;
      if (selectedCampaignId === "library") {
        url = `/${type}?campaign_id=null`;
      } else if (selectedCampaignId) {
        url = `/${type}?campaign_id=${selectedCampaignId}`;
      }
      const response = await apiClient.get(url);
      const data = response.data;

      logger.debug(`[SavedContent] Fetched ${type}:`, data);

      switch (type) {
        case "npcs":
          // Backend returns array directly for NPCs
          logger.debug("[SavedContent] NPCs data:", data);
          setNpcs(Array.isArray(data) ? data : []);
          break;
        case "monsters":
          setMonsters(data.monsters || []);
          break;
        case "encounters":
          setEncounters(data.encounters || []);
          break;
        case "dialogues":
          setDialogues(data.dialogues || []);
          break;
        case "locations":
          setLocations(Array.isArray(data) ? data : []);
          break;
        case "quests":
          setQuests(Array.isArray(data) ? data : []);
          break;
        case "items":
          setItems(Array.isArray(data) ? data : []);
          break;
        case "rumors":
          setRumors(Array.isArray(data) ? data : []);
          break;
        case "taverns":
          setTaverns(Array.isArray(data) ? data : []);
          break;
        case "merchants":
          setMerchants(Array.isArray(data) ? data : []);
          break;
        case "traps":
          setTraps(Array.isArray(data) ? data : []);
          break;
        case "critters":
          setCritters(Array.isArray(data) ? data : []);
          break;
        case "chases":
          setChases(Array.isArray(data) ? data : []);
          break;
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error || err.message || `Failed to load ${type}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (type: ContentType, id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      await apiClient.delete(`/${type}/${id}`);
      // Refresh the list
      fetchContent(type);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to delete");
    }
  };

  useEffect(() => {
    fetchContent(activeTab);
  }, [activeTab, selectedCampaignId]);

  const allTabs: { key: ContentType; label: string; iconName: IconName }[] = [
    { key: "npcs", label: "NPCs", iconName: "Users" },
    { key: "monsters", label: "Monsters", iconName: "Shield" },
    { key: "encounters", label: "Encounters", iconName: "Swords" },
    { key: "dialogues", label: "Dialogues", iconName: "MessageSquare" },
    { key: "locations", label: "Locations", iconName: "Map" },
    { key: "quests", label: "Quests", iconName: "Scroll" },
    { key: "items", label: "Items", iconName: "Package" },
    { key: "rumors", label: "Rumors", iconName: "Quote" },
    { key: "taverns", label: "Taverns", iconName: "Beer" },
    { key: "merchants", label: "Merchants", iconName: "Package" },
    { key: "traps", label: "Traps", iconName: "AlertCircle" },
    { key: "critters", label: "Critters", iconName: "Shield" },
    { key: "chases", label: "Chases", iconName: "Sparkles" },
  ];

  // Filter tabs based on library settings
  const tabs = allTabs.filter(
    (tab) => librarySettings.enabledContentTypes[tab.key as UIContentType],
  );

  return (
    <>
      <div className="h-full flex flex-col bg-background overflow-x-hidden">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-border bg-background-panel px-6 py-4">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            {isMobile && (
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
                <Icon name="BookOpen" className="w-8 h-8 text-primary" />
                Saved Content
              </h1>
              <p className="text-sm text-text-muted mt-1">
                View and manage your saved NPCs, monsters, encounters, and more
              </p>
            </div>
          </div>
        </div>

        {/* Main Layout with Sidebar */}
        <div className="flex-1 flex overflow-hidden">
          {/* Backdrop - Mobile only */}
          {isMobile && isDrawerOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-40 transition-opacity lg:hidden"
              onClick={() => setIsDrawerOpen(false)}
              aria-label="Close navigation"
            />
          )}

          {/* Vertical Sidebar Navigation */}
          <aside
            className={`
              ${isMobile ? "fixed top-0 left-0 h-full w-80 z-50 transform transition-transform duration-300 ease-in-out" : "w-64 flex-shrink-0"}
              ${isMobile && !isDrawerOpen ? "-translate-x-full" : "translate-x-0"}
              bg-background-panel border-r border-border overflow-y-auto
            `}
            role="navigation"
            aria-label="Content type navigation"
          >
            <div className="p-4">
              <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">
                Content Types
              </h2>
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setActiveTab(tab.key);
                      if (isMobile) setIsDrawerOpen(false);
                    }}
                    className={`w-full px-4 py-3 rounded-lg font-medium transition-all flex items-center gap-3 ${
                      activeTab === tab.key
                        ? "text-tavern-gold bg-tavern-purple/20 border border-tavern-purple/50"
                        : "text-tavern-mauve hover:text-tavern-cream hover:bg-tavern-dark/30 border border-transparent"
                    }`}
                  >
                    <Icon
                      name={tab.iconName}
                      className="w-5 h-5 flex-shrink-0"
                    />
                    <span className="text-left">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {/* Campaign Filter - conditionally rendered based on settings */}
              {librarySettings.showCampaignFilter && (
                <div className="mb-6">
                  <label className="block text-tavern-mauve text-sm font-semibold mb-2">
                    Filter by Campaign
                  </label>
                  <select
                    value={selectedCampaignId}
                    onChange={(e) => setSelectedCampaignId(e.target.value)}
                    className="w-full md:w-64 px-4 py-2 bg-background-panel border border-border rounded-lg text-tavern-cream focus:outline-none focus:border-tavern-purple transition-colors"
                  >
                    <option value="">All Content</option>
                    <option value="library">
                      Personal Library (No Campaign)
                    </option>
                    {campaigns.map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 mb-6">
                  <p className="text-red-400">{error}</p>
                </div>
              )}

              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-tavern-gold"></div>
                  <p className="text-tavern-mauve mt-4">Loading...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* NPCs */}
                  {activeTab === "npcs" && (
                    <>
                      {npcs.length === 0 ? (
                        <p className="text-tavern-mauve text-center py-12">
                          No saved NPCs yet
                        </p>
                      ) : (
                        npcs.map((npc) => (
                          <div
                            key={npc.id}
                            className="bg-background-panel border border-border rounded-lg p-4 hover:border-tavern-purple transition-colors cursor-pointer"
                            onClick={() => {
                              logger.debug(
                                "[SavedContent] Opening NPC detail:",
                                npc,
                              );
                              setSelectedItem({ ...npc, type: "npcs" });
                            }}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h3 className="text-xl font-bold text-tavern-light mb-2">
                                  {npc.name}
                                </h3>
                                <p className="text-tavern-mauve">
                                  {npc.race && `${npc.race} `}
                                  {npc.class && npc.class}
                                </p>
                                {npc.personality && (
                                  <p className="text-tavern-cream mt-2 line-clamp-2">
                                    {npc.personality}
                                  </p>
                                )}
                                <p className="text-sm text-text-muted mt-2">
                                  Created:{" "}
                                  {new Date(
                                    npc.created_at,
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAssignModalItem({
                                      type: "npcs",
                                      id: npc.id,
                                      name: npc.name,
                                      currentCampaignId: npc.campaign_id,
                                    });
                                  }}
                                  className="text-tavern-mauve hover:text-tavern-cream transition-colors p-2"
                                  title="Assign to Campaign"
                                >
                                  <Icon
                                    name="FolderInput"
                                    className="w-5 h-5"
                                  />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete("npcs", npc.id);
                                  }}
                                  className="text-red-400 hover:text-red-300 transition-colors p-2"
                                >
                                  <Icon name="Trash2" className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </>
                  )}

                  {/* Monsters */}
                  {activeTab === "monsters" && (
                    <>
                      {monsters.length === 0 ? (
                        <p className="text-tavern-mauve text-center py-12">
                          No saved monsters yet
                        </p>
                      ) : (
                        monsters.map((monster) => (
                          <div
                            key={monster.id}
                            className="bg-background-panel border border-border rounded-lg p-4 hover:border-tavern-purple transition-colors cursor-pointer"
                            onClick={() =>
                              setSelectedItem({ ...monster, type: "monsters" })
                            }
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h3 className="text-xl font-bold text-tavern-light mb-2">
                                  {monster.name}
                                </h3>
                                <p className="text-tavern-mauve">
                                  CR {monster.cr}
                                </p>
                                <p className="text-sm text-text-muted mt-2">
                                  Created:{" "}
                                  {new Date(
                                    monster.created_at,
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAssignModalItem({
                                      type: "monsters",
                                      id: monster.id,
                                      name: monster.name,
                                      currentCampaignId: monster.campaign_id,
                                    });
                                  }}
                                  className="text-tavern-mauve hover:text-tavern-cream transition-colors p-2"
                                  title="Assign to Campaign"
                                >
                                  <Icon
                                    name="FolderInput"
                                    className="w-5 h-5"
                                  />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete("monsters", monster.id);
                                  }}
                                  className="text-red-400 hover:text-red-300 transition-colors p-2"
                                >
                                  <Icon name="Trash2" className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </>
                  )}

                  {/* Encounters */}
                  {activeTab === "encounters" && (
                    <>
                      {encounters.length === 0 ? (
                        <p className="text-tavern-mauve text-center py-12">
                          No saved encounters yet
                        </p>
                      ) : (
                        encounters.map((encounter) => (
                          <div
                            key={encounter.id}
                            className="bg-background-panel border border-border rounded-lg p-4 hover:border-tavern-purple transition-colors cursor-pointer"
                            onClick={() =>
                              setSelectedItem({
                                ...encounter,
                                type: "encounters",
                              })
                            }
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h3 className="text-xl font-bold text-tavern-light mb-2">
                                  {encounter.name ||
                                    `${encounter.difficulty} Encounter`}
                                </h3>
                                <div className="flex gap-2 mb-2">
                                  <span
                                    className={`px-2 py-1 rounded text-xs font-semibold ${
                                      encounter.difficulty === "deadly"
                                        ? "bg-red-900/30 text-red-400"
                                        : encounter.difficulty === "hard"
                                          ? "bg-orange-900/30 text-orange-400"
                                          : encounter.difficulty === "medium"
                                            ? "bg-yellow-900/30 text-yellow-400"
                                            : "bg-green-900/30 text-green-400"
                                    }`}
                                  >
                                    {encounter.difficulty}
                                  </span>
                                  <span className="text-tavern-mauve text-sm">
                                    Party: {encounter.party_size} (Lvl{" "}
                                    {encounter.party_level})
                                  </span>
                                </div>
                                <p className="text-sm text-text-muted">
                                  Created:{" "}
                                  {new Date(
                                    encounter.created_at,
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAssignModalItem({
                                      type: "encounters",
                                      id: encounter.id,
                                      name:
                                        encounter.name ||
                                        `${encounter.difficulty} Encounter`,
                                      currentCampaignId: encounter.campaign_id,
                                    });
                                  }}
                                  className="text-tavern-mauve hover:text-tavern-cream transition-colors p-2"
                                  title="Assign to Campaign"
                                >
                                  <Icon
                                    name="FolderInput"
                                    className="w-5 h-5"
                                  />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete("encounters", encounter.id);
                                  }}
                                  className="text-red-400 hover:text-red-300 transition-colors p-2"
                                >
                                  <Icon name="Trash2" className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </>
                  )}

                  {/* Dialogues */}
                  {activeTab === "dialogues" && (
                    <>
                      {dialogues.length === 0 ? (
                        <p className="text-tavern-mauve text-center py-12">
                          No saved dialogues yet
                        </p>
                      ) : (
                        dialogues.map((dialogue) => (
                          <div
                            key={dialogue.id}
                            className="bg-background-panel border border-border rounded-lg p-4 hover:border-tavern-purple transition-colors cursor-pointer"
                            onClick={() =>
                              setSelectedItem({
                                ...dialogue,
                                type: "dialogues",
                              })
                            }
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h3 className="text-xl font-bold text-tavern-light mb-2">
                                  {dialogue.character_name}
                                </h3>
                                {dialogue.mood && (
                                  <p className="text-tavern-mauve">
                                    Mood: {dialogue.mood}
                                  </p>
                                )}
                                <p className="text-sm text-text-muted mt-2">
                                  Created:{" "}
                                  {new Date(
                                    dialogue.created_at,
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAssignModalItem({
                                      type: "dialogues",
                                      id: dialogue.id,
                                      name: dialogue.character_name,
                                      currentCampaignId: dialogue.campaign_id,
                                    });
                                  }}
                                  className="text-tavern-mauve hover:text-tavern-cream transition-colors p-2"
                                  title="Assign to Campaign"
                                >
                                  <Icon
                                    name="FolderInput"
                                    className="w-5 h-5"
                                  />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete("dialogues", dialogue.id);
                                  }}
                                  className="text-red-400 hover:text-red-300 transition-colors p-2"
                                >
                                  <Icon name="Trash2" className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </>
                  )}

                  {/* Locations */}
                  {activeTab === "locations" && (
                    <>
                      {locations.length === 0 ? (
                        <p className="text-tavern-mauve text-center py-12">
                          No saved locations yet
                        </p>
                      ) : (
                        locations.map((location) => (
                          <div
                            key={location.id}
                            className="bg-background-panel border border-border rounded-lg p-4 hover:border-tavern-purple transition-colors cursor-pointer"
                            onClick={() =>
                              setSelectedItem({
                                ...location,
                                type: "locations",
                              })
                            }
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h3 className="text-xl font-bold text-tavern-light mb-2">
                                  {location.name}
                                </h3>
                                <p className="text-tavern-mauve capitalize">
                                  {location.type}
                                </p>
                                {location.description && (
                                  <p className="text-tavern-cream mt-2 line-clamp-2">
                                    {location.description}
                                  </p>
                                )}
                                <p className="text-sm text-text-muted mt-2">
                                  Created:{" "}
                                  {new Date(
                                    location.created_at,
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAssignModalItem({
                                      type: "locations",
                                      id: location.id,
                                      name: location.name,
                                      currentCampaignId: location.campaign_id,
                                    });
                                  }}
                                  className="text-tavern-mauve hover:text-tavern-cream transition-colors p-2"
                                  title="Assign to Campaign"
                                >
                                  <Icon
                                    name="FolderInput"
                                    className="w-5 h-5"
                                  />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete("locations", location.id);
                                  }}
                                  className="text-red-400 hover:text-red-300 transition-colors p-2"
                                >
                                  <Icon name="Trash2" className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </>
                  )}

                  {/* Quests */}
                  {activeTab === "quests" && (
                    <>
                      {quests.length === 0 ? (
                        <p className="text-tavern-mauve text-center py-12">
                          No saved quests yet
                        </p>
                      ) : (
                        quests.map((quest) => (
                          <div
                            key={quest.id}
                            className="bg-background-panel border border-border rounded-lg p-4 hover:border-tavern-purple transition-colors cursor-pointer"
                            onClick={() =>
                              setSelectedItem({ ...quest, type: "quests" })
                            }
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h3 className="text-xl font-bold text-tavern-light mb-2">
                                  {quest.title}
                                </h3>
                                <div className="flex gap-2 items-center">
                                  <span className="px-2 py-1 bg-tavern-purple/30 text-tavern-cream rounded text-xs uppercase">
                                    {quest.type}
                                  </span>
                                  <span className="px-2 py-1 bg-tavern-dark text-tavern-mauve rounded text-xs uppercase">
                                    {quest.status}
                                  </span>
                                </div>
                                {quest.description && (
                                  <p className="text-tavern-cream mt-2 line-clamp-2">
                                    {quest.description}
                                  </p>
                                )}
                                <p className="text-sm text-text-muted mt-2">
                                  Created:{" "}
                                  {new Date(
                                    quest.created_at,
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAssignModalItem({
                                      type: "quests",
                                      id: quest.id,
                                      name: quest.title,
                                      currentCampaignId: quest.campaign_id,
                                    });
                                  }}
                                  className="text-tavern-mauve hover:text-tavern-cream transition-colors p-2"
                                  title="Assign to Campaign"
                                >
                                  <Icon
                                    name="FolderInput"
                                    className="w-5 h-5"
                                  />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete("quests", quest.id);
                                  }}
                                  className="text-red-400 hover:text-red-300 transition-colors p-2"
                                >
                                  <Icon name="Trash2" className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </>
                  )}

                  {/* Items */}
                  {activeTab === "items" && (
                    <>
                      {items.length === 0 ? (
                        <p className="text-tavern-mauve text-center py-12">
                          No saved items yet
                        </p>
                      ) : (
                        items.map((item) => (
                          <div
                            key={item.id}
                            className="bg-background-panel border border-border rounded-lg p-4 hover:border-tavern-purple transition-colors cursor-pointer"
                            onClick={() =>
                              setSelectedItem({ ...item, type: "items" })
                            }
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h3 className="text-xl font-bold text-tavern-light mb-2">
                                  {item.name}
                                </h3>
                                <div className="flex gap-2 items-center">
                                  <span className="px-2 py-1 bg-tavern-purple/30 text-tavern-cream rounded text-xs capitalize">
                                    {item.type}
                                  </span>
                                  {item.rarity && (
                                    <span className="px-2 py-1 bg-tavern-gold/20 text-tavern-gold rounded text-xs capitalize">
                                      {item.rarity}
                                    </span>
                                  )}
                                </div>
                                {item.description && (
                                  <p className="text-tavern-cream mt-2 line-clamp-2">
                                    {item.description}
                                  </p>
                                )}
                                <p className="text-sm text-text-muted mt-2">
                                  Created:{" "}
                                  {new Date(
                                    item.created_at,
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAssignModalItem({
                                      type: "items",
                                      id: item.id,
                                      name: item.name,
                                      currentCampaignId: item.campaign_id,
                                    });
                                  }}
                                  className="text-tavern-mauve hover:text-tavern-cream transition-colors p-2"
                                  title="Assign to Campaign"
                                >
                                  <Icon
                                    name="FolderInput"
                                    className="w-5 h-5"
                                  />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete("items", item.id);
                                  }}
                                  className="text-red-400 hover:text-red-300 transition-colors p-2"
                                >
                                  <Icon name="Trash2" className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </>
                  )}

                  {/* Rumors */}
                  {activeTab === "rumors" && (
                    <>
                      {rumors.length === 0 ? (
                        <p className="text-tavern-mauve text-center py-12">
                          No saved rumors yet
                        </p>
                      ) : (
                        rumors.map((rumor) => (
                          <div
                            key={rumor.id}
                            className="bg-background-panel border border-border rounded-lg p-4 hover:border-tavern-purple transition-colors cursor-pointer"
                            onClick={() =>
                              setSelectedItem({ ...rumor, type: "rumors" })
                            }
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="text-tavern-light mb-2 line-clamp-3 italic">
                                  &ldquo;{rumor.text}&rdquo;
                                </p>
                                <div className="flex gap-2 items-center">
                                  <span
                                    className={`px-2 py-1 rounded text-xs ${
                                      rumor.veracity === "true"
                                        ? "bg-green-900/30 text-green-400"
                                        : rumor.veracity === "partially_true"
                                          ? "bg-yellow-900/30 text-yellow-400"
                                          : "bg-red-900/30 text-red-400"
                                    }`}
                                  >
                                    {rumor.veracity.replace("_", " ")}
                                  </span>
                                  {rumor.revealed && (
                                    <span className="px-2 py-1 bg-tavern-purple/30 text-tavern-cream rounded text-xs">
                                      Revealed
                                    </span>
                                  )}
                                </div>
                                {rumor.source && (
                                  <p className="text-tavern-mauve text-sm mt-2">
                                    Source: {rumor.source}
                                  </p>
                                )}
                                <p className="text-sm text-text-muted mt-2">
                                  Created:{" "}
                                  {new Date(
                                    rumor.created_at,
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAssignModalItem({
                                      type: "rumors",
                                      id: rumor.id,
                                      name:
                                        rumor.text.substring(0, 40) +
                                        (rumor.text.length > 40 ? "..." : ""),
                                      currentCampaignId: rumor.campaign_id,
                                    });
                                  }}
                                  className="text-tavern-mauve hover:text-tavern-cream transition-colors p-2"
                                  title="Assign to Campaign"
                                >
                                  <Icon
                                    name="FolderInput"
                                    className="w-5 h-5"
                                  />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete("rumors", rumor.id);
                                  }}
                                  className="text-red-400 hover:text-red-300 transition-colors p-2"
                                >
                                  <Icon name="Trash2" className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </>
                  )}

                  {/* Taverns */}
                  {activeTab === "taverns" && (
                    <>
                      {taverns.length === 0 ? (
                        <p className="text-tavern-mauve text-center py-12">
                          No saved taverns yet
                        </p>
                      ) : (
                        taverns.map((tavern) => (
                          <div
                            key={tavern.id}
                            className="bg-background-panel border border-border rounded-lg p-4 hover:border-tavern-purple transition-colors cursor-pointer"
                            onClick={() =>
                              setSelectedItem({ ...tavern, type: "taverns" })
                            }
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold text-primary mb-1">
                                  {tavern.name}
                                </h3>
                                <div className="flex gap-2 items-center mb-2">
                                  <span className="px-2 py-1 bg-tavern-purple/30 text-tavern-cream rounded text-xs capitalize">
                                    {tavern.type}
                                  </span>
                                  {tavern.quality && (
                                    <span className="px-2 py-1 bg-tavern-dark text-tavern-mauve rounded text-xs capitalize">
                                      {tavern.quality}
                                    </span>
                                  )}
                                  {tavern.size && (
                                    <span className="px-2 py-1 bg-tavern-dark text-tavern-mauve rounded text-xs capitalize">
                                      {tavern.size}
                                    </span>
                                  )}
                                </div>
                                {tavern.atmosphere && (
                                  <p className="text-tavern-light text-sm mb-2 line-clamp-2">
                                    {tavern.atmosphere}
                                  </p>
                                )}
                                <p className="text-sm text-text-muted mt-2">
                                  Created:{" "}
                                  {new Date(
                                    tavern.created_at,
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAssignModalItem({
                                      type: "taverns",
                                      id: tavern.id,
                                      name: tavern.name,
                                      currentCampaignId: tavern.campaign_id,
                                    });
                                  }}
                                  className="text-tavern-mauve hover:text-tavern-cream transition-colors p-2"
                                  title="Assign to Campaign"
                                >
                                  <Icon
                                    name="FolderInput"
                                    className="w-5 h-5"
                                  />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete("taverns", tavern.id);
                                  }}
                                  className="text-red-400 hover:text-red-300 transition-colors p-2"
                                >
                                  <Icon name="Trash2" className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </>
                  )}

                  {/* Merchants */}
                  {activeTab === "merchants" && (
                    <>
                      {merchants.length === 0 ? (
                        <p className="text-tavern-mauve text-center py-12">
                          No saved merchants yet
                        </p>
                      ) : (
                        merchants.map((merchant) => (
                          <div
                            key={merchant.id}
                            className="bg-background-panel border border-border rounded-lg p-4 hover:border-tavern-purple transition-colors cursor-pointer"
                            onClick={() =>
                              setSelectedItem({
                                ...merchant,
                                type: "merchants",
                              })
                            }
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold text-primary mb-1">
                                  {merchant.name}
                                </h3>
                                <div className="flex gap-2 items-center mb-2">
                                  <span className="px-2 py-1 bg-tavern-purple/30 text-tavern-cream rounded text-xs capitalize">
                                    {merchant.shop_type.replace(/_/g, " ")}
                                  </span>
                                  {merchant.quality && (
                                    <span className="px-2 py-1 bg-tavern-dark text-tavern-mauve rounded text-xs capitalize">
                                      {merchant.quality}
                                    </span>
                                  )}
                                  {merchant.size && (
                                    <span className="px-2 py-1 bg-tavern-dark text-tavern-mauve rounded text-xs capitalize">
                                      {merchant.size}
                                    </span>
                                  )}
                                </div>
                                {merchant.location && (
                                  <p className="text-tavern-mauve text-sm mb-1">
                                    📍 {merchant.location}
                                  </p>
                                )}
                                {merchant.atmosphere && (
                                  <p className="text-tavern-light text-sm mb-2 line-clamp-2">
                                    {merchant.atmosphere}
                                  </p>
                                )}
                                <p className="text-sm text-text-muted mt-2">
                                  Created:{" "}
                                  {new Date(
                                    merchant.created_at,
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAssignModalItem({
                                      type: "merchants",
                                      id: merchant.id,
                                      name: merchant.name,
                                      currentCampaignId: merchant.campaign_id,
                                    });
                                  }}
                                  className="text-tavern-mauve hover:text-tavern-cream transition-colors p-2"
                                  title="Assign to Campaign"
                                >
                                  <Icon
                                    name="FolderInput"
                                    className="w-5 h-5"
                                  />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete("merchants", merchant.id);
                                  }}
                                  className="text-red-400 hover:text-red-300 transition-colors p-2"
                                >
                                  <Icon name="Trash2" className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </>
                  )}

                  {/* Traps */}
                  {activeTab === "traps" && (
                    <>
                      {traps.length === 0 ? (
                        <p className="text-tavern-mauve text-center py-12">
                          No saved traps yet
                        </p>
                      ) : (
                        traps.map((trap) => (
                          <div
                            key={trap.id}
                            className="bg-background-panel border border-border rounded-lg p-4 hover:border-tavern-purple transition-colors cursor-pointer"
                            onClick={() =>
                              setSelectedItem({ ...trap, type: "traps" })
                            }
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold text-primary mb-1">
                                  {trap.name}
                                </h3>
                                <div className="flex gap-2 items-center mb-2">
                                  <span className="px-2 py-1 bg-tavern-purple/30 text-tavern-cream rounded text-xs capitalize">
                                    {trap.trap_type.replace(/_/g, " ")}
                                  </span>
                                  {trap.difficulty && (
                                    <span
                                      className={`px-2 py-1 rounded text-xs capitalize ${
                                        trap.difficulty === "deadly"
                                          ? "bg-red-900/40 text-red-300"
                                          : trap.difficulty === "hard"
                                            ? "bg-orange-900/40 text-orange-300"
                                            : trap.difficulty === "medium"
                                              ? "bg-yellow-900/40 text-yellow-300"
                                              : "bg-green-900/40 text-green-300"
                                      }`}
                                    >
                                      {trap.difficulty}
                                    </span>
                                  )}
                                  {trap.environment && (
                                    <span className="px-2 py-1 bg-tavern-dark text-tavern-mauve rounded text-xs capitalize">
                                      {trap.environment}
                                    </span>
                                  )}
                                </div>
                                {trap.description && (
                                  <p className="text-tavern-light text-sm mb-2 line-clamp-2">
                                    {trap.description}
                                  </p>
                                )}
                                <p className="text-sm text-text-muted mt-2">
                                  Created:{" "}
                                  {new Date(
                                    trap.created_at,
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAssignModalItem({
                                      type: "traps",
                                      id: trap.id,
                                      name: trap.name,
                                      currentCampaignId: trap.campaign_id,
                                    });
                                  }}
                                  className="text-tavern-mauve hover:text-tavern-cream transition-colors p-2"
                                  title="Assign to Campaign"
                                >
                                  <Icon
                                    name="FolderInput"
                                    className="w-5 h-5"
                                  />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete("traps", trap.id);
                                  }}
                                  className="text-red-400 hover:text-red-300 transition-colors p-2"
                                >
                                  <Icon name="Trash2" className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </>
                  )}

                  {/* Critters */}
                  {activeTab === "critters" && (
                    <>
                      {critters.length === 0 ? (
                        <p className="text-tavern-mauve text-center py-12">
                          No saved critters yet
                        </p>
                      ) : (
                        critters.map((critter) => (
                          <div
                            key={critter.id}
                            className="bg-background-panel border border-border rounded-lg p-4 hover:border-tavern-purple transition-colors cursor-pointer"
                            onClick={() =>
                              setSelectedItem({ ...critter, type: "critters" })
                            }
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold text-primary mb-1">
                                  {critter.name}
                                </h3>
                                {critter.species && (
                                  <p className="text-sm text-text-muted italic mb-2">
                                    {critter.species}
                                  </p>
                                )}
                                <div className="flex gap-2 items-center mb-2">
                                  <span className="px-2 py-1 bg-tavern-purple/30 text-tavern-cream rounded text-xs capitalize">
                                    {critter.critter_type.replace(/_/g, " ")}
                                  </span>
                                  <span className="px-2 py-1 bg-blue-900/40 text-blue-300 rounded text-xs capitalize">
                                    {critter.size}
                                  </span>
                                  {critter.temperament && (
                                    <span className="px-2 py-1 bg-purple-900/40 text-purple-300 rounded text-xs capitalize">
                                      {critter.temperament}
                                    </span>
                                  )}
                                  {critter.habitat && (
                                    <span className="px-2 py-1 bg-green-900/40 text-green-300 rounded text-xs capitalize">
                                      {critter.habitat}
                                    </span>
                                  )}
                                </div>
                                {critter.description && (
                                  <p className="text-tavern-light text-sm mb-2 line-clamp-2">
                                    {critter.description}
                                  </p>
                                )}
                                <p className="text-sm text-text-muted mt-2">
                                  Created:{" "}
                                  {new Date(
                                    critter.created_at,
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAssignModalItem({
                                      type: "critters",
                                      id: critter.id,
                                      name: critter.name,
                                      currentCampaignId: critter.campaign_id,
                                    });
                                  }}
                                  className="text-tavern-mauve hover:text-tavern-cream transition-colors p-2"
                                  title="Assign to Campaign"
                                >
                                  <Icon
                                    name="FolderInput"
                                    className="w-5 h-5"
                                  />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete("critters", critter.id);
                                  }}
                                  className="text-red-400 hover:text-red-300 transition-colors p-2"
                                >
                                  <Icon name="Trash2" className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </>
                  )}

                  {activeTab === "chases" && (
                    <>
                      {chases.length === 0 ? (
                        <p className="text-tavern-mauve text-center py-12">
                          No saved chases yet
                        </p>
                      ) : (
                        chases.map((chase) => (
                          <div
                            key={chase.id}
                            className="bg-background-panel border border-border rounded-lg p-4 hover:border-tavern-purple transition-colors cursor-pointer"
                            onClick={() =>
                              setSelectedItem({ ...chase, type: "chases" })
                            }
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold text-primary mb-1">
                                  {chase.name}
                                </h3>
                                <div className="flex gap-2 items-center mb-2">
                                  <span className="px-2 py-1 bg-tavern-purple/30 text-tavern-cream rounded text-xs capitalize">
                                    {chase.chase_type.replace(/_/g, " ")}
                                  </span>
                                  <span className="px-2 py-1 bg-blue-900/40 text-blue-300 rounded text-xs capitalize">
                                    {chase.terrain}
                                  </span>
                                  <span className="px-2 py-1 bg-yellow-900/40 text-yellow-300 rounded text-xs capitalize">
                                    {chase.difficulty}
                                  </span>
                                </div>
                                {chase.description && (
                                  <p className="text-tavern-light text-sm mb-2 line-clamp-2">
                                    {chase.description}
                                  </p>
                                )}
                                <p className="text-sm text-text-muted mt-2">
                                  Created:{" "}
                                  {new Date(
                                    chase.created_at,
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAssignModalItem({
                                      type: "chases",
                                      id: chase.id,
                                      name: chase.name,
                                      currentCampaignId: chase.campaign_id,
                                    });
                                  }}
                                  className="text-tavern-mauve hover:text-tavern-cream transition-colors p-2"
                                  title="Assign to Campaign"
                                >
                                  <Icon
                                    name="FolderInput"
                                    className="w-5 h-5"
                                  />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete("chases", chase.id);
                                  }}
                                  className="text-red-400 hover:text-red-300 transition-colors p-2"
                                >
                                  <Icon name="Trash2" className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <SavedContentDetail
          content={selectedItem}
          type={selectedItem.type}
          onClose={() => setSelectedItem(null)}
        />
      )}

      {/* Assign Campaign Modal */}
      {assignModalItem && (
        <AssignCampaignModal
          isOpen={true}
          onClose={() => setAssignModalItem(null)}
          contentType={assignModalItem.type}
          contentId={assignModalItem.id}
          contentName={assignModalItem.name}
          currentCampaignId={assignModalItem.currentCampaignId}
          onSuccess={() => fetchContent(activeTab)}
        />
      )}
    </>
  );
}
