import { useState } from 'react'
import Icon from '../common/Icon'
import { CombatParticipant, DND_CONDITIONS } from './CombatTracker'

interface ParticipantCardProps {
  participant: CombatParticipant
  isCurrentTurn: boolean
  compact?: boolean
  onUpdate: (updates: Partial<CombatParticipant>) => void
  onRemove: () => void
}

export default function ParticipantCard({
  participant,
  isCurrentTurn,
  compact = false,
  onUpdate,
  onRemove,
}: ParticipantCardProps) {
  const [hpChange, setHpChange] = useState('')
  const [showConditions, setShowConditions] = useState(false)

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

  const handleHPChange = (isDamage: boolean) => {
    const amount = parseInt(hpChange) || 0
    if (amount <= 0) return

    let newHP: number
    let newTempHP = participant.temp_hp

    if (isDamage) {
      // Apply damage to temp HP first
      if (newTempHP > 0) {
        if (amount <= newTempHP) {
          newTempHP -= amount
          newHP = participant.current_hp
        } else {
          const remainingDamage = amount - newTempHP
          newTempHP = 0
          newHP = Math.max(0, participant.current_hp - remainingDamage)
        }
      } else {
        newHP = Math.max(0, participant.current_hp - amount)
      }
    } else {
      // Healing
      newHP = Math.min(participant.max_hp, participant.current_hp + amount)
    }

    onUpdate({ current_hp: newHP, temp_hp: newTempHP })
    setHpChange('')
  }

  const handleAddTempHP = () => {
    const amount = parseInt(hpChange) || 0
    if (amount <= 0) return
    // Temp HP doesn't stack, take the higher value
    onUpdate({ temp_hp: Math.max(participant.temp_hp, amount) })
    setHpChange('')
  }

  const toggleCondition = (condition: string) => {
    const currentConditions: string[] = participant.conditions
      ? JSON.parse(participant.conditions)
      : []

    const newConditions = currentConditions.includes(condition)
      ? currentConditions.filter((c) => c !== condition)
      : [...currentConditions, condition]

    onUpdate({ conditions: JSON.stringify(newConditions) })
  }

  const parsedConditions: string[] = participant.conditions
    ? JSON.parse(participant.conditions)
    : []

  // Death saves handling
  const deathSaves = participant.death_saves
    ? JSON.parse(participant.death_saves)
    : { successes: 0, failures: 0 }

  const handleDeathSave = (isSuccess: boolean) => {
    const newSaves = { ...deathSaves }
    if (isSuccess) {
      newSaves.successes = Math.min(3, newSaves.successes + 1)
    } else {
      newSaves.failures = Math.min(3, newSaves.failures + 1)
    }
    onUpdate({ death_saves: JSON.stringify(newSaves) })
  }

  const resetDeathSaves = () => {
    onUpdate({ death_saves: JSON.stringify({ successes: 0, failures: 0 }) })
  }

  const isDying = participant.current_hp === 0 && participant.participant_type === 'pc'

  // Compact view for the grid
  if (compact) {
    return (
      <div
        className={`bg-background-panel border rounded-lg p-3 transition-all ${
          isCurrentTurn ? 'border-primary ring-2 ring-primary/20' : 'border-border'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-text truncate">{participant.name}</span>
            <span
              className={`px-1.5 py-0.5 text-xs rounded ${getTypeColor(participant.participant_type)}`}
            >
              {participant.participant_type.toUpperCase()}
            </span>
          </div>
          <span className="text-sm text-text-muted">AC {participant.ac}</span>
        </div>

        {/* HP Bar */}
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-text-muted">HP</span>
            <span className="text-text">
              {participant.current_hp}
              {participant.temp_hp > 0 && (
                <span className="text-blue-400"> +{participant.temp_hp}</span>
              )}
              <span className="text-text-muted">/{participant.max_hp}</span>
            </span>
          </div>
          <div className="h-2 bg-background rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${getHPColor(participant.current_hp, participant.max_hp)}`}
              style={{
                width: `${Math.min(100, (participant.current_hp / participant.max_hp) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Quick HP adjustment */}
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={hpChange}
            onChange={(e) => setHpChange(e.target.value)}
            placeholder="HP"
            className="flex-1 px-2 py-1 bg-background border border-border rounded text-xs text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
          />
          <button
            onClick={() => handleHPChange(true)}
            className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors text-xs font-bold"
            title="Damage"
          >
            -
          </button>
          <button
            onClick={() => handleHPChange(false)}
            className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded transition-colors text-xs font-bold"
            title="Heal"
          >
            +
          </button>
        </div>

        {/* Conditions */}
        {parsedConditions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {parsedConditions.map((c) => (
              <span
                key={c}
                className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded"
              >
                {c}
              </span>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Full view for current turn
  return (
    <div
      className={`bg-background-panel border rounded-xl overflow-hidden ${
        isCurrentTurn ? 'border-primary ring-2 ring-primary/20' : 'border-border'
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isCurrentTurn && (
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <Icon name="ArrowRight" className="w-5 h-5 text-background" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-text">{participant.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded ${getTypeColor(participant.participant_type)}`}
                >
                  {participant.participant_type.toUpperCase()}
                </span>
                <span className="text-sm text-text-muted">
                  Initiative: {participant.initiative}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onRemove}
            className="p-2 hover:bg-red-500/20 text-text-muted hover:text-red-400 rounded-lg transition-colors"
            title="Remove from combat"
          >
            <Icon name="Trash2" className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 grid grid-cols-3 gap-4 border-b border-border">
        <div className="text-center">
          <div className="text-2xl font-bold text-text">{participant.ac}</div>
          <div className="text-xs text-text-muted uppercase">Armor Class</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-text">{participant.initiative}</div>
          <div className="text-xs text-text-muted uppercase">Initiative</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-text">
            {participant.passive_perception || '—'}
          </div>
          <div className="text-xs text-text-muted uppercase">Passive Perception</div>
        </div>
      </div>

      {/* HP Section */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-text">Hit Points</h3>
          <div className="text-lg font-bold text-text">
            {participant.current_hp}
            {participant.temp_hp > 0 && (
              <span className="text-blue-400"> +{participant.temp_hp}</span>
            )}
            <span className="text-text-muted">/{participant.max_hp}</span>
          </div>
        </div>

        {/* HP Bar */}
        <div className="h-4 bg-background rounded-full overflow-hidden mb-4">
          <div
            className={`h-full transition-all ${getHPColor(participant.current_hp, participant.max_hp)}`}
            style={{
              width: `${Math.min(100, (participant.current_hp / participant.max_hp) * 100)}%`,
            }}
          />
        </div>

        {/* HP Controls */}
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={hpChange}
            onChange={(e) => setHpChange(e.target.value)}
            placeholder="Amount"
            className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
          />
          <button
            onClick={() => handleHPChange(true)}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium rounded-lg transition-colors"
          >
            Damage
          </button>
          <button
            onClick={() => handleHPChange(false)}
            className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-medium rounded-lg transition-colors"
          >
            Heal
          </button>
          <button
            onClick={handleAddTempHP}
            className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-medium rounded-lg transition-colors"
          >
            Temp HP
          </button>
        </div>

        {/* Death Saves (for PCs at 0 HP) */}
        {isDying && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <h4 className="font-semibold text-red-400 mb-3 flex items-center gap-2">
              <Icon name="AlertCircle" className="w-5 h-5" />
              Death Saves
            </h4>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-xs text-text-muted mb-1">Successes</div>
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <button
                        key={`success-${i}`}
                        onClick={() => handleDeathSave(true)}
                        className={`w-6 h-6 rounded-full border-2 transition-colors ${
                          i < deathSaves.successes
                            ? 'bg-emerald-500 border-emerald-500'
                            : 'border-emerald-500/50 hover:border-emerald-500'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-text-muted mb-1">Failures</div>
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <button
                        key={`failure-${i}`}
                        onClick={() => handleDeathSave(false)}
                        className={`w-6 h-6 rounded-full border-2 transition-colors ${
                          i < deathSaves.failures
                            ? 'bg-red-500 border-red-500'
                            : 'border-red-500/50 hover:border-red-500'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={resetDeathSaves}
                className="text-xs text-text-muted hover:text-text transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Conditions */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-text">Conditions</h3>
          <button
            onClick={() => setShowConditions(!showConditions)}
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            {showConditions ? 'Hide' : 'Manage'}
          </button>
        </div>

        {/* Active Conditions */}
        {parsedConditions.length > 0 ? (
          <div className="flex flex-wrap gap-2 mb-3">
            {parsedConditions.map((c) => (
              <button
                key={c}
                onClick={() => toggleCondition(c)}
                className="px-3 py-1.5 bg-purple-500/20 text-purple-400 text-sm rounded-lg flex items-center gap-1.5 hover:bg-purple-500/30 transition-colors"
              >
                {c}
                <Icon name="X" className="w-3 h-3" />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted mb-3">No active conditions</p>
        )}

        {/* Condition Selector */}
        {showConditions && (
          <div className="flex flex-wrap gap-2 p-3 bg-background rounded-lg">
            {DND_CONDITIONS.map((c) => (
              <button
                key={c}
                onClick={() => toggleCondition(c)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  parsedConditions.includes(c)
                    ? 'bg-purple-500 text-white'
                    : 'bg-background-panel text-text-muted hover:text-text border border-border hover:border-purple-500/40'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {/* Quick Status Toggles */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => onUpdate({ is_surprised: !participant.is_surprised })}
            className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
              participant.is_surprised
                ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                : 'border-border text-text-muted hover:border-amber-500/40'
            }`}
          >
            Surprised
          </button>
          <button
            onClick={() => onUpdate({ has_reaction: !participant.has_reaction })}
            className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
              !participant.has_reaction
                ? 'bg-gray-500/20 border-gray-500 text-gray-400'
                : 'border-border text-text-muted hover:border-gray-500/40'
            }`}
          >
            {participant.has_reaction ? 'Has Reaction' : 'No Reaction'}
          </button>
        </div>
      </div>
    </div>
  )
}
