import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { logger } from '../utils/logger'
import { authFetch } from '../utils/authFetch'

export interface SectionSummary {
  section: string
  summary: string
  last_updated?: string
}

export interface CampaignSummary {
  id: string
  campaign_id: string
  user_id: string
  overview?: string
  setting_summary?: string
  characters_summary?: string
  plot_summary?: string
  tone_summary?: string
  content_stats?: {
    npcs: number
    locations: number
    quests: number
    monsters: number
    items: number
    encounters: number
    rumors: number
    campaign_content: number
  }
  section_summaries?: SectionSummary[]
  version: number
  created_at: string
  updated_at: string
}

export interface CampaignFaction {
  name: string
  description?: string
  alignment?: string
  goals?: string[]
  allies?: string[]
  enemies?: string[]
}

export interface CampaignSetting {
  name?: string
  description?: string
  world?: string
  region?: string
  locations?: string[]
}

export interface Campaign {
  id: string
  name: string
  description?: string
  game_system: string
  theme?: string
  tone?: string
  setting?: CampaignSetting | string
  factions?: CampaignFaction[]
  history?: string
  magic_level?: string
  tech_level?: string
  notes?: string
  is_active: boolean
  created_at: string
  updated_at: string
  summary?: CampaignSummary
}

export interface CampaignContent {
  id: string
  campaign_id: string
  user_id: string
  section: string
  subsection: string | null
  title: string
  content: string
  type: 'manual' | 'imported'
  file_name?: string
  created_at: string
  updated_at: string
  // Full character data for PCs section (allows using CharacterSheet component)
  characterData?: any
}

export interface CampaignCharacterLink {
  id: string
  campaign_id: string
  character_id: string
  character_name?: string
  character_class?: string
  character_level?: number
  created_at?: string
}

export interface Activity {
  id: string
  type:
    | 'npc'
    | 'monster'
    | 'location'
    | 'tavern'
    | 'chase'
    | 'session'
    | 'quest'
    | 'item'
    | 'encounter'
    | 'dialogue'
    | 'rumor'
    | 'merchant'
    | 'trap'
    | 'critter'
  action: string
  name: string
  created_at: string
  content_id: string
}

// Base interface for campaign-linked content (NPCs, monsters, items, etc.)
interface CampaignLinkedContent {
  id: string
  campaign_id: string
  name?: string
  title?: string // Some types use title instead of name
  character_name?: string // Dialogues use this
  text?: string // Rumors use this
  created_at: string
}

interface CampaignState {
  campaigns: Campaign[]
  activeCampaignId: string | null
  loading: boolean
  error: string | null
  lastFetchTime: number | null
  recentActivity: Activity[]
  activityLoading: boolean

  // UI state for triggering create modal from outside Campaign Ledger
  shouldOpenCreateModal: boolean
  setShouldOpenCreateModal: (value: boolean) => void

  // Actions
  fetchCampaigns: () => Promise<void>
  setCampaigns: (campaigns: Campaign[]) => void
  addCampaign: (campaign: Omit<Campaign, 'id' | 'created_at' | 'updated_at'>) => Promise<Campaign>
  updateCampaign: (id: string, updates: Partial<Campaign>) => Promise<void>
  deleteCampaign: (id: string) => Promise<void>
  setActiveCampaign: (id: string | null) => Promise<void>
  getActiveCampaign: () => Campaign | null
  getCampaignById: (id: string) => Campaign | null

  // Activity tracking
  fetchRecentActivity: (campaignId: string) => Promise<void>
  clearActivity: () => void

  // Content management
  fetchCampaignContent: (
    campaignId: string,
    section: string,
    subsection?: string | null
  ) => Promise<CampaignContent[]>
  createCampaignContent: (
    campaignId: string,
    content: Omit<CampaignContent, 'id' | 'campaign_id' | 'user_id' | 'created_at' | 'updated_at'>
  ) => Promise<CampaignContent>
  updateCampaignContent: (
    campaignId: string,
    contentId: string,
    updates: { title: string; content: string }
  ) => Promise<void>
  deleteCampaignContent: (campaignId: string, contentId: string) => Promise<void>

