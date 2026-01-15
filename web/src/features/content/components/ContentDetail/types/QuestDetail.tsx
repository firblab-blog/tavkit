// Quest content detail view

interface Objective {
  description?: string
}

interface Reward {
  description?: string
}

interface Complication {
  description?: string
}

interface NPC {
  name?: string
}

interface Location {
  name?: string
}

interface QuestData {
  title: string
  type: string
  status: string
  category?: string
  party_level?: number
  description?: string
  objectives?: string | (string | Objective)[]
  rewards?: string | (string | Reward)[]
  complications?: string | (string | Complication)[]
  combat_intensity?: string
  time_limit?: string
  npcs_involved?: string | (string | NPC)[]
  locations_involved?: string | (string | Location)[]
}

interface QuestDetailProps {
  quest: QuestData
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

function getStatusClasses(status: string): string {
  switch (status.toLowerCase()) {
    case 'available':
      return 'bg-blue-900/30 text-blue-400'
    case 'active':
      return 'bg-green-900/30 text-green-400'
    case 'completed':
      return 'bg-primary/20 text-primary'
    default:
      return 'bg-red-900/30 text-red-400'
  }
}

export function QuestDetail({ quest }: QuestDetailProps) {
  const objectives = parseJSON<(string | Objective)[]>(quest.objectives) || []
  const rewards = parseJSON<(string | Reward)[]>(quest.rewards) || []
  const complications = parseJSON<(string | Complication)[]>(quest.complications) || []
  const npcsInvolved = parseJSON<(string | NPC)[]>(quest.npcs_involved) || []
  const locationsInvolved = parseJSON<(string | Location)[]>(quest.locations_involved) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-text mb-3">{quest.title}</h2>
        <div className="flex gap-2 flex-wrap">
          <span className="px-3 py-1 bg-primary/30 text-text rounded-lg text-sm uppercase">
            {quest.type}
          </span>
          <span className={`px-3 py-1 rounded-lg text-sm uppercase ${getStatusClasses(quest.status)}`}>
            {quest.status}
          </span>
          {quest.category && (
            <span className="px-3 py-1 bg-surface text-text-muted rounded-lg text-sm capitalize">
              {quest.category}
            </span>
          )}
          {quest.party_level && (
            <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-sm">
              Level {quest.party_level}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {quest.description && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-2">Description</h3>
          <p className="text-text leading-relaxed whitespace-pre-wrap">{quest.description}</p>
        </div>
      )}

      {/* Objectives */}
      {objectives.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3">Objectives</h3>
          <ul className="list-disc list-inside space-y-2 text-text">
            {objectives.map((objective, idx) => (
              <li key={idx}>
                {typeof objective === 'string' ? objective : objective.description}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Rewards */}
      {rewards.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3">Rewards</h3>
          <div className="bg-primary/10 p-4 rounded-lg border border-primary/30">
            <ul className="space-y-1 text-text">
              {rewards.map((reward, idx) => (
                <li key={idx}>{typeof reward === 'string' ? reward : reward.description}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Complications */}
      {complications.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3">Complications</h3>
          <div className="space-y-2">
            {complications.map((complication, idx) => (
              <div key={idx} className="bg-red-900/20 p-3 rounded-lg border border-red-500/30">
                <p className="text-text text-sm">
                  {typeof complication === 'string' ? complication : complication.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Combat & Time */}
      <div className="grid grid-cols-2 gap-4">
        {quest.combat_intensity && (
          <div className="bg-surface p-4 rounded-lg border border-border">
            <div className="text-xs text-text-muted uppercase tracking-wide mb-1">
              Combat Intensity
            </div>
            <div className="text-text capitalize">{quest.combat_intensity}</div>
          </div>
        )}
        {quest.time_limit && (
          <div className="bg-surface p-4 rounded-lg border border-border">
            <div className="text-xs text-text-muted uppercase tracking-wide mb-1">Time Limit</div>
            <div className="text-text">{quest.time_limit}</div>
          </div>
        )}
      </div>

      {/* NPCs Involved */}
      {npcsInvolved.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3">NPCs Involved</h3>
          <div className="flex flex-wrap gap-2">
            {npcsInvolved.map((npc, idx) => (
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

      {/* Locations */}
      {locationsInvolved.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3">Locations</h3>
          <div className="flex flex-wrap gap-2">
            {locationsInvolved.map((location, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-primary/30 text-text rounded-full text-sm"
              >
                {typeof location === 'string' ? location : location?.name || 'Unnamed Location'}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
