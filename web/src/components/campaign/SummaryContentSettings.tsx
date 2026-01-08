import { useState, useEffect, useCallback } from 'react'
import Icon from '../common/Icon'
import type { IconName } from '../common/Icon'
import { authFetch } from '@/utils/authFetch'
import { logger } from '@/utils/logger'

interface ContentItem {
  id: string
  name: string
  type: string
  ai_generated: boolean
  preview?: string
}

interface ContentByType {
  [key: string]: ContentItem[]
}

interface SummaryContentSettingsProps {
  campaignId: string
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}

// Content types that can be included in summaries
const CONTENT_TYPE_CONFIG: Record<string, { label: string; icon: IconName }> = {
  npcs: { label: 'NPCs', icon: 'Users' },
  locations: { label: 'Locations', icon: 'Map' },
  quests: { label: 'Quests', icon: 'Scroll' },
  monsters: { label: 'Monsters', icon: 'Skull' },
  items: { label: 'Items', icon: 'Package' },
  encounters: { label: 'Encounters', icon: 'Swords' },
  rumors: { label: 'Rumors', icon: 'MessageSquare' },
  dialogues: { label: 'Dialogues', icon: 'MessageCircle' },
  taverns: { label: 'Taverns', icon: 'Beer' },
  merchants: { label: 'Merchants', icon: 'Store' },
  traps: { label: 'Traps', icon: 'AlertCircle' },
  critters: { label: 'Critters', icon: 'PawPrint' },
  chases: { label: 'Chases', icon: 'Zap' },
  campaign_content: { label: 'Campaign Content', icon: 'FileText' },
}

type FilterMode = 'all' | 'ai_generated' | 'manual'

