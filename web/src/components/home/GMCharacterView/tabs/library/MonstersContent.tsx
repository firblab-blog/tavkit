import ReactMarkdown from 'react-markdown'
import { useGeneratorModalStore } from '../../../../../store/generatorModalStore'
import ContentListLayout from '../../../../common/ContentListLayout'
import ContentCard from '../../../../common/ContentCard'
import ContentDetailModal from '../../../../common/ContentDetailModal'
import AssignCampaignModal from '../../../../common/AssignCampaignModal'
import { useLibraryContent } from '../../../../../hooks/useLibraryContent'
import { useCampaignStore } from '../../../../../store/campaignStore'
import { useState } from 'react'
import { logger } from '@/utils/logger'

interface Monster {
  id: string
  name: string
  campaign_id?: string | null
  cr: number | string
  type?: string
  size?: string
  alignment?: string
  hp?: number
  ac?: number
  lore?: string
  abilities?: string
  tactics?: string
  stats?: any
  ai_generated?: boolean
  created_at: string
}

interface MonstersContentProps {
  campaignId?: string
  showCampaignFilter?: boolean
}

export default function MonstersContent({ campaignId, showCampaignFilter }: MonstersContentProps) {
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
  } = useLibraryContent<Monster>({
    contentType: 'monsters',
    campaignId,
    showCampaignFilter,
    searchFields: ['name', 'type', 'lore'],
  })

  const handleDelete = async (monster: Monster) => {
    if (window.confirm(`Delete "${monster.name}"? This cannot be undone.`)) {
      try {
        await deleteItem(monster.id)
      } catch (err) {
        logger.error('Failed to delete monster:', err)
      }
    }
  }

  const getCRDisplay = (cr: number | string) => `CR ${cr}`

  return (
    <div className="space-y-4">
      {/* Campaign Filter */}
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
        searchPlaceholder="Search monsters..."
        addButtonLabel="Add Monster"
        onAddClick={() => openGenerator('monster')}
        addButtonColor="orange"
        loading={loading}
        error={error}
        emptyIcon="Skull"
        emptyTitle="No monsters yet"
        emptyDescription="Add custom monsters, bosses, and creatures."
        emptyCTALabel="Create Your First Monster"
        onEmptyCTAClick={() => openGenerator('monster')}
        hasItems={filteredItems.length > 0}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((monster) => (
            <ContentCard
              key={monster.id}
              title={monster.name}
              preview={getCRDisplay(monster.cr)}
              icon="Skull"
              iconColor="orange"
              layout="grid"
              badges={[
                ...(monster.type ? [{ label: monster.type }] : []),
                ...(monster.size ? [{ label: monster.size }] : []),
                ...(monster.hp
                  ? [{ label: `HP ${monster.hp}`, color: 'text-orange-400', bgColor: 'bg-orange-500/10' }]
                  : []),
                ...(monster.ac
                  ? [{ label: `AC ${monster.ac}`, color: 'text-blue-400', bgColor: 'bg-blue-500/10' }]
                  : []),
              ]}
              onClick={() => setViewingItem(monster)}
              onDelete={() => handleDelete(monster)}
              onAssign={() =>
                setAssignModalItem({
                  id: monster.id,
                  name: monster.name,
                  currentCampaignId: monster.campaign_id,
                })
              }
            />
          ))}
        </div>
      </ContentListLayout>

      {/* Detail Modal */}
      {viewingItem && (
        <MonsterDetailModal
          monster={viewingItem}
          onClose={() => setViewingItem(null)}
          onDelete={() => handleDelete(viewingItem)}
        />
      )}

      {/* Assign Campaign Modal */}
      {assignModalItem && (
        <AssignCampaignModal
          isOpen={true}
          onClose={() => setAssignModalItem(null)}
          contentType="monsters"
          contentId={assignModalItem.id}
          contentName={assignModalItem.name}
          currentCampaignId={assignModalItem.currentCampaignId}
          onSuccess={refresh}
        />
      )}
    </div>
  )
}

// Monster Detail Modal
interface MonsterDetailModalProps {
  monster: Monster
  onClose: () => void
  onDelete: () => void
}

function MonsterDetailModal({ monster, onClose, onDelete }: MonsterDetailModalProps) {
  const getCRDisplay = (cr: number | string) => `CR ${cr}`

  const subtitle = [getCRDisplay(monster.cr), monster.type].filter(Boolean).join(' • ')

  return (
    <ContentDetailModal
      isOpen={true}
      onClose={onClose}
      icon="Skull"
      iconColor="orange"
      title={monster.name}
      subtitle={subtitle || undefined}
      onDelete={onDelete}
    >
      <div className="space-y-6">
        {/* Stats Row */}
        <div className="flex flex-wrap gap-3">
          {monster.hp && (
            <div className="px-4 py-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <p className="text-xs text-text-muted">Hit Points</p>
              <p className="text-lg font-semibold text-orange-400">{monster.hp}</p>
            </div>
          )}
          {monster.ac && (
            <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-xs text-text-muted">Armor Class</p>
              <p className="text-lg font-semibold text-blue-400">{monster.ac}</p>
            </div>
          )}
          {monster.size && (
            <div className="px-4 py-2 bg-background border border-border rounded-lg">
              <p className="text-xs text-text-muted">Size</p>
              <p className="text-lg font-semibold text-text capitalize">{monster.size}</p>
            </div>
          )}
          {monster.alignment && (
            <div className="px-4 py-2 bg-background border border-border rounded-lg">
              <p className="text-xs text-text-muted">Alignment</p>
              <p className="text-lg font-semibold text-text capitalize">{monster.alignment}</p>
            </div>
          )}
        </div>

        {/* Lore */}
        {monster.lore && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Lore
            </h4>
            <div className="prose prose-invert prose-tavern max-w-none">
              <ReactMarkdown>{monster.lore.replace(/\\n/g, '\n')}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* Abilities */}
        {monster.abilities && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Abilities
            </h4>
            <div className="prose prose-invert prose-tavern max-w-none">
              <ReactMarkdown>{monster.abilities.replace(/\\n/g, '\n')}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* Tactics */}
        {monster.tactics && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Tactics
            </h4>
            <div className="prose prose-invert prose-tavern max-w-none">
              <ReactMarkdown>{monster.tactics.replace(/\\n/g, '\n')}</ReactMarkdown>
            </div>
          </div>
        )}

        {!monster.lore && !monster.abilities && !monster.tactics && (
          <p className="text-text-muted italic">No additional details</p>
        )}
      </div>
    </ContentDetailModal>
  )
}
