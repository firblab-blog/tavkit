import { useState, useEffect } from 'react'
import Icon from '../common/Icon'
import { useContainerStore } from '../../store/containerStore'
import { useUISettingsStore } from '../../store/uiSettingsStore'
import { logger } from '@/utils/logger'

interface ExternalSite {
  id: string
  name: string
  base_url: string
  login_url?: string
  requires_auth: boolean
}
export default function ContainerLauncher() {
  const [open, setOpen] = useState(false)
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [externalSites, setExternalSites] = useState<ExternalSite[]>([])
  const [customUrl, setCustomUrl] = useState('')
  const [customName, setCustomName] = useState('')
  const [saveForLater, setSaveForLater] = useState(false)
  const [requiresAuth, setRequiresAuth] = useState(false)
  const [currentView, setCurrentView] = useState<'main' | 'ai-toolkit' | 'tavern' | 'external'>(
    'main'
  )
  const openContainer = useContainerStore((s) => s.openContainer)
  const { enabledTools, enabledGenerators, toolbarPosition, density } = useUISettingsStore()
  const isCompact = density === 'compact'

  // Common classes for compact mode
  const buttonClass = `w-full text-left ${isCompact ? 'px-3 py-2' : 'px-4 py-3'} hover:bg-tavern-dark rounded-lg text-tavern-cream transition-colors flex items-center gap-3`
  const iconClass = `${isCompact ? 'w-5 h-5' : 'w-6 h-6'} text-tavern-gold`
  const titleClass = `font-medium ${isCompact ? 'text-sm' : ''}`
  const descClass = `text-xs text-tavern-mauve ${isCompact ? 'text-[10px]' : ''}`
  const categoryButtonClass = `w-full text-left ${isCompact ? 'px-3 py-2' : 'px-4 py-3'} hover:bg-tavern-purple/50 rounded-lg text-tavern-cream transition-colors flex items-center justify-between gap-3 group cursor-pointer`

  // Fetch available external sites
  useEffect(() => {
    if (open) {
      fetch('/api/v1/external-sites')
        .then((res) => res.json())
        .then((data) => setExternalSites(data.sites || []))
        .catch((err) => logger.error('Failed to fetch external sites:', err))
    }
  }, [open])

  const handleCustomSubmit = async () => {
    if (!customUrl || !customName) return

    // Open the container immediately
    openContainer({
      type: 'external',
      tool: 'custom',
      title: customName,
      url: customUrl,
    })

    // If user wants to save it, call admin API
    if (saveForLater) {
      try {
        await fetch('/api/v1/admin/external-sites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            id: customName.toLowerCase().replace(/\s+/g, '-'),
            name: customName,
            base_url: customUrl,
            requires_auth: requiresAuth,
            cookie_domains: requiresAuth ? [new URL(customUrl).hostname] : [],
          }),
        })
        // Refresh the sites list
        const data = await fetch('/api/v1/external-sites', { credentials: 'include' }).then((r) =>
          r.json()
        )
        setExternalSites(data.sites || [])
      } catch (err) {
        logger.error('Failed to save site:', err)
      }
    }

    // Reset form
    setCustomUrl('')
    setCustomName('')
    setSaveForLater(false)
    setRequiresAuth(false)
    setShowCustomModal(false)
    setOpen(false)
  }

  if (!open) {
    return (
      <div className="relative">
        <button
          onClick={() => setOpen(true)}
          className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-tavern-darkest font-medium transition-colors w-full"
        >
          + Add Kit
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <div
        className="fixed inset-0 z-40"
        onClick={() => {
          setOpen(false)
          setCurrentView('main')
        }}
      />
      <div
        className={`absolute ${isCompact ? 'w-72' : 'w-80'} max-w-[calc(100vw-2rem)] bg-background-panel border border-border rounded-lg shadow-2xl z-50 ${
          toolbarPosition === 'bottom'
            ? 'bottom-full mb-2 right-0'
            : toolbarPosition === 'left'
              ? 'left-full ml-2 bottom-0'
              : toolbarPosition === 'right'
                ? 'right-full mr-2 bottom-0'
                : 'top-full mt-2 right-0'
        }`}
      >
        <div
          className={`${isCompact ? 'p-1.5' : 'p-2'} border-b border-border flex items-center gap-2`}
        >
          {currentView !== 'main' && (
            <button
              onClick={() => setCurrentView('main')}
              className="px-2 py-1 hover:bg-tavern-purple rounded transition-colors flex items-center gap-1 text-tavern-light hover:text-tavern-gold"
              title="Back to main menu"
            >
              <Icon name="ChevronLeft" className="w-4 h-4" />
              <span className="text-xs font-medium">Back</span>
            </button>
          )}
          <h3 className={`font-semibold text-tavern-light ${isCompact ? 'text-sm' : ''} flex-1`}>
            {currentView === 'main' && 'Add Kit'}
            {currentView === 'ai-toolkit' && "Artificer's Toolkit"}
            {currentView === 'tavern' && 'Tavern Toolkit'}
            {currentView === 'external' && 'Other Tools'}
          </h3>
        </div>

        <div className={`${isCompact ? 'p-1.5' : 'p-2'} max-h-[calc(80vh-4rem)] overflow-y-auto`}>
          {/* Main Menu */}
          {currentView === 'main' && (
            <>
              {/* Artificer's Toolkit Category */}
              <div onClick={() => setCurrentView('ai-toolkit')} className={categoryButtonClass}>
                <div className="flex items-center gap-3">
                  <Icon name="Sparkles" className={iconClass} />
                  <div>
                    <div className={titleClass}>Artificer&apos;s Toolkit</div>
                    <div className={descClass}>AI-powered generators</div>
                  </div>
                </div>
                <Icon name="ChevronRight" className="w-4 h-4 opacity-50" />
              </div>

              {/* Tavern Toolkit Category */}
              <div onClick={() => setCurrentView('tavern')} className={categoryButtonClass}>
                <div className="flex items-center gap-3">
                  <Icon name="BookMarked" className={iconClass} />
                  <div>
                    <div className={titleClass}>Tavern Toolkit</div>
                    <div className={descClass}>Campaign management tools</div>
                  </div>
                </div>
                <Icon name="ChevronRight" className="w-4 h-4 opacity-50" />
              </div>

              {/* Saved Content */}
              <button
                onClick={() => {
                  openContainer({
                    type: 'internal',
                    tool: 'saved',
                    title: 'Saved Content',
                  })
                  setOpen(false)
                  setCurrentView('main')
                }}
                className={buttonClass}
              >
                <Icon name="BookOpen" className={iconClass} />
                <div>
                  <div className={titleClass}>Saved Content</div>
                  <div className={descClass}>View saved NPCs, monsters, etc.</div>
                </div>
              </button>

              <div className="border-t border-border my-2"></div>

              {/* Other Tools Category */}
              <div onClick={() => setCurrentView('external')} className={categoryButtonClass}>
                <div className="flex items-center gap-3">
                  <Icon name="ExternalLink" className={iconClass} />
                  <div>
                    <div className={titleClass}>Other Tools</div>
                    <div className={descClass}>External D&D resources</div>
                  </div>
                </div>
                <Icon name="ChevronRight" className="w-4 h-4 opacity-50" />
              </div>

              {/* Custom URL */}
              <button
                onClick={() => {
                  setShowCustomModal(true)
                }}
                className={`w-full text-left ${isCompact ? 'px-3 py-2' : 'px-4 py-3'} hover:bg-tavern-dark rounded-lg text-primary transition-colors flex items-center gap-3`}
              >
                <Icon name="Link" className={iconClass} />
                <div>
                  <div className={titleClass}>Custom URL</div>
                  <div className={descClass}>Add your own tool</div>
                </div>
              </button>
            </>
          )}

          {/* Artificer's Toolkit Submenu */}
          {currentView === 'ai-toolkit' && (
            <>
              {enabledGenerators.npc && (
                <button
                  onClick={() => {
                    openContainer({
                      type: 'internal',
                      tool: 'npc',
                      title: 'NPC Generator',
                    })
                    setOpen(false)
                    setCurrentView('main')
                  }}
                  className={buttonClass}
                >
                  <Icon name="Users" className={iconClass} />
                  <div>
                    <div className={titleClass}>NPC Generator</div>
                    <div className={descClass}>Create detailed NPCs with AI</div>
                  </div>
                </button>
              )}

              {enabledGenerators.monster && (
                <button
                  onClick={() => {
                    openContainer({
                      type: 'internal',
                      tool: 'monster',
                      title: 'Monster Generator',
                    })
                    setOpen(false)
                    setCurrentView('main')
                  }}
                  className={buttonClass}
                >
                  <Icon name="Shield" className={iconClass} />
                  <div>
                    <div className={titleClass}>Monster Generator</div>
                    <div className={descClass}>Generate custom monsters</div>
                  </div>
                </button>
              )}

              {enabledGenerators.encounter && (
                <button
                  onClick={() => {
                    openContainer({
                      type: 'internal',
                      tool: 'encounter',
                      title: 'Encounter Builder',
                    })
                    setOpen(false)
                    setCurrentView('main')
                  }}
                  className={buttonClass}
                >
                  <Icon name="Swords" className={iconClass} />
                  <div>
                    <div className={titleClass}>Encounter Builder</div>
                    <div className={descClass}>Build balanced encounters</div>
                  </div>
                </button>
              )}

              {enabledGenerators.dialogue && (
                <button
                  onClick={() => {
                    openContainer({
                      type: 'internal',
                      tool: 'dialogue',
                      title: 'Dialogue Builder',
                    })
                    setOpen(false)
                    setCurrentView('main')
                  }}
                  className={buttonClass}
                >
                  <Icon name="MessageSquare" className={iconClass} />
                  <div>
                    <div className={titleClass}>Dialogue Builder</div>
                    <div className={descClass}>Generate NPC conversations</div>
                  </div>
                </button>
              )}

              {enabledGenerators.location && (
                <button
                  onClick={() => {
                    openContainer({
                      type: 'internal',
                      tool: 'location',
                      title: 'Location Generator',
                    })
                    setOpen(false)
                    setCurrentView('main')
                  }}
                  className={buttonClass}
                >
                  <Icon name="Map" className={iconClass} />
                  <div>
                    <div className={titleClass}>Location Generator</div>
                    <div className={descClass}>Create places and dungeons</div>
                  </div>
                </button>
              )}

              {enabledGenerators.tavern && (
                <button
                  onClick={() => {
                    openContainer({
                      type: 'internal',
                      tool: 'tavern',
                      title: 'Tavern Generator',
                    })
                    setOpen(false)
                    setCurrentView('main')
                  }}
                  className={buttonClass}
                >
                  <Icon name="Beer" className={iconClass} />
                  <div>
                    <div className={titleClass}>Tavern Generator</div>
                    <div className={descClass}>Generate inns and taverns</div>
                  </div>
                </button>
              )}

              {enabledGenerators.merchant && (
                <button
                  onClick={() => {
                    openContainer({
                      type: 'internal',
                      tool: 'merchant',
                      title: 'Merchant Generator',
                    })
                    setOpen(false)
                    setCurrentView('main')
                  }}
                  className={buttonClass}
                >
                  <Icon name="Package" className={iconClass} />
                  <div>
                    <div className={titleClass}>Merchant Generator</div>
                    <div className={descClass}>Generate shops and merchants</div>
                  </div>
                </button>
              )}

              {enabledGenerators.trap && (
                <button
                  onClick={() => {
                    openContainer({
                      type: 'internal',
                      tool: 'trap',
                      title: 'Trap Generator',
                    })
                    setOpen(false)
                    setCurrentView('main')
                  }}
                  className={buttonClass}
                >
                  <Icon name="AlertCircle" className={iconClass} />
                  <div>
                    <div className={titleClass}>Trap Generator</div>
                    <div className={descClass}>Generate traps and puzzles</div>
                  </div>
                </button>
              )}

              {enabledGenerators.critter && (
                <button
                  onClick={() => {
                    openContainer({
                      type: 'internal',
                      tool: 'critter',
                      title: 'Critter Generator',
                    })
                    setOpen(false)
                    setCurrentView('main')
                  }}
                  className={buttonClass}
                >
                  <Icon name="Shield" className={iconClass} />
                  <div>
                    <div className={titleClass}>Critter Generator</div>
                    <div className={descClass}>Generate creatures and companions</div>
                  </div>
                </button>
              )}

              {enabledGenerators.chase && (
                <button
                  onClick={() => {
                    openContainer({
                      type: 'internal',
                      tool: 'chase',
                      title: 'Chase Generator',
                    })
                    setOpen(false)
                    setCurrentView('main')
                  }}
                  className={buttonClass}
                >
                  <Icon name="Sparkles" className={iconClass} />
                  <div>
                    <div className={titleClass}>Chase Generator</div>
                    <div className={descClass}>Generate chase and pursuit scenes</div>
                  </div>
                </button>
              )}

              {enabledGenerators.quest && (
                <button
                  onClick={() => {
                    openContainer({
                      type: 'internal',
                      tool: 'quest',
                      title: 'Quest Generator',
                    })
                    setOpen(false)
                    setCurrentView('main')
                  }}
                  className={buttonClass}
                >
                  <Icon name="Scroll" className={iconClass} />
                  <div>
                    <div className={titleClass}>Quest Generator</div>
                    <div className={descClass}>Generate quest hooks and objectives</div>
                  </div>
                </button>
              )}

              {enabledGenerators.item && (
                <button
                  onClick={() => {
                    openContainer({
                      type: 'internal',
                      tool: 'item',
                      title: 'Item Generator',
                    })
                    setOpen(false)
                    setCurrentView('main')
                  }}
                  className={buttonClass}
                >
                  <Icon name="Package" className={iconClass} />
                  <div>
                    <div className={titleClass}>Item Generator</div>
                    <div className={descClass}>Create magical items and treasure</div>
                  </div>
                </button>
              )}

              {enabledGenerators.rumor && (
                <button
                  onClick={() => {
                    openContainer({
                      type: 'internal',
                      tool: 'rumor',
                      title: 'Rumor Generator',
                    })
                    setOpen(false)
                    setCurrentView('main')
                  }}
                  className={buttonClass}
                >
                  <Icon name="MessageCircle" className={iconClass} />
                  <div>
                    <div className={titleClass}>Rumor Generator</div>
                    <div className={descClass}>Generate tavern rumors and hooks</div>
                  </div>
                </button>
              )}
            </>
          )}

          {/* Tavern Toolkit Submenu */}
          {currentView === 'tavern' && (
            <>
              <button
                onClick={() => {
                  openContainer({
                    type: 'internal',
                    tool: 'campaign',
                    title: 'Campaign Ledger',
                  })
                  setOpen(false)
                  setCurrentView('main')
                }}
                className={buttonClass}
              >
                <Icon name="FolderOpen" className={iconClass} />
                <div>
                  <div className={titleClass}>Campaign Ledger</div>
                  <div className={descClass}>The tavern keeper's chronicle</div>
                </div>
              </button>

              <button
                onClick={() => {
                  openContainer({
                    type: 'internal',
                    tool: 'characters',
                    title: 'Guild Roster',
                  })
                  setOpen(false)
                  setCurrentView('main')
                }}
                className={buttonClass}
              >
                <Icon name="Users" className={iconClass} />
                <div>
                  <div className={titleClass}>Guild Roster</div>
                  <div className={descClass}>Manage your party and characters</div>
                </div>
              </button>

              <button
                onClick={() => {
                  openContainer({
                    type: 'internal',
                    tool: 'session-chat',
                    title: 'Session Chat',
                  })
                  setOpen(false)
                  setCurrentView('main')
                }}
                className={buttonClass}
              >
                <Icon name="MessageSquare" className={iconClass} />
                <div>
                  <div className={titleClass}>Session Chat</div>
                  <div className={descClass}>AI-powered campaign assistant</div>
                </div>
              </button>

              <button
                onClick={() => {
                  openContainer({
                    type: 'internal',
                    tool: 'chase-manager',
                    title: 'Chase Manager',
                  })
                  setOpen(false)
                  setCurrentView('main')
                }}
                className={buttonClass}
              >
                <Icon name="Swords" className={iconClass} />
                <div>
                  <div className={titleClass}>Chase Manager</div>
                  <div className={descClass}>Dynamic chase scene manager</div>
                </div>
              </button>
            </>
          )}

          {/* External Tools Submenu */}
          {currentView === 'external' && (
            <>
              {enabledTools.dnd5etools && (
                <button
                  onClick={() => {
                    openContainer({
                      type: 'external',
                      tool: '5etools',
                      title: '5etools',
                      url: 'https://5e.tools',
                    })
                    setOpen(false)
                    setCurrentView('main')
                  }}
                  className={buttonClass}
                >
                  <Icon name="Book" className={iconClass} />
                  <div>
                    <div className={titleClass}>5etools</div>
                    <div className={descClass}>D&D 5e reference</div>
                  </div>
                </button>
              )}

              {enabledTools.dndbeyond && (
                <button
                  onClick={() => {
                    openContainer({
                      type: 'external',
                      tool: 'dndbeyond',
                      title: 'D&D Beyond',
                      url: 'https://www.dndbeyond.com',
                    })
                    setOpen(false)
                    setCurrentView('main')
                  }}
                  className={buttonClass}
                >
                  <Icon name="Dices" className={iconClass} />
                  <div>
                    <div className={titleClass}>D&D Beyond</div>
                    <div className={descClass}>Official D&D tools and character sheets</div>
                  </div>
                </button>
              )}

              {enabledTools.roll20 && (
                <button
                  onClick={() => {
                    openContainer({
                      type: 'external',
                      tool: 'roll20',
                      title: 'Roll20',
                      url: 'https://roll20.net',
                    })
                    setOpen(false)
                    setCurrentView('main')
                  }}
                  className={buttonClass}
                >
                  <Icon name="Dices" className={iconClass} />
                  <div>
                    <div className={titleClass}>Roll20</div>
                    <div className={descClass}>Virtual tabletop with dice rolling</div>
                  </div>
                </button>
              )}

              {enabledTools.foundryvtt && (
                <button
                  onClick={() => {
                    openContainer({
                      type: 'external',
                      tool: 'foundryvtt',
                      title: 'Foundry VTT',
                      url: 'http://localhost:30000',
                    })
                    setOpen(false)
                    setCurrentView('main')
                  }}
                  className={buttonClass}
                >
                  <Icon name="Globe" className={iconClass} />
                  <div>
                    <div className={titleClass}>Foundry VTT</div>
                    <div className={descClass}>Self-hosted virtual tabletop</div>
                  </div>
                </button>
              )}

              {enabledTools.koboldplus && (
                <button
                  onClick={() => {
                    openContainer({
                      type: 'external',
                      tool: 'koboldplus',
                      title: 'Kobold Plus Club',
                      url: 'https://koboldplus.club',
                    })
                    setOpen(false)
                    setCurrentView('main')
                  }}
                  className={buttonClass}
                >
                  <Icon name="Dices" className={iconClass} />
                  <div>
                    <div className={titleClass}>Kobold Plus Club</div>
                    <div className={descClass}>Encounter builder and CR calculator</div>
                  </div>
                </button>
              )}

              {enabledTools.tabletopaudio && (
                <button
                  onClick={() => {
                    openContainer({
                      type: 'external',
                      tool: 'tabletopaudio',
                      title: 'Tabletop Audio',
                      url: 'https://tabletopaudio.com',
                    })
                    setOpen(false)
                    setCurrentView('main')
                  }}
                  className={buttonClass}
                >
                  <Icon name="Music" className={iconClass} />
                  <div>
                    <div className={titleClass}>Tabletop Audio</div>
                    <div className={descClass}>Ambient sounds and music</div>
                  </div>
                </button>
              )}

              {enabledTools.fantasynamegen && (
                <button
                  onClick={() => {
                    openContainer({
                      type: 'external',
                      tool: 'fantasynamegen',
                      title: 'Fantasy Name Generators',
                      url: 'https://www.fantasynamegenerators.com',
                    })
                    setOpen(false)
                    setCurrentView('main')
                  }}
                  className={buttonClass}
                >
                  <Icon name="FileText" className={iconClass} />
                  <div>
                    <div className={titleClass}>Fantasy Name Generators</div>
                    <div className={descClass}>Random name generators</div>
                  </div>
                </button>
              )}

              {enabledTools.dungeonscrawl && (
                <button
                  onClick={() => {
                    openContainer({
                      type: 'external',
                      tool: 'dungeonscrawl',
                      title: 'Dungeon Scrawl',
                      url: 'https://app.dungeonscrawl.com',
                    })
                    setOpen(false)
                    setCurrentView('main')
                  }}
                  className={buttonClass}
                >
                  <Icon name="Map" className={iconClass} />
                  <div>
                    <div className={titleClass}>Dungeon Scrawl</div>
                    <div className={descClass}>Free dungeon map maker</div>
                  </div>
                </button>
              )}

              {enabledTools.thievesguild && (
                <button
                  onClick={() => {
                    openContainer({
                      type: 'external',
                      tool: 'thievesguild',
                      title: 'Thieves Guild',
                      url: 'https://www.thievesguild.cc',
                    })
                    setOpen(false)
                    setCurrentView('main')
                  }}
                  className={buttonClass}
                >
                  <Icon name="Sparkles" className={iconClass} />
                  <div>
                    <div className={titleClass}>Thieves Guild</div>
                    <div className={descClass}>Random generators for NPCs and more</div>
                  </div>
                </button>
              )}

              {externalSites
                .filter(
                  (site) =>
                    ![
                      '5etools',
                      'dnd5etools',
                      'dndbeyond',
                      'roll20',
                      'foundryvtt',
                      'foundry',
                      'koboldplus',
                      'tabletopaudio',
                      'fantasynamegen',
                      'dungeonscrawl',
                      'thievesguild',
                    ].includes(site.id) &&
                    ![
                      '5etools',
                      'd&d beyond',
                      'roll20',
                      'foundry vtt',
                      'kobold plus club',
                      'koboldplus',
                      'tabletop audio',
                      'fantasy name generators',
                      'dungeon scrawl',
                      'thieves guild',
                    ].includes(site.name.toLowerCase())
                )
                .map((site) => (
                  <button
                    key={site.id}
                    onClick={() => {
                      openContainer({
                        type: 'external',
                        tool: site.id,
                        title: site.name,
                        url: site.base_url,
                      })
                      setOpen(false)
                      setCurrentView('main')
                    }}
                    className={buttonClass}
                  >
                    <Icon name="Globe" className={iconClass} />
                    <div className="flex-1">
                      <div className={`${titleClass} flex items-center gap-2`}>
                        {site.name}
                        {site.requires_auth && (
                          <span className="text-xs px-1.5 py-0.5 bg-tavern-terra/20 text-tavern-terra rounded">
                            Auth
                          </span>
                        )}
                      </div>
                      <div className={descClass}>
                        {site.requires_auth ? 'Login required' : 'No authentication needed'}
                      </div>
                    </div>
                  </button>
                ))}
            </>
          )}
        </div>
      </div>

      {/* Custom URL Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background-panel border border-border rounded-lg shadow-2xl w-full max-w-md mx-4">
            <div className="p-4 border-b border-border">
              <h3 className="text-lg font-semibold text-tavern-light">Add Custom Site</h3>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-tavern-cream mb-1">
                  Site Name
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g., My Campaign Wiki"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-tavern-cream placeholder-tavern-mauve focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-tavern-cream mb-1">URL</label>
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-tavern-cream placeholder-tavern-mauve focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="requiresAuth"
                  checked={requiresAuth}
                  onChange={(e) => setRequiresAuth(e.target.checked)}
                  className="w-4 h-4 rounded border-border bg-background text-primary focus:ring-primary"
                />
                <label htmlFor="requiresAuth" className="text-sm text-tavern-cream">
                  Site requires login (will proxy cookies)
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="saveForLater"
                  checked={saveForLater}
                  onChange={(e) => setSaveForLater(e.target.checked)}
                  className="w-4 h-4 rounded border-border bg-background text-primary focus:ring-primary"
                />
                <label htmlFor="saveForLater" className="text-sm text-tavern-cream">
                  Save for everyone to use
                </label>
              </div>
            </div>

            <div className="p-4 border-t border-border flex gap-3">
              <button
                onClick={() => {
                  setShowCustomModal(false)
                  setCustomUrl('')
                  setCustomName('')
                  setSaveForLater(false)
                  setRequiresAuth(false)
                }}
                className="flex-1 px-4 py-2 bg-tavern-dark hover:bg-tavern-purple text-tavern-cream rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCustomSubmit}
                disabled={!customUrl || !customName}
                className="flex-1 px-4 py-2 bg-primary hover:bg-primary-dark disabled:bg-tavern-dark disabled:text-tavern-mauve text-tavern-darkest rounded-lg transition-colors"
              >
                Add Site
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
