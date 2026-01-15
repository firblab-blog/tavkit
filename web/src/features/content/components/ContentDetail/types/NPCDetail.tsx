// NPC content detail view

interface NPCStats {
  level?: number
  alignment?: string
  abilities?: Record<string, number>
  skills?: string[]
  equipment?: string[]
  role?: string
  plot_hooks?: string[]
}

interface NPCData {
  name: string
  race?: string
  class?: string
  personality?: string
  backstory?: string
  stats?: string | NPCStats
}

interface NPCDetailProps {
  npc: NPCData
}

function parseStats(stats: string | NPCStats | undefined): NPCStats | null {
  if (!stats) return null
  if (typeof stats === 'string') {
    try {
      return JSON.parse(stats)
    } catch {
      return null
    }
  }
  return stats
}

function getModifier(score: number): string {
  const mod = Math.floor((score - 10) / 2)
  return mod >= 0 ? `+${mod}` : String(mod)
}

export function NPCDetail({ npc }: NPCDetailProps) {
  const stats = parseStats(npc.stats)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-text mb-2">{npc.name}</h2>
        <div className="flex gap-4 text-text-muted">
          {npc.race && <span className="text-sm">{npc.race}</span>}
          {npc.class && <span className="text-sm">{npc.class}</span>}
        </div>
      </div>

      {/* Personality */}
      {npc.personality && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-2">Personality</h3>
          <p className="text-text leading-relaxed">{npc.personality}</p>
        </div>
      )}

      {/* Backstory */}
      {npc.backstory && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-2">Backstory</h3>
          <p className="text-text leading-relaxed whitespace-pre-wrap">{npc.backstory}</p>
        </div>
      )}

      {/* Statistics */}
      {stats && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3">Statistics</h3>
          <div className="space-y-4">
            {/* Level and Alignment */}
            <div className="grid grid-cols-2 gap-4">
              {stats.level && (
                <div className="bg-surface p-4 rounded-lg border border-border">
                  <div className="text-xs text-text-muted uppercase tracking-wide mb-1">Level</div>
                  <div className="text-2xl font-bold text-text">{stats.level}</div>
                </div>
              )}
              {stats.alignment && (
                <div className="bg-surface p-4 rounded-lg border border-border">
                  <div className="text-xs text-text-muted uppercase tracking-wide mb-1">
                    Alignment
                  </div>
                  <div className="text-lg font-semibold text-text">{stats.alignment}</div>
                </div>
              )}
            </div>

            {/* Ability Scores */}
            {stats.abilities && (
              <div>
                <h4 className="text-sm font-semibold text-text mb-2">Ability Scores</h4>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {Object.entries(stats.abilities).map(([ability, score]) => (
                    <div
                      key={ability}
                      className="bg-surface p-3 rounded-lg border border-border text-center"
                    >
                      <div className="text-xs text-text-muted uppercase">{ability}</div>
                      <div className="text-2xl font-bold text-text">{score}</div>
                      <div className="text-xs text-text-muted">{getModifier(score)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skills */}
            {stats.skills && stats.skills.length > 0 && (
              <div className="bg-surface p-4 rounded-lg border border-border">
                <div className="text-xs text-text-muted uppercase tracking-wide mb-2">Skills</div>
                <div className="flex flex-wrap gap-2">
                  {stats.skills.map((skill, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-primary/30 text-text rounded-full text-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Equipment */}
            {stats.equipment && stats.equipment.length > 0 && (
              <div className="bg-surface p-4 rounded-lg border border-border">
                <div className="text-xs text-text-muted uppercase tracking-wide mb-2">
                  Equipment
                </div>
                <ul className="list-disc list-inside text-text space-y-1">
                  {stats.equipment.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Role */}
            {stats.role && (
              <div className="bg-surface p-4 rounded-lg border border-border">
                <div className="text-xs text-text-muted uppercase tracking-wide mb-1">Role</div>
                <div className="text-text">{stats.role}</div>
              </div>
            )}

            {/* Plot Hooks */}
            {stats.plot_hooks && stats.plot_hooks.length > 0 && (
              <div className="bg-surface p-4 rounded-lg border border-border">
                <div className="text-xs text-text-muted uppercase tracking-wide mb-2">
                  Plot Hooks
                </div>
                <ul className="list-disc list-inside text-text space-y-1">
                  {stats.plot_hooks.map((hook, i) => (
                    <li key={i}>{hook}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
