import { useState, useEffect, useRef } from 'react'
import { GeneratorLayout } from './GeneratorLayout'
import { FormField } from '@/components/ui/FormField'
import { ActionsBar } from '@/components/ui/ActionsBar'
import Icon from '../common/Icon'
import CampaignSelector from '../common/CampaignSelector'
import { useCampaignStore } from '../../store/campaignStore'
import AISettings, { AIGenerationSettings, getMaxTokensFromSettings } from './AISettings'
import { emitContentSaved } from '@/lib/contentEvents'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'
import { EntryModeToggle, EntryMode } from './shared/EntryModeToggle'
import { ArrayFieldEditor } from './shared/fields'
import { SaveModal, ParseWarning, RawDataViewer, ManualEntryPreview } from './shared'
import {
  ManualDialogueData,
  ManualSkillCheck,
  defaultDialogueData,
  moodOptions,
  commonSkills,
} from './shared/schemas/dialogueSchema'
import {
  generateDialogue as generateDialogueApi,
  saveDialogue as saveDialogueApi,
  getErrorMessage,
} from '@/api/generators'
import { normalizeStringArray as sharedNormalizeStringArray } from '@/utils/aiResponseNormalizer'

// Expected dialogue structure
interface DialogueTree {
  friendly: { player_option: string; npc_response: string; outcome: string }
  neutral: { player_option: string; npc_response: string; outcome: string }
  hostile: { player_option: string; npc_response: string; outcome: string }
}

interface SkillCheck {
  skill: string
  dc: number
  success: string
  failure: string
}

interface DialogueData {
  character_name: string
  scene_setting: string
  mood: string
  opening_line: string
  dialogue_tree: DialogueTree
  skill_checks?: SkillCheck[]
  body_language: string
  information_revealed?: string[]
  potential_quests?: string[]
  // For any unexpected fields from AI
  _raw?: Record<string, unknown>
  _parseError?: string
}

// Default empty dialogue tree for when AI doesn't return expected structure
const DEFAULT_DIALOGUE_TREE: DialogueTree = {
  friendly: { player_option: '', npc_response: '', outcome: '' },
  neutral: { player_option: '', npc_response: '', outcome: '' },
  hostile: { player_option: '', npc_response: '', outcome: '' },
}

// Normalize AI response to expected structure
function normalizeDialogueResponse(raw: Record<string, unknown>): DialogueData {
  const expectedFields = [
    'character_name',
    'scene_setting',
    'mood',
    'opening_line',
    'dialogue_tree',
    'skill_checks',
    'body_language',
    'information_revealed',
    'potential_quests',
    'provider',
  ]

  // Collect unexpected fields
  const unexpectedFields: Record<string, unknown> = {}
  for (const key of Object.keys(raw)) {
    if (!expectedFields.includes(key)) {
      unexpectedFields[key] = raw[key]
    }
  }

  // Normalize dialogue_tree
  let dialogueTree = DEFAULT_DIALOGUE_TREE
  if (raw.dialogue_tree && typeof raw.dialogue_tree === 'object') {
    const dt = raw.dialogue_tree as Record<string, unknown>
    dialogueTree = {
      friendly: normalizeDialogueOption(dt.friendly),
      neutral: normalizeDialogueOption(dt.neutral),
      hostile: normalizeDialogueOption(dt.hostile),
    }
  }

  // Normalize skill_checks
  let skillChecks: SkillCheck[] | undefined
  if (Array.isArray(raw.skill_checks)) {
    skillChecks = raw.skill_checks.map((sc: unknown) => {
      if (typeof sc === 'object' && sc !== null) {
        const check = sc as Record<string, unknown>
        return {
          skill: String(check.skill || 'Unknown'),
          dc: Number(check.dc) || 10,
          success: String(check.success || ''),
          failure: String(check.failure || ''),
        }
      }
      return { skill: 'Unknown', dc: 10, success: '', failure: '' }
    })
  }

  return {
    character_name: String(raw.character_name || raw.name || 'Unknown Character'),
    scene_setting: String(raw.scene_setting || raw.setting || ''),
    mood: String(raw.mood || raw.tone || ''),
    opening_line: String(raw.opening_line || raw.greeting || ''),
    dialogue_tree: dialogueTree,
    skill_checks: skillChecks,
    body_language: String(raw.body_language || ''),
    information_revealed: raw.information_revealed
      ? sharedNormalizeStringArray(raw.information_revealed)
      : undefined,
    potential_quests: raw.potential_quests
      ? sharedNormalizeStringArray(raw.potential_quests)
      : undefined,
    _raw: Object.keys(unexpectedFields).length > 0 ? unexpectedFields : undefined,
  }
}

