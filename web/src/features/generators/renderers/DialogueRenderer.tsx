// Renderer for generated Dialogue content

import Icon from '@/components/common/Icon'
import { ActionsBar } from '@/components/ui/ActionsBar'
import { RawDataViewer, ParseWarning } from '@/features/generators/components'
import {
  GeneratedDialogueData,
  hasValidDialogueTree,
} from '../normalizers/dialogue'

interface DialogueRendererProps {
  dialogue: GeneratedDialogueData
  showRawResponse?: boolean
  isSaved: boolean
  onSave: () => void
  onCopy: () => void
}

// Render a dialogue option safely
function DialogueOption({
  option,
  type,
}: {
  option: { player_option: string; npc_response: string; outcome: string }
  type: 'friendly' | 'neutral' | 'hostile'
}) {
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

export function DialogueRenderer({
  dialogue,
  showRawResponse,
  isSaved,
  onSave,
  onCopy,
}: DialogueRendererProps) {
  return (
    <div className="space-y-6">
      {/* Parse warning */}
      {dialogue._parseError && <ParseWarning message={dialogue._parseError} />}

      {/* Header */}
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

      {/* Opening line */}
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

      {/* Dialogue Options */}
      {hasValidDialogueTree(dialogue.dialogue_tree) && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="MessageCircle" className="w-5 h-5 text-primary" />
            Dialogue Options
          </h3>
          <DialogueOption option={dialogue.dialogue_tree.friendly} type="friendly" />
          <DialogueOption option={dialogue.dialogue_tree.neutral} type="neutral" />
          <DialogueOption option={dialogue.dialogue_tree.hostile} type="hostile" />
        </div>
      )}

      {/* Skill checks */}
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

      {/* Body language */}
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

      {/* Information revealed */}
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

      {/* Potential quests */}
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

      {/* Raw/unexpected fields */}
      {dialogue._raw && <RawDataViewer data={dialogue._raw} defaultExpanded={showRawResponse} />}

      <ActionsBar
        onCopy={onCopy}
        onSave={isSaved ? undefined : onSave}
        showRegenerate={false}
        isSaved={isSaved}
      />
    </div>
  )
}

// Format dialogue for clipboard
export function formatDialogueForClipboard(dialogue: GeneratedDialogueData): string {
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

  return text
}
