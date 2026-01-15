import { useEffect, useState, useMemo, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import Icon from '../../../../common/Icon'
import { useCampaignStore, type CampaignContent } from '../../../../../store/campaignStore'
import { logger } from '../../../../../utils/logger'
import CampaignContentEditorModal from '../../../../campaign/CampaignContentEditorModal'

interface LoreContentProps {
  campaignId: string
}

/**
 * LoreContent - Display lore entries from the campaign.
 */
export default function LoreContent({ campaignId }: LoreContentProps) {
  const { fetchCampaignContent, deleteCampaignContent } = useCampaignStore()

  const [lore, setLore] = useState<CampaignContent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewingLore, setViewingLore] = useState<CampaignContent | null>(null)
  const [showEditorModal, setShowEditorModal] = useState(false)

  useEffect(() => {
    const loadLore = async () => {
      setLoading(true)
      setError(null)
      try {
        const content = await fetchCampaignContent(campaignId, 'lore')
        setLore(content)
      } catch (err) {
        setError('Failed to load lore')
        logger.error('Failed to load lore:', err)
      } finally {
        setLoading(false)
      }
    }
    loadLore()
  }, [campaignId, fetchCampaignContent])

  const refreshContent = useCallback(async () => {
    try {
      const content = await fetchCampaignContent(campaignId, 'lore')
      setLore(content)
    } catch (err) {
      logger.error('Failed to refresh content:', err)
    }
  }, [campaignId, fetchCampaignContent])

  const filteredLore = useMemo(() => {
    if (!searchQuery) return lore
    const query = searchQuery.toLowerCase()
    return lore.filter(
      (entry) =>
        entry.title.toLowerCase().includes(query) || entry.content?.toLowerCase().includes(query)
    )
  }, [lore, searchQuery])

  const handleDelete = async (entry: CampaignContent) => {
    if (window.confirm(`Delete "${entry.title}"? This cannot be undone.`)) {
      try {
        await deleteCampaignContent(campaignId, entry.id)
        setLore((prev) => prev.filter((l) => l.id !== entry.id))
        if (viewingLore?.id === entry.id) {
          setViewingLore(null)
        }
      } catch (err) {
        logger.error('Failed to delete lore:', err)
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* Header with search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Icon
            name="Search"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
          />
          <input
            type="text"
            placeholder="Search lore..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary text-sm"
          />
        </div>
        <button
          onClick={() => setShowEditorModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors text-sm"
        >
          <Icon name="Plus" className="w-4 h-4" />
          Add Lore
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Icon name="Loader2" className="w-6 h-6 text-primary animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredLore.length === 0 && (
        <div className="text-center py-8 bg-background-panel border border-border rounded-xl">
          <Icon name="BookOpen" className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <h3 className="text-text font-medium mb-1">
            {searchQuery ? 'No matching lore' : 'No lore yet'}
          </h3>
          <p className="text-text-muted text-sm mb-4">
            {searchQuery
              ? 'Try adjusting your search.'
              : 'Add world history, legends, and background information.'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowEditorModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors text-sm mx-auto"
            >
              <Icon name="Plus" className="w-4 h-4" />
              Add Lore
            </button>
          )}
        </div>
      )}

      {/* Lore List */}
      {!loading && filteredLore.length > 0 && (
        <div className="space-y-3">
          {filteredLore.map((entry) => (
            <div
              key={entry.id}
              onClick={() => setViewingLore(entry)}
              className="bg-background-panel border border-amber-500/30 rounded-xl p-4 hover:border-amber-500/50 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <Icon name="BookOpen" className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-text font-medium">{entry.title}</h4>
                    {entry.content && (
                      <p className="text-text-muted text-sm mt-1 line-clamp-2">
                        {entry.content.substring(0, 150)}...
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(entry)
                  }}
                  className="p-1.5 hover:bg-red-500/10 rounded text-text-muted hover:text-red-400 flex-shrink-0"
                >
                  <Icon name="Trash2" className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Modal */}
      {viewingLore && (
        <LoreDetailModal
          entry={viewingLore}
          onClose={() => setViewingLore(null)}
          onDelete={() => handleDelete(viewingLore)}
        />
      )}

      <CampaignContentEditorModal
        isOpen={showEditorModal}
        onClose={() => setShowEditorModal(false)}
        campaignId={campaignId}
        section="lore"
        onSaved={refreshContent}
      />
    </div>
  )
}

// Lore Detail Modal
interface LoreDetailModalProps {
  entry: CampaignContent
  onClose: () => void
  onDelete: () => void
}

function LoreDetailModal({ entry, onClose, onDelete }: LoreDetailModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-background-panel border border-border rounded-xl w-full max-w-5xl h-[95vh] sm:h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-border px-4 sm:px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Icon name="BookOpen" className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-text">{entry.title}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-background rounded-lg text-text-muted hover:text-text"
          >
            <Icon name="X" className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {entry.content ? (
            <div className="prose prose-invert prose-tavern max-w-none">
              <ReactMarkdown>{entry.content.replace(/\\n/g, '\n')}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-text-muted italic">No content</p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 sm:px-6 py-4 flex justify-between flex-shrink-0">
          <button
            onClick={onDelete}
            className="px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-sm flex items-center gap-2"
          >
            <Icon name="Trash2" className="w-4 h-4" />
            Delete
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
