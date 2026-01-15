// Manual Entry Form for Items

import Icon from '@/components/common/Icon'
import { FormField } from '@/components/ui/FormField'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'
import CampaignSelector from '@/components/common/CampaignSelector'
import { ObjectArrayEditor } from '../components/Fields'
import { itemTypeOptions, itemRarityOptions, type ManualItemData } from '../schemas/item'

interface ItemManualFormProps {
  campaignId: string | null
  onCampaignSelect: (id: string | null) => void
  manualData: ManualItemData
  setManualData: (data: ManualItemData | ((prev: ManualItemData) => ManualItemData)) => void
  onSave: () => void
  saving: boolean
  saved: boolean
  error: string | null
}

export function ItemManualForm({
  campaignId,
  onCampaignSelect,
  manualData,
  setManualData,
  onSave,
  saving,
  saved,
  error,
}: ItemManualFormProps) {
  return (
    <>
      <CampaignSelector selectedCampaignId={campaignId} onSelect={onCampaignSelect} />

      {/* Basic Information */}
      <FormField label="Item Name" required>
        <input
          type="text"
          value={manualData.name}
          onChange={(e) => setManualData({ ...manualData, name: e.target.value })}
          placeholder="e.g., Flamebrand Longsword"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Item Type">
          <select
            value={manualData.type}
            onChange={(e) => setManualData({ ...manualData, type: e.target.value })}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {itemTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Rarity">
          <select
            value={manualData.rarity}
            onChange={(e) => setManualData({ ...manualData, rarity: e.target.value })}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {itemRarityOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField label="Description">
        <textarea
          value={manualData.description}
          onChange={(e) => setManualData({ ...manualData, description: e.target.value })}
          placeholder="Describe the item's appearance, aura, history..."
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={4}
        />
      </FormField>

      <FormField label="Origin">
        <textarea
          value={manualData.origin}
          onChange={(e) => setManualData({ ...manualData, origin: e.target.value })}
          placeholder="Where did this item come from? Who made it?"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={2}
        />
      </FormField>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <FormField label="Value (gp)">
          <input
            type="number"
            value={manualData.value ?? ''}
            onChange={(e) =>
              setManualData({
                ...manualData,
                value: e.target.value ? parseInt(e.target.value) : null,
              })
            }
            placeholder="100"
            min={0}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </FormField>

        <FormField label="Weight (lb)">
          <input
            type="number"
            value={manualData.weight ?? ''}
            onChange={(e) =>
              setManualData({
                ...manualData,
                weight: e.target.value ? parseFloat(e.target.value) : null,
              })
            }
            placeholder="3"
            min={0}
            step="0.1"
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </FormField>

        <FormField label="Attunement">
          <div className="flex items-center h-full pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={manualData.attunement}
                onChange={(e) => setManualData({ ...manualData, attunement: e.target.checked })}
                className="w-5 h-5 rounded border-border bg-background text-primary focus:ring-primary"
              />
              <span className="text-text">Required</span>
            </label>
          </div>
        </FormField>
      </div>

      {/* Properties */}
      <CollapsibleSection title="Properties" defaultExpanded={false}>
        <ObjectArrayEditor
          label="Magical Properties"
          values={manualData.properties.map((p) => ({ name: p.name, description: p.value }))}
          onChange={(props) =>
            setManualData({
              ...manualData,
              properties: props.map((p) => ({ name: p.name, value: p.description })),
            })
          }
          namePlaceholder="Property name (e.g., Damage Bonus)"
          descriptionPlaceholder="Property value or effect..."
        />
      </CollapsibleSection>

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Save Button */}
      <button
        type="button"
        onClick={onSave}
        disabled={saving || !manualData.name.trim()}
        className="w-full px-4 py-3 bg-primary hover:bg-primary-dark disabled:bg-primary/50 text-tavern-darkest font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {saving ? (
          <>
            <Icon name="Loader2" className="w-5 h-5 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Icon name="Save" className="w-5 h-5" />
            Save Item
          </>
        )}
      </button>

      {saved && (
        <div className="text-center text-green-400 text-sm">
          Item saved! You can find it in the Saved Content section.
        </div>
      )}
    </>
  )
}
