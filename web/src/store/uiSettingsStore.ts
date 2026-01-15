import { create } from "zustand";
import { persist } from "zustand/middleware";
import { logger } from "../utils/logger";

export type IconSet =
  | "lucide"
  | "heroicons"
  | "react-icons"
  | "tabler"
  | "phosphor";
export type ToolbarPosition = "top" | "left" | "right" | "bottom";
export type UIDensity = "comfortable" | "compact";
export type MobileTabBarBehavior = "auto-hide" | "always-show" | "hidden";
export type LibraryViewMode = "list" | "grid" | "compact";
export type LibrarySortBy = "created_at" | "updated_at" | "name" | "type";
export type LibrarySortOrder = "asc" | "desc";
export type ViewStyle = "legacy" | "new";
export type ContentType =
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

interface EnabledTools {
  dnd5etools: boolean;
  dndbeyond: boolean;
  roll20: boolean;
  foundryvtt: boolean;
  koboldplus: boolean;
  tabletopaudio: boolean;
  fantasynamegen: boolean;
  dungeonscrawl: boolean;
  thievesguild: boolean;
}

interface EnabledGenerators {
  npc: boolean;
  monster: boolean;
  location: boolean;
  item: boolean;
  encounter: boolean;
  rumor: boolean;
  tavern: boolean;
  merchant: boolean;
  trap: boolean;
  critter: boolean;
  quest: boolean;
  dialogue: boolean;
  chase: boolean;
}

// GM Mode specific settings
interface GMSettings {
  showQuickStats: boolean;
  showRecentActivity: boolean;
  showExternalTools: boolean;
  defaultHomeSection: "campaign" | "create" | "play";
  quickActionsOrder: string[];
  hiddenQuickActions: string[];
}

// Player Mode specific settings
interface PlayerSettings {
  showCharacterStats: boolean;
  showQuickActions: boolean;
  showCreateContent: boolean;
  useGradientCharacterCard: boolean; // false = flat panel style, true = gradient style
  enabledPlayerGenerators: {
    npc: boolean;
    location: boolean;
    item: boolean;
    quest: boolean;
  };
  characterSheetSections: {
    combatStats: boolean;
    abilityScores: boolean;
    savingThrows: boolean;
    skills: boolean;
    features: boolean;
    equipment: boolean;
    spells: boolean;
    personality: boolean;
    notes: boolean;
  };
}

// Library/Saved Content settings
interface LibrarySettings {
  defaultContentType: ContentType;
  viewMode: LibraryViewMode;
  sortBy: LibrarySortBy;
  sortOrder: LibrarySortOrder;
  showAIBadge: boolean;
  showCampaignFilter: boolean;
  itemsPerPage: number;
  enabledContentTypes: Record<ContentType, boolean>;
}

interface UISettingsState {
  iconSet: IconSet;
  toolbarPosition: ToolbarPosition;
  density: UIDensity;
  viewStyle: ViewStyle;
  enabledTools: EnabledTools;
  enabledGenerators: EnabledGenerators;
  campaignActsCount: number;
  showCampaignSummary: boolean;
  hiddenSections: string[];
  mobileTabBarBehavior: MobileTabBarBehavior;
  gmSettings: GMSettings;
  playerSettings: PlayerSettings;
  librarySettings: LibrarySettings;
}

interface UISettings extends UISettingsState {
  // Actions
  setIconSet: (iconSet: IconSet) => void;
  setToolbarPosition: (position: ToolbarPosition) => void;
  setDensity: (density: UIDensity) => void;
  setViewStyle: (style: ViewStyle) => void;
  setToolEnabled: (tool: keyof EnabledTools, enabled: boolean) => void;
  setGeneratorEnabled: (
    generator: keyof EnabledGenerators,
    enabled: boolean,
  ) => void;
  setCampaignActsCount: (count: number) => void;
  setShowCampaignSummary: (show: boolean) => void;
  setHiddenSections: (sections: string[]) => void;
  toggleSectionVisibility: (sectionId: string) => void;
  setMobileTabBarBehavior: (behavior: MobileTabBarBehavior) => void;
  // GM Settings actions
  updateGMSettings: (settings: Partial<GMSettings>) => void;
  // Player Settings actions
  updatePlayerSettings: (settings: Partial<PlayerSettings>) => void;
  setPlayerGeneratorEnabled: (
    generator: keyof PlayerSettings["enabledPlayerGenerators"],
    enabled: boolean,
  ) => void;
  setCharacterSheetSection: (
    section: keyof PlayerSettings["characterSheetSections"],
    enabled: boolean,
  ) => void;
  // Library Settings actions
  updateLibrarySettings: (settings: Partial<LibrarySettings>) => void;
  setLibraryContentTypeEnabled: (
    contentType: ContentType,
    enabled: boolean,
  ) => void;
  // Backend sync
  loadFromBackend: () => Promise<void>;
  saveToBackend: () => Promise<void>;
}

