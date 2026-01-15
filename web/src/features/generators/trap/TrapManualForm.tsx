// Manual Entry Form for Traps

import Icon from '@/components/common/Icon'
import { FormField } from '@/components/ui/FormField'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'
import CampaignSelector from '@/components/common/CampaignSelector'
import { ArrayFieldEditor } from '../components/Fields'
import { trapTypeOptions, type ManualTrapData } from '../schemas/trap'

interface TrapManualFormProps {
  campaignId: string | null
  onCampaignSelect: (id: string | null) => void
  manualData: ManualTrapData
  setManualData: (data: ManualTrapData | ((prev: ManualTrapData) => ManualTrapData)) => void
  onSave: () => void
  saving: boolean
  saved: boolean
  error: string | null
}

export function TrapManualForm({
  campaignId,
  onCampaignSelect,
  manualData,
  setManualData,
  onSave,
  saving,
  saved,
  error,
}: TrapManualFormProps) {
  return (
    <>
      <CampaignSelector selectedCampaignId={campaignId} onSelect={onCampaignSelect} />

      {/* Basic Information */}
      <FormField label="Trap Name" required>
        <input
          type="text"
          value={manualData.name}
          onChange={(e) => setManualData({ ...manualData, name: e.target.value })}
          placeholder="e.g., Pendulum Blade, Poison Dart Trap"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      <FormField label="Trap Type">
        <select
          value={manualData.trap_type}
          onChange={(e) => setManualData({ ...manualData, trap_type: e.target.value })}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {trapTypeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      {/* Trap Mechanics */}
      <CollapsibleSection title="Trap Mechanics" defaultExpanded>
        <div className="space-y-3">
          <FormField label="Trigger">
            <input
              type="text"
              value={manualData.trigger}
              onChange={(e) => setManualData({ ...manualData, trigger: e.target.value })}
              placeholder="e.g., Pressure plate, Tripwire, Opening a door"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </FormField>

          <FormField label="Effect">
            <textarea
              value={manualData.effect}
              onChange={(e) => setManualData({ ...manualData, effect: e.target.value })}
              placeholder="What happens when the trap is triggered?"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={2}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Damage">
              <input
                type="text"
                value={manualData.damage}
                onChange={(e) => setManualData({ ...manualData, damage: e.target.value })}
                placeholder="e.g., 2d10 piercing"
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </FormField>

            <FormField label="Save DC">
              <input
                type="number"
                min={1}
                max={30}
                value={manualData.save_dc || ''}
                onChange={(e) =>
                  setManualData({
                    ...manualData,
                    save_dc: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                placeholder="DC"
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </FormField>
          </div>
        </div>
      </CollapsibleSection>

      {/* Detection & Disarm */}
      <CollapsibleSection title="Detection & Disarm" defaultExpanded={false}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Detection DC">
              <input
                type="number"
                min={1}
                max={30}
                value={manualData.detection_dc || ''}
                onChange={(e) =>
                  setManualData({
                    ...manualData,
                    detection_dc: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                placeholder="Perception DC"
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </FormField>

            <FormField label="Disarm DC">
              <input
                type="number"
                min={1}
                max={30}
                value={manualData.disarm_dc || ''}
                onChange={(e) =>
                  setManualData({
                    ...manualData,
                    disarm_dc: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                placeholder="Thieves' Tools DC"
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </FormField>
          </div>

          <FormField label="Bypass Method">
            <textarea
              value={manualData.bypass}
              onChange={(e) => setManualData({ ...manualData, bypass: e.target.value })}
              placeholder="How can the trap be avoided or bypassed?"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={2}
            />
          </FormField>
        </div>
      </CollapsibleSection>

      {/* Reset & Countermeasures */}
      <CollapsibleSection title="Reset & Countermeasures" defaultExpanded={false}>
        <div className="space-y-3">
          <FormField label="Reset Mechanism">
            <input
              type="text"
              value={manualData.reset}
              onChange={(e) => setManualData({ ...manualData, reset: e.target.value })}
              placeholder="e.g., Automatic (1 minute), Manual, None"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </FormField>

          <ArrayFieldEditor
            label="Countermeasures"
            values={manualData.countermeasures}
            onChange={(countermeasures) => setManualData({ ...manualData, countermeasures })}
            placeholder="Add a countermeasure..."
          />
        </div>
      </CollapsibleSection>

      {/* Lore */}
      <CollapsibleSection title="Lore & Description" defaultExpanded={false}>
        <FormField label="Lore/Description">
          <textarea
            value={manualData.lore}
            onChange={(e) => setManualData({ ...manualData, lore: e.target.value })}
            placeholder="Background, purpose, or description of the trap..."
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
            Save Trap
          </>
        )}
      </button>

      {saved && (
        <div className="text-center text-green-400 text-sm">
          Trap saved! You can find it in the Saved Content section.
        </div>
      )}
    </>
  )
}
