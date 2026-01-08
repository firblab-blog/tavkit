import { useState, useEffect } from 'react'
import { useContainerStore } from '../../store/containerStore'
import { useCampaignStore } from '../../store/campaignStore'
import { useAuthStore } from '../../store/authStore'
import Icon from '../common/Icon'
import { getApiUrl } from '../../config/api'
import { logger } from '@/utils/logger'
import { authFetch } from '@/utils/authFetch'

interface QuickStats {
  totalCampaigns: number
  totalNPCs: number
  totalMonsters: number
  totalLocations: number
  totalQuests: number
  totalItems: number
  totalEncounters: number
  totalDialogues: number
  totalRumors: number
  totalTaverns: number
  totalMerchants: number
  totalTraps: number
  totalCritters: number
}

export default function Home() {
  const { openContainer } = useContainerStore()
  const { campaigns, fetchCampaigns } = useCampaignStore()
  const { user } = useAuthStore()
  const [stats, setStats] = useState<QuickStats>({
    totalCampaigns: 0,
    totalNPCs: 0,
    totalMonsters: 0,
    totalLocations: 0,
    totalQuests: 0,
    totalItems: 0,
    totalEncounters: 0,
    totalDialogues: 0,
    totalRumors: 0,
    totalTaverns: 0,
    totalMerchants: 0,
    totalTraps: 0,
    totalCritters: 0,
  })

  useEffect(() => {
    fetchCampaigns()
    loadStats()
  }, [fetchCampaigns])

  // Update stats when campaigns change
  useEffect(() => {
    setStats((prev) => ({ ...prev, totalCampaigns: campaigns.length }))
  }, [campaigns])

  const loadStats = async () => {
    const isAuthenticated = useAuthStore.getState().isAuthenticated
    if (!isAuthenticated) return

    try {
      // Load counts for each content type using cookie-based auth
      const [
        npcs,
        monsters,
        locations,
        quests,
        items,
        encounters,
        dialogues,
        rumors,
        taverns,
        merchants,
        traps,
        critters,
      ] = await Promise.all([
        authFetch(getApiUrl('/npcs')).then((r) => (r.ok ? r.json() : [])),
        authFetch(getApiUrl('/monsters')).then((r) => (r.ok ? r.json() : { monsters: [] })),
        authFetch(getApiUrl('/locations')).then((r) => (r.ok ? r.json() : [])),
        authFetch(getApiUrl('/quests')).then((r) => (r.ok ? r.json() : [])),
        authFetch(getApiUrl('/items')).then((r) => (r.ok ? r.json() : [])),
        authFetch(getApiUrl('/encounters')).then((r) => (r.ok ? r.json() : { encounters: [] })),
        authFetch(getApiUrl('/dialogues')).then((r) => (r.ok ? r.json() : { dialogues: [] })),
        authFetch(getApiUrl('/rumors')).then((r) => (r.ok ? r.json() : [])),
        authFetch(getApiUrl('/taverns')).then((r) => (r.ok ? r.json() : [])),
        authFetch(getApiUrl('/merchants')).then((r) => (r.ok ? r.json() : [])),
        authFetch(getApiUrl('/traps')).then((r) => (r.ok ? r.json() : [])),
        authFetch(getApiUrl('/critters')).then((r) => (r.ok ? r.json() : [])),
      ])

      // Handle different API response formats:
      // Some return arrays directly, others return objects with a key
      const npcCount = Array.isArray(npcs) ? npcs.length : 0
      const monsterCount = monsters.monsters?.length || 0
      const locationCount = Array.isArray(locations) ? locations.length : 0
      const questCount = Array.isArray(quests) ? quests.length : 0
      const itemCount = Array.isArray(items) ? items.length : 0
      const encounterCount = encounters.encounters?.length || 0
      const dialogueCount = dialogues.dialogues?.length || 0
      const rumorCount = Array.isArray(rumors) ? rumors.length : 0
      const tavernCount = Array.isArray(taverns) ? taverns.length : 0
      const merchantCount = Array.isArray(merchants) ? merchants.length : 0
      const trapCount = Array.isArray(traps) ? traps.length : 0
      const critterCount = Array.isArray(critters) ? critters.length : 0

      logger.debug('[Home] Stats loaded:', {
        npcs: npcCount,
        monsters: monsterCount,
        locations: locationCount,
        quests: questCount,
        items: itemCount,
        encounters: encounterCount,
        dialogues: dialogueCount,
        rumors: rumorCount,
        taverns: tavernCount,
        merchants: merchantCount,
        traps: trapCount,
        critters: critterCount,
      })

      setStats({
        totalCampaigns: campaigns.length,
        totalNPCs: npcCount,
        totalMonsters: monsterCount,
        totalLocations: locationCount,
        totalQuests: questCount,
        totalItems: itemCount,
        totalEncounters: encounterCount,
        totalDialogues: dialogueCount,
        totalRumors: rumorCount,
        totalTaverns: tavernCount,
        totalMerchants: merchantCount,
        totalTraps: trapCount,
        totalCritters: critterCount,
      })
    } catch (error) {
      logger.error('Failed to load stats:', error)
    }
  }

  const openTool = (tool: string, title: string) => {
    openContainer({
      type: 'internal',
      tool,
      title,
    })
  }

  return (
    <div className="h-full overflow-y-auto bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-4">
            <img src="/tavkit-logo-master.svg" alt="TavKit Logo" className="w-20 h-20" />
            <h1 className="text-5xl font-bold text-tavern-cream">TavKit</h1>
          </div>
          <p className="text-xl text-tavern-mauve">Build, Track, Play</p>
          {user && <p className="text-tavern-mauve mt-2">Welcome back, {user.username}!</p>}
        </div>

        {/* Quick Stats */}
        <div className="bg-background-panel rounded-lg p-6 border border-border">
          <h2 className="text-2xl font-bold text-tavern-cream mb-4 flex items-center gap-2">
            <Icon name="ListChecks" className="w-6 h-6 text-primary" />
            Your Content
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-tavern-dark rounded-lg">
              <div className="text-3xl font-bold text-primary mb-1">{stats.totalCampaigns}</div>
              <div className="text-sm text-tavern-mauve">Campaigns</div>
            </div>
            <div className="text-center p-4 bg-tavern-dark rounded-lg">
              <div className="text-3xl font-bold text-primary mb-1">{stats.totalNPCs}</div>
              <div className="text-sm text-tavern-mauve">NPCs</div>
            </div>
            <div className="text-center p-4 bg-tavern-dark rounded-lg">
              <div className="text-3xl font-bold text-primary mb-1">{stats.totalMonsters}</div>
              <div className="text-sm text-tavern-mauve">Monsters</div>
            </div>
            <div className="text-center p-4 bg-tavern-dark rounded-lg">
              <div className="text-3xl font-bold text-primary mb-1">{stats.totalLocations}</div>
              <div className="text-sm text-tavern-mauve">Locations</div>
            </div>
            <div className="text-center p-4 bg-tavern-dark rounded-lg">
              <div className="text-3xl font-bold text-primary mb-1">{stats.totalQuests}</div>
              <div className="text-sm text-tavern-mauve">Quests</div>
            </div>
            <div className="text-center p-4 bg-tavern-dark rounded-lg">
              <div className="text-3xl font-bold text-primary mb-1">{stats.totalItems}</div>
              <div className="text-sm text-tavern-mauve">Items</div>
            </div>
            <div className="text-center p-4 bg-tavern-dark rounded-lg">
              <div className="text-3xl font-bold text-primary mb-1">{stats.totalEncounters}</div>
              <div className="text-sm text-tavern-mauve">Encounters</div>
            </div>
            <div className="text-center p-4 bg-tavern-dark rounded-lg">
              <div className="text-3xl font-bold text-primary mb-1">{stats.totalDialogues}</div>
              <div className="text-sm text-tavern-mauve">Dialogues</div>
            </div>
            <div className="text-center p-4 bg-tavern-dark rounded-lg">
              <div className="text-3xl font-bold text-primary mb-1">{stats.totalRumors}</div>
              <div className="text-sm text-tavern-mauve">Rumors</div>
            </div>
            <div className="text-center p-4 bg-tavern-dark rounded-lg">
              <div className="text-3xl font-bold text-primary mb-1">{stats.totalTaverns}</div>
              <div className="text-sm text-tavern-mauve">Taverns</div>
            </div>
            <div className="text-center p-4 bg-tavern-dark rounded-lg">
              <div className="text-3xl font-bold text-primary mb-1">{stats.totalMerchants}</div>
              <div className="text-sm text-tavern-mauve">Merchants</div>
            </div>
            <div className="text-center p-4 bg-tavern-dark rounded-lg">
              <div className="text-3xl font-bold text-primary mb-1">{stats.totalTraps}</div>
              <div className="text-sm text-tavern-mauve">Traps</div>
            </div>
            <div className="text-center p-4 bg-tavern-dark rounded-lg">
              <div className="text-3xl font-bold text-primary mb-1">{stats.totalCritters}</div>
              <div className="text-sm text-tavern-mauve">Critters</div>
            </div>
          </div>
        </div>

        {/* Quick Actions - Generators */}
        <div className="bg-background-panel rounded-lg p-6 border border-border">
          <h2 className="text-2xl font-bold text-tavern-cream mb-4 flex items-center gap-2">
            <Icon name="Sparkles" className="w-6 h-6 text-primary" />
            Artificer's Toolkit
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => openTool('npc', 'NPC Generator')}
              className="p-4 bg-tavern-dark hover:bg-tavern-purple rounded-lg transition-colors text-left group"
            >
              <Icon
                name="Users"
                className="w-8 h-8 text-primary mb-2 group-hover:scale-110 transition-transform"
              />
              <div className="font-bold text-tavern-cream">NPCs</div>
              <div className="text-sm text-tavern-mauve">Generate characters</div>
            </button>
            <button
              onClick={() => openTool('monster', 'Monster Generator')}
              className="p-4 bg-tavern-dark hover:bg-tavern-purple rounded-lg transition-colors text-left group"
            >
              <Icon
                name="Skull"
                className="w-8 h-8 text-primary mb-2 group-hover:scale-110 transition-transform"
              />
              <div className="font-bold text-tavern-cream">Monsters</div>
              <div className="text-sm text-tavern-mauve">Create creatures</div>
            </button>
            <button
              onClick={() => openTool('location', 'Location Generator')}
              className="p-4 bg-tavern-dark hover:bg-tavern-purple rounded-lg transition-colors text-left group"
            >
              <Icon
                name="Map"
                className="w-8 h-8 text-primary mb-2 group-hover:scale-110 transition-transform"
              />
              <div className="font-bold text-tavern-cream">Locations</div>
              <div className="text-sm text-tavern-mauve">Build places</div>
            </button>
            <button
              onClick={() => openTool('quest', 'Quest Generator')}
              className="p-4 bg-tavern-dark hover:bg-tavern-purple rounded-lg transition-colors text-left group"
            >
              <Icon
                name="Scroll"
                className="w-8 h-8 text-primary mb-2 group-hover:scale-110 transition-transform"
              />
              <div className="font-bold text-tavern-cream">Quests</div>
              <div className="text-sm text-tavern-mauve">Design adventures</div>
            </button>
            <button
              onClick={() => openTool('item', 'Item Generator')}
              className="p-4 bg-tavern-dark hover:bg-tavern-purple rounded-lg transition-colors text-left group"
            >
              <Icon
                name="Package"
                className="w-8 h-8 text-primary mb-2 group-hover:scale-110 transition-transform"
              />
              <div className="font-bold text-tavern-cream">Items</div>
              <div className="text-sm text-tavern-mauve">Forge treasures</div>
            </button>
            <button
              onClick={() => openTool('encounter', 'Encounter Builder')}
              className="p-4 bg-tavern-dark hover:bg-tavern-purple rounded-lg transition-colors text-left group"
            >
              <Icon
                name="Swords"
                className="w-8 h-8 text-primary mb-2 group-hover:scale-110 transition-transform"
              />
              <div className="font-bold text-tavern-cream">Encounters</div>
              <div className="text-sm text-tavern-mauve">Plan battles</div>
            </button>
            <button
              onClick={() => openTool('dialogue', 'Dialogue Builder')}
              className="p-4 bg-tavern-dark hover:bg-tavern-purple rounded-lg transition-colors text-left group"
            >
              <Icon
                name="MessageSquare"
                className="w-8 h-8 text-primary mb-2 group-hover:scale-110 transition-transform"
              />
              <div className="font-bold text-tavern-cream">Dialogues</div>
              <div className="text-sm text-tavern-mauve">Write conversations</div>
            </button>
            <button
              onClick={() => openTool('rumor', 'Rumor Generator')}
              className="p-4 bg-tavern-dark hover:bg-tavern-purple rounded-lg transition-colors text-left group"
            >
              <Icon
                name="MessageCircle"
                className="w-8 h-8 text-primary mb-2 group-hover:scale-110 transition-transform"
              />
              <div className="font-bold text-tavern-cream">Rumors</div>
              <div className="text-sm text-tavern-mauve">Spread whispers</div>
            </button>
            <button
              onClick={() => openTool('tavern', 'Tavern Generator')}
              className="p-4 bg-tavern-dark hover:bg-tavern-purple rounded-lg transition-colors text-left group"
            >
              <Icon
                name="Beer"
                className="w-8 h-8 text-primary mb-2 group-hover:scale-110 transition-transform"
              />
              <div className="font-bold text-tavern-cream">Taverns</div>
              <div className="text-sm text-tavern-mauve">Generate establishments</div>
            </button>
            <button
              onClick={() => openTool('merchant', 'Merchant Generator')}
              className="p-4 bg-tavern-dark hover:bg-tavern-purple rounded-lg transition-colors text-left group"
            >
              <Icon
                name="Package"
                className="w-8 h-8 text-primary mb-2 group-hover:scale-110 transition-transform"
              />
              <div className="font-bold text-tavern-cream">Merchants</div>
              <div className="text-sm text-tavern-mauve">Generate shops</div>
            </button>
            <button
              onClick={() => openTool('trap', 'Trap Generator')}
              className="p-4 bg-tavern-dark hover:bg-tavern-purple rounded-lg transition-colors text-left group"
            >
              <Icon
                name="AlertCircle"
                className="w-8 h-8 text-primary mb-2 group-hover:scale-110 transition-transform"
              />
              <div className="font-bold text-tavern-cream">Traps</div>
              <div className="text-sm text-tavern-mauve">Generate traps & puzzles</div>
            </button>
            <button
              onClick={() => openTool('critter', 'Critter Generator')}
              className="p-4 bg-tavern-dark hover:bg-tavern-purple rounded-lg transition-colors text-left group"
            >
              <Icon
                name="Shield"
                className="w-8 h-8 text-primary mb-2 group-hover:scale-110 transition-transform"
              />
              <div className="font-bold text-tavern-cream">Critters</div>
              <div className="text-sm text-tavern-mauve">Generate creatures & companions</div>
            </button>
            <button
              onClick={() => openTool('chase', 'Chase Generator')}
              className="p-4 bg-tavern-dark hover:bg-tavern-purple rounded-lg transition-colors text-left group"
            >
              <Icon
                name="Sparkles"
                className="w-8 h-8 text-primary mb-2 group-hover:scale-110 transition-transform"
              />
              <div className="font-bold text-tavern-cream">Chases</div>
              <div className="text-sm text-tavern-mauve">Generate chase & pursuit scenes</div>
            </button>
          </div>
        </div>

        {/* Campaign & Content Management */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-background-panel rounded-lg p-6 border border-border">
            <h2 className="text-2xl font-bold text-tavern-cream mb-4 flex items-center gap-2">
              <Icon name="BookOpen" className="w-6 h-6 text-primary" />
              Campaign Management
            </h2>
            <button
              onClick={() => openTool('campaign', 'Campaign Ledger')}
              className="w-full p-4 bg-tavern-dark hover:bg-tavern-purple rounded-lg transition-colors text-left group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-tavern-cream mb-1">Campaign Ledger</div>
                  <div className="text-sm text-tavern-mauve">
                    Manage your campaigns and organize all content
                  </div>
                </div>
                <Icon
                  name="ChevronRight"
                  className="w-6 h-6 text-primary group-hover:translate-x-1 transition-transform"
                />
              </div>
            </button>
            {campaigns.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="text-sm text-tavern-mauve font-medium">Recent Campaigns:</div>
                {campaigns.slice(0, 3).map((campaign) => (
                  <div
                    key={campaign.id}
                    className="p-3 bg-tavern-dark rounded-lg border border-border/50"
                  >
                    <div className="font-medium text-tavern-cream">{campaign.name}</div>
                    {campaign.description && (
                      <div className="text-sm text-tavern-mauve mt-1 line-clamp-1">
                        {campaign.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-background-panel rounded-lg p-6 border border-border">
            <h2 className="text-2xl font-bold text-tavern-cream mb-4 flex items-center gap-2">
              <Icon name="Box" className="w-6 h-6 text-primary" />
              Saved Content
            </h2>
            <button
              onClick={() => openTool('saved', 'Saved Content')}
              className="w-full p-4 bg-tavern-dark hover:bg-tavern-purple rounded-lg transition-colors text-left group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-tavern-cream mb-1">View All Saved Content</div>
                  <div className="text-sm text-tavern-mauve">
                    Browse and manage all your generated content
                  </div>
                </div>
                <Icon
                  name="ChevronRight"
                  className="w-6 h-6 text-primary group-hover:translate-x-1 transition-transform"
                />
              </div>
            </button>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="p-3 bg-tavern-dark rounded-lg text-center">
                <div className="text-lg font-bold text-primary">
                  {stats.totalNPCs + stats.totalMonsters + stats.totalLocations}
                </div>
                <div className="text-xs text-tavern-mauve">World Elements</div>
              </div>
              <div className="p-3 bg-tavern-dark rounded-lg text-center">
                <div className="text-lg font-bold text-primary">
                  {stats.totalQuests + stats.totalEncounters + stats.totalDialogues}
                </div>
                <div className="text-xs text-tavern-mauve">Story Elements</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tavern Toolkit - Second Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-background-panel rounded-lg p-6 border border-border">
            <h2 className="text-2xl font-bold text-tavern-cream mb-4 flex items-center gap-2">
              <Icon name="Users" className="w-6 h-6 text-primary" />
              Party Management
            </h2>
            <button
              onClick={() => openTool('characters', 'Guild Roster')}
              className="w-full p-4 bg-tavern-dark hover:bg-tavern-purple rounded-lg transition-colors text-left group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-tavern-cream mb-1">Guild Roster</div>
                  <div className="text-sm text-tavern-mauve">
                    Manage player characters and the party
                  </div>
                </div>
                <Icon
                  name="ChevronRight"
                  className="w-6 h-6 text-primary group-hover:translate-x-1 transition-transform"
                />
              </div>
            </button>
          </div>

          <div className="bg-background-panel rounded-lg p-6 border border-border">
            <h2 className="text-2xl font-bold text-tavern-cream mb-4 flex items-center gap-2">
              <Icon name="Swords" className="w-6 h-6 text-primary" />
              Chase Scenes
            </h2>
            <button
              onClick={() => openTool('chase-manager', 'Chase Manager')}
              className="w-full p-4 bg-tavern-dark hover:bg-tavern-purple rounded-lg transition-colors text-left group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-tavern-cream mb-1">Chase Manager</div>
                  <div className="text-sm text-tavern-mauve">
                    Dynamic chase scene manager with real-time tracking
                  </div>
                </div>
                <Icon
                  name="ChevronRight"
                  className="w-6 h-6 text-primary group-hover:translate-x-1 transition-transform"
                />
              </div>
            </button>
          </div>
        </div>

        {/* Getting Started */}
        {stats.totalCampaigns === 0 && (
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-tavern-cream mb-4 flex items-center gap-2">
              <Icon name="Sparkles" className="w-6 h-6 text-primary" />
              Getting Started
            </h2>
            <div className="space-y-3 text-tavern-mauve">
              <div className="flex items-start gap-3">
                <Icon name="Check" className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-tavern-cream">Create a Campaign:</span> Start by
                  opening the Campaign Ledger and creating your first campaign to organize all your
                  content.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Icon name="Check" className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-tavern-cream">Generate Content:</span> Use the
                  Artificer's Toolkit above to create NPCs, locations, quests, and more for your
                  campaign.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Icon name="Check" className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-tavern-cream">Organize & Browse:</span> All
                  generated content is automatically saved and can be viewed in Saved Content or
                  organized within your campaigns.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Info */}
        <div className="text-center text-tavern-mauve text-sm pb-8">
          <p>
            Click any tool above to open it in a new tab, or use the "+ Add Kit" button in the
            toolbar
          </p>
          <p className="mt-2">Running on {window.location.host}</p>
        </div>
      </div>
    </div>
  )
}
