// Manual Entry Form for Locations

import Icon from '@/components/common/Icon'
import { FormField } from '@/components/ui/FormField'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'
import CampaignSelector from '@/components/common/CampaignSelector'
import { ArrayFieldEditor } from '../components/Fields'
import { locationTypeOptions, locationSizeOptions, type ManualLocationData } from '../schemas/location'

interface LocationManualFormProps {
  campaignId: string | null
  onCampaignSelect: (id: string | null) => void
  manualData: ManualLocationData
  setManualData: (data: ManualLocationData | ((prev: ManualLocationData) => ManualLocationData)) => void
  onSave: () => void
  saving: boolean
  saved: boolean
  error: string | null
}

export function LocationManualForm({
  campaignId,
  onCampaignSelect,
  manualData,
  setManualData,
  onSave,
  saving,
  saved,
  error,
}: LocationManualFormProps) {
  return (
    <>
      <CampaignSelector selectedCampaignId={campaignId} onSelect={onCampaignSelect} />

      {/* Basic Information */}
      <FormField label="Location Name" required>
        <input
          type="text"
          value={manualData.name}
          onChange={(e) => setManualData({ ...manualData, name: e.target.value })}
          placeholder="e.g., The Sunken Crypt, Willowbrook Village"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Location Type">
          <select
            value={manualData.location_type}
            onChange={(e) => setManualData({ ...manualData, location_type: e.target.value })}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {locationTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Size">
          <select
            value={manualData.size}
            onChange={(e) => setManualData({ ...manualData, size: e.target.value })}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {locationSizeOptions.map((opt) => (
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
          placeholder="Describe the location..."
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={3}
        />
      </FormField>

      <FormField label="Atmosphere">
        <input
          type="text"
          value={manualData.atmosphere}
          onChange={(e) => setManualData({ ...manualData, atmosphere: e.target.value })}
          placeholder="e.g., Dark and foreboding, Peaceful and serene"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      {/* Notable Features */}
      <CollapsibleSection title="Notable Features" defaultExpanded>
        <ArrayFieldEditor
          label="Features"
          values={manualData.notable_features}
          onChange={(notable_features) => setManualData({ ...manualData, notable_features })}
          placeholder="Add a notable feature..."
        />
      </CollapsibleSection>

      {/* Inhabitants */}
      <CollapsibleSection title="Inhabitants" defaultExpanded={false}>
        <ArrayFieldEditor
          label="Inhabitants"
          values={manualData.inhabitants}
          onChange={(inhabitants) => setManualData({ ...manualData, inhabitants })}
          placeholder="Add an inhabitant or NPC..."
        />
      </CollapsibleSection>

      {/* Secrets */}
      <CollapsibleSection title="Secrets (DM Only)" defaultExpanded={false}>
        <ArrayFieldEditor
          label="Secrets"
          values={manualData.secrets}
          onChange={(secrets) => setManualData({ ...manualData, secrets })}
          placeholder="Add a secret..."
        />
      </CollapsibleSection>

      {/* Hazards */}
      <CollapsibleSection title="Hazards & Encounters" defaultExpanded={false}>
        <ArrayFieldEditor
          label="Hazards"
          values={manualData.hazards}
          onChange={(hazards) => setManualData({ ...manualData, hazards })}
          placeholder="Add a hazard or encounter hook..."
        />
      </CollapsibleSection>

      {/* Treasure */}
      <CollapsibleSection title="Treasure & Loot" defaultExpanded={false}>
        <ArrayFieldEditor
          label="Treasure"
          values={manualData.treasure}
          onChange={(treasure) => setManualData({ ...manualData, treasure })}
          placeholder="Add treasure or loot..."
        />
      </CollapsibleSection>

      {/* Connections */}
      <CollapsibleSection title="Connections to Other Locations" defaultExpanded={false}>
        <ArrayFieldEditor
          label="Connections"
          values={manualData.connections}
          onChange={(connections) => setManualData({ ...manualData, connections })}
          placeholder="Add a connection..."
        />
      </CollapsibleSection>

      {/* History */}
      <CollapsibleSection title="History & Lore" defaultExpanded={false}>
        <FormField label="History">
          <textarea
            value={manualData.history}
            onChange={(e) => setManualData({ ...manualData, history: e.target.value })}
            placeholder="Historical background of this location..."
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            rows={3}
          />
        </FormField>
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
            Save Location
          </>
        )}
      </button>

      {saved && (
        <div className="text-center text-green-400 text-sm">
          Location saved! You can find it in the Saved Content section.
        </div>
      )}
    </>
  )
}
