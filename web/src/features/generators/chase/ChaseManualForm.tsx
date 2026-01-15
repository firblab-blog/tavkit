// Manual Entry Form for Chase Scenarios

import { Dispatch, SetStateAction } from 'react'
import Icon from '@/components/common/Icon'
import { FormField } from '@/components/ui/FormField'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'
import CampaignSelector from '@/components/common/CampaignSelector'
import { ArrayFieldEditor } from '../components/Fields'
import {
  ManualChaseData,
  ManualObstacle,
  ManualShortcut,
  chaseTypeOptions,
  chaseDifficultyOptions,
  chaseTerrainOptions,
} from '../schemas/chase'

interface ChaseManualFormProps {
  campaignId: string | null
  onCampaignSelect: (id: string | null) => void
  manualData: ManualChaseData
  setManualData: Dispatch<SetStateAction<ManualChaseData>>
  onSave: () => void
  saving: boolean
  saved: boolean
  error: string | null
}

export function ChaseManualForm({
  campaignId,
  onCampaignSelect,
  manualData,
  setManualData,
  onSave,
  saving,
  saved,
  error,
}: ChaseManualFormProps) {
  const updateObstacle = (index: number, updates: Partial<ManualObstacle>) => {
    const newObstacles = [...manualData.obstacles]
    newObstacles[index] = { ...newObstacles[index], ...updates }
    setManualData((prev) => ({ ...prev, obstacles: newObstacles }))
  }

  const removeObstacle = (index: number) => {
    const newObstacles = [...manualData.obstacles]
    newObstacles.splice(index, 1)
    setManualData((prev) => ({ ...prev, obstacles: newObstacles }))
  }

  const addObstacle = () => {
    setManualData((prev) => ({
      ...prev,
      obstacles: [...prev.obstacles, { name: '', description: '', check: '', failure: '' }],
    }))
  }

  const updateShortcut = (index: number, updates: Partial<ManualShortcut>) => {
    const newShortcuts = [...manualData.shortcuts]
    newShortcuts[index] = { ...newShortcuts[index], ...updates }
    setManualData((prev) => ({ ...prev, shortcuts: newShortcuts }))
  }

  const removeShortcut = (index: number) => {
    const newShortcuts = [...manualData.shortcuts]
    newShortcuts.splice(index, 1)
    setManualData((prev) => ({ ...prev, shortcuts: newShortcuts }))
  }

  const addShortcut = () => {
    setManualData((prev) => ({
      ...prev,
      shortcuts: [...prev.shortcuts, { name: '', description: '', benefit: '' }],
    }))
  }

  return (
    <>
      <CampaignSelector selectedCampaignId={campaignId} onSelect={onCampaignSelect} />

      {/* Basic Information */}
      <FormField label="Chase Name" required>
        <input
          type="text"
          value={manualData.name}
          onChange={(e) => setManualData((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="e.g., Rooftop Pursuit, Market Chase"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      <div className="grid grid-cols-3 gap-3">
        <FormField label="Chase Type">
          <select
            value={manualData.chase_type}
            onChange={(e) => setManualData((prev) => ({ ...prev, chase_type: e.target.value }))}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {chaseTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Terrain">
          <select
            value={manualData.terrain}
            onChange={(e) => setManualData((prev) => ({ ...prev, terrain: e.target.value }))}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {chaseTerrainOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Difficulty">
          <select
            value={manualData.difficulty}
            onChange={(e) => setManualData((prev) => ({ ...prev, difficulty: e.target.value }))}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {chaseDifficultyOptions.map((opt) => (
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
          onChange={(e) => setManualData((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Describe the chase scenario..."
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={3}
        />
      </FormField>

      <FormField label="Setting">
        <input
          type="text"
          value={manualData.setting}
          onChange={(e) => setManualData((prev) => ({ ...prev, setting: e.target.value }))}
          placeholder="e.g., Busy marketplace at noon, Dark alleyways at night"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      {/* Participants */}
      <CollapsibleSection title="Participants" defaultExpanded>
        <div className="space-y-3">
          <FormField label="Quarry (Being Chased)">
            <input
              type="text"
              value={manualData.quarry}
              onChange={(e) => setManualData((prev) => ({ ...prev, quarry: e.target.value }))}
              placeholder="e.g., A hooded thief, The party wizard"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </FormField>

          <FormField label="Pursuers">
            <input
              type="text"
              value={manualData.pursuers}
              onChange={(e) => setManualData((prev) => ({ ...prev, pursuers: e.target.value }))}
              placeholder="e.g., City guards, The party fighters"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </FormField>

          <FormField label="Starting Conditions">
            <textarea
              value={manualData.starting_conditions}
              onChange={(e) =>
                setManualData((prev) => ({ ...prev, starting_conditions: e.target.value }))
              }
              placeholder="Initial distance, terrain state, etc."
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={2}
            />
          </FormField>
        </div>
      </CollapsibleSection>

      {/* Obstacles */}
      <CollapsibleSection title="Obstacles" defaultExpanded={false}>
        <div className="space-y-3">
          {manualData.obstacles.map((obstacle, idx) => (
            <div key={idx} className="bg-background p-3 rounded border border-border space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-text">Obstacle {idx + 1}</span>
                <button
                  type="button"
                  onClick={() => removeObstacle(idx)}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Remove
                </button>
              </div>
              <input
                type="text"
                value={obstacle.name}
                onChange={(e) => updateObstacle(idx, { name: e.target.value })}
                placeholder="Obstacle name"
                className="w-full px-3 py-1.5 bg-background border border-border rounded text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <textarea
                value={obstacle.description}
                onChange={(e) => updateObstacle(idx, { description: e.target.value })}
                placeholder="Description"
                className="w-full px-3 py-1.5 bg-background border border-border rounded text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                rows={2}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={obstacle.check}
                  onChange={(e) => updateObstacle(idx, { check: e.target.value })}
                  placeholder="Check (e.g., DC 15 Athletics)"
                  className="w-full px-3 py-1.5 bg-background border border-border rounded text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <input
                  type="text"
                  value={obstacle.failure}
                  onChange={(e) => updateObstacle(idx, { failure: e.target.value })}
                  placeholder="Failure consequence"
                  className="w-full px-3 py-1.5 bg-background border border-border rounded text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addObstacle}
            className="w-full px-3 py-2 border border-dashed border-border text-text-muted hover:border-primary hover:text-primary rounded transition-colors text-sm"
          >
            + Add Obstacle
          </button>
        </div>
      </CollapsibleSection>

      {/* Complications */}
      <CollapsibleSection title="Complications" defaultExpanded={false}>
        <ArrayFieldEditor
          label="Complications"
          values={manualData.complications}
          onChange={(complications) => setManualData((prev) => ({ ...prev, complications }))}
          placeholder="Add a complication..."
        />
      </CollapsibleSection>

      {/* Shortcuts */}
      <CollapsibleSection title="Shortcuts" defaultExpanded={false}>
        <div className="space-y-3">
          {manualData.shortcuts.map((shortcut, idx) => (
            <div key={idx} className="bg-background p-3 rounded border border-border space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-text">Shortcut {idx + 1}</span>
                <button
                  type="button"
                  onClick={() => removeShortcut(idx)}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Remove
                </button>
              </div>
              <input
                type="text"
                value={shortcut.name}
                onChange={(e) => updateShortcut(idx, { name: e.target.value })}
                placeholder="Shortcut name"
                className="w-full px-3 py-1.5 bg-background border border-border rounded text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <textarea
                value={shortcut.description}
                onChange={(e) => updateShortcut(idx, { description: e.target.value })}
                placeholder="Description"
                className="w-full px-3 py-1.5 bg-background border border-border rounded text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                rows={2}
              />
              <input
                type="text"
                value={shortcut.benefit}
                onChange={(e) => updateShortcut(idx, { benefit: e.target.value })}
                placeholder="Benefit (e.g., Gain 1 position)"
                className="w-full px-3 py-1.5 bg-background border border-border rounded text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={addShortcut}
            className="w-full px-3 py-2 border border-dashed border-border text-text-muted hover:border-primary hover:text-primary rounded transition-colors text-sm"
          >
            + Add Shortcut
          </button>
        </div>
      </CollapsibleSection>

      {/* Environmental Factors */}
      <CollapsibleSection title="Environmental Factors" defaultExpanded={false}>
        <ArrayFieldEditor
          label="Environmental Factors"
          values={manualData.environmental_factors}
          onChange={(environmental_factors) =>
            setManualData((prev) => ({ ...prev, environmental_factors }))
          }
          placeholder="Add an environmental factor..."
        />
      </CollapsibleSection>

      {/* Ending Conditions & Rewards */}
      <CollapsibleSection title="Ending Conditions & Rewards" defaultExpanded={false}>
        <div className="space-y-3">
          <FormField label="Success Condition">
            <textarea
              value={manualData.success_condition}
              onChange={(e) =>
                setManualData((prev) => ({ ...prev, success_condition: e.target.value }))
              }
              placeholder="What happens when the pursuers catch the quarry (or quarry escapes)?"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={2}
            />
          </FormField>

          <FormField label="Failure Condition">
            <textarea
              value={manualData.failure_condition}
              onChange={(e) =>
                setManualData((prev) => ({ ...prev, failure_condition: e.target.value }))
              }
              placeholder="What happens if the chase fails?"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={2}
            />
          </FormField>

          <FormField label="Success Reward">
            <input
              type="text"
              value={manualData.success_reward}
              onChange={(e) =>
                setManualData((prev) => ({ ...prev, success_reward: e.target.value }))
              }
              placeholder="e.g., Stolen goods recovered, Information obtained"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </FormField>

          <FormField label="Failure Consequence">
            <input
              type="text"
              value={manualData.failure_consequence}
              onChange={(e) =>
                setManualData((prev) => ({ ...prev, failure_consequence: e.target.value }))
              }
              placeholder="e.g., Thief escapes, Guards alerted"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </FormField>
        </div>
      </CollapsibleSection>

      {/* Error Display */}
      {error && <div className="text-center text-red-400 text-sm">{error}</div>}

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
            Save Chase
          </>
        )}
      </button>

      {saved && (
        <div className="text-center text-green-400 text-sm">
          Chase saved! You can find it in the Saved Content section.
        </div>
      )}
    </>
  )
}
