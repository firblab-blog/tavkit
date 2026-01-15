// Dialogue content detail view

import Icon from '@/components/common/Icon'

interface DialogueBranch {
  player_option: string
  npc_response: string
  outcome: string
}

interface DialogueTree {
  friendly?: DialogueBranch
  neutral?: DialogueBranch
  hostile?: DialogueBranch
}

interface SkillCheck {
  skill?: string
  name?: string
  dc: number
  success?: string
  failure?: string
}

interface Quest {
  name?: string
  description?: string
}

interface DialogueData {
  character_name: string
  scene_setting?: string
  mood?: string
  dialogue_tree?: string | DialogueTree
  skill_checks?: string | SkillCheck[]
  information?: string | string[]
  potential_quests?: string | (string | Quest)[]
}

interface DialogueDetailProps {
  dialogue: DialogueData
}

function parseJSON<T>(value: string | T | undefined): T | null {
  if (!value) return null
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }
  return value
}

export function DialogueDetail({ dialogue }: DialogueDetailProps) {
  const dialogueTree = parseJSON<DialogueTree>(dialogue.dialogue_tree)
  const skillChecks = parseJSON<SkillCheck[]>(dialogue.skill_checks) || []
  const information = parseJSON<string | string[]>(dialogue.information)
  const quests = parseJSON<(string | Quest)[]>(dialogue.potential_quests) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-text mb-2">{dialogue.character_name}</h2>
        <div className="flex gap-4 text-text-muted text-sm">
          {dialogue.scene_setting && <span>📍 {dialogue.scene_setting}</span>}
          {dialogue.mood && (
            <span className="flex items-center gap-1">
              <Icon name="Smile" className="w-4 h-4" />
              {dialogue.mood}
            </span>
          )}
        </div>
      </div>

      {/* Dialogue Options */}
      {dialogueTree && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3">Dialogue Options</h3>
          <div className="space-y-4">
            {dialogueTree.friendly && (
              <div className="bg-surface p-4 rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-green-400 flex items-center gap-1">
                    <Icon name="Smile" className="w-4 h-4" />
                    Friendly
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="text-text">
                    <strong className="text-primary">Player:</strong> "
                    {dialogueTree.friendly.player_option}"
                  </p>
                  <p className="text-text">
                    <strong className="text-primary">NPC:</strong>{' '}
                    {dialogueTree.friendly.npc_response}
                  </p>
                  <p className="text-text-muted italic">→ {dialogueTree.friendly.outcome}</p>
                </div>
              </div>
            )}
            {dialogueTree.neutral && (
              <div className="bg-surface p-4 rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-yellow-400 flex items-center gap-1">
                    <Icon name="Meh" className="w-4 h-4" />
                    Neutral
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="text-text">
                    <strong className="text-primary">Player:</strong> "
                    {dialogueTree.neutral.player_option}"
                  </p>
                  <p className="text-text">
                    <strong className="text-primary">NPC:</strong>{' '}
                    {dialogueTree.neutral.npc_response}
                  </p>
                  <p className="text-text-muted italic">→ {dialogueTree.neutral.outcome}</p>
                </div>
              </div>
            )}
            {dialogueTree.hostile && (
              <div className="bg-surface p-4 rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-red-400 flex items-center gap-1">
                    <Icon name="Frown" className="w-4 h-4" />
                    Hostile
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="text-text">
                    <strong className="text-primary">Player:</strong> "
                    {dialogueTree.hostile.player_option}"
                  </p>
                  <p className="text-text">
                    <strong className="text-primary">NPC:</strong>{' '}
                    {dialogueTree.hostile.npc_response}
                  </p>
                  <p className="text-text-muted italic">→ {dialogueTree.hostile.outcome}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Skill Checks */}
      {skillChecks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3">Skill Checks</h3>
          <div className="space-y-3">
            {skillChecks.map((check, idx) => (
              <div key={idx} className="bg-surface p-4 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-text font-semibold">{check.skill || check.name}</span>
                  <span className="text-primary font-bold">DC {check.dc}</span>
                </div>
                {check.success && (
                  <p className="text-sm text-green-400 mb-1">
                    <strong>Success:</strong> {check.success}
                  </p>
                )}
                {check.failure && (
                  <p className="text-sm text-red-400">
                    <strong>Failure:</strong> {check.failure}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Information */}
      {information && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-2">Information Revealed</h3>
          <div className="bg-surface p-4 rounded-lg border border-border">
            {Array.isArray(information) ? (
              <ul className="list-disc list-inside text-text space-y-1">
                {information.map((info, idx) => (
                  <li key={idx}>{info}</li>
                ))}
              </ul>
            ) : (
              <p className="text-text">{information}</p>
            )}
          </div>
        </div>
      )}

      {/* Potential Quests */}
      {quests.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3">Potential Quests</h3>
          <div className="space-y-3">
            {quests.map((quest, idx) => (
              <div key={idx} className="bg-surface p-4 rounded-lg border border-border">
                <div className="font-semibold text-text mb-1">Quest {idx + 1}</div>
                <p className="text-text text-sm">
                  {typeof quest === 'string'
                    ? quest
                    : quest.description || quest.name || JSON.stringify(quest)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
