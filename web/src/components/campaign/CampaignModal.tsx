import React, { useState, useEffect } from 'react'
import Icon from '../common/Icon'
import type { Campaign } from '../../store/campaignStore'
import { logger } from '../../utils/logger'
import { GAME_SYSTEMS } from '../../constants/gameSystems'

interface SettingPack {
  id: string
  name: string
  slug: string
  game_system: string
  description: string | null
  scrape_status: string
  total_pages: number
  total_chunks: number
  is_active: boolean
}

interface CampaignModalProps {
  campaign: Campaign | null
  onClose: () => void
  onSave: (data: Partial<Campaign>) => Promise<void>
}

export default function CampaignModal({ campaign, onClose, onSave }: CampaignModalProps) {
  // For new campaigns, default to 'owner' (GM). For existing campaigns, use their role.
  const [selectedRole, setSelectedRole] = useState<'owner' | 'player'>(
    campaign?.role === 'player' ? 'player' : 'owner'
  )
  const [formData, setFormData] = useState<Partial<Campaign>>({
    name: campaign?.name || '',
    description: campaign?.description || '',
    game_system: campaign?.game_system || '',
    theme: campaign?.theme || '',
    tone: campaign?.tone || '',
    magic_level: campaign?.magic_level || '',
    tech_level: campaign?.tech_level || '',
    history: campaign?.history || '',
    notes: campaign?.notes || '',
    role: campaign?.role || 'owner',
  })
  const [saving, setSaving] = useState(false)

  // Setting knowledge pack state
  const [settingPacks, setSettingPacks] = useState<SettingPack[]>([])
  const [selectedSettingSlug, setSelectedSettingSlug] = useState<string>('')
  const [loadingPacks, setLoadingPacks] = useState(false)

  // Fetch available setting packs on mount
  useEffect(() => {
    const fetchSettingPacks = async () => {
      setLoadingPacks(true)
      try {
        // Try to fetch from the AI service RAG endpoint
        const response = await fetch('/api/v1/rag/settings')
        if (response.ok) {
          const packs = await response.json()
          setSettingPacks(packs)
        } else if (response.status === 404) {
          // RAG feature not available yet - that's ok
          setSettingPacks([])
        } else {
          logger.warn('Failed to fetch setting packs:', response.status)
        }
      } catch (error) {
        // RAG service might not be running
        logger.warn('Setting packs not available:', error)
      } finally {
        setLoadingPacks(false)
      }
    }

    fetchSettingPacks()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({ ...formData, role: selectedRole })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-background-panel border border-border rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="sticky top-0 bg-background-panel border-b border-border p-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-text flex items-center gap-2">
              <Icon name="BookMarked" className="w-6 h-6 text-primary" />
              {campaign ? 'Edit Campaign' : 'Create New Campaign'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-tavern-mauve hover:text-text transition-colors"
            >
              <Icon name="X" className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Role Selector - only show for new campaigns */}
            {!campaign && (
              <div>
                <label className="block text-sm font-medium text-text mb-3">
                  What's your role in this campaign?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('owner')}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      selectedRole === 'owner'
                        ? 'border-amber-500/50 bg-amber-500/10'
                        : 'border-border hover:border-amber-500/30 hover:bg-amber-500/5'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Icon
                        name="Crown"
                        className={`w-5 h-5 ${selectedRole === 'owner' ? 'text-amber-400' : 'text-text-muted'}`}
                      />
                      <span
                        className={`font-semibold ${selectedRole === 'owner' ? 'text-text' : 'text-text'}`}
                      >
                        I'm the GM
                      </span>
                    </div>
                    <p className="text-xs text-text-muted">
                      Create and run your own campaign with full GM tools
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('player')}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      selectedRole === 'player'
                        ? 'border-blue-500/50 bg-blue-500/10'
                        : 'border-border hover:border-blue-500/30 hover:bg-blue-500/5'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Icon
                        name="Sword"
                        className={`w-5 h-5 ${selectedRole === 'player' ? 'text-blue-400' : 'text-text-muted'}`}
                      />
                      <span
                        className={`font-semibold ${selectedRole === 'player' ? 'text-text' : 'text-text'}`}
                      >
                        I'm a Player
                      </span>
                    </div>
                    <p className="text-xs text-text-muted">
                      Track your character in someone else's game
                    </p>
                  </button>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-text mb-2">
                Campaign Name *
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder={
                  selectedRole === 'player'
                    ? "Your GM's campaign name"
                    : 'The Lost Mines of Phandelver'
                }
                required
              />
            </div>

            <div>
              <label htmlFor="game_system" className="block text-sm font-medium text-text mb-2">
                Game System
              </label>
              <select
                id="game_system"
                value={formData.game_system}
                onChange={(e) => setFormData({ ...formData, game_system: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select a game system...</option>
                {GAME_SYSTEMS.map((system) => (
                  <option key={system} value={system}>
                    {system}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-text mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
                placeholder="A brief description of your campaign..."
              />
            </div>

            {/* GM-specific fields - hidden for player campaigns */}
            {selectedRole === 'owner' && (
              <>
                {/* Campaign Setting Knowledge Base */}
                {settingPacks.length > 0 && (
                  <div className="border border-border rounded-lg p-4 bg-background/50">
                    <div className="flex items-center gap-2 mb-3">
                      <Icon name="Globe" className="w-5 h-5 text-primary" />
                      <label className="text-sm font-medium text-text">
                        Campaign Setting (AI Knowledge Base)
                      </label>
                    </div>
                    <p className="text-xs text-text-muted mb-3">
                      Select a published D&D setting to enhance AI-generated content with canonical
                      lore.
                    </p>
                    <select
                      value={selectedSettingSlug}
                      onChange={(e) => setSelectedSettingSlug(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
                      disabled={loadingPacks}
                    >
                      <option value="">None (Custom/Homebrew)</option>
                      {settingPacks.map((pack) => (
                        <option key={pack.slug} value={pack.slug}>
                          {pack.name}
                          {pack.scrape_status === 'completed'
                            ? ` (${pack.total_chunks} facts indexed)`
                            : pack.scrape_status === 'pending'
                              ? ' (Not indexed yet)'
                              : ` (${pack.scrape_status})`}
                        </option>
                      ))}
                    </select>
                    {selectedSettingSlug && (
                      <div className="mt-2">
                        {(() => {
                          const selectedPack = settingPacks.find(
                            (p) => p.slug === selectedSettingSlug
                          )
                          if (!selectedPack) return null
                          return (
                            <div className="text-xs text-text-muted">
                              <p className="mb-1">{selectedPack.description}</p>
                              {selectedPack.scrape_status === 'completed' ? (
                                <p className="text-green-500">
                                  <Icon name="Check" className="w-3 h-3 inline mr-1" />
                                  {selectedPack.total_pages} wiki pages indexed
                                </p>
                              ) : selectedPack.scrape_status === 'pending' ? (
                                <p className="text-yellow-500">
                                  <Icon name="AlertCircle" className="w-3 h-3 inline mr-1" />
                                  Wiki not yet indexed - AI will use general knowledge
                                </p>
                              ) : (
                                <p className="text-blue-500">
                                  <Icon
                                    name="Loader2"
                                    className="w-3 h-3 inline mr-1 animate-spin"
                                  />
                                  Indexing in progress...
                                </p>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="theme" className="block text-sm font-medium text-text mb-2">
                      Theme
                    </label>
                    <input
                      id="theme"
                      type="text"
                      value={formData.theme}
                      onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="High Fantasy, Dark Fantasy, etc."
                    />
                  </div>

                  <div>
                    <label htmlFor="tone" className="block text-sm font-medium text-text mb-2">
                      Tone
                    </label>
                    <input
                      id="tone"
                      type="text"
                      value={formData.tone}
                      onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Serious, Comedic, Gritty, etc."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="magic_level"
                      className="block text-sm font-medium text-text mb-2"
                    >
                      Magic Level
                    </label>
                    <input
                      id="magic_level"
                      type="text"
                      value={formData.magic_level}
                      onChange={(e) => setFormData({ ...formData, magic_level: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Low, Medium, High"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="tech_level"
                      className="block text-sm font-medium text-text mb-2"
                    >
                      Tech Level
                    </label>
                    <input
                      id="tech_level"
                      type="text"
                      value={formData.tech_level}
                      onChange={(e) => setFormData({ ...formData, tech_level: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Medieval, Renaissance, Industrial"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="history" className="block text-sm font-medium text-text mb-2">
                    World History
                  </label>
                  <textarea
                    id="history"
                    value={formData.history}
                    onChange={(e) => setFormData({ ...formData, history: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
                    placeholder="Brief history of your campaign world..."
                  />
                </div>
              </>
            )}

            {/* GM Notes - only for GM campaigns */}
            {selectedRole === 'owner' && (
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-text mb-2">
                  GM Notes
                </label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
                  placeholder="Private notes for the GM..."
                />
              </div>
            )}

            {/* Player info note */}
            {selectedRole === 'player' && (
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <Icon name="Info" className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-text font-medium mb-1">Player Tracking Campaign</p>
                    <p className="text-text-muted">
                      This creates a local campaign to track your character. Your GM doesn't need to
                      use TavKit - you can use this to keep notes, track your character, and save
                      content for yourself.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="sticky bottom-0 bg-background-panel border-t border-border p-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-border hover:bg-tavern-dark text-text font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !formData.name?.trim()}
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Icon name="Loader2" className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Icon name="Save" className="w-4 h-4" />
                  {campaign ? 'Update Campaign' : 'Create Campaign'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
