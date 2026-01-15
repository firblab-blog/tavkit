// Location content detail view

interface Feature {
  description?: string
}

interface Secret {
  description?: string
}

interface NPC {
  name?: string
}

interface Encounter {
  description?: string
}

interface LocationData {
  name: string
  type: string
  theme?: string
  description?: string
  features?: string | (string | Feature)[]
  secrets?: string | (string | Secret)[]
  factions?: string | string[]
  npcs?: string | (string | NPC)[]
  encounters?: string | (string | Encounter)[]
}

interface LocationDetailProps {
  location: LocationData
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

export function LocationDetail({ location }: LocationDetailProps) {
  const features = parseJSON<(string | Feature)[]>(location.features) || []
  const secrets = parseJSON<(string | Secret)[]>(location.secrets) || []
  const factions = parseJSON<string[]>(location.factions) || []
  const npcs = parseJSON<(string | NPC)[]>(location.npcs) || []
  const encounters = parseJSON<(string | Encounter)[]>(location.encounters) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-text mb-2">{location.name}</h2>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-primary/30 text-text rounded-lg text-sm capitalize">
            {location.type}
          </span>
          {location.theme && (
            <span className="px-3 py-1 bg-surface text-text-muted rounded-lg text-sm">
              {location.theme}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {location.description && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-2">Description</h3>
          <p className="text-text leading-relaxed whitespace-pre-wrap">{location.description}</p>
        </div>
      )}

      {/* Notable Features */}
      {features.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3">Notable Features</h3>
          <ul className="list-disc list-inside space-y-2 text-text">
            {features.map((feature, idx) => (
              <li key={idx}>
                {typeof feature === 'string' ? feature : feature.description}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Secrets & Clues */}
      {secrets.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3">Secrets & Clues</h3>
          <div className="space-y-2">
            {secrets.map((secret, idx) => (
              <div key={idx} className="bg-surface p-3 rounded-lg border border-border">
                <p className="text-text text-sm">
                  {typeof secret === 'string' ? secret : secret.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Factions */}
      {factions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3">Factions Present</h3>
          <div className="flex flex-wrap gap-2">
            {factions.map((faction, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-primary/30 text-text rounded-full text-sm"
              >
                {faction}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* NPCs */}
      {npcs.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3">NPCs</h3>
          <div className="flex flex-wrap gap-2">
            {npcs.map((npc, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-surface text-text rounded-full text-sm"
              >
                {typeof npc === 'string' ? npc : npc?.name || 'Unnamed NPC'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Encounter Hooks */}
      {encounters.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3">Encounter Hooks</h3>
          <ul className="list-disc list-inside space-y-2 text-text">
            {encounters.map((encounter, idx) => (
              <li key={idx}>
                {typeof encounter === 'string' ? encounter : encounter.description}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
