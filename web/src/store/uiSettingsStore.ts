import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { logger } from '../utils/logger'

export type IconSet = 'lucide' | 'heroicons' | 'react-icons' | 'tabler' | 'phosphor'
export type ToolbarPosition = 'top' | 'left' | 'right' | 'bottom'
export type UIDensity = 'comfortable' | 'compact'
export type MobileTabBarBehavior = 'auto-hide' | 'always-show' | 'hidden'

interface EnabledTools {
  dnd5etools: boolean
  dndbeyond: boolean
  roll20: boolean
  foundryvtt: boolean
  koboldplus: boolean
  tabletopaudio: boolean
  fantasynamegen: boolean
  dungeonscrawl: boolean
  thievesguild: boolean
}

interface EnabledGenerators {
  npc: boolean
  monster: boolean
  location: boolean
  item: boolean
  encounter: boolean
  rumor: boolean
  tavern: boolean
  merchant: boolean
  trap: boolean
  critter: boolean
  quest: boolean
  dialogue: boolean
  chase: boolean
}

interface UISettings {
  iconSet: IconSet
  toolbarPosition: ToolbarPosition
  density: UIDensity
  enabledTools: EnabledTools
  enabledGenerators: EnabledGenerators
  campaignActsCount: number
  showCampaignSummary: boolean
  hiddenSections: string[] // IDs of campaign sections to hide in sidebar
  mobileTabBarBehavior: MobileTabBarBehavior
  setIconSet: (iconSet: IconSet) => void
  setToolbarPosition: (position: ToolbarPosition) => void
  setDensity: (density: UIDensity) => void
  setToolEnabled: (tool: keyof EnabledTools, enabled: boolean) => void
  setGeneratorEnabled: (generator: keyof EnabledGenerators, enabled: boolean) => void
  setCampaignActsCount: (count: number) => void
  setShowCampaignSummary: (show: boolean) => void
  setHiddenSections: (sections: string[]) => void
  toggleSectionVisibility: (sectionId: string) => void
  setMobileTabBarBehavior: (behavior: MobileTabBarBehavior) => void
  loadFromBackend: () => Promise<void>
}

export const useUISettingsStore = create<UISettings>()(
  persist(
    (set) => ({
      iconSet: 'lucide',
      toolbarPosition: 'top',
      density: 'comfortable',
      enabledTools: {
        dnd5etools: true,
        dndbeyond: false,
        roll20: false,
        foundryvtt: false,
        koboldplus: true,
        tabletopaudio: false,
        fantasynamegen: true,
        dungeonscrawl: true,
        thievesguild: true,
      },
      enabledGenerators: {
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
      },
      campaignActsCount: 3,
      showCampaignSummary: true, // Enable by default so saved summaries are displayed on page load
      hiddenSections: [], // No sections hidden by default
      mobileTabBarBehavior: 'auto-hide', // Default to auto-hide for best mobile experience
      setIconSet: (iconSet) => set({ iconSet }),
      setToolbarPosition: (position) => set({ toolbarPosition: position }),
      setDensity: (density) => set({ density }),
      setToolEnabled: (tool, enabled) =>
        set((state) => ({
          enabledTools: {
            ...state.enabledTools,
            [tool]: enabled,
          },
        })),
      setGeneratorEnabled: (generator, enabled) =>
        set((state) => ({
          enabledGenerators: {
            ...state.enabledGenerators,
            [generator]: enabled,
          },
        })),
      setCampaignActsCount: (count) => set({ campaignActsCount: count }),
      setShowCampaignSummary: (show) => set({ showCampaignSummary: show }),
      setHiddenSections: (sections) => set({ hiddenSections: sections }),
      toggleSectionVisibility: (sectionId) =>
        set((state) => ({
          hiddenSections: state.hiddenSections.includes(sectionId)
            ? state.hiddenSections.filter((id) => id !== sectionId)
            : [...state.hiddenSections, sectionId],
        })),
      setMobileTabBarBehavior: (behavior) => set({ mobileTabBarBehavior: behavior }),
      loadFromBackend: async () => {
        try {
          const res = await fetch('/api/v1/settings')
          if (!res.ok) return
          const data = await res.json()

          if (data.ui_settings) {
            set({
              iconSet: data.ui_settings.icon_set || 'lucide',
              toolbarPosition: data.ui_settings.toolbar_position || 'top',
              enabledTools: data.ui_settings.enabled_tools || {
                dnd5etools: true,
                dndbeyond: false,
                roll20: false,
                foundryvtt: false,
                koboldplus: true,
                tabletopaudio: false,
                fantasynamegen: true,
                dungeonscrawl: true,
                thievesguild: true,
              },
              enabledGenerators: data.ui_settings.enabled_generators || {
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
              },
              hiddenSections: data.ui_settings.hidden_sections || [],
              mobileTabBarBehavior: data.ui_settings.mobile_tab_bar_behavior || 'auto-hide',
            })
          }
        } catch (error) {
          logger.error('Failed to load UI settings from backend:', error)
        }
      },
    }),
    {
      name: 'tavkit-ui-settings',
    }
  )
)
