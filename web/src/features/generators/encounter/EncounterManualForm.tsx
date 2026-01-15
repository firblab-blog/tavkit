// Manual Entry Form for Encounters

import Icon from '@/components/common/Icon'
import { FormField } from '@/components/ui/FormField'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'
import CampaignSelector from '@/components/common/CampaignSelector'
import { ArrayFieldEditor } from '../components/Fields'
import {
  encounterTypeOptions,
  difficultyOptions,
  type ManualEncounterData,
} from '../schemas/encounter'

interface EncounterManualFormProps {
  campaignId: string | null
  onCampaignSelect: (id: string | null) => void
  manualData: ManualEncounterData
  setManualData: (data: ManualEncounterData | ((prev: ManualEncounterData) => ManualEncounterData)) => void
  onSave: () => void
  saving: boolean
  saved: boolean
  error: string | null
}

export function EncounterManualForm({
  campaignId,
  onCampaignSelect,
  manualData,
  setManualData,
  onSave,
  saving,
  saved,
  error,
}: EncounterManualFormProps) {
  return (
    <>
      <CampaignSelector selectedCampaignId={campaignId} onSelect={onCampaignSelect} />

      {/* Basic Information */}
      <FormField label="Encounter Name" required>
        <input
          type="text"
          value={manualData.name}
          onChange={(e) => setManualData({ ...manualData, name: e.target.value })}
          placeholder="e.g., Ambush at the Bridge, The Goblin Camp"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Encounter Type">
          <select
            value={manualData.encounter_type}
            onChange={(e) => setManualData({ ...manualData, encounter_type: e.target.value })}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {encounterTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Difficulty">
          <select
            value={manualData.difficulty}
            onChange={(e) => setManualData({ ...manualData, difficulty: e.target.value })}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {difficultyOptions.map((opt) => (
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
          placeholder="Describe the encounter scenario..."
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={3}
        />
      </FormField>

      <FormField label="Environment">
        <input
          type="text"
          value={manualData.environment}
          onChange={(e) => setManualData({ ...manualData, environment: e.target.value })}
          placeholder="e.g., Forest clearing, Underground cavern"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      {/* Creatures */}
      <CollapsibleSection title="Creatures" defaultExpanded>
        <div className="space-y-3">
          {manualData.creatures.map((creature, idx) => (
            <div key={idx} className="bg-background p-3 rounded border border-border space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-text">Creature {idx + 1}</span>
                <button
                  type="button"
                  onClick={() => {
                    const newCreatures = [...manualData.creatures]
                    newCreatures.splice(idx, 1)
                    setManualData({ ...manualData, creatures: newCreatures })
                  }}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={creature.name}
                  onChange={(e) => {
                    const newCreatures = [...manualData.creatures]
                    newCreatures[idx] = { ...creature, name: e.target.value }
                    setManualData({ ...manualData, creatures: newCreatures })
                  }}
                  placeholder="Creature name"
                  className="col-span-2 w-full px-3 py-1.5 bg-background border border-border rounded text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <input
                  type="number"
                  min={1}
                  value={creature.count}
                  onChange={(e) => {
                    const newCreatures = [...manualData.creatures]
                    newCreatures[idx] = { ...creature, count: parseInt(e.target.value) || 1 }
                    setManualData({ ...manualData, creatures: newCreatures })
                  }}
                  placeholder="#"
                  className="w-full px-3 py-1.5 bg-background border border-border rounded text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <input
                type="text"
                value={creature.notes}
                onChange={(e) => {
                  const newCreatures = [...manualData.creatures]
                  newCreatures[idx] = { ...creature, notes: e.target.value }
                  setManualData({ ...manualData, creatures: newCreatures })
                }}
                placeholder="Notes (tactics, special abilities, etc.)"
                className="w-full px-3 py-1.5 bg-background border border-border rounded text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setManualData({
                ...manualData,
                creatures: [...manualData.creatures, { name: '', count: 1, notes: '' }],
              })
            }
            className="w-full px-3 py-2 border border-dashed border-border text-text-muted hover:border-primary hover:text-primary rounded transition-colors text-sm"
          >
            + Add Creature
          </button>
        </div>
      </CollapsibleSection>

      {/* Setup */}
      <CollapsibleSection title="Setup & Initial Conditions" defaultExpanded={false}>
        <FormField label="Setup">
          <textarea
            value={manualData.setup}
            onChange={(e) => setManualData({ ...manualData, setup: e.target.value })}
            placeholder="Initial positions, surprise, timing, etc."
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            rows={2}
          />
        </FormField>
      </CollapsibleSection>

      {/* Objectives */}
      <CollapsibleSection title="Objectives" defaultExpanded={false}>
        <ArrayFieldEditor
          label="Objectives"
          values={manualData.objectives}
          onChange={(objectives) => setManualData({ ...manualData, objectives })}
          placeholder="Add an objective..."
        />
      </CollapsibleSection>

      {/* Terrain Features */}
      <CollapsibleSection title="Terrain Features" defaultExpanded={false}>
        <ArrayFieldEditor
          label="Terrain Features"
          values={manualData.terrain_features}
          onChange={(terrain_features) => setManualData({ ...manualData, terrain_features })}
          placeholder="Add a terrain feature..."
        />
      </CollapsibleSection>

      {/* Tactics */}
      <CollapsibleSection title="Tactics & Strategies" defaultExpanded={false}>
        <ArrayFieldEditor
          label="Tactics"
          values={manualData.tactics}
          onChange={(tactics) => setManualData({ ...manualData, tactics })}
          placeholder="Add a tactic..."
        />
      </CollapsibleSection>

      {/* Complications */}
      <CollapsibleSection title="Complications" defaultExpanded={false}>
        <ArrayFieldEditor
          label="Complications"
          values={manualData.complications}
          onChange={(complications) => setManualData({ ...manualData, complications })}
          placeholder="Add a complication..."
        />
      </CollapsibleSection>

      {/* Treasure */}
      <CollapsibleSection title="Treasure" defaultExpanded={false}>
        <ArrayFieldEditor
          label="Treasure"
          values={manualData.treasure}
          onChange={(treasure) => setManualData({ ...manualData, treasure })}
          placeholder="Add treasure..."
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
            Save Encounter
          </>
        )}
      </button>

      {saved && (
        <div className="text-center text-green-400 text-sm">
          Encounter saved! You can find it in the Saved Content section.
        </div>
      )}
    </>
  )
}
