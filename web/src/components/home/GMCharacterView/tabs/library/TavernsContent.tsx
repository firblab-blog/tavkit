import ContentListLayout from '../../../../common/ContentListLayout'
import { useGeneratorModalStore } from '../../../../../store/generatorModalStore'
import ContentCard from '../../../../common/ContentCard'
import ContentDetailModal from '../../../../common/ContentDetailModal'
import AssignCampaignModal from '../../../../common/AssignCampaignModal'
import { useLibraryContent } from '../../../../../hooks/useLibraryContent'
import { useCampaignStore } from '../../../../../store/campaignStore'
import { useState } from 'react'
import { logger } from '@/utils/logger'

interface Tavern {
  id: string
  name: string
  campaign_id?: string | null
  type: string
  quality?: string
  size?: string
  atmosphere?: string
  menu?: any
  rooms?: any
  services?: any
  staff?: any
  patrons?: any
  special_notes?: string
  ai_generated?: boolean
  created_at: string
}

interface TavernsContentProps {
  campaignId?: string
  showCampaignFilter?: boolean
}

export default function TavernsContent({ campaignId, showCampaignFilter }: TavernsContentProps) {
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
  } = useLibraryContent<Tavern>({
    contentType: 'taverns',
    campaignId,
    showCampaignFilter,
    searchFields: ['name', 'type', 'atmosphere'],
  })

  const handleDelete = async (tavern: Tavern) => {
    if (window.confirm(`Delete "${tavern.name}"? This cannot be undone.`)) {
      try {
        await deleteItem(tavern.id)
      } catch (err) {
        logger.error('Failed to delete tavern:', err)
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
        searchPlaceholder="Search taverns..."
        addButtonLabel="Add Tavern"
        onAddClick={() => openGenerator('tavern')}
        addButtonColor="yellow"
        loading={loading}
        error={error}
        emptyIcon="Beer"
        emptyTitle="No taverns yet"
        emptyDescription="Create inns, pubs, and gathering places."
        emptyCTALabel="Create Your First Tavern"
        onEmptyCTAClick={() => openGenerator('tavern')}
        hasItems={filteredItems.length > 0}
      >
        <div className="space-y-3">
          {filteredItems.map((tavern) => (
            <ContentCard
              key={tavern.id}
              title={tavern.name}
              preview={tavern.atmosphere || undefined}
              icon="Beer"
              iconColor="yellow"
              date={tavern.created_at}
              badges={[
                { label: tavern.type },
                ...(tavern.quality ? [{ label: tavern.quality }] : []),
                ...(tavern.size ? [{ label: tavern.size }] : []),
              ]}
              onClick={() => setViewingItem(tavern)}
              onDelete={() => handleDelete(tavern)}
              onAssign={() =>
                setAssignModalItem({
                  id: tavern.id,
                  name: tavern.name,
                  currentCampaignId: tavern.campaign_id,
                })
              }
            />
          ))}
        </div>
      </ContentListLayout>

      {viewingItem && (
        <TavernDetailModal
          tavern={viewingItem}
          onClose={() => setViewingItem(null)}
          onDelete={() => handleDelete(viewingItem)}
        />
      )}

      {assignModalItem && (
        <AssignCampaignModal
          isOpen={true}
          onClose={() => setAssignModalItem(null)}
          contentType="taverns"
          contentId={assignModalItem.id}
          contentName={assignModalItem.name}
          currentCampaignId={assignModalItem.currentCampaignId}
          onSuccess={refresh}
        />
      )}
    </div>
  )
}

interface TavernDetailModalProps {
  tavern: Tavern
  onClose: () => void
  onDelete: () => void
}

function TavernDetailModal({ tavern, onClose, onDelete }: TavernDetailModalProps) {
  let menu: any[] = []
  let staff: any[] = []
  let services: any[] = []

  try {
    menu = tavern.menu ? (typeof tavern.menu === 'string' ? JSON.parse(tavern.menu) : tavern.menu) : []
    staff = tavern.staff ? (typeof tavern.staff === 'string' ? JSON.parse(tavern.staff) : tavern.staff) : []
    services = tavern.services ? (typeof tavern.services === 'string' ? JSON.parse(tavern.services) : tavern.services) : []
  } catch (err) {
    logger.error('Failed to parse tavern data:', err)
  }

  return (
    <ContentDetailModal
      isOpen={true}
      onClose={onClose}
      icon="Beer"
      iconColor="yellow"
      title={tavern.name}
      subtitle={[tavern.type, tavern.quality, tavern.size].filter(Boolean).join(' • ')}
      onDelete={onDelete}
    >
      <div className="space-y-6">
        {tavern.atmosphere && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Atmosphere
            </h4>
            <p className="text-text leading-relaxed">{tavern.atmosphere}</p>
          </div>
        )}

        {staff.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Staff
            </h4>
            <div className="space-y-2">
              {staff.map((person: any, i: number) => (
                <div key={i} className="bg-background p-3 rounded-lg border border-border">
                  <p className="text-text font-medium">{person.name || person}</p>
                  {person.role && <p className="text-text-muted text-sm">{person.role}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {menu.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Menu
            </h4>
            <div className="bg-background p-4 rounded-lg border border-border">
              <ul className="space-y-2">
                {menu.map((item: any, i: number) => (
                  <li key={i} className="flex justify-between">
                    <span className="text-text">{item.name || item}</span>
                    {item.price && <span className="text-amber-400">{item.price}</span>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {services.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Services
            </h4>
            <ul className="list-disc list-inside text-text space-y-1">
              {services.map((service: any, i: number) => (
                <li key={i}>{typeof service === 'string' ? service : service.name}</li>
              ))}
            </ul>
          </div>
        )}

        {tavern.special_notes && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Special Notes
            </h4>
            <p className="text-text leading-relaxed whitespace-pre-wrap">{tavern.special_notes}</p>
          </div>
        )}
      </div>
    </ContentDetailModal>
  )
}
