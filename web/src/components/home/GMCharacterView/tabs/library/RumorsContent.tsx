import ContentListLayout from '../../../../common/ContentListLayout'
import { useGeneratorModalStore } from '../../../../../store/generatorModalStore'
import ContentDetailModal from '../../../../common/ContentDetailModal'
import AssignCampaignModal from '../../../../common/AssignCampaignModal'
import Icon from '../../../../common/Icon'
import { useLibraryContent } from '../../../../../hooks/useLibraryContent'
import { useCampaignStore } from '../../../../../store/campaignStore'
import { useState } from 'react'
import { logger } from '@/utils/logger'

interface Rumor {
  id: string
  text: string
  campaign_id?: string | null
  source?: string
  veracity: string
  leads_to?: string
  context?: string
  foreshadowing?: boolean
  revealed: boolean
  ai_generated?: boolean
  created_at: string
}

interface RumorsContentProps {
  campaignId?: string
  showCampaignFilter?: boolean
}

const veracityColors: Record<string, { bg: string; text: string }> = {
  true: { bg: 'bg-green-500/10', text: 'text-green-400' },
  partially_true: { bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
  false: { bg: 'bg-red-500/10', text: 'text-red-400' },
}

export default function RumorsContent({ campaignId, showCampaignFilter }: RumorsContentProps) {
  const { openGenerator } = useGeneratorModalStore()
  const { campaigns } = useCampaignStore()
  const [assignModalItem, setAssignModalItem] = useState<{
    id: string
    name: string
    currentCampaignId?: string | null
  } | null>(null)

  const {
    filteredItems,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    selectedCampaignId,
    setSelectedCampaignId,
    viewingItem,
    setViewingItem,
    deleteItem,
    refresh,
  } = useLibraryContent<Rumor>({
    contentType: 'rumors',
    campaignId,
    showCampaignFilter,
    searchFields: ['text', 'source', 'context'],
  })

  const handleDelete = async (rumor: Rumor) => {
    const preview = rumor.text.substring(0, 40) + (rumor.text.length > 40 ? '...' : '')
    if (window.confirm(`Delete rumor "${preview}"? This cannot be undone.`)) {
      try {
        await deleteItem(rumor.id)
      } catch (err) {
        logger.error('Failed to delete rumor:', err)
      }
    }
  }

  return (
    <div className="space-y-4">
      {showCampaignFilter && (
        <div className="mb-4">
          <select
            value={selectedCampaignId}
            onChange={(e) => setSelectedCampaignId(e.target.value)}
            className="w-full md:w-64 px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary transition-colors text-sm"
          >
            <option value="">All Content</option>
            <option value="library">Personal Library (No Campaign)</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <ContentListLayout
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search rumors..."
        addButtonLabel="Add Rumor"
        onAddClick={() => openGenerator('rumor')}
        addButtonColor="rose"
        loading={loading}
        error={error}
        emptyIcon="Quote"
        emptyTitle="No rumors yet"
        emptyDescription="Create tavern gossip and plot hooks."
        emptyCTALabel="Create Your First Rumor"
        onEmptyCTAClick={() => openGenerator('rumor')}
        hasItems={filteredItems.length > 0}
      >
        <div className="space-y-3">
          {filteredItems.map((rumor) => {
            const veracityColor = veracityColors[rumor.veracity] || veracityColors.partially_true
            return (
              <div
                key={rumor.id}
                onClick={() => setViewingItem(rumor)}
                className="bg-background-panel border border-rose-500/30 rounded-xl p-4 hover:border-rose-500/50 transition-colors cursor-pointer"
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-text mb-2 line-clamp-3 italic">&ldquo;{rumor.text}&rdquo;</p>
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className={`px-2 py-1 ${veracityColor.bg} ${veracityColor.text} rounded text-xs capitalize`}>
                        {rumor.veracity.replace('_', ' ')}
                      </span>
                      {rumor.revealed && (
                        <span className="px-2 py-1 bg-purple-500/10 text-purple-400 rounded text-xs">
                          Revealed
                        </span>
                      )}
                      {rumor.source && (
                        <span className="text-text-muted text-sm">Source: {rumor.source}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setAssignModalItem({
                          id: rumor.id,
                          name: rumor.text.substring(0, 40),
                          currentCampaignId: rumor.campaign_id,
                        })
                      }}
                      className="p-1.5 hover:bg-background rounded text-text-muted hover:text-text"
                    >
                      <Icon name="FolderInput" className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(rumor)
                      }}
                      className="p-1.5 hover:bg-red-500/10 rounded text-text-muted hover:text-red-400"
                    >
                      <Icon name="Trash2" className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </ContentListLayout>

      {viewingItem && (
        <RumorDetailModal
          rumor={viewingItem}
          onClose={() => setViewingItem(null)}
          onDelete={() => handleDelete(viewingItem)}
        />
      )}

      {assignModalItem && (
        <AssignCampaignModal
          isOpen={true}
          onClose={() => setAssignModalItem(null)}
          contentType="rumors"
          contentId={assignModalItem.id}
          contentName={assignModalItem.name}
          currentCampaignId={assignModalItem.currentCampaignId}
          onSuccess={refresh}
        />
      )}
    </div>
  )
}

interface RumorDetailModalProps {
  rumor: Rumor
  onClose: () => void
  onDelete: () => void
}

function RumorDetailModal({ rumor, onClose, onDelete }: RumorDetailModalProps) {
  const veracityColor = veracityColors[rumor.veracity] || veracityColors.partially_true

  return (
    <ContentDetailModal
      isOpen={true}
      onClose={onClose}
      icon="Quote"
      iconColor="rose"
      title="Rumor"
      subtitle={rumor.source ? `Source: ${rumor.source}` : undefined}
      onDelete={onDelete}
    >
      <div className="space-y-6">
        <div className="bg-rose-500/5 p-6 rounded-lg border border-rose-500/20">
          <p className="text-text text-lg italic leading-relaxed">&ldquo;{rumor.text}&rdquo;</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className={`px-4 py-2 ${veracityColor.bg} border border-rose-500/30 rounded-lg`}>
            <p className="text-xs text-text-muted">Veracity</p>
            <p className={`text-lg font-semibold ${veracityColor.text} capitalize`}>
              {rumor.veracity.replace('_', ' ')}
            </p>
          </div>
          {rumor.revealed && (
            <div className="px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <p className="text-xs text-text-muted">Status</p>
              <p className="text-lg font-semibold text-purple-400">Revealed</p>
            </div>
          )}
        </div>

        {rumor.context && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Context
            </h4>
            <p className="text-text leading-relaxed">{rumor.context}</p>
          </div>
        )}

        {rumor.leads_to && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Leads To
            </h4>
            <p className="text-text leading-relaxed">{rumor.leads_to}</p>
          </div>
        )}

        {rumor.foreshadowing && (
          <div className="bg-amber-500/10 p-3 rounded-lg border border-amber-500/30">
            <p className="text-amber-400 font-medium">This rumor foreshadows future events</p>
          </div>
        )}
      </div>
    </ContentDetailModal>
  )
}