  // Campaign character linking (many-to-many)
  fetchCampaignCharacters: (campaignId: string) => Promise<CampaignCharacterLink[]>
  linkCharacterToCampaign: (campaignId: string, characterId: string) => Promise<void>
  unlinkCharacterFromCampaign: (campaignId: string, characterId: string) => Promise<void>
}

// Use relative path for API calls (nginx proxy) or environment variable
const API_URL = import.meta.env.VITE_API_URL || ''

// Debounce time in milliseconds - prevent fetching more than once per 2 seconds
const FETCH_DEBOUNCE_MS = 2000

export const useCampaignStore = create<CampaignState>()(
  persist(
    (set, get) => ({
      campaigns: [],
      activeCampaignId: null,
      loading: false,
      error: null,
      lastFetchTime: null,
      shouldOpenCreateModal: false,
      setShouldOpenCreateModal: (value) => set({ shouldOpenCreateModal: value }),
      recentActivity: [],
      activityLoading: false,

      // Fetch campaigns from backend
      fetchCampaigns: async () => {
        // Debounce: if we fetched recently, skip this call
        const now = Date.now()
        const lastFetch = get().lastFetchTime
        if (lastFetch && now - lastFetch < FETCH_DEBOUNCE_MS) {
          logger.debug('[campaignStore] Skipping fetchCampaigns - called too soon after last fetch')
          return
        }

        // Prevent concurrent fetches
        if (get().loading) {
          logger.debug('[campaignStore] Skipping fetchCampaigns - already loading')
          return
        }

        set({ loading: true, error: null, lastFetchTime: now })
        try {
          logger.debug('[campaignStore] fetchCampaigns - using cookie auth')

          const response = await authFetch(`${API_URL}/api/v1/campaigns`)

          if (!response.ok) {
            if (response.status === 401) {
              set({ loading: false, error: 'Not authenticated' })
              return
            }
            throw new Error('Failed to fetch campaigns')
          }

          const data = await response.json()
          const campaigns = data.campaigns || []

          // Fetch summaries for each campaign with delay to avoid rate limiting
          const campaignsWithSummaries = []
          for (const campaign of campaigns) {
            try {
              const summaryResponse = await authFetch(
                `${API_URL}/api/v1/campaigns/${campaign.id}/summary`
              )
              if (summaryResponse.ok) {
                const summaryData = await summaryResponse.json()
                campaignsWithSummaries.push({ ...campaign, summary: summaryData.summary })
              } else {
                campaignsWithSummaries.push(campaign)
              }
              // Add small delay between requests to avoid rate limiting
              if (campaigns.length > 1) {
                await new Promise((resolve) => setTimeout(resolve, 100))
              }
            } catch (err) {
              logger.warn(`Failed to fetch summary for campaign ${campaign.id}:`, err)
              campaignsWithSummaries.push(campaign)
            }
          }

          // Find the active campaign
          const activeCampaign = campaignsWithSummaries.find((c: Campaign) => c.is_active)

          set({
            campaigns: campaignsWithSummaries,
            activeCampaignId: activeCampaign?.id || null,
            loading: false,
          })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            loading: false,
          })
        }
      },

      setCampaigns: (campaigns) => set({ campaigns }),

      // Create campaign on backend
      addCampaign: async (campaignData) => {
        set({ loading: true, error: null })
        try {
          logger.debug('[campaignStore] addCampaign - data:', campaignData)

          const response = await authFetch(`${API_URL}/api/v1/campaigns`, {
            method: 'POST',
            body: JSON.stringify(campaignData),
          })

          if (!response.ok) {
            throw new Error('Failed to create campaign')
          }

          const campaign = await response.json()

          logger.debug('[campaignStore] Backend response after creation:', campaign)
          logger.debug('[campaignStore] Campaign name from backend:', campaign.name)

          set((state) => ({
            campaigns: [...state.campaigns, campaign],
            activeCampaignId: campaign.is_active ? campaign.id : state.activeCampaignId,
            loading: false,
          }))

          logger.debug('[campaignStore] Updated campaigns array:', get().campaigns)

          return campaign
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            loading: false,
          })
          throw error
        }
      },

      // Update campaign on backend
      updateCampaign: async (id, updates) => {
        set({ loading: true, error: null })
        try {
          const response = await authFetch(`${API_URL}/api/v1/campaigns/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
          })

          if (!response.ok) {
            throw new Error('Failed to update campaign')
          }

          set((state) => ({
            campaigns: state.campaigns.map((c) => (c.id === id ? { ...c, ...updates } : c)),
            activeCampaignId: updates.is_active ? id : state.activeCampaignId,
            loading: false,
          }))
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            loading: false,
          })
          throw error
        }
      },

      // Delete campaign from backend
      deleteCampaign: async (id) => {
        set({ loading: true, error: null })
        try {
          const response = await authFetch(`${API_URL}/api/v1/campaigns/${id}`, {
            method: 'DELETE',
          })

          if (!response.ok) {
            throw new Error('Failed to delete campaign')
          }

          set((state) => ({
            campaigns: state.campaigns.filter((c) => c.id !== id),
            activeCampaignId: state.activeCampaignId === id ? null : state.activeCampaignId,
            loading: false,
          }))
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            loading: false,
          })
          throw error
        }
      },

      // Set active campaign on backend
      setActiveCampaign: async (id) => {
        if (!id) {
          set({ activeCampaignId: null })
          return
        }

        set({ loading: true, error: null })
        try {
          const response = await authFetch(`${API_URL}/api/v1/campaigns/${id}/activate`, {
            method: 'PUT',
          })

          if (!response.ok) {
            throw new Error('Failed to activate campaign')
          }

          set((state) => ({
            campaigns: state.campaigns.map((c) => ({
              ...c,
              is_active: c.id === id,
            })),
            activeCampaignId: id,
            loading: false,
          }))
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            loading: false,
          })
          throw error
        }
      },

      getActiveCampaign: () => {
        const state = get()
        if (!state.activeCampaignId) return null
        return state.campaigns.find((c) => c.id === state.activeCampaignId) || null
      },

      getCampaignById: (id) => {
        const state = get()
        return state.campaigns.find((c) => c.id === id) || null
      },

      // Fetch recent activity for campaign
      fetchRecentActivity: async (campaignId) => {
        // Skip if already loading (deduplication)
        if (get().activityLoading) {
          logger.debug('[campaignStore] fetchRecentActivity skipped - already loading')
          return
        }

        set({ activityLoading: true })
        try {
          // Fetch all content types and build activity from them
          const [
            npcs,
            monsters,
            locations,
            items,
            quests,
            encounters,
            taverns,
            merchants,
            traps,
            critters,
            chases,
            dialogues,
            rumors,
          ] = await Promise.all([
            authFetch(`${API_URL}/api/v1/npcs`).then((r) => (r.ok ? r.json() : [])),
            authFetch(`${API_URL}/api/v1/monsters`).then((r) =>
              r.ok ? r.json() : { monsters: [] }
            ),
            authFetch(`${API_URL}/api/v1/locations`).then((r) => (r.ok ? r.json() : [])),
            authFetch(`${API_URL}/api/v1/items`).then((r) => (r.ok ? r.json() : [])),
            authFetch(`${API_URL}/api/v1/quests`).then((r) => (r.ok ? r.json() : [])),
            authFetch(`${API_URL}/api/v1/encounters`).then((r) =>
              r.ok ? r.json() : { encounters: [] }
            ),
            authFetch(`${API_URL}/api/v1/taverns`).then((r) => (r.ok ? r.json() : [])),
            authFetch(`${API_URL}/api/v1/merchants`).then((r) => (r.ok ? r.json() : [])),
            authFetch(`${API_URL}/api/v1/traps`).then((r) => (r.ok ? r.json() : [])),
            authFetch(`${API_URL}/api/v1/critters`).then((r) => (r.ok ? r.json() : [])),
            authFetch(`${API_URL}/api/v1/chases`).then((r) => (r.ok ? r.json() : [])),
            authFetch(`${API_URL}/api/v1/dialogues`).then((r) => (r.ok ? r.json() : [])),
            authFetch(`${API_URL}/api/v1/rumors`).then((r) => (r.ok ? r.json() : [])),
          ])

          logger.debug('fetchRecentActivity - Raw API responses:', {
            npcsCount: Array.isArray(npcs) ? npcs.length : 0,
            monstersCount: monsters.monsters?.length || 0,
            locationsCount: Array.isArray(locations) ? locations.length : 0,
            itemsCount: Array.isArray(items) ? items.length : 0,
            questsCount: Array.isArray(quests) ? quests.length : 0,
            encountersCount: encounters.encounters?.length || 0,
            tavernsCount: Array.isArray(taverns) ? taverns.length : 0,
            merchantsCount: Array.isArray(merchants) ? merchants.length : 0,
            trapsCount: Array.isArray(traps) ? traps.length : 0,
            crittersCount: Array.isArray(critters) ? critters.length : 0,
            chasesCount: Array.isArray(chases) ? chases.length : 0,
            dialoguesCount: dialogues.dialogues?.length || 0,
            rumorsCount: Array.isArray(rumors) ? rumors.length : 0,
            campaignId,
          })

          const activity: Activity[] = []

          // Convert NPCs to activity
          const npcList = Array.isArray(npcs) ? npcs : []
          logger.debug('[campaignStore] Filtering NPCs:', {
            total: npcList.length,
            campaignId,
            filtered: npcList.filter((n: { campaign_id: string }) => n.campaign_id === campaignId)
              .length,
          })
          npcList
            .filter((n: CampaignLinkedContent) => n.campaign_id === campaignId)
            .forEach((n: CampaignLinkedContent) => {
              activity.push({
                id: n.id,
                type: 'npc',
                action: 'created',
                name: n.name || 'Unnamed NPC',
                created_at: n.created_at,
                content_id: n.id,
              })
            })

          // Convert Monsters
          const monsterList = monsters.monsters || []
          monsterList
            .filter((m: CampaignLinkedContent) => m.campaign_id === campaignId)
            .forEach((m: CampaignLinkedContent) => {
              activity.push({
                id: m.id,
                type: 'monster',
                action: 'created',
                name: m.name || 'Unnamed Monster',
                created_at: m.created_at,
                content_id: m.id,
              })
            })

          // Convert Locations
          const locationList = Array.isArray(locations) ? locations : []
          locationList
            .filter((l: CampaignLinkedContent) => l.campaign_id === campaignId)
            .forEach((l: CampaignLinkedContent) => {
              activity.push({
                id: l.id,
                type: 'location',
                action: 'created',
                name: l.name || 'Unnamed Location',
                created_at: l.created_at,
                content_id: l.id,
              })
            })

          // Convert Items
          const itemList = Array.isArray(items) ? items : []
          itemList
            .filter((i: CampaignLinkedContent) => i.campaign_id === campaignId)
            .forEach((i: CampaignLinkedContent) => {
              activity.push({
                id: i.id,
                type: 'item',
                action: 'created',
                name: i.name || 'Unnamed Item',
                created_at: i.created_at,
                content_id: i.id,
              })
            })

          // Convert Quests
          const questList = Array.isArray(quests) ? quests : []
          questList
            .filter((q: CampaignLinkedContent) => q.campaign_id === campaignId)
            .forEach((q: CampaignLinkedContent) => {
              activity.push({
                id: q.id,
                type: 'quest',
                action: 'created',
                name: q.title || q.name || 'Untitled Quest',
                created_at: q.created_at,
                content_id: q.id,
              })
            })

          // Convert Encounters
          const encounterList = encounters.encounters || []
          encounterList
            .filter((e: CampaignLinkedContent) => e.campaign_id === campaignId)
            .forEach((e: CampaignLinkedContent) => {
              activity.push({
                id: e.id,
                type: 'encounter',
                action: 'created',
                name: e.name || 'Unnamed Encounter',
                created_at: e.created_at,
                content_id: e.id,
              })
            })

          // Convert Taverns
          const tavernList = Array.isArray(taverns) ? taverns : []
          tavernList
            .filter((t: CampaignLinkedContent) => t.campaign_id === campaignId)
            .forEach((t: CampaignLinkedContent) => {
              activity.push({
                id: t.id,
                type: 'tavern',
                action: 'created',
                name: t.name || 'Unnamed Tavern',
                created_at: t.created_at,
                content_id: t.id,
              })
            })

          // Convert Merchants
          const merchantList = Array.isArray(merchants) ? merchants : []
          merchantList
            .filter((m: CampaignLinkedContent) => m.campaign_id === campaignId)
            .forEach((m: CampaignLinkedContent) => {
              activity.push({
                id: m.id,
                type: 'merchant',
                action: 'created',
                name: m.name || 'Unnamed Merchant',
                created_at: m.created_at,
                content_id: m.id,
              })
            })

          // Convert Traps
          const trapList = Array.isArray(traps) ? traps : []
          trapList
            .filter((t: CampaignLinkedContent) => t.campaign_id === campaignId)
            .forEach((t: CampaignLinkedContent) => {
              activity.push({
                id: t.id,
                type: 'trap',
                action: 'created',
                name: t.name || 'Unnamed Trap',
                created_at: t.created_at,
                content_id: t.id,
              })
            })

          // Convert Critters
          const critterList = Array.isArray(critters) ? critters : []
          critterList
            .filter((c: CampaignLinkedContent) => c.campaign_id === campaignId)
            .forEach((c: CampaignLinkedContent) => {
              activity.push({
                id: c.id,
                type: 'critter',
                action: 'created',
                name: c.name || 'Unnamed Critter',
                created_at: c.created_at,
                content_id: c.id,
              })
            })

          // Convert Chases
          const chaseList = Array.isArray(chases) ? chases : []
          chaseList
            .filter((c: CampaignLinkedContent) => c.campaign_id === campaignId)
            .forEach((c: CampaignLinkedContent) => {
              activity.push({
                id: c.id,
                type: 'chase',
                action: 'created',
                name: c.name || 'Unnamed Chase',
                created_at: c.created_at,
                content_id: c.id,
              })
            })

          // Convert Dialogues
          const dialogueList = dialogues.dialogues || []
          dialogueList
            .filter((d: CampaignLinkedContent) => d.campaign_id === campaignId)
            .forEach((d: CampaignLinkedContent) => {
              activity.push({
                id: d.id,
                type: 'dialogue',
                action: 'created',
                name: d.character_name || d.name || 'Unknown Character',
                created_at: d.created_at,
                content_id: d.id,
              })
            })

          // Convert Rumors
          const rumorList = Array.isArray(rumors) ? rumors : []
          rumorList
            .filter((r: CampaignLinkedContent) => r.campaign_id === campaignId)
            .forEach((r: CampaignLinkedContent) => {
              // Rumors have 'text' field, truncate it for display
              const rumorText = r.text || r.name || 'Unknown Rumor'
              const truncatedText =
                rumorText.length > 40 ? rumorText.substring(0, 40) + '...' : rumorText
              activity.push({
                id: r.id,
                type: 'rumor',
                action: 'created',
                name: truncatedText,
                created_at: r.created_at,
                content_id: r.id,
              })
            })

          // Sort by most recent first
          activity.sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )

          logger.debug('Activity feed populated:', {
            campaignId,
            activityCount: activity.length,
          })
          set({ recentActivity: activity, activityLoading: false })
        } catch (error) {
          logger.error('Failed to fetch recent activity:', error)
          set({ recentActivity: [], activityLoading: false })
        }
      },

      clearActivity: () => set({ recentActivity: [] }),

      // Fetch campaign content
      fetchCampaignContent: async (campaignId, section, subsection = null) => {
        try {
          let url = `${API_URL}/api/v1/campaigns/${campaignId}/content?section=${encodeURIComponent(section)}`
          if (subsection) {
            url += `&subsection=${encodeURIComponent(subsection)}`
          }

          const response = await authFetch(url)

          if (!response.ok) {
            throw new Error('Failed to fetch content')
          }

          const data = await response.json()
          return data.content || []
        } catch (error) {
          logger.error('Failed to fetch campaign content:', error)
          throw error
        }
      },

      // Create campaign content
      createCampaignContent: async (campaignId, contentData) => {
        try {
          const response = await authFetch(`${API_URL}/api/v1/campaigns/${campaignId}/content`, {
            method: 'POST',
            body: JSON.stringify(contentData),
          })

          if (!response.ok) {
            throw new Error('Failed to create content')
          }

          return await response.json()
        } catch (error) {
          logger.error('Failed to create campaign content:', error)
          throw error
        }
      },

      // Update campaign content
      updateCampaignContent: async (campaignId, contentId, updates) => {
        try {
          const response = await authFetch(
            `${API_URL}/api/v1/campaigns/${campaignId}/content/${contentId}`,
            {
              method: 'PUT',
              body: JSON.stringify(updates),
            }
          )

          if (!response.ok) {
            throw new Error('Failed to update content')
          }
        } catch (error) {
          logger.error('Failed to update campaign content:', error)
          throw error
        }
      },

      // Delete campaign content
      deleteCampaignContent: async (campaignId, contentId) => {
        try {
          const response = await authFetch(
            `${API_URL}/api/v1/campaigns/${campaignId}/content/${contentId}`,
            {
              method: 'DELETE',
            }
          )

          if (!response.ok) {
            throw new Error('Failed to delete content')
          }
        } catch (error) {
          logger.error('Failed to delete campaign content:', error)
          throw error
        }
      },

      // Fetch campaign characters (linked via many-to-many)
      fetchCampaignCharacters: async (campaignId) => {
        try {
          const response = await authFetch(`${API_URL}/api/v1/campaigns/${campaignId}/characters`)

          if (!response.ok) {
            throw new Error('Failed to fetch campaign characters')
          }

          const data = await response.json()
          return data.characters || []
        } catch (error) {
          logger.error('Failed to fetch campaign characters:', error)
          throw error
        }
      },

      // Link character to campaign
      linkCharacterToCampaign: async (campaignId, characterId) => {
        try {
          const response = await authFetch(
            `${API_URL}/api/v1/campaigns/${campaignId}/characters/${characterId}`,
            {
              method: 'POST',
            }
          )

          if (!response.ok) {
            throw new Error('Failed to link character to campaign')
          }
        } catch (error) {
          logger.error('Failed to link character to campaign:', error)
          throw error
        }
      },

      // Unlink character from campaign
      unlinkCharacterFromCampaign: async (campaignId, characterId) => {
        try {
          const response = await authFetch(
            `${API_URL}/api/v1/campaigns/${campaignId}/characters/${characterId}`,
            {
              method: 'DELETE',
            }
          )

          if (!response.ok) {
            throw new Error('Failed to unlink character from campaign')
          }
        } catch (error) {
          logger.error('Failed to unlink character from campaign:', error)
          throw error
        }
      },
    }),
    {
      name: 'campaign-storage',
      // Only persist the activeCampaignId, fetch campaigns from server on load
      partialize: (state) => ({ activeCampaignId: state.activeCampaignId }),
    }
  )
)
