import React, { useState, useEffect } from 'react'
import Icon from '../common/Icon'
import type { Campaign } from '../../store/campaignStore'

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
          console.warn('Failed to fetch setting packs:', response.status)
        }
      } catch (error) {
        // RAG service might not be running
        console.warn('Setting packs not available:', error)
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
      await onSave(formData)
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
                placeholder="The Lost Mines of Phandelver"
                required
              />
            </div>

            <div>
              <label htmlFor="game_system" className="block text-sm font-medium text-text mb-2">
                Game System
              </label>
              <input
                id="game_system"
                type="text"
                value={formData.game_system}
                onChange={(e) => setFormData({ ...formData, game_system: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="D&D 5e, Pathfinder 2e, etc."
              />
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
                      const selectedPack = settingPacks.find((p) => p.slug === selectedSettingSlug)
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
                              <Icon name="Loader2" className="w-3 h-3 inline mr-1 animate-spin" />
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
                <label htmlFor="magic_level" className="block text-sm font-medium text-text mb-2">
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
                <label htmlFor="tech_level" className="block text-sm font-medium text-text mb-2">
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