// Default values for context-specific settings
const defaultGMSettings: GMSettings = {
  showQuickStats: true,
  showRecentActivity: true,
  showExternalTools: true,
  defaultHomeSection: "campaign",
  quickActionsOrder: ["campaign", "create", "play"],
  hiddenQuickActions: [],
};

const defaultPlayerSettings: PlayerSettings = {
  showCharacterStats: true,
  showQuickActions: true,
  showCreateContent: true,
  useGradientCharacterCard: false, // Default to flat panel style to match other cards
  enabledPlayerGenerators: {
    npc: true,
    location: true,
    item: true,
    quest: true,
  },
  characterSheetSections: {
    combatStats: true,
    abilityScores: true,
    savingThrows: true,
    skills: true,
    features: true,
    equipment: true,
    spells: true,
    personality: true,
    notes: true,
  },
};

const defaultLibrarySettings: LibrarySettings = {
  defaultContentType: "npcs",
  viewMode: "list",
  sortBy: "created_at",
  sortOrder: "desc",
  showAIBadge: true,
  showCampaignFilter: true,
  itemsPerPage: 20,
  enabledContentTypes: {
    npcs: true,
    monsters: true,
    encounters: true,
    dialogues: true,
    locations: true,
    quests: true,
    items: true,
    rumors: true,
    taverns: true,
    merchants: true,
    traps: true,
    critters: true,
    chases: true,
  },
};

const defaultEnabledTools: EnabledTools = {
  dnd5etools: true,
  dndbeyond: false,
  roll20: false,
  foundryvtt: false,
  koboldplus: true,
  tabletopaudio: false,
  fantasynamegen: true,
  dungeonscrawl: true,
  thievesguild: true,
};

const defaultEnabledGenerators: EnabledGenerators = {
  npc: true,
  monster: true,
  location: true,
  item: true,
  encounter: true,
  rumor: true,
  tavern: true,
  merchant: true,
  trap: true,
  critter: true,
  quest: true,
  dialogue: true,
  chase: true,
};

// Debounce save to backend
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
const debouncedSave = (saveFn: () => Promise<void>) => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(() => {
    saveFn();
  }, 1000); // Wait 1 second after last change before saving
};

// Helper to get current settings state (excluding actions)
const getSettingsState = (state: UISettings): UISettingsState => ({
  iconSet: state.iconSet,
  toolbarPosition: state.toolbarPosition,
  density: state.density,
  viewStyle: state.viewStyle,
  enabledTools: state.enabledTools,
  enabledGenerators: state.enabledGenerators,
  campaignActsCount: state.campaignActsCount,
  showCampaignSummary: state.showCampaignSummary,
  hiddenSections: state.hiddenSections,
  mobileTabBarBehavior: state.mobileTabBarBehavior,
  gmSettings: state.gmSettings,
  playerSettings: state.playerSettings,
  librarySettings: state.librarySettings,
});

