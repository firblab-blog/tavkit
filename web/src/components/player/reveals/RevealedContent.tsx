import { useEffect, useState } from 'react'
import Icon from '../../common/Icon'
import {
  useContentRevealsStore,
  ContentReveal,
  ContentType,
} from '../../../store/contentRevealsStore'
import { useCampaignStore } from '../../../store/campaignStore'

const contentTypeConfig: Record<ContentType, { icon: string; color: string; label: string }> = {
  npc: { icon: 'User', color: 'blue', label: 'NPC' },
  location: { icon: 'MapPin', color: 'emerald', label: 'Location' },
  quest: { icon: 'Target', color: 'amber', label: 'Quest' },
  item: { icon: 'Gem', color: 'yellow', label: 'Item' },
  monster: { icon: 'Skull', color: 'red', label: 'Monster' },
}

export default function RevealedContent() {
  const { playerReveals, loading, error, fetchPlayerReveals } = useContentRevealsStore()
  const getActiveCampaign = useCampaignStore((state) => state.getActiveCampaign)
  const activeCampaign = getActiveCampaign()

  const [filterType, setFilterType] = useState<ContentType | ''>('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (activeCampaign?.id) {
      fetchPlayerReveals(activeCampaign.id)
    }
  }, [fetchPlayerReveals, activeCampaign?.id])

  const filteredReveals = filterType
    ? playerReveals.filter((r) => r.content_type === filterType)
    : playerReveals

  // Group by content type
  const groupedReveals = filteredReveals.reduce(
    (acc, reveal) => {
      const type = reveal.content_type
      if (!acc[type]) acc[type] = []
      acc[type].push(reveal)
      return acc
    },
    {} as Record<ContentType, ContentReveal[]>
  )

  const getRevealLevelBadge = (level: string) => {
    switch (level) {
      case 'name_only':
        return { text: 'Name Only', color: 'bg-gray-500/20 text-gray-300' }
      case 'summary':
        return { text: 'Summary', color: 'bg-blue-500/20 text-blue-300' }
      case 'full':
        return { text: 'Full Details', color: 'bg-emerald-500/20 text-emerald-300' }
      default:
        return { text: level, color: 'bg-gray-500/20 text-gray-300' }
    }
  }

  if (!activeCampaign) {
    return (
      <div className="text-center py-12 bg-background-panel border border-border rounded-xl">
        <Icon name="Eye" className="w-12 h-12 text-text-muted mx-auto mb-4" />
        <h3 className="text-lg font-medium text-text mb-2">No Active Campaign</h3>
        <p className="text-text-muted">
          Select or join a campaign to see revealed content from your GM.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text flex items-center gap-2">
            <Icon name="Eye" className="w-5 h-5 text-purple-400" />
            GM Shared Content
          </h2>
          <p className="text-sm text-text-muted mt-1">Content your GM has revealed to the party.</p>
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as ContentType | '')}
          className="px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
        >
          <option value="">All Types</option>
          <option value="npc">NPCs</option>
          <option value="location">Locations</option>
          <option value="quest">Quests</option>
          <option value="item">Items</option>
          <option value="monster">Monsters</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && playerReveals.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <Icon name="Loader2" className="w-6 h-6 text-primary animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredReveals.length === 0 && (
        <div className="text-center py-12 bg-background-panel border border-border rounded-xl">
          <Icon name="Eye" className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text mb-2">
            {filterType ? 'No matching content' : 'No revealed content yet'}
          </h3>
          <p className="text-text-muted max-w-md mx-auto">
            {filterType
              ? 'Try selecting a different filter.'
              : "Your GM hasn't shared any content yet. As you play, they may reveal NPCs, locations, quests, and more!"}
          </p>
        </div>
      )}

      {/* Grouped Content */}
      {Object.entries(groupedReveals).map(([type, reveals]) => {
        const config = contentTypeConfig[type as ContentType]
        return (
          <div key={type} className="space-y-3">
            <div className="flex items-center gap-2">
              <Icon name={config.icon as any} className={`w-4 h-4 text-${config.color}-400`} />
              <h3 className="text-sm font-medium text-text-muted">
                {config.label}s ({reveals.length})
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {reveals.map((reveal) => {
                const isExpanded = expandedId === reveal.id
                const levelBadge = getRevealLevelBadge(reveal.reveal_level)

                return (
                  <div
                    key={reveal.id}
                    className={`bg-background-panel border border-${config.color}-500/20 rounded-xl overflow-hidden hover:border-${config.color}-500/40 transition-colors`}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg bg-${config.color}-500/10 flex items-center justify-center flex-shrink-0`}
                          >
                            <Icon
                              name={config.icon as any}
                              className={`w-4 h-4 text-${config.color}-400`}
                            />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-text font-medium truncate">
                              {reveal.content_name || 'Unknown'}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`px-1.5 py-0.5 text-xs rounded ${levelBadge.color}`}>
                                {levelBadge.text}
                              </span>
                              <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded">
                                GM
                              </span>
                            </div>
                          </div>
                        </div>
                        {(reveal.reveal_level !== 'name_only' || reveal.custom_notes) && (
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : reveal.id)}
                            className="p-1 hover:bg-background rounded text-text-muted hover:text-text"
                          >
                            <Icon
                              name={isExpanded ? 'ChevronUp' : 'ChevronDown'}
                              className="w-4 h-4"
                            />
                          </button>
                        )}
                      </div>

                      {/* GM Notes */}
                      {reveal.custom_notes && (
                        <div className="mt-2 p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                          <p className="text-purple-200 text-sm">
                            <span className="font-medium">GM Note:</span> {reveal.custom_notes}
                          </p>
                        </div>
                      )}

                      {/* Expanded content based on reveal level */}
                      {isExpanded && reveal.reveal_level !== 'name_only' && reveal.content_data && (
                        <div className="mt-3 pt-3 border-t border-border/50 text-sm text-text-muted">
                          {reveal.reveal_level === 'summary' && (
                            <p>
                              {(reveal.content_data as any).description ||
                                (reveal.content_data as any).summary ||
                                'No description available.'}
                            </p>
                          )}
                          {reveal.reveal_level === 'full' && (
                            <div className="space-y-2">
                              {(reveal.content_data as any).description && (
                                <p>{(reveal.content_data as any).description}</p>
                              )}
                              {/* Additional fields based on content type could be shown here */}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
