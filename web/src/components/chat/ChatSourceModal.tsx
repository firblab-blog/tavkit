import React, { useState, useEffect, useCallback } from 'react'
import Icon from '../common/Icon'
import type { IconName } from '../common/Icon'
import { authFetch } from '@/utils/authFetch'
import { logger } from '@/utils/logger'

export interface ChatSourcePreferences {
  id?: string
  campaign_id: string
  user_id?: string
  include_npcs: boolean
  include_monsters: boolean
  include_locations: boolean
  include_quests: boolean
  include_items: boolean
  include_encounters: boolean
  include_rumors: boolean
  include_taverns: boolean
  include_merchants: boolean
  include_traps: boolean
  include_critters: boolean
  include_chases: boolean
  include_dialogues: boolean
  include_campaign_summary: boolean
  include_wiki_knowledge: boolean
  enabled_wiki_sources?: string[]
  max_context_chunks: number
}

interface SettingPack {
  id: string
  name: string
  slug: string
  game_system: string
  description: string | null
  scrape_status: 'pending' | 'in_progress' | 'completed' | 'failed'
  total_pages: number
  total_chunks: number
  is_active: boolean
}

interface ChatSourceModalProps {
  isOpen: boolean
  onClose: () => void
  campaignId: string
  preferences: ChatSourcePreferences | null
  onSave: (prefs: Partial<ChatSourcePreferences>) => Promise<void>
}

// Content type configuration for campaign content
const CONTENT_TYPE_CONFIG: {
  key: keyof ChatSourcePreferences
  label: string
  icon: IconName
  description: string
}[] = [
  { key: 'include_npcs', label: 'NPCs', icon: 'Users', description: 'Non-player characters' },
  {
    key: 'include_monsters',
    label: 'Monsters',
    icon: 'Skull',
    description: 'Creature stat blocks',
  },
  { key: 'include_locations', label: 'Locations', icon: 'Map', description: 'Places and regions' },
  {
    key: 'include_quests',
    label: 'Quests',
    icon: 'Scroll',
    description: 'Storylines and objectives',
  },
  { key: 'include_items', label: 'Items', icon: 'Package', description: 'Equipment and loot' },
  {
    key: 'include_encounters',
    label: 'Encounters',
    icon: 'Swords',
    description: 'Combat scenarios',
  },
  {
    key: 'include_rumors',
    label: 'Rumors',
    icon: 'MessageSquare',
    description: 'Plot hooks and gossip',
  },
  {
    key: 'include_taverns',
    label: 'Taverns',
    icon: 'Beer',
    description: 'Inns and gathering places',
  },
  { key: 'include_merchants', label: 'Merchants', icon: 'Store', description: 'Shops and traders' },
  {
    key: 'include_traps',
    label: 'Traps',
    icon: 'AlertCircle',
    description: 'Hazards and obstacles',
  },
  {
    key: 'include_critters',
    label: 'Critters',
    icon: 'PawPrint',
    description: 'Wildlife and pets',
  },
  { key: 'include_chases', label: 'Chases', icon: 'Zap', description: 'Chase sequences' },
  {
    key: 'include_dialogues',
    label: 'Dialogues',
    icon: 'MessageCircle',
    description: 'Conversation scripts',
  },
]

