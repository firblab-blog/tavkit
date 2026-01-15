import { useState, useEffect, useCallback } from 'react'
import Icon from '../../../common/Icon'
import {
  useGMCombatStore,
  CombatParticipant,
  CreateCombatRequest,
} from '../../../../store/gmCombatStore'
import PartyImporter, { ImportedParticipant } from './combat/PartyImporter'
import ConditionManager, { ActiveCondition } from './combat/ConditionManager'

interface CombatTabProps {
  readonly campaignId: string
}

/**
 * CombatTab - Inline combat tracker for GM.
 *
 * Shows:
 * - Combat setup when no active combat
 * - Active combat tracker with initiative order and participant cards
 * - Real-time sync via WebSocket with players
 */
export default function CombatTab({ campaignId }: CombatTabProps) {
  const {
    combat,
    participants,
    loading,
    error,
    fetchActiveCombat,
    createCombat,
    endCombat,
    nextTurn,
    addParticipant,
    updateParticipant,
    removeParticipant,
    clearError,
  } = useGMCombatStore()

  const [showSetup, setShowSetup] = useState(false)
  const [newCombatName, setNewCombatName] = useState('')
  const [showPartyImporter, setShowPartyImporter] = useState(false)

  useEffect(() => {
    fetchActiveCombat(campaignId)
  }, [campaignId, fetchActiveCombat])

  // Auto-dismiss errors after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, clearError])

  const handleCreateCombat = useCallback(async () => {
    if (!newCombatName.trim()) return

    const data: CreateCombatRequest = {
      name: newCombatName.trim(),
      visibility_mode: 'full',
    }

    try {
      await createCombat(campaignId, data)
      setNewCombatName('')
      setShowSetup(false)
    } catch {
      // Error handled by store
    }
  }, [campaignId, newCombatName, createCombat])

  const handleEndCombat = useCallback(async () => {
    if (!combat) return
    if (!globalThis.confirm('Are you sure you want to end this combat?')) return
    await endCombat(combat.id)
  }, [combat, endCombat])

  const handleNextTurn = useCallback(async () => {
    if (!combat) return
    await nextTurn(combat.id)
  }, [combat, nextTurn])

  const handleImportParty = useCallback(
    async (importedParticipants: ImportedParticipant[]) => {
      if (!combat) return

      // Add all participants in sequence
      for (const participant of importedParticipants) {
        await addParticipant(combat.id, participant)
      }

      setShowPartyImporter(false)
    },
    [combat, addParticipant]
  )

  const handleAddCustomParticipant = useCallback(
    async (name: string, hp: number, ac: number, initiative: number) => {
      if (!combat) return
      await addParticipant(combat.id, {
        participant_type: 'npc',
        name,
        max_hp: hp,
        ac,
        initiative,
      })
    },
    [combat, addParticipant]
  )

  const handleUpdateHP = useCallback(
    async (participantId: string, delta: number) => {
      if (!combat) return
      const participant = participants.find((p) => p.id === participantId)
      if (!participant) return

      let newHP = participant.current_hp + delta
      let newTempHP = participant.temp_hp

      // Handle damage with temp HP absorption
      if (delta < 0 && participant.temp_hp > 0) {
        const damage = Math.abs(delta)
        const absorbed = Math.min(participant.temp_hp, damage)
        newTempHP = participant.temp_hp - absorbed
        newHP = Math.max(0, participant.current_hp - (damage - absorbed))
      } else {
        newHP = Math.max(0, Math.min(participant.max_hp, newHP))
      }

      await updateParticipant(combat.id, participantId, { current_hp: newHP, temp_hp: newTempHP })
    },
    [combat, participants, updateParticipant]
  )

  const handleRemoveParticipant = useCallback(
    async (participantId: string) => {
      if (!combat) return
      if (!globalThis.confirm('Remove this participant from combat?')) return
      await removeParticipant(combat.id, participantId)
    },
    [combat, removeParticipant]
  )

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  // No active combat - show setup
  if (!combat) {
    return (
      <div className="space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="bg-background-panel border border-border rounded-xl p-6 text-center">
          <Icon name="Swords" className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text mb-2">No Active Combat</h3>
          <p className="text-text-muted mb-6">
            Start a new combat encounter to begin tracking initiative and managing participants.
          </p>

          {showSetup ? (
            <div className="max-w-md mx-auto space-y-4">
              <input
                type="text"
                placeholder="Combat name (e.g., 'Goblin Ambush')"
                value={newCombatName}
                onChange={(e) => setNewCombatName(e.target.value)}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSetup(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg text-text-muted hover:text-text hover:border-text-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCombat}
                  disabled={!newCombatName.trim()}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Start Combat
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowSetup(true)}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
            >
              <Icon name="Plus" className="w-5 h-5" />
              Start New Combat
            </button>
          )}
        </div>

        <div className="bg-background-panel border border-border rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Icon name="Info" className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-text font-medium mb-1">Combat Sync</p>
              <p className="text-text-muted text-sm">
                When you start combat, players in your campaign will see the initiative order and
                can track their own HP and conditions in real-time.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Active combat - show tracker
  const sortedParticipants = [...participants].sort((a, b) => b.initiative - a.initiative)
  const currentParticipant = sortedParticipants[combat.current_turn]

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={clearError} className="text-red-400 hover:text-red-300">
            <Icon name="X" className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Combat Header */}
      <div className="bg-background-panel border border-border rounded-xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-semibold text-text">{combat.name}</h3>
            <div className="flex items-center gap-4 text-sm text-text-muted mt-1">
              <span>Round {combat.current_round + 1}</span>
              <span>
                Turn {combat.current_turn + 1} of {sortedParticipants.length}
              </span>
              {currentParticipant && (
                <span className="text-primary font-medium">Current: {currentParticipant.name}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleNextTurn}
              disabled={sortedParticipants.length === 0}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              <Icon name="ChevronRight" className="w-4 h-4" />
              Next Turn
            </button>
            <button
              onClick={handleEndCombat}
              className="px-4 py-2 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/10 transition-colors inline-flex items-center gap-2"
            >
              <Icon name="X" className="w-4 h-4" />
              End Combat
            </button>
          </div>
        </div>
      </div>

      {/* Add Participant Quick Form */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <button
            onClick={() => setShowPartyImporter(true)}
            className="flex-1 p-4 border border-dashed border-primary/50 rounded-xl text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <Icon name="Users" className="w-5 h-5" />
            Import Party Members
          </button>
        </div>
        <AddParticipantForm onAdd={handleAddCustomParticipant} />
      </div>

      {/* Party Importer Modal */}
      {showPartyImporter && combat && (
        <PartyImporter
          campaignId={campaignId}
          onImport={handleImportParty}
          onClose={() => setShowPartyImporter(false)}
        />
      )}

      {/* Initiative Order */}
      {sortedParticipants.length === 0 ? (
        <div className="bg-background-panel border border-border rounded-xl p-8 text-center">
          <Icon name="Users" className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h4 className="text-lg font-medium text-text mb-2">No Participants</h4>
          <p className="text-text-muted">
            Add combatants using the form above to begin tracking initiative.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedParticipants.map((participant, index) => (
            <ParticipantRow
              key={participant.id}
              participant={participant}
              isCurrentTurn={index === combat.current_turn}
              onUpdateHP={(delta) => handleUpdateHP(participant.id, delta)}
              onUpdateConditions={async (conditions) => {
                await updateParticipant(combat.id, participant.id, {
                  conditions: JSON.stringify(conditions),
                })
              }}
              onRemove={() => handleRemoveParticipant(participant.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Add Participant Form Component
interface AddParticipantFormProps {
  readonly onAdd: (name: string, hp: number, ac: number, initiative: number) => Promise<void>
}

function AddParticipantForm({ onAdd }: AddParticipantFormProps) {
  const [name, setName] = useState('')
  const [hp, setHP] = useState('')
  const [ac, setAC] = useState('')
  const [initiative, setInitiative] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim() || !hp || !initiative) return

    setIsSubmitting(true)
    try {
      await onAdd(
        name.trim(),
        Number.parseInt(hp),
        Number.parseInt(ac) || 10,
        Number.parseInt(initiative)
      )
      setName('')
      setHP('')
      setAC('')
      setInitiative('')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full p-4 border border-dashed border-border rounded-xl text-text-muted hover:text-text hover:border-primary/50 transition-colors flex items-center justify-center gap-2"
      >
        <Icon name="Plus" className="w-5 h-5" />
        Add Combatant
      </button>
    )
  }

  return (
    <div className="bg-background-panel border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-text">Add Combatant</h4>
        <button onClick={() => setIsExpanded(false)} className="text-text-muted hover:text-text">
          <Icon name="X" className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="col-span-2 md:col-span-1 px-3 py-2 bg-background border border-border rounded-lg text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
        />
        <input
          type="number"
          placeholder="HP"
          value={hp}
          onChange={(e) => setHP(e.target.value)}
          className="px-3 py-2 bg-background border border-border rounded-lg text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
        />
        <input
          type="number"
          placeholder="AC"
          value={ac}
          onChange={(e) => setAC(e.target.value)}
          className="px-3 py-2 bg-background border border-border rounded-lg text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
        />
        <input
          type="number"
          placeholder="Initiative"
          value={initiative}
          onChange={(e) => setInitiative(e.target.value)}
          className="px-3 py-2 bg-background border border-border rounded-lg text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
        />
        <button
          onClick={handleSubmit}
          disabled={!name.trim() || !hp || !initiative || isSubmitting}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </div>
    </div>
  )
}

// Participant Row Component
interface ParticipantRowProps {
  readonly participant: CombatParticipant
  readonly isCurrentTurn: boolean
  readonly onUpdateHP: (delta: number) => Promise<void>
  readonly onUpdateConditions: (conditions: ActiveCondition[]) => Promise<void>
  readonly onRemove: () => Promise<void>
}

function ParticipantRow({
  participant,
  isCurrentTurn,
  onUpdateHP,
  onUpdateConditions,
  onRemove,
}: ParticipantRowProps) {
  const [customDamage, setCustomDamage] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)

  const hpPercent = participant.max_hp > 0 ? (participant.current_hp / participant.max_hp) * 100 : 0

  let hpColor = 'bg-green-500'
  if (hpPercent <= 25) {
    hpColor = 'bg-red-500'
  } else if (hpPercent <= 50) {
    hpColor = 'bg-yellow-500'
  }

  // Parse conditions from JSON string
  let conditions: ActiveCondition[] = []
  try {
    if (participant.conditions) {
      conditions =
        typeof participant.conditions === 'string'
          ? JSON.parse(participant.conditions)
          : participant.conditions
    }
  } catch {
    conditions = []
  }

  const handleCustomDamage = () => {
    const amount = Number.parseInt(customDamage)
    if (!Number.isNaN(amount)) {
      onUpdateHP(-amount)
      setCustomDamage('')
      setShowCustomInput(false)
    }
  }

  return (
    <div
      className={`bg-background-panel border rounded-xl p-4 transition-all ${
        isCurrentTurn ? 'border-primary ring-1 ring-primary/30' : 'border-border'
      }`}
    >
      <div className="flex items-center gap-4">
        {/* Initiative Badge */}
        <div className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-text">{participant.initiative}</span>
        </div>

        {/* Name & Type */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-text truncate">{participant.name}</span>
            {isCurrentTurn && (
              <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full">
                Current
              </span>
            )}
            <span className="text-xs text-text-muted uppercase">
              {participant.participant_type}
            </span>
          </div>
          {/* HP Bar */}
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-2 bg-background rounded-full overflow-hidden">
              <div
                className={`h-full ${hpColor} transition-all`}
                style={{ width: `${Math.min(100, hpPercent)}%` }}
              />
            </div>
            <span className="text-sm text-text-muted whitespace-nowrap">
              {participant.current_hp}/{participant.max_hp}
              {participant.temp_hp > 0 && (
                <span className="text-blue-400"> +{participant.temp_hp}</span>
              )}
            </span>
          </div>
        </div>

        {/* AC */}
        <div className="flex items-center gap-1 text-text-muted">
          <Icon name="Shield" className="w-4 h-4" />
          <span className="text-sm">{participant.ac}</span>
        </div>

        {/* HP Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onUpdateHP(-5)}
            className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors flex items-center justify-center text-sm font-medium"
            title="Take 5 damage"
          >
            -5
          </button>
          <button
            onClick={() => onUpdateHP(-1)}
            className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors flex items-center justify-center text-sm font-medium"
            title="Take 1 damage"
          >
            -1
          </button>
          <button
            onClick={() => setShowCustomInput(!showCustomInput)}
            className="w-8 h-8 rounded-lg border border-border text-text-muted hover:text-text hover:border-text-muted transition-colors flex items-center justify-center"
            title="Custom damage"
          >
            <Icon name="Edit" className="w-4 h-4" />
          </button>
          <button
            onClick={() => onUpdateHP(1)}
            className="w-8 h-8 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors flex items-center justify-center text-sm font-medium"
            title="Heal 1"
          >
            +1
          </button>
          <button
            onClick={() => onUpdateHP(5)}
            className="w-8 h-8 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors flex items-center justify-center text-sm font-medium"
            title="Heal 5"
          >
            +5
          </button>
        </div>

        {/* Remove Button */}
        <button
          onClick={onRemove}
          className="w-8 h-8 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors flex items-center justify-center"
          title="Remove from combat"
        >
          <Icon name="Trash2" className="w-4 h-4" />
        </button>
      </div>

      {/* Custom Damage Input */}
      {showCustomInput && (
        <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
          <input
            type="number"
            placeholder="Damage amount"
            value={customDamage}
            onChange={(e) => setCustomDamage(e.target.value)}
            className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
            autoFocus
          />
          <button
            onClick={handleCustomDamage}
            disabled={!customDamage}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            Apply Damage
          </button>
          <button
            onClick={() => {
              const amount = Number.parseInt(customDamage)
              if (!Number.isNaN(amount)) onUpdateHP(amount)
              setCustomDamage('')
              setShowCustomInput(false)
            }}
            disabled={!customDamage}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            Heal
          </button>
        </div>
      )}

      {/* Conditions */}
      <div className="mt-3 pt-3 border-t border-border">
        <ConditionManager conditions={conditions} onChange={onUpdateConditions} />
      </div>
    </div>
  )
}
