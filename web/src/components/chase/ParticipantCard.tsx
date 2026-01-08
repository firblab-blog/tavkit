import { useState } from 'react'
import Icon from '../common/Icon'
import type { ChaseParticipant } from '../../types/chase'
import { getParticipantIcon } from '../../types/chase'

interface ParticipantCardProps {
  participant: ChaseParticipant
  onUpdate?: (updates: Partial<ChaseParticipant>) => void
  showControls?: boolean
}

export default function ParticipantCard({
  participant,
  onUpdate,
  showControls = false,
}: ParticipantCardProps) {
  const [isEditingConditions, setIsEditingConditions] = useState(false)
  const [newCondition, setNewCondition] = useState('')

  // Calculate stamina percentage
  const staminaPercent =
    participant.max_stamina > 0 ? (participant.stamina / participant.max_stamina) * 100 : 0

  // Get stamina color
  const getStaminaColor = (percent: number) => {
    if (percent > 60) return 'bg-green-500'
    if (percent > 30) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const handleAddCondition = () => {
    if (newCondition.trim() && participant.conditions) {
      const updatedConditions = [...participant.conditions, newCondition.trim()]
      onUpdate?.({ conditions: updatedConditions })
      setNewCondition('')
    }
  }

  const handleRemoveCondition = (index: number) => {
    if (participant.conditions) {
      const updatedConditions = participant.conditions.filter((_, i) => i !== index)
      onUpdate?.({ conditions: updatedConditions })
    }
  }

  const handleStaminaDamage = (amount: number) => {
    const newStamina = Math.max(0, participant.stamina - amount)
    onUpdate?.({ stamina: newStamina })
  }

  const handleStaminaHeal = (amount: number) => {
    const newStamina = Math.min(participant.max_stamina, participant.stamina + amount)
    onUpdate?.({ stamina: newStamina })
  }

  return (
    <div
      className={`p-4 rounded-lg border-2 transition-all ${
        participant.role === 'quarry'
          ? 'bg-amber-950/30 border-amber-700 hover:border-amber-600'
          : 'bg-blue-950/30 border-blue-700 hover:border-blue-600'
      } ${participant.stamina === 0 ? 'opacity-60' : ''}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`text-3xl ${participant.role === 'quarry' ? 'opacity-90' : 'opacity-80'}`}
          >
            {getParticipantIcon(participant)}
          </div>
          <div>
            <div className="font-semibold text-stone-100">{participant.name}</div>
            <div
              className={`text-xs font-medium ${
                participant.role === 'quarry' ? 'text-amber-400' : 'text-blue-400'
              }`}
            >
              {participant.role === 'quarry' ? 'Quarry' : 'Pursuer'}
              {participant.participant_type === 'npc' && ' (NPC)'}
            </div>
          </div>
        </div>

        {/* Position badge */}
        <div className="text-right">
          <div className="text-xs text-stone-400">Position</div>
          <div className="text-lg font-bold text-stone-200">{participant.current_position}</div>
        </div>
      </div>

      {/* Stamina bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-stone-400 mb-1">
          <span>Stamina</span>
          <span>
            {participant.stamina} / {participant.max_stamina}
          </span>
        </div>
        <div className="h-2 bg-stone-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${getStaminaColor(staminaPercent)}`}
            style={{ width: `${staminaPercent}%` }}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
        <div className="bg-stone-800/50 rounded p-2 text-center">
          <div className="text-stone-400">Speed</div>
          <div className="font-semibold text-stone-200">{participant.movement_speed}</div>
        </div>
        <div className="bg-stone-800/50 rounded p-2 text-center">
          <div className="text-stone-400">Moved</div>
          <div
            className={`font-semibold ${
              participant.movement_this_round > 0
                ? 'text-green-400'
                : participant.movement_this_round < 0
                  ? 'text-red-400'
                  : 'text-stone-400'
            }`}
          >
            {participant.movement_this_round > 0 ? '+' : ''}
            {participant.movement_this_round}
          </div>
        </div>
        <div className="bg-stone-800/50 rounded p-2 text-center">
          <div className="text-stone-400">Dash</div>
          <div
            className={`font-semibold ${
              participant.has_dashed ? 'text-amber-400' : 'text-stone-500'
            }`}
          >
            {participant.has_dashed ? 'Yes' : 'No'}
          </div>
        </div>
      </div>

      {/* Conditions */}
      {participant.conditions && participant.conditions.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-stone-400 mb-1">Conditions</div>
          <div className="flex flex-wrap gap-1">
            {participant.conditions.map((condition, index) => (
              <div
                key={index}
                className="inline-flex items-center gap-1 px-2 py-1 bg-purple-900/30 border border-purple-700 rounded text-xs text-purple-300"
              >
                <span>{condition}</span>
                {showControls && onUpdate && (
                  <button
                    onClick={() => handleRemoveCondition(index)}
                    className="hover:text-purple-100 transition-colors"
                    aria-label={`Remove ${condition} condition`}
                  >
                    <Icon name="X" size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      {showControls && onUpdate && (
        <div className="mt-3 pt-3 border-t border-stone-700 space-y-2">
          {/* Stamina controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleStaminaDamage(1)}
              disabled={participant.stamina === 0}
              className="flex-1 px-2 py-1 bg-red-900/30 border border-red-700 rounded text-xs text-red-300 hover:bg-red-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              -1 Stamina
            </button>
            <button
              onClick={() => handleStaminaHeal(1)}
              disabled={participant.stamina === participant.max_stamina}
              className="flex-1 px-2 py-1 bg-green-900/30 border border-green-700 rounded text-xs text-green-300 hover:bg-green-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              +1 Stamina
            </button>
          </div>

          {/* Add condition */}
          {isEditingConditions ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newCondition}
                onChange={(e) => setNewCondition(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCondition()
                  if (e.key === 'Escape') {
                    setNewCondition('')
                    setIsEditingConditions(false)
                  }
                }}
                placeholder="Condition name..."
                className="flex-1 px-2 py-1 bg-stone-800 border border-stone-600 rounded text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                autoFocus
              />
              <button
                onClick={handleAddCondition}
                className="px-2 py-1 bg-purple-900/30 border border-purple-700 rounded text-xs text-purple-300 hover:bg-purple-900/50 transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setNewCondition('')
                  setIsEditingConditions(false)
                }}
                className="px-2 py-1 bg-stone-700 border border-stone-600 rounded text-xs text-stone-300 hover:bg-stone-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditingConditions(true)}
              className="w-full px-2 py-1 bg-purple-900/30 border border-purple-700 rounded text-xs text-purple-300 hover:bg-purple-900/50 transition-colors flex items-center justify-center gap-1"
            >
              <Icon name="Plus" size={12} />
              Add Condition
            </button>
          )}
        </div>
      )}

      {/* Exhausted indicator */}
      {participant.stamina === 0 && (
        <div className="mt-3 p-2 bg-red-900/30 border border-red-700 rounded text-xs text-red-300 text-center font-medium">
          <Icon name="AlertCircle" size={14} className="inline mr-1" />
          Exhausted - Cannot dash
        </div>
      )}
    </div>
  )
}