export default function ChatSourceModal({
  isOpen,
  onClose,
  campaignId: _campaignId,
  preferences,
  onSave,
}: ChatSourceModalProps) {
  const [formData, setFormData] = useState<Partial<ChatSourcePreferences>>({})
  const [saving, setSaving] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['campaign_content'])
  )
  const [wikiSources, setWikiSources] = useState<SettingPack[]>([])
  const [loadingWikiSources, setLoadingWikiSources] = useState(false)

  // Fetch available wiki sources - show ALL scraped sources regardless of admin settings
  const fetchWikiSources = useCallback(async () => {
    setLoadingWikiSources(true)
    try {
      // Get pack details - show all scraped packs
      const packsRes = await authFetch('/api/v1/admin/rag/packs')
      if (packsRes.ok) {
        const packs = await packsRes.json()
        // Show all packs that have been scraped successfully
        const scrapedPacks = packs.filter(
          (p: SettingPack) => p.scrape_status === 'completed' && p.total_chunks > 0
        )
        setWikiSources(scrapedPacks)
      }
    } catch (err) {
      logger.error('Failed to fetch wiki sources:', err)
    } finally {
      setLoadingWikiSources(false)
    }
  }, [])

  // Initialize form data from preferences
  useEffect(() => {
    if (preferences) {
      // Ensure enabled_wiki_sources is always an array
      setFormData({
        ...preferences,
        enabled_wiki_sources: preferences.enabled_wiki_sources || [],
      })
    } else {
      // Default all to true
      setFormData({
        include_npcs: true,
        include_monsters: true,
        include_locations: true,
        include_quests: true,
        include_items: true,
        include_encounters: true,
        include_rumors: true,
        include_taverns: true,
        include_merchants: true,
        include_traps: true,
        include_critters: true,
        include_chases: true,
        include_dialogues: true,
        include_campaign_summary: true,
        include_wiki_knowledge: true,
        enabled_wiki_sources: [],
        max_context_chunks: 5,
      })
    }
  }, [preferences])

  // Fetch wiki sources when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchWikiSources()
    }
  }, [isOpen, fetchWikiSources])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave(formData)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  // Campaign content helpers
  const campaignContentEnabledCount = CONTENT_TYPE_CONFIG.filter(
    (config) => formData[config.key] === true
  ).length

  const toggleAllCampaignContent = (enabled: boolean) => {
    const updates: Partial<ChatSourcePreferences> = {}
    CONTENT_TYPE_CONFIG.forEach((config) => {
      updates[config.key] = enabled as never
    })
    setFormData({ ...formData, ...updates })
  }

  // Wiki sources helpers - use all scraped sources directly
  const enabledWikiSources = formData.enabled_wiki_sources || []
  const availableWikiSources = wikiSources // All scraped sources are available

  const toggleWikiSource = (slug: string) => {
    const current = formData.enabled_wiki_sources || []
    const updated = current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug]
    setFormData({ ...formData, enabled_wiki_sources: updated })
  }

  const toggleAllWikiSources = (enabled: boolean) => {
    if (enabled) {
      setFormData({
        ...formData,
        enabled_wiki_sources: availableWikiSources.map((s) => s.slug),
        include_wiki_knowledge: true,
      })
    } else {
      setFormData({
        ...formData,
        enabled_wiki_sources: [],
        include_wiki_knowledge: false,
      })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-background-panel border border-border rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
          {/* Header */}
          <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <Icon name="Settings" className="w-6 h-6 text-primary" />
              <div>
                <h2 className="text-xl font-bold text-text">Chat Source Preferences</h2>
                <p className="text-sm text-tavern-mauve mt-1">
                  Choose which content sources to include in AI responses
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-tavern-dark rounded-lg transition-colors"
            >
              <Icon name="X" className="w-5 h-5 text-tavern-mauve" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2">
            {/* Campaign Content Section */}
            <div className="border border-border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('campaign_content')}
                className="w-full flex items-center justify-between p-4 bg-background hover:bg-tavern-dark/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon name="Database" className="w-5 h-5 text-primary" />
                  <span className="font-medium text-text">Campaign Content</span>
                  <span className="text-xs text-tavern-mauve bg-tavern-dark px-2 py-0.5 rounded-full">
                    {campaignContentEnabledCount}/{CONTENT_TYPE_CONFIG.length} enabled
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleAllCampaignContent(true)
                    }}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      campaignContentEnabledCount === CONTENT_TYPE_CONFIG.length
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-tavern-dark text-tavern-mauve hover:text-tavern-light'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleAllCampaignContent(false)
                    }}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      campaignContentEnabledCount === 0
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-tavern-dark text-tavern-mauve hover:text-tavern-light'
                    }`}
                  >
                    None
                  </button>
                  <Icon
                    name={expandedSections.has('campaign_content') ? 'ChevronUp' : 'ChevronDown'}
                    className="w-4 h-4 text-tavern-mauve"
                  />
                </div>
              </button>

              {expandedSections.has('campaign_content') && (
                <div className="border-t border-border bg-background-panel/50 p-4">
                  <p className="text-xs text-tavern-mauve mb-4">
                    Include data from your campaign content in AI responses. Disable sources you
                    don&apos;t want the AI to reference.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {CONTENT_TYPE_CONFIG.map((config) => (
                      <label
                        key={config.key}
                        className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-tavern-dark/30 ${
                          !formData[config.key] ? 'opacity-50' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={(formData[config.key] as boolean) ?? true}
                          onChange={(e) =>
                            setFormData({ ...formData, [config.key]: e.target.checked })
                          }
                          className="mt-1 w-4 h-4 rounded border-border bg-background text-primary focus:ring-primary"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Icon name={config.icon} className="w-4 h-4 text-primary" />
                            <span className="font-medium text-sm text-text">{config.label}</span>
                          </div>
                          <p className="text-xs text-tavern-mauve mt-0.5">{config.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* AI-Generated Summary Section */}
            <div className="border border-border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('ai_summary')}
                className="w-full flex items-center justify-between p-4 bg-background hover:bg-tavern-dark/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon name="Sparkles" className="w-5 h-5 text-primary" />
                  <span className="font-medium text-text">AI-Generated Summary</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      formData.include_campaign_summary
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-tavern-dark text-tavern-mauve'
                    }`}
                  >
                    {formData.include_campaign_summary ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon
                    name={expandedSections.has('ai_summary') ? 'ChevronUp' : 'ChevronDown'}
                    className="w-4 h-4 text-tavern-mauve"
                  />
                </div>
              </button>

              {expandedSections.has('ai_summary') && (
                <div className="border-t border-border bg-background-panel/50 p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.include_campaign_summary ?? true}
                      onChange={(e) =>
                        setFormData({ ...formData, include_campaign_summary: e.target.checked })
                      }
                      className="mt-1 w-4 h-4 rounded border-border bg-background text-primary focus:ring-primary"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-sm text-text">Campaign Summary</span>
                      <p className="text-xs text-tavern-mauve mt-0.5">
                        Include AI-generated campaign summary for context
                      </p>
                    </div>
                  </label>
                </div>
              )}
            </div>

            {/* Wiki Knowledge Base Section */}
            <div className="border border-border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('wiki_knowledge')}
                className="w-full flex items-center justify-between p-4 bg-background hover:bg-tavern-dark/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon name="Globe" className="w-5 h-5 text-primary" />
                  <span className="font-medium text-text">Wiki Knowledge Base</span>
                  <span className="text-xs text-tavern-mauve bg-tavern-dark px-2 py-0.5 rounded-full">
                    {enabledWikiSources.length}/{availableWikiSources.length} sources enabled
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleAllWikiSources(true)
                    }}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      enabledWikiSources.length === availableWikiSources.length &&
                      availableWikiSources.length > 0
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-tavern-dark text-tavern-mauve hover:text-tavern-light'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleAllWikiSources(false)
                    }}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      enabledWikiSources.length === 0
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-tavern-dark text-tavern-mauve hover:text-tavern-light'
                    }`}
                  >
                    None
                  </button>
                  <Icon
                    name={expandedSections.has('wiki_knowledge') ? 'ChevronUp' : 'ChevronDown'}
                    className="w-4 h-4 text-tavern-mauve"
                  />
                </div>
              </button>

              {expandedSections.has('wiki_knowledge') && (
                <div className="border-t border-border bg-background-panel/50 p-4">
                  <p className="text-xs text-tavern-mauve mb-4">
                    Include official D&D setting lore from indexed wiki sources. Disabling sources
                    can significantly speed up responses.
                  </p>

                  {loadingWikiSources ? (
                    <div className="flex items-center justify-center py-4">
                      <Icon name="Loader2" className="w-5 h-5 text-primary animate-spin" />
                    </div>
                  ) : availableWikiSources.length === 0 ? (
                    <p className="text-sm text-tavern-mauve text-center py-4">
                      No wiki sources have been indexed yet. Enable and index wiki sources in
                      Settings.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {availableWikiSources.map((source) => (
                        <label
                          key={source.slug}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-tavern-dark/30 ${
                            !enabledWikiSources.includes(source.slug) ? 'opacity-50' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={enabledWikiSources.includes(source.slug)}
                            onChange={() => toggleWikiSource(source.slug)}
                            className="w-4 h-4 rounded border-border bg-background text-primary focus:ring-primary"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm text-text">{source.name}</span>
                              <span className="text-xs text-tavern-mauve bg-tavern-dark px-1.5 py-0.5 rounded">
                                {source.total_chunks.toLocaleString()} facts
                              </span>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Max Context Chunks slider */}
                  {availableWikiSources.length > 0 && enabledWikiSources.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <label className="block text-sm font-medium text-text mb-2">
                        Max Context Chunks
                      </label>
                      <p className="text-xs text-tavern-mauve mb-2">
                        Number of wiki sections to include. Lower = faster, higher = more context.
                      </p>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={formData.max_context_chunks ?? 5}
                        onChange={(e) =>
                          setFormData({ ...formData, max_context_chunks: parseInt(e.target.value) })
                        }
                        className="w-full accent-primary"
                      />
                      <div className="flex justify-between text-xs text-tavern-mauve mt-1">
                        <span>1 (Fast)</span>
                        <span className="text-primary font-medium">
                          {formData.max_context_chunks ?? 5}
                        </span>
                        <span>10 (Detailed)</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 flex items-center justify-between p-4 border-t border-border bg-background/50">
            <p className="text-xs text-tavern-mauve">
              Disabled sources will not be used in AI responses
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-tavern-mauve hover:text-tavern-light transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Icon name="Loader2" className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Icon name="Check" className="w-4 h-4" />
                    Save Settings
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
