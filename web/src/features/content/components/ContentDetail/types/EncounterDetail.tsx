// Encounter content detail view

interface Creature {
  name: string
  quantity?: number
  cr?: string | number
  notes?: string
}

interface Environment {
  terrain?: string
  lighting?: string
  weather?: string
}

interface Treasure {
  coins?: Record<string, number>
  items?: string[]
}

interface EncounterData {
  name: string
  party_level: number
  party_size: number
  difficulty: string
  description?: string
  creatures?: string | Creature[]
  environment?: string | Environment
  treasure?: string | Treasure
  xp_total?: number
  xp_per_player?: number
  notes?: string
}

interface EncounterDetailProps {
  encounter: EncounterData
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

function getDifficultyClasses(difficulty: string): string {
  switch (difficulty.toLowerCase()) {
    case 'deadly':
      return 'bg-red-900/30 text-red-400'
    case 'hard':
      return 'bg-orange-900/30 text-orange-400'
    case 'medium':
      return 'bg-yellow-900/30 text-yellow-400'
    default:
      return 'bg-green-900/30 text-green-400'
  }
}

export function EncounterDetail({ encounter }: EncounterDetailProps) {
  const creatures = parseJSON<Creature[]>(encounter.creatures) || []
  const environment = parseJSON<Environment>(encounter.environment)
  const treasure = parseJSON<Treasure>(encounter.treasure)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-text mb-3">{encounter.name}</h2>
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="px-3 py-1 bg-surface rounded-lg text-text text-sm">
            Party Level: {encounter.party_level}
          </span>
          <span className="px-3 py-1 bg-surface rounded-lg text-text text-sm">
            Party Size: {encounter.party_size}
          </span>
          <span
            className={`px-3 py-1 rounded-lg text-sm font-semibold capitalize ${getDifficultyClasses(encounter.difficulty)}`}
          >
            {encounter.difficulty}
          </span>
        </div>
      </div>

      {/* Description */}
      {encounter.description && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-2">Description</h3>
          <p className="text-text leading-relaxed whitespace-pre-wrap">{encounter.description}</p>
        </div>
      )}

      {/* Environment */}
      {environment && Object.keys(environment).length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3">Environment</h3>
          <div className="bg-surface p-4 rounded-lg border border-border space-y-2">
            {environment.terrain && (
              <div>
                <span className="text-text-muted font-medium">Terrain:</span>{' '}
                <span className="text-text">{environment.terrain}</span>
              </div>
            )}
            {environment.lighting && (
              <div>
                <span className="text-text-muted font-medium">Lighting:</span>{' '}
                <span className="text-text">{environment.lighting}</span>
              </div>
            )}
            {environment.weather && (
              <div>
                <span className="text-text-muted font-medium">Weather:</span>{' '}
                <span className="text-text">{environment.weather}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Creatures */}
      {creatures.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3">Creatures</h3>
          <div className="space-y-3">
            {creatures.map((creature, idx) => (
              <div key={idx} className="bg-surface p-4 rounded-lg border border-border">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-text">{creature.name}</div>
                    <div className="text-sm text-text-muted">
                      Quantity: {creature.quantity || 1}
                    </div>
                  </div>
                  {creature.cr && (
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">
                      CR {creature.cr}
                    </span>
                  )}
                </div>
                {creature.notes && <p className="text-text text-sm mt-2">{creature.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* XP */}
      <div className="grid grid-cols-2 gap-4">
        {encounter.xp_total && (
          <div className="bg-surface p-4 rounded-lg border border-border">
            <div className="text-text-muted text-sm">Total XP</div>
            <div className="text-2xl font-bold text-text">{encounter.xp_total}</div>
          </div>
        )}
        {encounter.xp_per_player && (
          <div className="bg-surface p-4 rounded-lg border border-border">
            <div className="text-text-muted text-sm">XP per Player</div>
            <div className="text-2xl font-bold text-text">{encounter.xp_per_player}</div>
          </div>
        )}
      </div>

      {/* Treasure */}
      {treasure && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3">Treasure</h3>
          <div className="bg-surface p-4 rounded-lg border border-border space-y-3">
            {treasure.coins && Object.keys(treasure.coins).length > 0 && (
              <div>
                <div className="text-sm text-text-muted mb-2">Coins</div>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(treasure.coins).map(([coin, amount]) => (
                    <span
                      key={coin}
                      className="px-3 py-1 bg-primary/20 text-primary rounded-lg text-sm font-semibold"
                    >
                      {amount} {coin.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {treasure.items && treasure.items.length > 0 && (
              <div>
                <div className="text-sm text-text-muted mb-2">Items</div>
                <ul className="list-disc list-inside text-text space-y-1">
                  {treasure.items.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {encounter.notes && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-2">Notes</h3>
          <p className="text-text leading-relaxed">{encounter.notes}</p>
        </div>
      )}
    </div>
  )
}