function normalizeDialogueOption(option: unknown): {
  player_option: string
  npc_response: string
  outcome: string
} {
  if (typeof option === 'object' && option !== null) {
    const opt = option as Record<string, unknown>
    return {
      player_option: String(opt.player_option || opt.player || ''),
      npc_response: String(opt.npc_response || opt.response || opt.npc || ''),
      outcome: String(opt.outcome || opt.result || ''),
    }
  }
  return { player_option: '', npc_response: '', outcome: '' }
}

// Check if dialogue tree has valid content
function hasValidDialogueTree(tree: DialogueTree): boolean {
  return !!(
    tree.friendly.player_option ||
    tree.friendly.npc_response ||
    tree.neutral.player_option ||
    tree.neutral.npc_response ||
    tree.hostile.player_option ||
    tree.hostile.npc_response
  )
}

export default function DialogueBuilder() {
  const [specialRequests, setSpecialRequests] = useState('')
  const [characterName, setCharacterName] = useState('')
  const [personality, setPersonality] = useState('random')
  const [tone, setTone] = useState('random')
  const [dialogueType, setDialogueType] = useState('random')
  const [complexity, setComplexity] = useState('moderate')
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dialogue, setDialogue] = useState<DialogueData | null>(null)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  // Manual entry mode state
  const [entryMode, setEntryMode] = useState<EntryMode>('ai')
  const [manualData, setManualData] = useState<ManualDialogueData>(defaultDialogueData)
  const [manualSaving, setManualSaving] = useState(false)
  const [manualSaved, setManualSaved] = useState(false)

  // Track if user has made an explicit campaign selection
  const hasUserSelectedCampaign = useRef(false)

  // AI settings for controlling token generation
  const [aiSettings, setAiSettings] = useState<AIGenerationSettings>({
    detailLevel: 'high',
    timeout: 120,
  })

  const { fetchCampaigns, activeCampaignId } = useCampaignStore()

  // Fetch campaigns on mount
  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  // Auto-select active campaign ONLY on initial mount (not after user interaction)
  useEffect(() => {
    if (activeCampaignId && !hasUserSelectedCampaign.current) {
      setCampaignId(activeCampaignId)
    }
  }, [activeCampaignId])

  const handleSave = async () => {
    if (!dialogue) return

    setError('')

    try {
      await saveDialogueApi({
        character_name: dialogue.character_name,
        scene_setting: dialogue.scene_setting,
        mood: dialogue.mood,
        dialogue_tree: dialogue.dialogue_tree,
        skill_checks: dialogue.skill_checks,
        information: dialogue.information_revealed,
        potential_quests: dialogue.potential_quests,
        campaign_id: campaignId || undefined,
        ai_generated: true,
      })

      setShowSaveModal(false)
      setIsSaved(true)
      emitContentSaved()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  // Handle manual entry save
  const handleManualSave = async () => {
    if (!manualData.character_name.trim()) {
      setError('Character name is required')
      return
    }

    setManualSaving(true)
    setError('')

    try {
      // Convert skill_checks to proper format (filter out empty ones and fix dc)
      const skillChecks = manualData.skill_checks
        .filter((sc) => sc.skill.trim())
        .map((sc) => ({
          skill: sc.skill,
          dc: sc.dc ?? 10,
          success: sc.success,
          failure: sc.failure,
        }))

      await saveDialogueApi({
        character_name: manualData.character_name.trim(),
        scene_setting: manualData.scene_setting.trim() || undefined,
        mood: manualData.mood || undefined,
        dialogue_tree: manualData.dialogue_tree,
        skill_checks: skillChecks.length > 0 ? skillChecks : undefined,
        information: manualData.information_revealed.filter((i) => i.trim()),
        potential_quests: manualData.potential_quests.filter((q) => q.trim()),
        campaign_id: campaignId || undefined,
        ai_generated: false,
      })

      setManualSaved(true)
      emitContentSaved()
      // Reset form after successful save
      setManualData(defaultDialogueData)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setManualSaving(false)
    }
  }

  const handleGenerate = async () => {
    setLoading(true)
    setError('')
    setDialogue(null)
    setIsSaved(false)

    try {
      const data = await generateDialogueApi(
        {
          campaign_id: campaignId || undefined,
          character_name: characterName.trim() || undefined,
          dialogue_type: dialogueType !== 'random' ? dialogueType : 'quest_giver',
          npc_personality: personality !== 'random' ? personality : 'friendly',
          mood: tone !== 'random' ? tone : 'casual',
          complexity: complexity || 'moderate',
          scene_setting: undefined,
          special_requests: specialRequests.trim() || undefined,
          max_tokens: getMaxTokensFromSettings(aiSettings),
          timeout: aiSettings.timeout,
        },
        aiSettings.timeout
      )

      // Normalize the response to handle missing/unexpected fields
      if (data.dialogue) {
        const normalized = normalizeDialogueResponse(data.dialogue)

        // Check if we got a valid dialogue tree
        if (!hasValidDialogueTree(normalized.dialogue_tree)) {
          normalized._parseError =
            'AI response missing dialogue tree structure. Showing raw response.'
        }

        setDialogue(normalized)
      } else {
        // No dialogue wrapper - try to normalize the raw response
        const normalized = normalizeDialogueResponse(data as unknown as Record<string, unknown>)
        normalized._parseError = 'Unexpected response format. Attempting to display.'
        setDialogue(normalized)
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!dialogue) return
    let text = `${dialogue.character_name}\n${dialogue.scene_setting}\nMood: ${dialogue.mood}\n\nOpening Line: "${dialogue.opening_line}"\n\nDialogue Options:\n\nFriendly:\nPlayer: "${dialogue.dialogue_tree.friendly.player_option}"\nNPC: "${dialogue.dialogue_tree.friendly.npc_response}"\nOutcome: ${dialogue.dialogue_tree.friendly.outcome}\n\nNeutral:\nPlayer: "${dialogue.dialogue_tree.neutral.player_option}"\nNPC: "${dialogue.dialogue_tree.neutral.npc_response}"\nOutcome: ${dialogue.dialogue_tree.neutral.outcome}\n\nHostile:\nPlayer: "${dialogue.dialogue_tree.hostile.player_option}"\nNPC: "${dialogue.dialogue_tree.hostile.npc_response}"\nOutcome: ${dialogue.dialogue_tree.hostile.outcome}`

    if (dialogue.skill_checks && dialogue.skill_checks.length > 0) {
      text += '\n\nSkill Checks:\n'
      dialogue.skill_checks.forEach((check) => {
        text += `${check.skill} (DC ${check.dc})\nSuccess: ${check.success}\nFailure: ${check.failure}\n\n`
      })
    }

    text += `\nBody Language: ${dialogue.body_language}`

    if (dialogue.information_revealed && dialogue.information_revealed.length > 0) {
      text += '\n\nInformation Revealed:\n'
      dialogue.information_revealed.forEach((info) => {
        text += `- ${info}\n`
      })
    }

    if (dialogue.potential_quests && dialogue.potential_quests.length > 0) {
      text += '\nPotential Quests:\n'
      dialogue.potential_quests.forEach((quest) => {
        text += `- ${quest}\n`
      })
    }

    navigator.clipboard.writeText(text)
  }

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

  // AI form content
  const aiFormContent = (
    <>
      {/* AI Settings */}
      <AISettings generatorType="dialogue" onSettingsChange={setAiSettings} />

      {/* Campaign Context */}
      <CampaignSelector
        selectedCampaignId={campaignId}
        onSelect={(id) => {
          hasUserSelectedCampaign.current = true
          setCampaignId(id)
        }}
      />

      <FormField label="Character Name" description="(optional)">
        <input
          type="text"
          value={characterName}
          onChange={(e) => setCharacterName(e.target.value)}
          placeholder="e.g., Grim the Merchant"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      <FormField label="Dialogue Type">
        <select
          value={dialogueType}
          onChange={(e) => setDialogueType(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="random">Random (surprise me)</option>
          <option value="quest_giver">Quest Giver (assign mission)</option>
          <option value="merchant">Merchant (trade goods)</option>
          <option value="informant">Informant (share secrets)</option>
          <option value="antagonist">Antagonist (create conflict)</option>
          <option value="ally">Ally (offer help)</option>
          <option value="neutral">Neutral (bystander)</option>
        </select>
      </FormField>

      <FormField label="Personality">
        <select
          value={personality}
          onChange={(e) => setPersonality(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="random">Random</option>
          <option value="friendly">Friendly</option>
          <option value="suspicious">Suspicious</option>
          <option value="gruff">Gruff</option>
          <option value="mysterious">Mysterious</option>
          <option value="nervous">Nervous</option>
          <option value="arrogant">Arrogant</option>
          <option value="helpful">Helpful</option>
          <option value="deceptive">Deceptive</option>
        </select>
      </FormField>

      <FormField label="Tone">
        <select
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="random">Random</option>
          <option value="tense">Tense</option>
          <option value="lighthearted">Lighthearted</option>
          <option value="mysterious">Mysterious</option>
          <option value="urgent">Urgent</option>
          <option value="casual">Casual</option>
          <option value="formal">Formal</option>
          <option value="threatening">Threatening</option>
        </select>
      </FormField>

      <FormField label="Complexity">
        <select
          value={complexity}
          onChange={(e) => setComplexity(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="simple">Simple (basic exchange)</option>
          <option value="moderate">Moderate (multiple options)</option>
          <option value="complex">Complex (skill checks, branching)</option>
        </select>
      </FormField>

      <FormField label="Special Requests" description="(optional)">
        <textarea
          value={specialRequests}
          onChange={(e) => setSpecialRequests(e.target.value)}
          placeholder="e.g., 'Include Persuasion DC 15 check' or 'NPC knows location of hidden temple' or 'Can lead to secret quest if befriended'"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={3}
        />
      </FormField>
    </>
  )

  // Render a dialogue option editor for manual entry
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

  // Manual form content
  const manualFormContent = (
    <>
      {/* Campaign Context */}
      <CampaignSelector
        selectedCampaignId={campaignId}
        onSelect={(id) => {
          hasUserSelectedCampaign.current = true
          setCampaignId(id)
        }}
      />

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

      {/* Save Button */}
      <button
        type="button"
        onClick={handleManualSave}
        disabled={manualSaving || !manualData.character_name.trim()}
        className="w-full mt-4 py-3 bg-primary hover:bg-primary-dark disabled:bg-primary/50 text-tavern-darkest font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {manualSaving ? (
          <>
            <Icon name="Loader2" className="w-5 h-5 animate-spin" />
            Saving...
          </>
        ) : manualSaved ? (
          <>
            <Icon name="Check" className="w-5 h-5" />
            Saved!
          </>
        ) : (
          <>
            <Icon name="Save" className="w-5 h-5" />
            Save Dialogue
          </>
        )}
      </button>
    </>
  )

  // Combined form content with mode toggle
  const formContent = (
    <>
      <EntryModeToggle
        mode={entryMode}
        onChange={(mode) => {
          setEntryMode(mode)
          setManualSaved(false)
          setError('')
        }}
        disabled={loading}
      />
      {entryMode === 'ai' ? aiFormContent : manualFormContent}
    </>
  )

  // Manual mode preview content
  const manualPreviewContent = <ManualEntryPreview entityType="dialogue" />

  // Render a dialogue option safely
  const renderDialogueOption = (
    option: { player_option: string; npc_response: string; outcome: string },
    type: 'friendly' | 'neutral' | 'hostile'
  ) => {
    const configs = {
      friendly: {
        bg: 'bg-green-500/10',
        border: 'border-green-500/30',
        text: 'text-green-400',
        icon: 'Smile',
        label: 'Friendly Approach',
      },
      neutral: {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        text: 'text-blue-400',
        icon: 'Meh',
        label: 'Neutral Approach',
      },
      hostile: {
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        text: 'text-red-400',
        icon: 'Frown',
        label: 'Hostile Approach',
      },
    }
    const config = configs[type]

    // Skip if no content
    if (!option.player_option && !option.npc_response && !option.outcome) {
      return null
    }

    return (
      <div className={`${config.bg} border ${config.border} rounded-lg p-4 mb-3`}>
        <h4 className={`${config.text} font-semibold mb-3 flex items-center gap-2`}>
          <Icon name={config.icon as 'Smile' | 'Meh' | 'Frown'} className="w-5 h-5" />
          {config.label}
        </h4>
        {option.player_option && (
          <p className="text-text mb-2">
            <strong className={config.text}>Player:</strong> "{option.player_option}"
          </p>
        )}
        {option.npc_response && (
          <p className="text-text mb-2">
            <strong className={config.text}>NPC Response:</strong> "{option.npc_response}"
          </p>
        )}
        {option.outcome && (
          <p className="text-text-muted text-sm">
            <strong className={config.text}>Outcome:</strong> {option.outcome}
          </p>
        )}
      </div>
    )
  }

  const generatedContent = dialogue ? (
    <div className="space-y-6">
      {/* Parse warning */}
      {dialogue._parseError && <ParseWarning message={dialogue._parseError} />}

      {/* Header - styled like Monster/NPC */}
      <div>
        <h2 className="text-2xl font-bold text-primary mb-2">
          {dialogue.character_name || 'Generated Dialogue'}
        </h2>
        {dialogue.scene_setting && (
          <p className="text-text-muted italic">{dialogue.scene_setting}</p>
        )}
        {dialogue.mood && (
          <p className="text-text-muted mt-1">
            <strong className="text-primary">Mood:</strong> {dialogue.mood}
          </p>
        )}
      </div>

      {/* Opening line - styled with primary accent */}
      {dialogue.opening_line && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="Quote" className="w-5 h-5 text-primary" />
            Opening Line
          </h3>
          <div className="bg-background p-4 rounded border border-primary/30">
            <p className="text-text italic">"{dialogue.opening_line}"</p>
          </div>
        </div>
      )}

      {/* Dialogue Options - with null checks */}
      {hasValidDialogueTree(dialogue.dialogue_tree) && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="MessageCircle" className="w-5 h-5 text-primary" />
            Dialogue Options
          </h3>
          {renderDialogueOption(dialogue.dialogue_tree.friendly, 'friendly')}
          {renderDialogueOption(dialogue.dialogue_tree.neutral, 'neutral')}
          {renderDialogueOption(dialogue.dialogue_tree.hostile, 'hostile')}
        </div>
      )}

      {/* Skill checks - styled with amber accent */}
      {dialogue.skill_checks && dialogue.skill_checks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-amber-400 mb-3 flex items-center gap-2">
            <Icon name="AlertCircle" className="w-5 h-5" />
            Skill Checks
          </h3>
          <div className="space-y-3">
            {dialogue.skill_checks.map((check, i) => (
              <div key={i} className="bg-amber-500/10 p-4 rounded border border-amber-500/30">
                <h4 className="text-amber-400 font-semibold mb-2">
                  {check.skill} (DC {check.dc})
                </h4>
                {check.success && (
                  <p className="text-green-400 text-sm mb-1">
                    <strong>Success:</strong> {check.success}
                  </p>
                )}
                {check.failure && (
                  <p className="text-red-400 text-sm">
                    <strong>Failure:</strong> {check.failure}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Body language - styled with blue accent */}
      {dialogue.body_language && (
        <div>
          <h3 className="text-lg font-semibold text-blue-400 mb-2 flex items-center gap-2">
            <Icon name="Eye" className="w-5 h-5" />
            Body Language
          </h3>
          <div className="bg-blue-500/10 p-4 rounded border border-blue-500/30">
            <p className="text-text">{dialogue.body_language}</p>
          </div>
        </div>
      )}

      {/* Information revealed - styled with purple accent */}
      {dialogue.information_revealed && dialogue.information_revealed.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-purple-400 mb-2 flex items-center gap-2">
            <Icon name="BookOpen" className="w-5 h-5" />
            Information Revealed
          </h3>
          <div className="bg-purple-500/10 p-4 rounded border border-purple-500/30">
            <ul className="space-y-2">
              {dialogue.information_revealed.map((info, i) => (
                <li key={i} className="flex items-start gap-2 text-text">
                  <span className="text-purple-400">•</span>
                  <span>{info}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Potential quests - styled with green accent */}
      {dialogue.potential_quests && dialogue.potential_quests.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-green-400 mb-2 flex items-center gap-2">
            <Icon name="Sparkles" className="w-5 h-5" />
            Potential Quests
          </h3>
          <div className="bg-green-500/10 p-4 rounded border border-green-500/30">
            <ul className="space-y-2">
              {dialogue.potential_quests.map((quest, i) => (
                <li key={i} className="flex items-start gap-2 text-text">
                  <span className="text-green-400">•</span>
                  <span>{quest}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Raw/unexpected fields - collapsible */}
      {dialogue._raw && <RawDataViewer data={dialogue._raw} />}

      <ActionsBar
        onCopy={handleCopy}
        onSave={isSaved ? undefined : () => setShowSaveModal(true)}
        showRegenerate={false}
        isSaved={isSaved}
      />
    </div>
  ) : null

  return (
    <>
      <GeneratorLayout
        title="Dialogue Builder"
        description="Create branching NPC dialogues with skill checks and outcomes"
        icon="MessageCircle"
        formTitle="Dialogue Parameters"
        formIcon="Settings"
        resultsTitle={entryMode === 'manual' ? 'Manual Entry' : 'Generated Dialogue'}
        formContent={formContent}
        generatedContent={entryMode === 'manual' ? manualPreviewContent : generatedContent}
        isGenerating={loading}
        onGenerate={handleGenerate}
        generateButtonText="Generate Dialogue"
        error={error}
        hideGenerateButton={entryMode === 'manual'}
      />

      {/* Save Modal */}
      <SaveModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSave}
        entityName={dialogue?.character_name || 'Dialogue'}
        campaignId={campaignId}
      />
    </>
  )
}
