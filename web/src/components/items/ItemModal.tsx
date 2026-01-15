import { useState } from 'react'
import Icon from '../common/Icon'
import { Item, CreateItemRequest, ITEM_TYPES, ITEM_RARITIES } from '../../api/items'
import { useItemStore } from '../../store/itemStore'
import { useCampaignStore } from '../../store/campaignStore'

interface ItemModalProps {
  item?: Item // If provided, edit mode
  onClose: () => void
  onSave: (item: Item) => void
}

export default function ItemModal({ item, onClose, onSave }: ItemModalProps) {
  const { createItem, updateItem } = useItemStore()
  const { campaigns, activeCampaignId } = useCampaignStore()
  const isEditMode = !!item

  const [formData, setFormData] = useState<CreateItemRequest>({
    name: item?.name || '',
    type: item?.type || 'treasure',
    rarity: item?.rarity || 'common',
    description: item?.description || '',
    value: item?.value,
    weight: item?.weight,
    attunement: item?.attunement || false,
    origin: item?.origin || '',
    previous_owner: item?.previous_owner || '',
    complication: item?.complication || '',
    campaign_id: item?.campaign_id || activeCampaignId || '',
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.name.trim()) {
      setError('Item name is required')
      return
    }

    setSaving(true)

    try {
      if (isEditMode && item) {
        const success = await updateItem(item.id, {
          name: formData.name,
          type: formData.type,
          rarity: formData.rarity,
          description: formData.description,
          value: formData.value,
          weight: formData.weight,
          attunement: formData.attunement,
          origin: formData.origin,
          previous_owner: formData.previous_owner,
          complication: formData.complication,
        })

        if (success) {
          onSave({ ...item, ...formData })
        } else {
          setError('Failed to update item')
        }
      } else {
        const newItem = await createItem({
          ...formData,
          campaign_id: formData.campaign_id || undefined,
        })

        if (newItem) {
          onSave(newItem)
        } else {
          setError('Failed to create item')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background-panel border border-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-bold text-text flex items-center gap-2">
            <Icon name="Gem" className="w-6 h-6 text-primary" />
            {isEditMode ? 'Edit Item' : 'Create New Item'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-tavern-dark rounded-lg transition-colors"
          >
            <Icon name="X" className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
              Basic Information
            </h3>

            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text focus:outline-none focus:border-primary"
                placeholder="Enter item name..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text focus:outline-none focus:border-primary"
                >
                  {ITEM_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1">Rarity</label>
                <select
                  value={formData.rarity || 'common'}
                  onChange={(e) => setFormData({ ...formData, rarity: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text focus:outline-none focus:border-primary"
                >
                  {ITEM_RARITIES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text focus:outline-none focus:border-primary resize-none"
                rows={4}
                placeholder="Describe this item..."
              />
            </div>
          </div>

          {/* Properties */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
              Properties
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Value (gp)</label>
                <input
                  type="number"
                  value={formData.value ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      value: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text focus:outline-none focus:border-primary"
                  placeholder="0"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1">Weight (lb)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.weight ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      weight: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text focus:outline-none focus:border-primary"
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="attunement"
                checked={formData.attunement || false}
                onChange={(e) => setFormData({ ...formData, attunement: e.target.checked })}
                className="w-4 h-4 rounded border-border"
              />
              <label htmlFor="attunement" className="text-sm text-text">
                Requires Attunement
              </label>
            </div>
          </div>

          {/* Lore */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
              History & Lore
            </h3>

            <div>
              <label className="block text-sm font-medium text-text mb-1">Origin</label>
              <textarea
                value={formData.origin}
                onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text focus:outline-none focus:border-primary resize-none"
                rows={2}
                placeholder="How was this item created?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1">Previous Owner</label>
              <input
                type="text"
                value={formData.previous_owner}
                onChange={(e) => setFormData({ ...formData, previous_owner: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text focus:outline-none focus:border-primary"
                placeholder="Who owned this item before?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1">Complication</label>
              <textarea
                value={formData.complication}
                onChange={(e) => setFormData({ ...formData, complication: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text focus:outline-none focus:border-primary resize-none"
                rows={2}
                placeholder="Any curse, flaw, or story hook?"
              />
            </div>
          </div>

          {/* Campaign Association */}
          {!isEditMode && campaigns.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
                Campaign
              </h3>
              <div>
                <label className="block text-sm font-medium text-text mb-1">
                  Associate with Campaign (optional)
                </label>
                <select
                  value={formData.campaign_id || ''}
                  onChange={(e) => setFormData({ ...formData, campaign_id: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text focus:outline-none focus:border-primary"
                >
                  <option value="">No campaign (global item)</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-text-muted mt-1">
                  Items can be linked to multiple campaigns later from the Campaigns tab.
                </p>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-text-muted hover:text-text transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Icon name="Loader2" className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Icon name="Save" className="w-4 h-4" />
                {isEditMode ? 'Save Changes' : 'Create Item'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
