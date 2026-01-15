import ContentListLayout from '../../../../common/ContentListLayout'
import { useGeneratorModalStore } from '../../../../../store/generatorModalStore'
import ContentCard from '../../../../common/ContentCard'
import ContentDetailModal from '../../../../common/ContentDetailModal'
import AssignCampaignModal from '../../../../common/AssignCampaignModal'
import { useLibraryContent } from '../../../../../hooks/useLibraryContent'
import { useCampaignStore } from '../../../../../store/campaignStore'
import { useState } from 'react'
import { logger } from '@/utils/logger'

interface Trap {
  id: string
  name: string
  campaign_id?: string | null
  trap_type: string
  difficulty?: string
  party_level?: number
  environment?: string
  description?: string
  trigger?: string
  effect?: string
  damage?: string
  detection?: any
  solution_paths?: any
  complications?: any
  rewards?: any
  dm_notes?: string
  ai_generated?: boolean
  created_at: string
}

interface TrapsContentProps {
  campaignId?: string
  showCampaignFilter?: boolean
}

const difficultyColors: Record<string, { bg: string; text: string }> = {
  easy: { bg: 'bg-green-500/10', text: 'text-green-400' },
  medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
  hard: { bg: 'bg-orange-500/10', text: 'text-orange-400' },
  deadly: { bg: 'bg-red-500/10', text: 'text-red-400' },
}

export default function TrapsContent({ campaignId, showCampaignFilter }: TrapsContentProps) {
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
  } = useLibraryContent<Trap>({
    contentType: 'traps',
    campaignId,
    showCampaignFilter,
    searchFields: ['name', 'trap_type', 'description', 'environment'],
  })

  const handleDelete = async (trap: Trap) => {
    if (window.confirm(`Delete "${trap.name}"? This cannot be undone.`)) {
      try {
        await deleteItem(trap.id)
      } catch (err) {
        logger.error('Failed to delete trap:', err)
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
        searchPlaceholder="Search traps..."
        addButtonLabel="Add Trap"
        onAddClick={() => openGenerator('trap')}
        addButtonColor="red"
        loading={loading}
        error={error}
        emptyIcon="AlertTriangle"
        emptyTitle="No traps yet"
        emptyDescription="Create dangerous hazards and puzzles."
        emptyCTALabel="Create Your First Trap"
        onEmptyCTAClick={() => openGenerator('trap')}
        hasItems={filteredItems.length > 0}
      >
        <div className="space-y-3">
          {filteredItems.map((trap) => {
            const diffColor = difficultyColors[trap.difficulty || 'medium'] || difficultyColors.medium
            return (
              <ContentCard
                key={trap.id}
                title={trap.name}
                preview={trap.description || undefined}
                icon="AlertTriangle"
                iconColor="red"
                date={trap.created_at}
                badges={[
                  { label: trap.trap_type.replace(/_/g, ' ') },
                  ...(trap.difficulty ? [{ label: trap.difficulty, color: diffColor.text, bgColor: diffColor.bg }] : []),
                  ...(trap.environment ? [{ label: trap.environment }] : []),
                ]}
                onClick={() => setViewingItem(trap)}
                onDelete={() => handleDelete(trap)}
                onAssign={() =>
                  setAssignModalItem({
                    id: trap.id,
                    name: trap.name,
                    currentCampaignId: trap.campaign_id,
                  })
                }
              />
            )
          })}
        </div>
      </ContentListLayout>

      {viewingItem && (
        <TrapDetailModal
          trap={viewingItem}
          onClose={() => setViewingItem(null)}
          onDelete={() => handleDelete(viewingItem)}
        />
      )}

      {assignModalItem && (
        <AssignCampaignModal
          isOpen={true}
          onClose={() => setAssignModalItem(null)}
          contentType="traps"
          contentId={assignModalItem.id}
          contentName={assignModalItem.name}
          currentCampaignId={assignModalItem.currentCampaignId}
          onSuccess={refresh}
        />
      )}
    </div>
  )
}

interface TrapDetailModalProps {
  trap: Trap
  onClose: () => void
  onDelete: () => void
}

function TrapDetailModal({ trap, onClose, onDelete }: TrapDetailModalProps) {
  let detection: any = null
  let solutionPaths: any[] = []

  try {
    detection = trap.detection ? (typeof trap.detection === 'string' ? JSON.parse(trap.detection) : trap.detection) : null
    solutionPaths = trap.solution_paths ? (typeof trap.solution_paths === 'string' ? JSON.parse(trap.solution_paths) : trap.solution_paths) : []
  } catch (err) {
    logger.error('Failed to parse trap data:', err)
  }

  const diffColor = difficultyColors[trap.difficulty || 'medium'] || difficultyColors.medium

  return (
    <ContentDetailModal
      isOpen={true}
      onClose={onClose}
      icon="AlertTriangle"
      iconColor="red"
      title={trap.name}
      subtitle={trap.trap_type.replace(/_/g, ' ')}
      onDelete={onDelete}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-3">
          {trap.difficulty && (
            <div className={`px-4 py-2 ${diffColor.bg} border border-red-500/30 rounded-lg`}>
              <p className="text-xs text-text-muted">Difficulty</p>
              <p className={`text-lg font-semibold ${diffColor.text} capitalize`}>{trap.difficulty}</p>
            </div>
          )}
          {trap.party_level && (
            <div className="px-4 py-2 bg-background border border-border rounded-lg">
              <p className="text-xs text-text-muted">Party Level</p>
              <p className="text-lg font-semibold text-text">{trap.party_level}</p>
            </div>
          )}
        </div>

        {trap.description && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Description
            </h4>
            <p className="text-text leading-relaxed">{trap.description}</p>
          </div>
        )}

        {trap.trigger && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Trigger
            </h4>
            <p className="text-text leading-relaxed">{trap.trigger}</p>
          </div>
        )}

        {trap.effect && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Effect
            </h4>
            <p className="text-text leading-relaxed">{trap.effect}</p>
          </div>
        )}

        {trap.damage && (
          <div className="bg-red-500/10 p-4 rounded-lg border border-red-500/30">
            <h4 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-2">
              Damage
            </h4>
            <p className="text-red-300 font-medium">{trap.damage}</p>
          </div>
        )}

        {detection && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Detection
            </h4>
            <div className="bg-background p-4 rounded-lg border border-border">
              {detection.dc && <p className="text-text">DC: {detection.dc}</p>}
              {detection.skill && <p className="text-text-muted">Skill: {detection.skill}</p>}
              {typeof detection === 'string' && <p className="text-text">{detection}</p>}
            </div>
          </div>
        )}

        {solutionPaths.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Solutions
            </h4>
            <ul className="list-disc list-inside text-text space-y-1">
              {solutionPaths.map((s: any, i: number) => (
                <li key={i}>{typeof s === 'string' ? s : s.description || s.method}</li>
              ))}
            </ul>
          </div>
        )}

        {trap.dm_notes && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              DM Notes
            </h4>
            <p className="text-text leading-relaxed whitespace-pre-wrap">{trap.dm_notes}</p>
          </div>
        )}
      </div>
    </ContentDetailModal>
  )
}