export default function SummaryContentSettings({
  campaignId,
  isOpen,
  onClose,
  onSave,
}: SummaryContentSettingsProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [contentByType, setContentByType] = useState<ContentByType>({})
  const [exclusions, setExclusions] = useState<Record<string, string[]>>({})
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch all campaign content and current exclusions
  const fetchContent = useCallback(async () => {
    if (!campaignId) return

    setLoading(true)
    try {
      const response = await authFetch(
        `${import.meta.env.VITE_API_URL}/api/v1/campaigns/${campaignId}/summary-content`
      )

      if (response.ok) {
        const data = await response.json()
        setContentByType(data.content_by_type || {})
        setExclusions(data.exclusions || {})
      } else {
        logger.error('Failed to fetch summary content settings')
      }
    } catch (err) {
      logger.error('Failed to fetch summary content settings:', err)
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  useEffect(() => {
    if (isOpen) {
      fetchContent()
    }
  }, [isOpen, fetchContent])

  // Toggle a single item's inclusion
  const toggleItem = (contentType: string, itemId: string) => {
    setExclusions((prev) => {
      const typeExclusions = prev[contentType] || []
      const isExcluded = typeExclusions.includes(itemId)

      if (isExcluded) {
        // Remove from exclusions (include it)
        return {
          ...prev,
          [contentType]: typeExclusions.filter((id) => id !== itemId),
        }
      } else {
        // Add to exclusions (exclude it)
        return {
          ...prev,
          [contentType]: [...typeExclusions, itemId],
        }
      }
    })
  }

  // Toggle all items of a type
  const toggleAllOfType = (contentType: string, include: boolean) => {
    const items = contentByType[contentType] || []
    setExclusions((prev) => {
      if (include) {
        // Include all - remove all exclusions for this type
        return {
          ...prev,
          [contentType]: [],
        }
      } else {
        // Exclude all - add all item IDs to exclusions
        return {
          ...prev,
          [contentType]: items.map((item) => item.id),
        }
      }
    })
  }

  // Save exclusions to the backend
  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await authFetch(
        `${import.meta.env.VITE_API_URL}/api/v1/campaigns/${campaignId}/summary-content`,
        {
          method: 'PUT',
          body: JSON.stringify({ exclusions }),
        }
      )

      if (response.ok) {
        onSave()
        onClose()
      } else {
        logger.error('Failed to save summary content settings')
      }
    } catch (err) {
      logger.error('Failed to save summary content settings:', err)
    } finally {
      setSaving(false)
    }
  }

  // Filter items based on current filter mode and search
  const getFilteredItems = (contentType: string): ContentItem[] => {
    const items = contentByType[contentType] || []
    return items.filter((item) => {
      // Filter by AI/Manual
      if (filterMode === 'ai_generated' && !item.ai_generated) return false
      if (filterMode === 'manual' && item.ai_generated) return false

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          item.name.toLowerCase().includes(query) || item.preview?.toLowerCase().includes(query)
        )
      }

      return true
    })
  }

  // Calculate stats for a content type
  const getTypeStats = (contentType: string) => {
    const items = contentByType[contentType] || []
    const typeExclusions = exclusions[contentType] || []
    const included = items.filter((item) => !typeExclusions.includes(item.id)).length
    return { included, total: items.length }
  }

  // Toggle accordion expansion
  const toggleExpanded = (contentType: string) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev)
      if (next.has(contentType)) {
        next.delete(contentType)
      } else {
        next.add(contentType)
      }
      return next
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-background-panel border border-border rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <Icon name="Settings" className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-xl font-bold text-text">Summary Content Settings</h2>
              <p className="text-sm text-tavern-mauve mt-1">
                Choose which content to include in your campaign summary
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-tavern-dark rounded-lg transition-colors"
          >
            <Icon name="X" className="w-5 h-5 text-tavern-mauve" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 p-4 border-b border-border bg-background/50">
          {/* Search */}
          <div className="flex-1 relative">
            <Icon
              name="Globe"
              className="w-4 h-4 text-tavern-mauve absolute left-3 top-1/2 -translate-y-1/2"
            />
            <input
              type="text"
              placeholder="Search entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm text-text placeholder:text-tavern-mauve focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Filter chips */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filterMode === 'all'
                  ? 'bg-primary text-tavern-darkest'
                  : 'bg-tavern-dark text-tavern-mauve hover:bg-tavern-purple hover:text-tavern-light'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterMode('ai_generated')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                filterMode === 'ai_generated'
                  ? 'bg-primary text-tavern-darkest'
                  : 'bg-tavern-dark text-tavern-mauve hover:bg-tavern-purple hover:text-tavern-light'
              }`}
            >
              <Icon name="Sparkles" className="w-3 h-3" />
              AI Generated
            </button>
            <button
              onClick={() => setFilterMode('manual')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                filterMode === 'manual'
                  ? 'bg-primary text-tavern-darkest'
                  : 'bg-tavern-dark text-tavern-mauve hover:bg-tavern-purple hover:text-tavern-light'
              }`}
            >
              <Icon name="FileText" className="w-3 h-3" />
              Manual
            </button>
          </div>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Icon name="Loader2" className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {Object.entries(CONTENT_TYPE_CONFIG).map(([contentType, config]) => {
                const items = contentByType[contentType] || []
                const filteredItems = getFilteredItems(contentType)
                const stats = getTypeStats(contentType)
                const isExpanded = expandedTypes.has(contentType)
                const typeExclusions = exclusions[contentType] || []
                const allIncluded = typeExclusions.length === 0
                const noneIncluded = typeExclusions.length === items.length

                if (items.length === 0) return null

                return (
                  <div
                    key={contentType}
                    className="border border-border rounded-lg overflow-hidden"
                  >
                    {/* Type Header */}
                    <button
                      onClick={() => toggleExpanded(contentType)}
                      className="w-full flex items-center justify-between p-4 bg-background hover:bg-tavern-dark/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Icon name={config.icon} className="w-5 h-5 text-primary" />
                        <span className="font-medium text-text">{config.label}</span>
                        <span className="text-xs text-tavern-mauve bg-tavern-dark px-2 py-0.5 rounded-full">
                          {stats.included}/{stats.total} included
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Quick toggle buttons */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleAllOfType(contentType, true)
                          }}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            allIncluded
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-tavern-dark text-tavern-mauve hover:text-tavern-light'
                          }`}
                          title="Include all"
                        >
                          All
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleAllOfType(contentType, false)
                          }}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            noneIncluded
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-tavern-dark text-tavern-mauve hover:text-tavern-light'
                          }`}
                          title="Exclude all"
                        >
                          None
                        </button>
                        <Icon
                          name={isExpanded ? 'ChevronUp' : 'ChevronDown'}
                          className="w-4 h-4 text-tavern-mauve"
                        />
                      </div>
                    </button>

                    {/* Items List */}
                    {isExpanded && (
                      <div className="border-t border-border bg-background-panel/50">
                        {filteredItems.length === 0 ? (
                          <p className="p-4 text-sm text-tavern-mauve text-center">
                            No items match your filter
                          </p>
                        ) : (
                          <div className="divide-y divide-border/50">
                            {filteredItems.map((item) => {
                              const isExcluded = typeExclusions.includes(item.id)
                              return (
                                <label
                                  key={item.id}
                                  className={`flex items-start gap-3 p-3 cursor-pointer hover:bg-tavern-dark/30 transition-colors ${
                                    isExcluded ? 'opacity-50' : ''
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={!isExcluded}
                                    onChange={() => toggleItem(contentType, item.id)}
                                    className="mt-1 w-4 h-4 rounded border-border bg-background text-primary focus:ring-primary"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-sm text-text truncate">
                                        {item.name}
                                      </span>
                                      {item.ai_generated && (
                                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-primary/20 text-primary rounded text-xs">
                                          <Icon name="Sparkles" className="w-3 h-3" />
                                          AI
                                        </span>
                                      )}
                                    </div>
                                    {item.preview && (
                                      <p className="text-xs text-tavern-mauve mt-1 line-clamp-1">
                                        {item.preview}
                                      </p>
                                    )}
                                  </div>
                                </label>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border bg-background/50">
          <p className="text-xs text-tavern-mauve">
            Excluded content will not appear in generated summaries
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-tavern-mauve hover:text-tavern-light transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
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
      </div>
    </div>
  )
}
