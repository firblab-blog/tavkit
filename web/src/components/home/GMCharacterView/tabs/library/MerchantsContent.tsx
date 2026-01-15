import ContentListLayout from '../../../../common/ContentListLayout'
import { useGeneratorModalStore } from '../../../../../store/generatorModalStore'
import ContentCard from '../../../../common/ContentCard'
import ContentDetailModal from '../../../../common/ContentDetailModal'
import AssignCampaignModal from '../../../../common/AssignCampaignModal'
import { useLibraryContent } from '../../../../../hooks/useLibraryContent'
import { useCampaignStore } from '../../../../../store/campaignStore'
import { useState } from 'react'
import { logger } from '@/utils/logger'

interface Merchant {
  id: string
  name: string
  campaign_id?: string | null
  shop_type: string
  quality?: string
  size?: string
  atmosphere?: string
  description?: string
  location?: string
  owner_name?: string
  owner_personality?: string
  inventory?: any
  services?: any
  special_items?: any
  special_notes?: string
  ai_generated?: boolean
  created_at: string
}

interface MerchantsContentProps {
  campaignId?: string
  showCampaignFilter?: boolean
}

export default function MerchantsContent({ campaignId, showCampaignFilter }: MerchantsContentProps) {
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
  } = useLibraryContent<Merchant>({
    contentType: 'merchants',
    campaignId,
    showCampaignFilter,
    searchFields: ['name', 'shop_type', 'location', 'atmosphere'],
  })

  const handleDelete = async (merchant: Merchant) => {
    if (window.confirm(`Delete "${merchant.name}"? This cannot be undone.`)) {
      try {
        await deleteItem(merchant.id)
      } catch (err) {
        logger.error('Failed to delete merchant:', err)
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
        searchPlaceholder="Search merchants..."
        addButtonLabel="Add Merchant"
        onAddClick={() => openGenerator('merchant')}
        addButtonColor="teal"
        loading={loading}
        error={error}
        emptyIcon="Store"
        emptyTitle="No merchants yet"
        emptyDescription="Create shops, vendors, and traders."
        emptyCTALabel="Create Your First Merchant"
        onEmptyCTAClick={() => openGenerator('merchant')}
        hasItems={filteredItems.length > 0}
      >
        <div className="space-y-3">
          {filteredItems.map((merchant) => (
            <ContentCard
              key={merchant.id}
              title={merchant.name}
              preview={merchant.atmosphere || merchant.location || undefined}
              icon="Store"
              iconColor="teal"
              date={merchant.created_at}
              badges={[
                { label: merchant.shop_type.replace(/_/g, ' ') },
                ...(merchant.quality ? [{ label: merchant.quality }] : []),
                ...(merchant.size ? [{ label: merchant.size }] : []),
              ]}
              onClick={() => setViewingItem(merchant)}
              onDelete={() => handleDelete(merchant)}
              onAssign={() =>
                setAssignModalItem({
                  id: merchant.id,
                  name: merchant.name,
                  currentCampaignId: merchant.campaign_id,
                })
              }
            />
          ))}
        </div>
      </ContentListLayout>

      {viewingItem && (
        <MerchantDetailModal
          merchant={viewingItem}
          onClose={() => setViewingItem(null)}
          onDelete={() => handleDelete(viewingItem)}
        />
      )}

      {assignModalItem && (
        <AssignCampaignModal
          isOpen={true}
          onClose={() => setAssignModalItem(null)}
          contentType="merchants"
          contentId={assignModalItem.id}
          contentName={assignModalItem.name}
          currentCampaignId={assignModalItem.currentCampaignId}
          onSuccess={refresh}
        />
      )}
    </div>
  )
}

interface MerchantDetailModalProps {
  merchant: Merchant
  onClose: () => void
  onDelete: () => void
}

function MerchantDetailModal({ merchant, onClose, onDelete }: MerchantDetailModalProps) {
  let inventory: any[] = []
  let specialItems: any[] = []

  try {
    inventory = merchant.inventory ? (typeof merchant.inventory === 'string' ? JSON.parse(merchant.inventory) : merchant.inventory) : []
    specialItems = merchant.special_items ? (typeof merchant.special_items === 'string' ? JSON.parse(merchant.special_items) : merchant.special_items) : []
  } catch (err) {
    logger.error('Failed to parse merchant data:', err)
  }

  return (
    <ContentDetailModal
      isOpen={true}
      onClose={onClose}
      icon="Store"
      iconColor="teal"
      title={merchant.name}
      subtitle={merchant.shop_type.replace(/_/g, ' ')}
      onDelete={onDelete}
    >
      <div className="space-y-6">
        {merchant.location && (
          <p className="text-teal-400">📍 {merchant.location}</p>
        )}

        {merchant.atmosphere && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Atmosphere
            </h4>
            <p className="text-text leading-relaxed">{merchant.atmosphere}</p>
          </div>
        )}

        {(merchant.owner_name || merchant.owner_personality) && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Owner
            </h4>
            <div className="bg-background p-4 rounded-lg border border-border">
              {merchant.owner_name && <p className="text-text font-medium">{merchant.owner_name}</p>}
              {merchant.owner_personality && <p className="text-text-muted mt-1">{merchant.owner_personality}</p>}
            </div>
          </div>
        )}

        {inventory.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Inventory
            </h4>
            <div className="bg-background p-4 rounded-lg border border-border">
              <ul className="space-y-2">
                {inventory.map((item: any, i: number) => (
                  <li key={i} className="flex justify-between">
                    <span className="text-text">{item.name || item}</span>
                    {item.price && <span className="text-amber-400">{item.price}</span>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {specialItems.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Special Items
            </h4>
            <div className="space-y-2">
              {specialItems.map((item: any, i: number) => (
                <div key={i} className="bg-purple-500/10 p-3 rounded-lg border border-purple-500/30">
                  <p className="text-purple-400 font-medium">{item.name || item}</p>
                  {item.description && <p className="text-text-muted text-sm mt-1">{item.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {merchant.special_notes && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Special Notes
            </h4>
            <p className="text-text leading-relaxed whitespace-pre-wrap">{merchant.special_notes}</p>
          </div>
        )}
      </div>
    </ContentDetailModal>
  )
}
