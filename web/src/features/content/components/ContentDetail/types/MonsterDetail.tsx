// Monster content detail view

interface MonsterAction {
  name: string;
  description: string;
}

interface HitPoints {
  average?: number;
  roll?: string;
}

interface MonsterStats {
  armor_class?: number | string;
  hit_points?: number | HitPoints;
  speed?: Record<string, string>;
  abilities?: Record<string, number>;
  actions?: MonsterAction[];
}

interface MonsterData {
  name: string;
  cr: string | number;
  stats?: string | MonsterStats;
  lore?: string;
  tactics?: string;
}

interface MonsterDetailProps {
  monster: MonsterData;
}

function parseStats(
  stats: string | MonsterStats | undefined,
): MonsterStats | null {
  if (!stats) return null;
  if (typeof stats === "string") {
    try {
      return JSON.parse(stats);
    } catch {
      return null;
    }
  }
  return stats;
}

function getModifier(score: number): string {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : String(mod);
}

function formatHitPoints(hp: number | HitPoints): string {
  if (typeof hp === "number") return String(hp);
  if (hp.average && hp.roll) return `${hp.average} (${hp.roll})`;
  if (hp.average) return String(hp.average);
  return "";
}

export function MonsterDetail({ monster }: MonsterDetailProps) {
  const stats = parseStats(monster.stats);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-text mb-2">{monster.name}</h2>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg font-semibold">
            CR {monster.cr}
          </span>
        </div>
      </div>

      {/* Combat Statistics */}
      {stats && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3">
            Combat Statistics
          </h3>
          <div className="bg-surface p-6 rounded-lg border border-border space-y-4">
            {stats.armor_class && (
              <div className="flex justify-between">
                <span className="text-text-muted">Armor Class</span>
                <span className="text-text font-semibold">
                  {stats.armor_class}
                </span>
              </div>
            )}
            {stats.hit_points && (
              <div className="flex justify-between">
                <span className="text-text-muted">Hit Points</span>
                <span className="text-text font-semibold">
                  {formatHitPoints(stats.hit_points)}
                </span>
              </div>
            )}
            {stats.speed && (
              <div>
                <div className="text-text-muted mb-2">Speed</div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(stats.speed).map(([type, value]) => (
                    <div key={type} className="text-text">
                      <span className="capitalize">{type}:</span> {value}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ability Scores */}
      {stats?.abilities && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3">
            Ability Scores
          </h3>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {Object.entries(stats.abilities).map(([ability, score]) => (
              <div
                key={ability}
                className="bg-surface p-3 rounded-lg border border-border text-center"
              >
                <div className="text-xs text-text-muted uppercase">
                  {ability}
                </div>
                <div className="text-2xl font-bold text-text">{score}</div>
                <div className="text-xs text-text-muted">
                  {getModifier(score)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lore */}
      {monster.lore && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-2">Lore</h3>
          <p className="text-text leading-relaxed whitespace-pre-wrap">
            {monster.lore}
          </p>
        </div>
      )}

      {/* Tactics */}
      {monster.tactics && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-2">Tactics</h3>
          <p className="text-text leading-relaxed whitespace-pre-wrap">
            {monster.tactics}
          </p>
        </div>
      )}

      {/* Actions */}
      {stats?.actions && stats.actions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3">Actions</h3>
          <div className="space-y-3">
            {stats.actions.map((action, idx) => (
              <div
                key={idx}
                className="bg-surface p-4 rounded-lg border border-border"
              >
                <div className="font-semibold text-text mb-1">
                  {action.name}
                </div>
                <p className="text-text-muted text-sm">{action.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
