import { useState } from 'react'
import Icon from '../common/Icon'
import { Item, getRarityColor, ITEM_RARITIES, ITEM_TYPES } from '../../api/items'
import { useItemStore } from '../../store/itemStore'
import { useCampaignStore } from '../../store/campaignStore'
import { getCampaignItems, linkItemToCampaign, unlinkItemFromCampaign } from '../../api/items'
import { logger } from '../../utils/logger'

interface ItemDetailProps {
  item: Item
  onUpdate: () => void
  onClose: () => void
}

export default function ItemDetail({ item, onUpdate, onClose }: ItemDetailProps) {
  const { updateItem } = useItemStore()
  const { campaigns } = useCampaignStore()
  const [isEditing, setIsEditing] = useState(false)
  const [editedItem, setEditedItem] = useState(item)
  const [activeTab, setActiveTab] = useState<'details' | 'campaigns'>('details')
  const [linkedCampaigns, setLinkedCampaigns] = useState<string[]>([])
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)
  const [linkingCampaignId, setLinkingCampaignId] = useState<string | null>(null)

  const formatRarity = (rarity?: string): string => {
    if (!rarity) return 'Common'
    return rarity.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const getTypeIcon = (
    type: string
  ):
    | 'Sword'
    | 'Shield'
    | 'FlaskConical'
    | 'Gem'
    | 'Wrench'
    | 'Scroll'
    | 'Crown'
    | 'Sparkles'
    | 'Package' => {
    switch (type) {
      case 'weapon':
        return 'Sword'
      case 'armor':
        return 'Shield'
      case 'consumable':
        return 'FlaskConical'
      case 'treasure':
        return 'Gem'
      case 'tool':
        return 'Wrench'
      case 'quest_item':
        return 'Scroll'
      case 'relic':
        return 'Crown'
      case 'wondrous':
        return 'Sparkles'
      default:
        return 'Package'
    }
  }

  const handleSave = async () => {
    const success = await updateItem(item.id, {
      name: editedItem.name,
      type: editedItem.type,
      rarity: editedItem.rarity,
      description: editedItem.description,
      value: editedItem.value,
      weight: editedItem.weight,
      attunement: editedItem.attunement,
      origin: editedItem.origin,
      previous_owner: editedItem.previous_owner,
      complication: editedItem.complication,
    })

    if (success) {
      setIsEditing(false)
      onUpdate()
    }
  }

  const loadLinkedCampaigns = async () => {
    if (loadingCampaigns) return
    setLoadingCampaigns(true)

    // Check which campaigns this item is linked to
    const linked: string[] = []
    for (const campaign of campaigns) {
      try {
        const items = await getCampaignItems(campaign.id)
        if (items.some((i) => i.id === item.id)) {
          linked.push(campaign.id)
        }
      } catch {
        // Ignore errors for individual campaigns
      }
    }
    setLinkedCampaigns(linked)
    setLoadingCampaigns(false)
  }

  const handleLinkToCampaign = async (campaignId: string) => {
    setLinkingCampaignId(campaignId)
    try {
      await linkItemToCampaign(campaignId, item.id)
      setLinkedCampaigns([...linkedCampaigns, campaignId])
    } catch (err) {
      logger.error('Failed to link item:', err)
    }
    setLinkingCampaignId(null)
  }

  const handleUnlinkFromCampaign = async (campaignId: string) => {
    setLinkingCampaignId(campaignId)
    try {
      await unlinkItemFromCampaign(campaignId, item.id)
      setLinkedCampaigns(linkedCampaigns.filter((id) => id !== campaignId))
    } catch (err) {
      logger.error('Failed to unlink item:', err)
    }
    setLinkingCampaignId(null)
  }

  // Load campaigns when switching to campaigns tab
  const handleTabChange = (tab: 'details' | 'campaigns') => {
    setActiveTab(tab)
    if (tab === 'campaigns' && linkedCampaigns.length === 0) {
      loadLinkedCampaigns()
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-background-panel px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 hover:bg-tavern-dark rounded transition-colors lg:hidden"
            >
              <Icon name="ArrowLeft" className="w-5 h-5 text-text-muted" />
            </button>
            <Icon
              name={getTypeIcon(item.type)}
              className={`w-8 h-8 ${getRarityColor(item.rarity)}`}
            />
            <div>
              <h1 className={`text-xl font-bold ${getRarityColor(item.rarity)}`}>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedItem.name}
                    onChange={(e) => setEditedItem({ ...editedItem, name: e.target.value })}
                    className="bg-background border border-border rounded px-2 py-1 text-text"
                  />
                ) : (
                  item.name
                )}
              </h1>
              <p className="text-sm text-text-muted">
                {formatRarity(item.rarity)} {item.type.replace(/_/g, ' ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={() => {
                    setEditedItem(item)
                    setIsEditing(false)
                  }}
                  className="px-3 py-1.5 text-text-muted hover:text-text transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-1.5 bg-primary hover:bg-primary/80 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Icon name="Save" className="w-4 h-4" />
                  Save
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-1.5 border border-border hover:border-primary text-text rounded-lg transition-colors flex items-center gap-2"
              >
                <Icon name="Edit" className="w-4 h-4" />
                Edit
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mt-4">
          <button
            onClick={() => handleTabChange('details')}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'details'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => handleTabChange('campaigns')}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'campaigns'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            Campaigns
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'details' && (
          <div className="space-y-6 max-w-3xl">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-background-panel border border-border rounded-lg p-4">
                <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Type</p>
                {isEditing ? (
                  <select
                    value={editedItem.type}
                    onChange={(e) => setEditedItem({ ...editedItem, type: e.target.value })}
                    className="w-full bg-background border border-border rounded px-2 py-1 text-text text-sm"
                  >
                    {ITEM_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="font-semibold text-text capitalize">
                    {item.type.replace(/_/g, ' ')}
                  </p>
                )}
              </div>

              <div className="bg-background-panel border border-border rounded-lg p-4">
                <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Rarity</p>
                {isEditing ? (
                  <select
                    value={editedItem.rarity || ''}
                    onChange={(e) => setEditedItem({ ...editedItem, rarity: e.target.value })}
                    className="w-full bg-background border border-border rounded px-2 py-1 text-text text-sm"
                  >
                    <option value="">Common</option>
                    {ITEM_RARITIES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className={`font-semibold ${getRarityColor(item.rarity)}`}>
                    {formatRarity(item.rarity)}
                  </p>
                )}
              </div>

              <div className="bg-background-panel border border-border rounded-lg p-4">
                <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Value</p>
                {isEditing ? (
                  <input
                    type="number"
                    value={editedItem.value || ''}
                    onChange={(e) =>
                      setEditedItem({
                        ...editedItem,
                        value: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    placeholder="0"
                    className="w-full bg-background border border-border rounded px-2 py-1 text-text text-sm"
                  />
                ) : (
                  <p className="font-semibold text-gold">{item.value ? `${item.value} gp` : '-'}</p>
                )}
              </div>

              <div className="bg-background-panel border border-border rounded-lg p-4">
                <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Weight</p>
                {isEditing ? (
                  <input
                    type="number"
                    step="0.1"
                    value={editedItem.weight || ''}
                    onChange={(e) =>
                      setEditedItem({
                        ...editedItem,
                        weight: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    placeholder="0"
                    className="w-full bg-background border border-border rounded px-2 py-1 text-text text-sm"
                  />
                ) : (
                  <p className="font-semibold text-text">
                    {item.weight ? `${item.weight} lb` : '-'}
                  </p>
                )}
              </div>
            </div>

            {/* Attunement */}
            <div className="bg-background-panel border border-border rounded-lg p-4">
              <label className="flex items-center gap-3">
                {isEditing ? (
                  <input
                    type="checkbox"
                    checked={editedItem.attunement || false}
                    onChange={(e) => setEditedItem({ ...editedItem, attunement: e.target.checked })}
                    className="w-4 h-4"
                  />
                ) : (
                  <Icon
                    name={item.attunement ? 'Check' : 'X'}
                    className={`w-5 h-5 ${item.attunement ? 'text-green-400' : 'text-text-muted'}`}
                  />
                )}
                <span className="text-text">Requires Attunement</span>
              </label>
            </div>

            {/* Description */}
            <div className="bg-background-panel border border-border rounded-lg p-4">
              <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
                Description
              </h3>
              {isEditing ? (
                <textarea
                  value={editedItem.description || ''}
                  onChange={(e) => setEditedItem({ ...editedItem, description: e.target.value })}
                  rows={4}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-text"
                  placeholder="Describe this item..."
                />
              ) : (
                <p className="text-text whitespace-pre-wrap">
                  {item.description || 'No description provided.'}
                </p>
              )}
            </div>

            {/* Origin */}
            {(item.origin || isEditing) && (
              <div className="bg-background-panel border border-border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
                  Origin
                </h3>
                {isEditing ? (
                  <textarea
                    value={editedItem.origin || ''}
                    onChange={(e) => setEditedItem({ ...editedItem, origin: e.target.value })}
                    rows={2}
                    className="w-full bg-background border border-border rounded px-3 py-2 text-text"
                    placeholder="How was this item created?"
                  />
                ) : (
                  <p className="text-text">{item.origin}</p>
                )}
              </div>
            )}

            {/* Previous Owner */}
            {(item.previous_owner || isEditing) && (
              <div className="bg-background-panel border border-border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
                  Previous Owner
                </h3>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedItem.previous_owner || ''}
                    onChange={(e) =>
                      setEditedItem({ ...editedItem, previous_owner: e.target.value })
                    }
                    className="w-full bg-background border border-border rounded px-3 py-2 text-text"
                    placeholder="Who owned this item before?"
                  />
                ) : (
                  <p className="text-text">{item.previous_owner}</p>
                )}
              </div>
            )}

            {/* Complication */}
            {(item.complication || isEditing) && (
              <div className="bg-background-panel border border-border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Icon name="AlertTriangle" className="w-4 h-4 text-yellow-400" />
                  Complication
                </h3>
                {isEditing ? (
                  <textarea
                    value={editedItem.complication || ''}
                    onChange={(e) => setEditedItem({ ...editedItem, complication: e.target.value })}
                    rows={2}
                    className="w-full bg-background border border-border rounded px-3 py-2 text-text"
                    placeholder="Any curse, flaw, or story hook?"
                  />
                ) : (
                  <p className="text-text">{item.complication}</p>
                )}
              </div>
            )}

            {/* Properties (JSON) */}
            {item.properties && Object.keys(item.properties).length > 0 && (
              <div className="bg-background-panel border border-border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
                  Properties
                </h3>
                <div className="space-y-2">
                  {Object.entries(item.properties).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-text-muted capitalize">{key.replace(/_/g, ' ')}</span>
                      <span className="text-text">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="text-xs text-text-muted">
              <p>Created: {new Date(item.created_at).toLocaleDateString()}</p>
              <p>Updated: {new Date(item.updated_at).toLocaleDateString()}</p>
              {item.ai_generated && (
                <p className="mt-1 flex items-center gap-1">
                  <Icon name="Sparkles" className="w-3 h-3" />
                  AI Generated {item.ai_provider && `(${item.ai_provider})`}
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'campaigns' && (
          <div className="max-w-3xl">
            <h3 className="text-lg font-semibold text-text mb-4">Linked Campaigns</h3>
            <p className="text-text-muted text-sm mb-6">
              Link this item to campaigns to make it available in their item lists.
            </p>

            {loadingCampaigns ? (
              <div className="flex items-center justify-center py-8">
                <Icon name="Loader2" className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-8 px-4 bg-background-panel border border-border rounded-lg">
                <Icon name="Map" className="w-12 h-12 text-text-muted mx-auto mb-3" />
                <p className="text-text-muted">No campaigns available.</p>
                <p className="text-text-muted text-sm">Create a campaign first to link items.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {campaigns.map((campaign) => {
                  const isLinked = linkedCampaigns.includes(campaign.id)
                  const isLoading = linkingCampaignId === campaign.id

                  return (
                    <div
                      key={campaign.id}
                      className="flex items-center justify-between p-4 bg-background-panel border border-border rounded-lg"
                    >
                      <div>
                        <h4 className="font-medium text-text">{campaign.name}</h4>
                        <p className="text-xs text-text-muted">{campaign.game_system}</p>
                      </div>
                      <button
                        onClick={() =>
                          isLinked
                            ? handleUnlinkFromCampaign(campaign.id)
                            : handleLinkToCampaign(campaign.id)
                        }
                        disabled={isLoading}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                          isLinked
                            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                            : 'bg-primary/20 text-primary hover:bg-primary/30'
                        }`}
                      >
                        {isLoading ? (
                          <Icon name="Loader2" className="w-4 h-4 animate-spin" />
                        ) : isLinked ? (
                          <>
                            <Icon name="LinkSlash" className="w-4 h-4" />
                            Unlink
                          </>
                        ) : (
                          <>
                            <Icon name="Link" className="w-4 h-4" />
                            Link
                          </>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