export const useUISettingsStore = create<UISettings>()(
  persist(
    (set, get) => ({
      iconSet: "lucide",
      toolbarPosition: "top",
      density: "comfortable",
      viewStyle: "legacy",
      enabledTools: defaultEnabledTools,
      enabledGenerators: defaultEnabledGenerators,
      campaignActsCount: 3,
      showCampaignSummary: true,
      hiddenSections: [],
      mobileTabBarBehavior: "auto-hide",
      gmSettings: defaultGMSettings,
      playerSettings: defaultPlayerSettings,
      librarySettings: defaultLibrarySettings,

      // Actions - each one triggers a debounced save to backend
      setIconSet: (iconSet) => {
        set({ iconSet });
        debouncedSave(() => get().saveToBackend());
      },
      setToolbarPosition: (position) => {
        set({ toolbarPosition: position });
        debouncedSave(() => get().saveToBackend());
      },
      setDensity: (density) => {
        set({ density });
        debouncedSave(() => get().saveToBackend());
      },
      setViewStyle: (style) => {
        set({ viewStyle: style });
        debouncedSave(() => get().saveToBackend());
      },
      setToolEnabled: (tool, enabled) => {
        set((state) => ({
          enabledTools: {
            ...state.enabledTools,
            [tool]: enabled,
          },
        }));
        debouncedSave(() => get().saveToBackend());
      },
      setGeneratorEnabled: (generator, enabled) => {
        set((state) => ({
          enabledGenerators: {
            ...state.enabledGenerators,
            [generator]: enabled,
          },
        }));
        debouncedSave(() => get().saveToBackend());
      },
      setCampaignActsCount: (count) => {
        set({ campaignActsCount: count });
        debouncedSave(() => get().saveToBackend());
      },
      setShowCampaignSummary: (show) => {
        set({ showCampaignSummary: show });
        debouncedSave(() => get().saveToBackend());
      },
      setHiddenSections: (sections) => {
        set({ hiddenSections: sections });
        debouncedSave(() => get().saveToBackend());
      },
      toggleSectionVisibility: (sectionId) => {
        set((state) => ({
          hiddenSections: state.hiddenSections.includes(sectionId)
            ? state.hiddenSections.filter((id) => id !== sectionId)
            : [...state.hiddenSections, sectionId],
        }));
        debouncedSave(() => get().saveToBackend());
      },
      setMobileTabBarBehavior: (behavior) => {
        set({ mobileTabBarBehavior: behavior });
        debouncedSave(() => get().saveToBackend());
      },
      // GM Settings actions
      updateGMSettings: (settings) => {
        set((state) => ({
          gmSettings: { ...state.gmSettings, ...settings },
        }));
        debouncedSave(() => get().saveToBackend());
      },
      // Player Settings actions
      updatePlayerSettings: (settings) => {
        set((state) => ({
          playerSettings: { ...state.playerSettings, ...settings },
        }));
        debouncedSave(() => get().saveToBackend());
      },
      setPlayerGeneratorEnabled: (generator, enabled) => {
        set((state) => ({
          playerSettings: {
            ...state.playerSettings,
            enabledPlayerGenerators: {
              ...state.playerSettings.enabledPlayerGenerators,
              [generator]: enabled,
            },
          },
        }));
        debouncedSave(() => get().saveToBackend());
      },
      setCharacterSheetSection: (section, enabled) => {
        set((state) => ({
          playerSettings: {
            ...state.playerSettings,
            characterSheetSections: {
              ...state.playerSettings.characterSheetSections,
              [section]: enabled,
            },
          },
        }));
        debouncedSave(() => get().saveToBackend());
      },
      // Library Settings actions
      updateLibrarySettings: (settings) => {
        set((state) => ({
          librarySettings: { ...state.librarySettings, ...settings },
        }));
        debouncedSave(() => get().saveToBackend());
      },
      setLibraryContentTypeEnabled: (contentType, enabled) => {
        set((state) => ({
          librarySettings: {
            ...state.librarySettings,
            enabledContentTypes: {
              ...state.librarySettings.enabledContentTypes,
              [contentType]: enabled,
            },
          },
        }));
        debouncedSave(() => get().saveToBackend());
      },

      // Load settings from backend (per-user)
      loadFromBackend: async () => {
        try {
          const res = await fetch("/api/v1/users/me/ui-settings");
          if (!res.ok) {
            // 401 means not logged in, just use localStorage
            if (res.status === 401) return;
            logger.warn("Failed to load UI settings from backend:", res.status);
            return;
          }

          const data = await res.json();

          // Only update if we got actual settings (not empty object)
          if (data && Object.keys(data).length > 0) {
            set({
              iconSet: data.iconSet || "lucide",
              toolbarPosition: data.toolbarPosition || "top",
              density: data.density || "comfortable",
              viewStyle: data.viewStyle || "legacy",
              enabledTools: data.enabledTools || defaultEnabledTools,
              enabledGenerators:
                data.enabledGenerators || defaultEnabledGenerators,
              campaignActsCount: data.campaignActsCount ?? 3,
              showCampaignSummary: data.showCampaignSummary ?? true,
              hiddenSections: data.hiddenSections || [],
              mobileTabBarBehavior: data.mobileTabBarBehavior || "auto-hide",
              gmSettings: data.gmSettings
                ? { ...defaultGMSettings, ...data.gmSettings }
                : defaultGMSettings,
              playerSettings: data.playerSettings
                ? { ...defaultPlayerSettings, ...data.playerSettings }
                : defaultPlayerSettings,
              librarySettings: data.librarySettings
                ? { ...defaultLibrarySettings, ...data.librarySettings }
                : defaultLibrarySettings,
            });
          }
        } catch (error) {
          logger.error("Failed to load UI settings from backend:", error);
        }
      },

      // Save settings to backend (per-user)
      saveToBackend: async () => {
        try {
          const state = get();
          const settingsState = getSettingsState(state);

          const res = await fetch("/api/v1/users/me/ui-settings", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(settingsState),
          });

          if (!res.ok) {
            // 401 means not logged in, that's okay - localStorage will persist
            if (res.status === 401) return;
            logger.warn("Failed to save UI settings to backend:", res.status);
          }
        } catch (error) {
          logger.error("Failed to save UI settings to backend:", error);
        }
      },
    }),
    {
      name: "tavkit-ui-settings",
    },
  ),
);
