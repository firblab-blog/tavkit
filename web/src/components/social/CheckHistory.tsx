import Icon from '../common/Icon'
import type { IconName } from '../common/Icon'
import { SocialCheck } from './SocialEncounters'

interface CheckHistoryProps {
  checks: SocialCheck[]
}

export default function CheckHistory({ checks }: CheckHistoryProps) {
  if (checks.length === 0) {
    return (
      <div className="bg-background-panel border border-border rounded-xl p-6 text-center">
        <Icon name="MessageSquare" className="w-8 h-8 text-text-muted mx-auto mb-2" />
        <p className="text-text-muted">No skill checks recorded yet</p>
        <p className="text-sm text-text-muted mt-1">
          Record checks as they happen during the encounter
        </p>
      </div>
    )
  }

  const getSkillIcon = (skill: string): IconName => {
    switch (skill) {
      case 'Persuasion':
        return 'Smile'
      case 'Deception':
        return 'Eye'
      case 'Intimidation':
        return 'Zap'
      case 'Insight':
        return 'Sparkles'
      case 'Performance':
        return 'Dices'
      default:
        return 'MessageSquare'
    }
  }

  return (
    <div className="bg-background-panel border border-border rounded-xl overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-text flex items-center gap-2">
          <Icon name="History" className="w-4 h-4 text-text-muted" />
          Check History
          <span className="ml-auto text-sm text-text-muted">
            {checks.filter((c) => c.success).length} successes /{' '}
            {checks.filter((c) => !c.success).length} failures
          </span>
        </h3>
      </div>

      <div className="divide-y divide-border max-h-96 overflow-y-auto">
        {checks
          .map((check, index) => (
            <div
              key={check.id}
              className={`p-4 ${check.success ? 'bg-emerald-500/5' : 'bg-red-500/5'}`}
            >
              <div className="flex items-start gap-3">
                {/* Result Icon */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    check.success
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  <Icon name={check.success ? 'Check' : 'X'} className="w-4 h-4" />
                </div>

                {/* Check Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-text">{check.character_name}</span>
                    <span className="text-text-muted">made a</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-background rounded text-sm text-text">
                      <Icon name={getSkillIcon(check.skill)} className="w-3 h-3" />
                      {check.skill}
                    </span>
                    <span className="text-text-muted">check</span>
                  </div>

                  {/* Roll Details */}
                  <div className="mt-1 text-sm">
                    <span className="text-text-muted">Rolled </span>
                    <span
                      className={`font-bold ${check.roll === 20 ? 'text-emerald-400' : check.roll === 1 ? 'text-red-400' : 'text-text'}`}
                    >
                      {check.roll}
                    </span>
                    <span className="text-text-muted">
                      {check.modifier !== 0 && <> + {check.modifier}</>} ={' '}
                    </span>
                    <span
                      className={`font-bold ${check.success ? 'text-emerald-400' : 'text-red-400'}`}
                    >
                      {check.total}
                    </span>
                    <span className="text-text-muted"> vs DC </span>
                    <span className="text-text">{check.dc}</span>

                    {/* Mood Change */}
                    {check.mood_change !== 0 && (
                      <span
                        className={`ml-2 ${check.mood_change > 0 ? 'text-emerald-400' : 'text-red-400'}`}
                      >
                        (Mood {check.mood_change > 0 ? '+' : ''}
                        {check.mood_change})
                      </span>
                    )}
                  </div>

                  {/* Approach */}
                  {check.approach && (
                    <p className="mt-2 text-sm text-text-muted italic">"{check.approach}"</p>
                  )}

                  {/* NPC Response */}
                  {check.npc_response && (
                    <p className="mt-1 text-sm text-text-muted">
                      <span className="text-text">Response:</span> {check.npc_response}
                    </p>
                  )}
                </div>

                {/* Check Number */}
                <div className="text-xs text-text-muted">#{checks.length - index}</div>
              </div>
            </div>
          ))
          .reverse()}
      </div>
    </div>
  )
}
