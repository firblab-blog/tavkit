import { useState, useEffect, useRef } from 'react'
import { GeneratorLayout } from './GeneratorLayout'
import { FormField } from '@/components/ui/FormField'
import { ActionsBar } from '@/components/ui/ActionsBar'
import Icon from '../common/Icon'
import CampaignSelector from '../common/CampaignSelector'
import { useCampaignStore } from '../../store/campaignStore'
import AISettings, { AIGenerationSettings, getMaxTokensFromSettings } from './AISettings'
import { emitContentSaved } from '@/lib/contentEvents'
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
  const [showRawResponse, setShowRawResponse] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

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

  const handleGenerate = async () => {
    setLoading(true)
    setError('')
    setDialogue(null)
    setShowRawResponse(false)
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
          setShowRawResponse(true)
        }

        setDialogue(normalized)
      } else {
        // No dialogue wrapper - try to normalize the raw response
        const normalized = normalizeDialogueResponse(data as unknown as Record<string, unknown>)
        normalized._parseError = 'Unexpected response format. Attempting to display.'
        setShowRawResponse(true)
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

  const formContent = (
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
      {dialogue._parseError && (
        <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-400 font-semibold mb-2">
            <Icon name="AlertCircle" className="w-5 h-5" />
            Response Format Warning
          </div>
          <p className="text-text-muted text-sm">{dialogue._parseError}</p>
        </div>
      )}

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
      {dialogue._raw && Object.keys(dialogue._raw).length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setShowRawResponse(!showRawResponse)}
            className="w-full px-4 py-3 bg-background-panel flex items-center justify-between text-left hover:bg-tavern-dark transition-colors"
          >
            <span className="flex items-center gap-2 text-text-muted">
              <Icon name="FileText" className="w-5 h-5" />
              Additional AI Response Data ({Object.keys(dialogue._raw).length} fields)
            </span>
            <Icon
              name={showRawResponse ? 'ChevronUp' : 'ChevronDown'}
              className="w-5 h-5 text-text-muted"
            />
          </button>
          {showRawResponse && (
            <div className="p-4 bg-background border-t border-border">
              <pre className="text-xs text-text-muted overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(dialogue._raw, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

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
        resultsTitle="Generated Dialogue"
        formContent={formContent}
        generatedContent={generatedContent}
        isGenerating={loading}
        onGenerate={handleGenerate}
        generateButtonText="Generate Dialogue"
        error={error}
      />

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background-panel rounded-lg border border-border max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-text mb-4">Save Dialogue</h3>
            <p className="text-text-muted mb-6">
              Save dialogue for "{dialogue?.character_name}" to your campaign for future reference?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="flex-1 px-4 py-2 bg-background border border-border hover:bg-tavern-dark text-text rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-primary hover:bg-primary-dark text-tavern-darkest font-medium rounded-lg transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
