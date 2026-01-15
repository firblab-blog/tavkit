// Manual Entry Form for Quests

import Icon from '@/components/common/Icon'
import { FormField } from '@/components/ui/FormField'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'
import CampaignSelector from '@/components/common/CampaignSelector'
import { ArrayFieldEditor } from '../components/Fields'
import { questTypeOptions, questDifficultyOptions, type ManualQuestData } from '../schemas/quest'

interface QuestManualFormProps {
  campaignId: string | null
  onCampaignSelect: (id: string | null) => void
  manualData: ManualQuestData
  setManualData: (data: ManualQuestData | ((prev: ManualQuestData) => ManualQuestData)) => void
  onSave: () => void
  saving: boolean
  saved: boolean
  error: string | null
}

export function QuestManualForm({
  campaignId,
  onCampaignSelect,
  manualData,
  setManualData,
  onSave,
  saving,
  saved,
  error,
}: QuestManualFormProps) {
  return (
    <>
      <CampaignSelector selectedCampaignId={campaignId} onSelect={onCampaignSelect} />

      {/* Basic Information */}
      <FormField label="Quest Title" required>
        <input
          type="text"
          value={manualData.title}
          onChange={(e) => setManualData({ ...manualData, title: e.target.value })}
          placeholder="e.g., The Lost Temple of Zandalar"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Quest Type">
          <select
            value={manualData.type}
            onChange={(e) => setManualData({ ...manualData, type: e.target.value })}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {questTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Difficulty">
          <select
            value={manualData.combat_intensity}
            onChange={(e) => setManualData({ ...manualData, combat_intensity: e.target.value })}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {questDifficultyOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Party Level">
          <input
            type="number"
            value={manualData.party_level ?? ''}
            onChange={(e) =>
              setManualData({
                ...manualData,
                party_level: e.target.value ? parseInt(e.target.value) : null,
              })
            }
            placeholder="5"
            min={1}
            max={20}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </FormField>

        <FormField label="Time Limit">
          <input
            type="text"
            value={manualData.time_limit}
            onChange={(e) => setManualData({ ...manualData, time_limit: e.target.value })}
            placeholder="e.g., 3 days, Full moon"
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </FormField>
      </div>

      <FormField label="Description">
        <textarea
          value={manualData.description}
          onChange={(e) => setManualData({ ...manualData, description: e.target.value })}
          placeholder="Describe the quest's hook, background, and what the party needs to know..."
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={4}
        />
      </FormField>

      {/* Objectives */}
      <ArrayFieldEditor
        label="Objectives"
        values={manualData.objectives}
        onChange={(objectives) => setManualData({ ...manualData, objectives })}
        placeholder="Add an objective..."
      />

      {/* Rewards & Complications */}
      <CollapsibleSection title="Rewards & Complications" defaultExpanded={false}>
        <div className="space-y-4">
          <ArrayFieldEditor
            label="Rewards"
            values={manualData.rewards}
            onChange={(rewards) => setManualData({ ...manualData, rewards })}
            placeholder="Add a reward..."
          />

          <ArrayFieldEditor
            label="Complications"
            values={manualData.complications}
            onChange={(complications) => setManualData({ ...manualData, complications })}
            placeholder="Add a complication..."
          />
        </div>
      </CollapsibleSection>

      {/* NPCs and Locations */}
      <CollapsibleSection title="NPCs & Locations" defaultExpanded={false}>
        <div className="space-y-4">
          <ArrayFieldEditor
            label="NPCs Involved"
            values={manualData.npcs_involved}
            onChange={(npcs_involved) => setManualData({ ...manualData, npcs_involved })}
            placeholder="Add an NPC..."
          />

          <ArrayFieldEditor
            label="Locations Involved"
            values={manualData.locations_involved}
            onChange={(locations_involved) => setManualData({ ...manualData, locations_involved })}
            placeholder="Add a location..."
          />
        </div>
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
        disabled={saving || !manualData.title.trim()}
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
            Save Quest
          </>
        )}
      </button>

      {saved && (
        <div className="text-center text-green-400 text-sm">
          Quest saved! You can find it in the Saved Content section.
        </div>
      )}
    </>
  )
}
