// Manual Entry Form for Dialogues

import Icon from '@/components/common/Icon'
import { FormField } from '@/components/ui/FormField'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'
import CampaignSelector from '@/components/common/CampaignSelector'
import { ArrayFieldEditor } from '../components/Fields'
import {
  moodOptions,
  commonSkills,
  type ManualDialogueData,
  type ManualSkillCheck,
} from '../schemas/dialogue'

interface DialogueManualFormProps {
  campaignId: string | null
  onCampaignSelect: (id: string | null) => void
  manualData: ManualDialogueData
  setManualData: (data: ManualDialogueData | ((prev: ManualDialogueData) => ManualDialogueData)) => void
  onSave: () => void
  saving: boolean
  saved: boolean
  error: string | null
}

export function DialogueManualForm({
  campaignId,
  onCampaignSelect,
  manualData,
  setManualData,
  onSave,
  saving,
  saved,
  error,
}: DialogueManualFormProps) {
  // Helper to update a specific dialogue tree branch
  const updateDialogueTreeBranch = (
    branch: 'friendly' | 'neutral' | 'hostile',
    field: 'player_option' | 'npc_response' | 'outcome',
    value: string
  ) => {
    setManualData({
      ...manualData,
      dialogue_tree: {
        ...manualData.dialogue_tree,
        [branch]: {
          ...manualData.dialogue_tree[branch],
          [field]: value,
        },
      },
    })
  }

  // Helper to update a skill check
  const updateSkillCheck = (
    index: number,
    field: keyof ManualSkillCheck,
    value: string | number | null
  ) => {
    const newChecks = [...manualData.skill_checks]
    newChecks[index] = { ...newChecks[index], [field]: value }
    setManualData({ ...manualData, skill_checks: newChecks })
  }

  // Helper to add a new skill check
  const addSkillCheck = () => {
    setManualData({
      ...manualData,
      skill_checks: [...manualData.skill_checks, { skill: '', dc: 10, success: '', failure: '' }],
    })
  }

  // Helper to remove a skill check
  const removeSkillCheck = (index: number) => {
    const newChecks = manualData.skill_checks.filter((_, i) => i !== index)
    setManualData({ ...manualData, skill_checks: newChecks })
  }

  // Render a dialogue option editor
  const renderDialogueOptionEditor = (
    branch: 'friendly' | 'neutral' | 'hostile',
    label: string,
    colorClass: string
  ) => (
    <div
      className={`bg-${colorClass}-500/10 border border-${colorClass}-500/30 rounded-lg p-4 space-y-3`}
    >
      <h4 className={`text-${colorClass}-400 font-semibold`}>{label}</h4>
      <FormField label="Player Option">
        <input
          type="text"
          value={manualData.dialogue_tree[branch].player_option}
          onChange={(e) => updateDialogueTreeBranch(branch, 'player_option', e.target.value)}
          placeholder="What the player might say..."
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>
      <FormField label="NPC Response">
        <textarea
          value={manualData.dialogue_tree[branch].npc_response}
          onChange={(e) => updateDialogueTreeBranch(branch, 'npc_response', e.target.value)}
          placeholder="How the NPC responds..."
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={2}
        />
      </FormField>
      <FormField label="Outcome">
        <input
          type="text"
          value={manualData.dialogue_tree[branch].outcome}
          onChange={(e) => updateDialogueTreeBranch(branch, 'outcome', e.target.value)}
          placeholder="What happens as a result..."
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>
    </div>
  )

  return (
    <>
      <CampaignSelector selectedCampaignId={campaignId} onSelect={onCampaignSelect} />

      {/* Basic Information */}
      <FormField label="Character Name" required>
        <input
          type="text"
          value={manualData.character_name}
          onChange={(e) => setManualData({ ...manualData, character_name: e.target.value })}
          placeholder="e.g., Grim the Merchant"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      <FormField label="Scene Setting">
        <input
          type="text"
          value={manualData.scene_setting}
          onChange={(e) => setManualData({ ...manualData, scene_setting: e.target.value })}
          placeholder="e.g., A dusty market stall at dawn"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      <FormField label="Mood">
        <select
          value={manualData.mood}
          onChange={(e) => setManualData({ ...manualData, mood: e.target.value })}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Select mood...</option>
          {moodOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Opening Line">
        <textarea
          value={manualData.opening_line}
          onChange={(e) => setManualData({ ...manualData, opening_line: e.target.value })}
          placeholder="The NPC's first words to the party..."
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={2}
        />
      </FormField>

      <FormField label="Body Language">
        <textarea
          value={manualData.body_language}
          onChange={(e) => setManualData({ ...manualData, body_language: e.target.value })}
          placeholder="How the NPC carries themselves, gestures, etc."
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={2}
        />
      </FormField>

      {/* Dialogue Options */}
      <CollapsibleSection title="Dialogue Options" defaultExpanded={true}>
        <div className="space-y-4">
          {renderDialogueOptionEditor('friendly', 'Friendly Approach', 'green')}
          {renderDialogueOptionEditor('neutral', 'Neutral Approach', 'blue')}
          {renderDialogueOptionEditor('hostile', 'Hostile Approach', 'red')}
        </div>
      </CollapsibleSection>

      {/* Skill Checks */}
      <CollapsibleSection title="Skill Checks" defaultExpanded={false}>
        <div className="space-y-4">
          {manualData.skill_checks.map((check, index) => (
            <div
              key={index}
              className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 space-y-3"
            >
              <div className="flex justify-between items-center">
                <h4 className="text-amber-400 font-semibold">Skill Check {index + 1}</h4>
                <button
                  type="button"
                  onClick={() => removeSkillCheck(index)}
                  className="text-red-400 hover:text-red-300"
                >
                  <Icon name="Trash2" className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Skill">
                  <select
                    value={check.skill}
                    onChange={(e) => updateSkillCheck(index, 'skill', e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select skill...</option>
                    {commonSkills.map((skill) => (
                      <option key={skill} value={skill}>
                        {skill}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="DC">
                  <input
                    type="number"
                    value={check.dc ?? ''}
                    onChange={(e) =>
                      updateSkillCheck(
                        index,
                        'dc',
                        e.target.value ? parseInt(e.target.value) : null
                      )
                    }
                    placeholder="10"
                    min={1}
                    max={30}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </FormField>
              </div>
              <FormField label="Success">
                <input
                  type="text"
                  value={check.success}
                  onChange={(e) => updateSkillCheck(index, 'success', e.target.value)}
                  placeholder="What happens on success..."
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </FormField>
              <FormField label="Failure">
                <input
                  type="text"
                  value={check.failure}
                  onChange={(e) => updateSkillCheck(index, 'failure', e.target.value)}
                  placeholder="What happens on failure..."
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </FormField>
            </div>
          ))}
          <button
            type="button"
            onClick={addSkillCheck}
            className="w-full py-2 border border-dashed border-border rounded-lg text-text-muted hover:text-text hover:border-primary transition-colors flex items-center justify-center gap-2"
          >
            <Icon name="Plus" className="w-4 h-4" />
            Add Skill Check
          </button>
        </div>
      </CollapsibleSection>

      {/* Additional Information */}
      <CollapsibleSection title="Additional Information" defaultExpanded={false}>
        <div className="space-y-4">
          <ArrayFieldEditor
            label="Information Revealed"
            values={manualData.information_revealed}
            onChange={(values) => setManualData({ ...manualData, information_revealed: values })}
            placeholder="Add information the NPC might reveal..."
          />

          <ArrayFieldEditor
            label="Potential Quests"
            values={manualData.potential_quests}
            onChange={(values) => setManualData({ ...manualData, potential_quests: values })}
            placeholder="Add quest hooks from this dialogue..."
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
        disabled={saving || !manualData.character_name.trim()}
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
            Save Dialogue
          </>
        )}
      </button>

      {saved && (
        <div className="text-center text-green-400 text-sm">
          Dialogue saved! You can find it in the Saved Content section.
        </div>
      )}
    </>
  )
}
