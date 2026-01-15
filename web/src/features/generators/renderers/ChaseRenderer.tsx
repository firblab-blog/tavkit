// Renderer for Chase generator results

import Icon from '@/components/common/Icon'
import { ActionsBar } from '@/components/ui/ActionsBar'
import { ParseWarning, RawDataViewer } from '../components'
import type { GeneratedChaseData } from '../normalizers/chase'

interface ChaseRendererProps {
  chase: GeneratedChaseData
  showRawResponse?: boolean
  isSaved: boolean
  onSave: () => void
  onCopy: () => void
}

export function ChaseRenderer({
  chase,
  showRawResponse,
  isSaved,
  onSave,
  onCopy,
}: ChaseRendererProps) {
  return (
    <div className="space-y-6">
      {/* Parse warning */}
      {chase._parseError && <ParseWarning message={chase._parseError} />}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-primary">{chase.name}</h2>
        <p className="text-sm text-text-muted capitalize">
          {chase.chase_type.replace(/_/g, ' ')} • {chase.terrain.replace(/_/g, ' ')} •{' '}
          {chase.difficulty}
        </p>
      </div>

      {/* Description */}
      {chase.description && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="FileText" className="w-5 h-5 text-primary" />
            Description
          </h3>
          <p className="text-text">{chase.description}</p>
        </div>
      )}

      {/* Setting */}
      {chase.setting && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="MapPin" className="w-5 h-5 text-primary" />
            Setting
          </h3>
          <p className="text-text">{chase.setting}</p>
        </div>
      )}

      {/* Participants */}
      {(chase.participants.quarry || chase.participants.pursuers) && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Users" className="w-5 h-5 text-primary" />
            Participants
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {chase.participants.quarry && (
              <div className="bg-background p-3 rounded border border-border">
                <span className="text-primary font-medium">Quarry:</span>
                <p className="text-text mt-1">{chase.participants.quarry}</p>
              </div>
            )}
            {chase.participants.pursuers && (
              <div className="bg-background p-3 rounded border border-border">
                <span className="text-primary font-medium">Pursuers:</span>
                <p className="text-text mt-1">{chase.participants.pursuers}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Starting Conditions */}
      {chase.starting_conditions && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="MapPin" className="w-5 h-5 text-primary" />
            Starting Conditions
          </h3>
          <p className="text-text">{chase.starting_conditions}</p>
        </div>
      )}

      {/* Obstacles */}
      {chase.obstacles.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="AlertCircle" className="w-5 h-5 text-primary" />
            Obstacles
          </h3>
          <div className="space-y-3">
            {chase.obstacles.map((obstacle, idx) => (
              <div key={idx} className="bg-background p-4 rounded border border-border">
                <h4 className="font-semibold text-primary mb-2">{obstacle.name}</h4>
                {obstacle.description && (
                  <p className="text-text-muted text-sm mb-3">{obstacle.description}</p>
                )}
                <div className="grid md:grid-cols-2 gap-2 text-sm">
                  {obstacle.check && (
                    <div>
                      <span className="text-primary font-medium">Check:</span>
                      <p className="text-text">{obstacle.check}</p>
                    </div>
                  )}
                  {obstacle.failure && (
                    <div>
                      <span className="text-red-400 font-medium">Failure:</span>
                      <p className="text-text">{obstacle.failure}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Complications */}
      {chase.complications.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="AlertCircle" className="w-5 h-5 text-primary" />
            Complications
          </h3>
          <ul className="space-y-2">
            {chase.complications.map((complication, idx) => (
              <li key={idx} className="flex items-start gap-2 text-text">
                <span className="text-primary">•</span>
                <span>{complication}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Shortcuts */}
      {chase.shortcuts.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Sparkles" className="w-5 h-5 text-primary" />
            Shortcuts & Alternate Routes
          </h3>
          <div className="space-y-2">
            {chase.shortcuts.map((shortcut, idx) => (
              <div key={idx} className="bg-background p-3 rounded border-2 border-primary/30">
                <h4 className="font-semibold text-text mb-1">{shortcut.name}</h4>
                {shortcut.description && (
                  <p className="text-text-muted text-sm mb-1">{shortcut.description}</p>
                )}
                {shortcut.benefit && (
                  <p className="text-primary text-sm font-medium">✓ {shortcut.benefit}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chase Phases */}
      {chase.chase_phases.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="ArrowRight" className="w-5 h-5 text-primary" />
            Chase Phases
          </h3>
          <div className="space-y-2">
            {chase.chase_phases.map((phase, idx) => (
              <div key={idx} className="bg-background p-3 rounded border border-border">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-primary">Round {phase.round}</span>
                  <span className="text-sm px-2 py-0.5 bg-primary/20 text-primary rounded">
                    {phase.difficulty}
                  </span>
                </div>
                <p className="text-text text-sm">{phase.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Environmental Factors */}
      {chase.environmental_factors.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Globe" className="w-5 h-5 text-primary" />
            Environmental Factors
          </h3>
          <ul className="space-y-2">
            {chase.environmental_factors.map((factor, idx) => (
              <li key={idx} className="flex items-start gap-2 text-text">
                <span className="text-primary">•</span>
                <span>{factor}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Special Rules */}
      {chase.special_rules && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="Book" className="w-5 h-5 text-primary" />
            Special Rules
          </h3>
          <p className="text-text">{chase.special_rules}</p>
        </div>
      )}

      {/* Ending Conditions */}
      {(chase.ending_conditions.success || chase.ending_conditions.failure) && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Shield" className="w-5 h-5 text-primary" />
            Ending Conditions
          </h3>
          <div className="space-y-2">
            {chase.ending_conditions.success && (
              <div className="bg-green-500/10 p-3 rounded border border-green-500/30">
                <span className="font-medium text-green-400">Success:</span>
                <p className="text-text mt-1">{chase.ending_conditions.success}</p>
              </div>
            )}
            {chase.ending_conditions.failure && (
              <div className="bg-red-500/10 p-3 rounded border border-red-500/30">
                <span className="font-medium text-red-400">Failure:</span>
                <p className="text-text mt-1">{chase.ending_conditions.failure}</p>
              </div>
            )}
            {chase.ending_conditions.alternative && (
              <div className="bg-primary/10 p-3 rounded border border-primary/30">
                <span className="font-medium text-primary">Alternative:</span>
                <p className="text-text mt-1">{chase.ending_conditions.alternative}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rewards */}
      {chase.rewards.success && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Package" className="w-5 h-5 text-primary" />
            Rewards
          </h3>
          <div className="space-y-2">
            <div className="bg-background p-3 rounded border border-border">
              <span className="font-medium text-primary">Success:</span>
              <p className="text-text mt-1">{chase.rewards.success}</p>
            </div>
            {chase.rewards.partial && (
              <div className="bg-background p-3 rounded border border-border">
                <span className="font-medium text-primary">Partial Success:</span>
                <p className="text-text mt-1">{chase.rewards.partial}</p>
              </div>
            )}
            {chase.rewards.failure && (
              <div className="bg-background p-3 rounded border border-border">
                <span className="font-medium text-text-muted">Failure:</span>
                <p className="text-text mt-1">{chase.rewards.failure}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Raw/unexpected fields */}
      {showRawResponse && chase._raw && <RawDataViewer data={chase._raw} />}

      <ActionsBar
        onCopy={onCopy}
        onSave={isSaved ? undefined : onSave}
        showRegenerate={false}
        isSaved={isSaved}
      />
    </div>
  )
}

// ============================================================================
// Clipboard Formatter
// ============================================================================

export function formatChaseForClipboard(chase: GeneratedChaseData): string {
  const chaseTypeLabel = chase.chase_type ? chase.chase_type.replace(/_/g, ' ') : 'Chase'
  const terrainLabel = chase.terrain ? chase.terrain.replace(/_/g, ' ') : 'Unknown'
  let text = `${chase.name || 'Unnamed Chase'}\n${chaseTypeLabel} • ${terrainLabel} • ${chase.difficulty || 'Medium'}\n\n${chase.description || ''}`

  if (chase.setting) {
    text += `\n\nSetting: ${chase.setting}`
  }

  if (chase.participants && (chase.participants.quarry || chase.participants.pursuers)) {
    text += `\n\nParticipants:\nQuarry: ${chase.participants.quarry}\nPursuers: ${chase.participants.pursuers}`
  }

  if (chase.starting_conditions) {
    text += `\n\nStarting Conditions: ${chase.starting_conditions}`
  }

  if (chase.obstacles.length > 0) {
    text += '\n\nObstacles:\n'
    chase.obstacles.forEach((obstacle) => {
      text += `${obstacle.name}\n${obstacle.description}\nCheck: ${obstacle.check}\nFailure: ${obstacle.failure}\n\n`
    })
  }

  if (chase.complications.length > 0) {
    text += '\nComplications:\n'
    chase.complications.forEach((comp) => {
      text += `- ${comp}\n`
    })
  }

  if (chase.shortcuts.length > 0) {
    text += '\nShortcuts:\n'
    chase.shortcuts.forEach((sc) => {
      text += `${sc.name}: ${sc.description} (${sc.benefit})\n`
    })
  }

  if (chase.chase_phases.length > 0) {
    text += '\nChase Phases:\n'
    chase.chase_phases.forEach((phase) => {
      text += `Round ${phase.round} (${phase.difficulty}): ${phase.description}\n`
    })
  }

  if (chase.environmental_factors.length > 0) {
    text += '\nEnvironmental Factors:\n'
    chase.environmental_factors.forEach((factor) => {
      text += `- ${factor}\n`
    })
  }

  if (chase.special_rules) {
    text += `\nSpecial Rules: ${chase.special_rules}`
  }

  if (
    chase.ending_conditions &&
    (chase.ending_conditions.success || chase.ending_conditions.failure)
  ) {
    text += '\n\nEnding Conditions:'
    if (chase.ending_conditions.success) text += `\nSuccess: ${chase.ending_conditions.success}`
    if (chase.ending_conditions.failure) text += `\nFailure: ${chase.ending_conditions.failure}`
    if (chase.ending_conditions.alternative)
      text += `\nAlternative: ${chase.ending_conditions.alternative}`
  }

  if (chase.rewards && chase.rewards.success) {
    text += '\n\nRewards:'
    if (chase.rewards.success) text += `\nSuccess: ${chase.rewards.success}`
    if (chase.rewards.partial) text += `\nPartial: ${chase.rewards.partial}`
    if (chase.rewards.failure) text += `\nFailure: ${chase.rewards.failure}`
  }

  return text
}
