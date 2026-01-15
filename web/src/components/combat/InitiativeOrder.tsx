import { useState } from 'react'
import Icon from '../common/Icon'
import { CombatParticipant } from './CombatTracker'

interface InitiativeOrderProps {
  participants: CombatParticipant[]
  currentTurn: number
  onAddParticipant: (participant: Omit<CombatParticipant, 'id' | 'combat_id'>) => void
}

export default function InitiativeOrder({
  participants,
  currentTurn,
  onAddParticipant,
}: InitiativeOrderProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [newParticipant, setNewParticipant] = useState({
    name: '',
    participant_type: 'monster' as 'pc' | 'npc' | 'monster',
    max_hp: 10,
    ac: 10,
    initiative: 10,
    initiative_bonus: 0,
  })

  const handleAddParticipant = () => {
    if (!newParticipant.name.trim()) return

    onAddParticipant({
      ...newParticipant,
      current_hp: newParticipant.max_hp,
      temp_hp: 0,
      is_surprised: false,
      has_reaction: true,
      legendary_actions_used: 0,
      legendary_actions_max: 0,
      position: participants.length,
    })

    // Reset form
    setNewParticipant({
      name: '',
      participant_type: 'monster',
      max_hp: 10,
      ac: 10,
      initiative: 10,
      initiative_bonus: 0,
    })
    setShowAddForm(false)
  }

  const rollInitiative = () => {
    const roll = Math.floor(Math.random() * 20) + 1
    setNewParticipant({
      ...newParticipant,
      initiative: roll + newParticipant.initiative_bonus,
    })
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'pc':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
      case 'npc':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40'
      case 'monster':
        return 'bg-red-500/20 text-red-400 border-red-500/40'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/40'
    }
  }

  const getHPColor = (current: number, max: number) => {
    const ratio = current / max
    if (ratio > 0.5) return 'bg-emerald-500'
    if (ratio > 0.25) return 'bg-amber-500'
    return 'bg-red-500'
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-text">Initiative Order</h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="p-1.5 hover:bg-background rounded transition-colors"
            title="Add Combatant"
          >
            <Icon name="Plus" className="w-5 h-5 text-primary" />
          </button>
        </div>
      </div>

      {/* Add Participant Form */}
      {showAddForm && (
        <div className="p-4 border-b border-border bg-background/50 space-y-3">
          <input
            type="text"
            value={newParticipant.name}
            onChange={(e) => setNewParticipant({ ...newParticipant, name: e.target.value })}
            placeholder="Name"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
            autoFocus
          />

          <div className="flex gap-2">
            {(['pc', 'npc', 'monster'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setNewParticipant({ ...newParticipant, participant_type: type })}
                className={`flex-1 px-2 py-1.5 text-xs font-medium rounded border transition-colors ${
                  newParticipant.participant_type === type
                    ? getTypeColor(type)
                    : 'bg-background border-border text-text-muted hover:border-primary/40'
                }`}
              >
                {type.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-text-muted">HP</label>
              <input
                type="number"
                value={newParticipant.max_hp}
                onChange={(e) =>
                  setNewParticipant({ ...newParticipant, max_hp: parseInt(e.target.value) || 0 })
                }
                className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm text-text focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted">AC</label>
              <input
                type="number"
                value={newParticipant.ac}
                onChange={(e) =>
                  setNewParticipant({ ...newParticipant, ac: parseInt(e.target.value) || 0 })
                }
                className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm text-text focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted">Init</label>
              <div className="flex gap-1">
                <input
                  type="number"
                  value={newParticipant.initiative}
                  onChange={(e) =>
                    setNewParticipant({
                      ...newParticipant,
                      initiative: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm text-text focus:border-primary focus:outline-none"
                />
                <button
                  onClick={rollInitiative}
                  className="px-2 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary rounded transition-colors"
                  title="Roll d20"
                >
                  <Icon name="Dices" className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAddParticipant}
              disabled={!newParticipant.name.trim()}
              className="flex-1 px-3 py-2 bg-primary hover:bg-primary/80 text-background text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              Add to Combat
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-3 py-2 bg-background border border-border hover:border-primary/40 text-text-muted text-sm rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Participant List */}
      <div className="flex-1 overflow-y-auto">
        {participants.length === 0 ? (
          <div className="p-4 text-center text-text-muted text-sm">
            <Icon name="Users" className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No combatants yet</p>
            <p className="text-xs mt-1">Click + to add participants</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {participants.map((p, index) => {
              const isCurrentTurn = index === currentTurn % participants.length
              return (
                <div
                  key={p.id}
                  className={`p-3 transition-colors ${
                    isCurrentTurn
                      ? 'bg-primary/10 border-l-4 border-l-primary'
                      : 'hover:bg-background'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {/* Initiative */}
                    <div className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-sm font-bold text-text">
                      {p.initiative}
                    </div>

                    {/* Name & Type */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text truncate">{p.name}</span>
                        {isCurrentTurn && (
                          <Icon name="ArrowRight" className="w-4 h-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={`px-1.5 py-0.5 text-xs rounded ${getTypeColor(p.participant_type)}`}
                        >
                          {p.participant_type.toUpperCase()}
                        </span>
                        <span className="text-xs text-text-muted">AC {p.ac}</span>
                      </div>
                    </div>
                  </div>

                  {/* HP Bar */}
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-text-muted">HP</span>
                      <span className="text-text">
                        {p.current_hp}
                        {p.temp_hp > 0 && <span className="text-blue-400"> +{p.temp_hp}</span>}
                        <span className="text-text-muted">/{p.max_hp}</span>
                      </span>
                    </div>
                    <div className="h-1.5 bg-background rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${getHPColor(p.current_hp, p.max_hp)}`}
                        style={{ width: `${Math.min(100, (p.current_hp / p.max_hp) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Status indicators */}
                  {(p.is_surprised || !p.has_reaction || p.concentration_spell) && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {p.is_surprised && (
                        <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded">
                          Surprised
                        </span>
                      )}
                      {!p.has_reaction && (
                        <span className="px-1.5 py-0.5 bg-gray-500/20 text-gray-400 text-xs rounded">
                          No Reaction
                        </span>
                      )}
                      {p.concentration_spell && (
                        <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">
                          Concentrating
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
