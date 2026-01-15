import ContentListLayout from '../../../../common/ContentListLayout'
import { useGeneratorModalStore } from '../../../../../store/generatorModalStore'
import ContentCard from '../../../../common/ContentCard'
import ContentDetailModal from '../../../../common/ContentDetailModal'
import AssignCampaignModal from '../../../../common/AssignCampaignModal'
import { useLibraryContent } from '../../../../../hooks/useLibraryContent'
import { useCampaignStore } from '../../../../../store/campaignStore'
import { useState } from 'react'
import { logger } from '@/utils/logger'

interface Chase {
  id: string
  name: string
  campaign_id?: string | null
  chase_type: string
  terrain: string
  difficulty: string
  description?: string
  setting?: string
  participants?: any
  starting_conditions?: string
  obstacles?: any
  complications?: any
  shortcuts?: any
  chase_phases?: any
  ending_conditions?: any
  rewards?: any
  special_rules?: string
  environmental_factors?: any
  ai_generated?: boolean
  created_at: string
}

interface ChasesContentProps {
  campaignId?: string
  showCampaignFilter?: boolean
}

const difficultyColors: Record<string, { bg: string; text: string }> = {
  easy: { bg: 'bg-green-500/10', text: 'text-green-400' },
  medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
  hard: { bg: 'bg-orange-500/10', text: 'text-orange-400' },
  deadly: { bg: 'bg-red-500/10', text: 'text-red-400' },
}

export default function ChasesContent({ campaignId, showCampaignFilter }: ChasesContentProps) {
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
  } = useLibraryContent<Chase>({
    contentType: 'chases',
    campaignId,
    showCampaignFilter,
    searchFields: ['name', 'chase_type', 'terrain', 'description'],
  })

  const handleDelete = async (chase: Chase) => {
    if (window.confirm(`Delete "${chase.name}"? This cannot be undone.`)) {
      try {
        await deleteItem(chase.id)
      } catch (err) {
        logger.error('Failed to delete chase:', err)
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
        searchPlaceholder="Search chases..."
        addButtonLabel="Add Chase"
        onAddClick={() => openGenerator('chase')}
        addButtonColor="indigo"
        loading={loading}
        error={error}
        emptyIcon="Zap"
        emptyTitle="No chases yet"
        emptyDescription="Create pursuit sequences and action scenes."
        emptyCTALabel="Create Your First Chase"
        onEmptyCTAClick={() => openGenerator('chase')}
        hasItems={filteredItems.length > 0}
      >
        <div className="space-y-3">
          {filteredItems.map((chase) => {
            const diffColor = difficultyColors[chase.difficulty] || difficultyColors.medium
            return (
              <ContentCard
                key={chase.id}
                title={chase.name}
                preview={chase.description || undefined}
                icon="Zap"
                iconColor="indigo"
                date={chase.created_at}
                badges={[
                  { label: chase.chase_type.replace(/_/g, ' ') },
                  { label: chase.terrain, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
                  { label: chase.difficulty, color: diffColor.text, bgColor: diffColor.bg },
                ]}
                onClick={() => setViewingItem(chase)}
                onDelete={() => handleDelete(chase)}
                onAssign={() =>
                  setAssignModalItem({
                    id: chase.id,
                    name: chase.name,
                    currentCampaignId: chase.campaign_id,
                  })
                }
              />
            )
          })}
        </div>
      </ContentListLayout>

      {viewingItem && (
        <ChaseDetailModal
          chase={viewingItem}
          onClose={() => setViewingItem(null)}
          onDelete={() => handleDelete(viewingItem)}
        />
      )}

      {assignModalItem && (
        <AssignCampaignModal
          isOpen={true}
          onClose={() => setAssignModalItem(null)}
          contentType="chases"
          contentId={assignModalItem.id}
          contentName={assignModalItem.name}
          currentCampaignId={assignModalItem.currentCampaignId}
          onSuccess={refresh}
        />
      )}
    </div>
  )
}

interface ChaseDetailModalProps {
  chase: Chase
  onClose: () => void
  onDelete: () => void
}

function ChaseDetailModal({ chase, onClose, onDelete }: ChaseDetailModalProps) {
  let obstacles: any[] = []
  let complications: any[] = []
  let shortcuts: any[] = []

  try {
    obstacles = chase.obstacles ? (typeof chase.obstacles === 'string' ? JSON.parse(chase.obstacles) : chase.obstacles) : []
    complications = chase.complications ? (typeof chase.complications === 'string' ? JSON.parse(chase.complications) : chase.complications) : []
    shortcuts = chase.shortcuts ? (typeof chase.shortcuts === 'string' ? JSON.parse(chase.shortcuts) : chase.shortcuts) : []
  } catch (err) {
    logger.error('Failed to parse chase data:', err)
  }

  const diffColor = difficultyColors[chase.difficulty] || difficultyColors.medium

  return (
    <ContentDetailModal
      isOpen={true}
      onClose={onClose}
      icon="Zap"
      iconColor="indigo"
      title={chase.name}
      subtitle={chase.chase_type.replace(/_/g, ' ')}
      onDelete={onDelete}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-3">
          <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-xs text-text-muted">Terrain</p>
            <p className="text-lg font-semibold text-blue-400 capitalize">{chase.terrain}</p>
          </div>
          <div className={`px-4 py-2 ${diffColor.bg} border border-indigo-500/30 rounded-lg`}>
            <p className="text-xs text-text-muted">Difficulty</p>
            <p className={`text-lg font-semibold ${diffColor.text} capitalize`}>{chase.difficulty}</p>
          </div>
        </div>

        {chase.description && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Description
            </h4>
            <p className="text-text leading-relaxed">{chase.description}</p>
          </div>
        )}

        {chase.setting && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Setting
            </h4>
            <p className="text-text leading-relaxed">{chase.setting}</p>
          </div>
        )}

        {chase.starting_conditions && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Starting Conditions
            </h4>
            <p className="text-text leading-relaxed">{chase.starting_conditions}</p>
          </div>
        )}

        {obstacles.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Obstacles
            </h4>
            <div className="space-y-2">
              {obstacles.map((o: any, i: number) => (
                <div key={i} className="bg-orange-500/10 p-3 rounded-lg border border-orange-500/30">
                  <p className="text-orange-400 font-medium">{o.name || o}</p>
                  {o.description && <p className="text-text-muted text-sm mt-1">{o.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {complications.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Complications
            </h4>
            <ul className="list-disc list-inside text-text space-y-1">
              {complications.map((c: any, i: number) => (
                <li key={i}>{typeof c === 'string' ? c : c.description || c.name}</li>
              ))}
            </ul>
          </div>
        )}

        {shortcuts.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Shortcuts
            </h4>
            <div className="space-y-2">
              {shortcuts.map((s: any, i: number) => (
                <div key={i} className="bg-green-500/10 p-3 rounded-lg border border-green-500/30">
                  <p className="text-green-400 font-medium">{s.name || s}</p>
                  {s.description && <p className="text-text-muted text-sm mt-1">{s.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {chase.special_rules && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Special Rules
            </h4>
            <p className="text-text leading-relaxed whitespace-pre-wrap">{chase.special_rules}</p>
          </div>
        )}
      </div>
    </ContentDetailModal>
  )
}
