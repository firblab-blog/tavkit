// Trap content detail view

import Icon from '@/components/common/Icon'

interface Detection {
  passive_perception_dc?: number
  investigation_dc?: number
  clues?: string[]
}

interface SolutionPath {
  approach: string
  skill?: string
  dc?: number
  description: string
  time?: string
  failure?: string
}

interface Scaling {
  easier?: string
  harder?: string
}

interface TrapData {
  name?: string
  trap_type?: string
  difficulty: string
  environment?: string
  description?: string
  trigger?: string
  effect?: string
  damage?: string
  detection?: string | Detection
  solution_paths?: string | SolutionPath[]
  complications?: string | string[]
  rewards?: string | string[]
  scaling?: string | Scaling
  dm_notes?: string
}

interface TrapDetailProps {
  trap: TrapData
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

function getDifficultyColor(difficulty: string): string {
  switch (difficulty.toLowerCase()) {
    case 'deadly':
      return 'text-red-400'
    case 'hard':
      return 'text-orange-400'
    case 'medium':
      return 'text-yellow-400'
    default:
      return 'text-green-400'
  }
}

export function TrapDetail({ trap }: TrapDetailProps) {
  const detection = parseJSON<Detection>(trap.detection)
  const solutionPaths = parseJSON<SolutionPath[]>(trap.solution_paths)
  const complications = parseJSON<string[]>(trap.complications)
  const rewards = parseJSON<string[]>(trap.rewards)
  const scaling = parseJSON<Scaling>(trap.scaling)

  return (
    <div className="space-y-6">
      {/* Type/Difficulty/Environment */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface p-4 rounded-lg border border-border">
          <div className="text-xs text-text-muted uppercase tracking-wide mb-2">Type</div>
          <div className="text-lg text-text capitalize">
            {trap.trap_type?.replace(/_/g, ' ')}
          </div>
        </div>
        <div className="bg-surface p-4 rounded-lg border border-border">
          <div className="text-xs text-text-muted uppercase tracking-wide mb-2">Difficulty</div>
          <div className={`text-lg font-semibold capitalize ${getDifficultyColor(trap.difficulty)}`}>
            {trap.difficulty}
          </div>
        </div>
        <div className="bg-surface p-4 rounded-lg border border-border">
          <div className="text-xs text-text-muted uppercase tracking-wide mb-2">Environment</div>
          <div className="text-lg text-text capitalize">{trap.environment}</div>
        </div>
      </div>

      {/* Description */}
      {trap.description && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-2">Description</h3>
          <p className="text-text leading-relaxed">{trap.description}</p>
        </div>
      )}

      {/* Trigger */}
      {trap.trigger && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-2">Trigger</h3>
          <p className="text-text leading-relaxed">{trap.trigger}</p>
        </div>
      )}

      {/* Effect/Damage */}
      <div className="grid grid-cols-2 gap-4">
        {trap.effect && (
          <div className="bg-surface p-4 rounded-lg border border-border">
            <div className="text-xs text-text-muted uppercase tracking-wide mb-2">Effect</div>
            <div className="text-text">{trap.effect}</div>
          </div>
        )}
        {trap.damage && (
          <div className="bg-surface p-4 rounded-lg border border-border">
            <div className="text-xs text-text-muted uppercase tracking-wide mb-2">Damage</div>
            <div className="text-text font-mono">{trap.damage}</div>
          </div>
        )}
      </div>

      {/* Detection */}
      {detection && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3">Detection</h3>
          <div className="bg-surface p-4 rounded-lg border border-border space-y-3">
            {detection.passive_perception_dc && (
              <div className="flex items-center gap-2">
                <span className="text-text-muted">Passive Perception DC:</span>
                <span className="text-text font-bold">{detection.passive_perception_dc}</span>
              </div>
            )}
            {detection.investigation_dc && (
              <div className="flex items-center gap-2">
                <span className="text-text-muted">Investigation DC:</span>
                <span className="text-text font-bold">{detection.investigation_dc}</span>
              </div>
            )}
            {Array.isArray(detection.clues) && detection.clues.length > 0 && (
              <div>
                <div className="text-sm text-text-muted mb-2">Clues:</div>
                <ul className="list-disc list-inside space-y-1">
                  {detection.clues.map((clue, idx) => (
                    <li key={idx} className="text-text">{clue}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Solution Paths */}
      {Array.isArray(solutionPaths) && solutionPaths.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3">Solution Paths</h3>
          <div className="grid gap-4">
            {solutionPaths.map((path, idx) => (
              <div key={idx} className="bg-surface p-4 rounded-lg border border-primary/50">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-text">{path.approach}</h4>
                  <div className="flex gap-2">
                    {path.skill && (
                      <span className="px-2 py-1 bg-surface text-text-muted rounded text-xs">
                        {path.skill}
                      </span>
                    )}
                    {path.dc && (
                      <span className="px-2 py-1 bg-primary/20 text-primary rounded text-xs font-bold">
                        DC {path.dc}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-text text-sm mb-2">{path.description}</p>
                {path.time && <p className="text-text-muted text-xs">⏱️ Time: {path.time}</p>}
                {path.failure && (
                  <p className="text-red-400 text-xs mt-1">⚠️ On Failure: {path.failure}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Complications */}
      {Array.isArray(complications) && complications.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3 flex items-center gap-2">
            <Icon name="AlertCircle" className="w-5 h-5" />
            Complications
          </h3>
          <ul className="list-disc list-inside space-y-1">
            {complications.map((comp, idx) => (
              <li key={idx} className="text-text">{comp}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Rewards */}
      {Array.isArray(rewards) && rewards.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3">Rewards</h3>
          <ul className="list-disc list-inside space-y-1">
            {rewards.map((reward, idx) => (
              <li key={idx} className="text-text">{reward}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Scaling */}
      {scaling && (scaling.easier || scaling.harder) && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3">Scaling</h3>
          <div className="grid gap-4">
            {scaling.easier && (
              <div className="bg-green-900/20 p-4 rounded-lg border border-green-700">
                <h4 className="font-semibold text-green-400 mb-2">Easier Version</h4>
                <p className="text-text text-sm">{scaling.easier}</p>
              </div>
            )}
            {scaling.harder && (
              <div className="bg-red-900/20 p-4 rounded-lg border border-red-700">
                <h4 className="font-semibold text-red-400 mb-2">Harder Version</h4>
                <p className="text-text text-sm">{scaling.harder}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DM Notes */}
      {trap.dm_notes && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-2 flex items-center gap-2">
            <Icon name="BookOpen" className="w-5 h-5" />
            DM Notes
          </h3>
          <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-700">
            <p className="text-text leading-relaxed whitespace-pre-wrap">{trap.dm_notes}</p>
          </div>
        </div>
      )}
    </div>
  )
}
