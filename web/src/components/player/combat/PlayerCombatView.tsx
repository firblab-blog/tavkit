import { useEffect, useState, useCallback, useRef } from 'react'
import Icon from '../../common/Icon'
import {
  usePlayerCombatStore,
  CONDITION_INFO,
  CombatParticipant,
} from '../../../store/playerCombatStore'
import { useCharacterStore } from '../../../store/characterStore'
import { useContextStore } from '../../../store/contextStore'
import { useCampaignStore } from '../../../store/campaignStore'
import { apiClient } from '../../../api/client'
import { toast } from '../../common/Toast'
import JoinCombatModal from './JoinCombatModal'
import ConditionPicker from './ConditionPicker'
import HPTracker from './HPTracker'
import { getHPBreakdown } from '@/utils/characterStats'
import { logger } from '@/utils/logger'

interface GMCombatState {
  combat: {
    id: string
    name: string
    current_round: number
    current_turn: number
    status: string
  } | null
  participants: CombatParticipant[]
  isMyTurn: boolean
}

interface PlayerCombatViewProps {
  characterId?: string
}

export default function PlayerCombatView({ characterId: propCharacterId }: PlayerCombatViewProps) {
  const {
    combat,
    error,
    fetchCombatState,
    startCombat,
    endCombat,
    toggleReaction,
    setConcentration,
    removeCondition,
    setLocalCombat,
  } = usePlayerCombatStore()

  const { characters } = useCharacterStore()
  const { userContext } = useContextStore()
  const { activeCampaignId } = useCampaignStore()

  const [showConditionPicker, setShowConditionPicker] = useState(false)
  const [initiativeRoll, setInitiativeRoll] = useState('')
  const [concentrationSpell, setConcentrationSpell] = useState('')
  const [showJoinModal, setShowJoinModal] = useState(false)

  // GM combat sync state
  const [gmCombat, setGMCombat] = useState<GMCombatState>({
    combat: null,
    participants: [],
    isMyTurn: false,
  })
  const [wsConnected, setWsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const lastTurnNotificationRef = useRef<number>(0)

  // Get active character - prefer prop, fallback to context
  const activeCharacterId = propCharacterId || userContext?.last_character_id
  const activeCharacter = characters.find((c) => c.id === activeCharacterId)

  useEffect(() => {
    if (activeCharacterId) {
      fetchCombatState(activeCharacterId)
    }
  }, [activeCharacterId, fetchCombatState])

  // Fetch active GM combat for campaign
  const fetchGMCombat = useCallback(async () => {
    if (!activeCampaignId) return

    try {
      const response = await apiClient.get(`/campaigns/${activeCampaignId}/combat/active`)
      const { combat: activeCombat, participants } = response.data

      if (activeCombat && activeCharacterId) {
        // Check if it's our turn
        const sortedParticipants = [...participants].sort(
          (a: CombatParticipant, b: CombatParticipant) => b.initiative - a.initiative
        )
        const currentParticipant = sortedParticipants[activeCombat.current_turn]
        const myParticipant = participants.find(
          (p: CombatParticipant) => p.character_id === activeCharacterId
        )
        const isMyTurn = currentParticipant?.id === myParticipant?.id

        setGMCombat({
          combat: activeCombat,
          participants: sortedParticipants,
          isMyTurn,
        })

        // Connect to WebSocket if combat is active
        if (!wsRef.current && activeCombat.status === 'active') {
          connectWebSocket(activeCombat.id)
        }
      } else {
        setGMCombat({ combat: null, participants: [], isMyTurn: false })
        disconnectWebSocket()
      }
    } catch {
      // No active combat or not authorized
      setGMCombat({ combat: null, participants: [], isMyTurn: false })
    }
  }, [activeCampaignId, activeCharacterId])

  // Connect to WebSocket for real-time updates
  const connectWebSocket = useCallback((combatId: string) => {
    if (wsRef.current) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws/combat/${combatId}`

    const socket = new WebSocket(wsUrl)

    socket.onopen = () => {
      setWsConnected(true)
    }

    socket.onclose = () => {
      setWsConnected(false)
      wsRef.current = null
    }

    socket.onerror = () => {
      setWsConnected(false)
    }

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        handleWSMessage(data)
      } catch {
        logger.error('Failed to parse WebSocket message')
      }
    }

    wsRef.current = socket
  }, [])

  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
      setWsConnected(false)
    }
  }, [])

  const handleWSMessage = useCallback(
    (data: { type: string; payload: unknown }) => {
      switch (data.type) {
        case 'combat:state': {
          const payload = data.payload as {
            combat: GMCombatState['combat']
            participants: CombatParticipant[]
          }
          const sorted = [...payload.participants].sort((a, b) => b.initiative - a.initiative)
          const current = sorted[payload.combat?.current_turn ?? 0]
          const myP = sorted.find((p) => p.character_id === activeCharacterId)
          setGMCombat({
            combat: payload.combat,
            participants: sorted,
            isMyTurn: current?.id === myP?.id,
          })
          break
        }
        case 'combat:turn_changed': {
          const payload = data.payload as { current_turn: number; current_round: number }
          setGMCombat((prev) => {
            if (!prev.combat) return prev
            const current = prev.participants[payload.current_turn]
            const myP = prev.participants.find((p) => p.character_id === activeCharacterId)
            const isMyTurn = current?.id === myP?.id

            // Show notification if it's now my turn
            if (isMyTurn && !prev.isMyTurn) {
              showTurnNotification(myP?.name || 'Your character')
            }

            return {
              ...prev,
              combat: { ...prev.combat, ...payload },
              isMyTurn,
            }
          })
          break
        }
        case 'combat:your_turn': {
          setGMCombat((prev) => {
            const myP = prev.participants.find((p) => p.character_id === activeCharacterId)
            if (myP && !prev.isMyTurn) {
              showTurnNotification(myP.name)
            }
            return { ...prev, isMyTurn: true }
          })
          break
        }
        case 'combat:hp_updated':
        case 'combat:participant_updated': {
          const payload = data.payload as { participant_id: string } & Partial<CombatParticipant>
          setGMCombat((prev) => ({
            ...prev,
            participants: prev.participants.map((p) =>
              p.id === payload.participant_id ? { ...p, ...payload } : p
            ),
          }))
          break
        }
      }
    },
    [activeCharacterId]
  )

  // Show turn notification with toast and browser notification
  const showTurnNotification = useCallback((characterName: string) => {
    // Prevent duplicate notifications within 2 seconds
    const now = Date.now()
    if (now - lastTurnNotificationRef.current < 2000) return
    lastTurnNotificationRef.current = now

    // Toast notification
    toast.turn(`⚔️ It's ${characterName}'s turn!`, {
      label: 'View Combat',
      onClick: () => {
        // Scroll to combat section if needed
        const combatSection = document.getElementById('player-combat')
        combatSection?.scrollIntoView({ behavior: 'smooth' })
      },
    })

    // Browser notification (if permitted)
    if ('Notification' in globalThis && Notification.permission === 'granted') {
      try {
        new Notification('Your Turn!', {
          body: `It's ${characterName}'s turn in combat!`,
          icon: '/tavkit-icon.png',
          badge: '/tavkit-badge.png',
          tag: 'combat-turn',
          requireInteraction: false,
        })
      } catch {
        // Ignore notification errors
      }
    }

    // Play notification sound
    try {
      const audio = new Audio('/sounds/turn-notification.mp3')
      audio.volume = 0.5
      audio.play().catch(() => {})
    } catch {
      // Ignore audio errors
    }
  }, [])

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in globalThis && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Poll for GM combat state
  useEffect(() => {
    fetchGMCombat()
    const interval = setInterval(fetchGMCombat, 10000) // Poll every 10 seconds as backup
    return () => {
      clearInterval(interval)
      disconnectWebSocket()
    }
  }, [fetchGMCombat, disconnectWebSocket])

  // Sync max HP with calculated total when character loads
  useEffect(() => {
    if (activeCharacter && combat.max_hp > 0) {
      const totalHP = getHPBreakdown(
        activeCharacter.max_hp,
        activeCharacter.level,
        activeCharacter.constitution
      ).total

      // Only update if different to avoid loops
      if (totalHP !== combat.max_hp && totalHP > 0) {
        // Initialize current HP to total if it matches the old base max HP
        const currentHP = combat.current_hp === activeCharacter.max_hp ? totalHP : combat.current_hp
        setLocalCombat({
          current_hp: currentHP,
          max_hp: totalHP,
        })
      }
    }
  }, [
    activeCharacter?.id,
    activeCharacter?.max_hp,
    activeCharacter?.level,
    activeCharacter?.constitution,
    combat.max_hp,
    setLocalCombat,
  ])

  const handleStartCombat = async () => {
    if (!activeCharacterId || !initiativeRoll) return
    await startCombat(activeCharacterId, parseInt(initiativeRoll))
    setInitiativeRoll('')
  }

  const handleEndCombat = async () => {
    if (!activeCharacterId) return
    if (window.confirm('End combat? This will clear your initiative and concentration.')) {
      await endCombat(activeCharacterId)
    }
  }

  const handleSetConcentration = async () => {
    if (!activeCharacterId || !concentrationSpell.trim()) return
    await setConcentration(activeCharacterId, concentrationSpell.trim())
    setConcentrationSpell('')
  }

  const handleDropConcentration = async () => {
    if (!activeCharacterId) return
    await setConcentration(activeCharacterId, null)
  }

  const handleJoinGMCombat = async (initiative: number) => {
    if (!activeCharacterId || !gmCombat.combat) return

    try {
      await apiClient.post(`/combat/${gmCombat.combat.id}/join`, {
        character_id: activeCharacterId,
        initiative,
      })

      // Refresh GM combat state
      await fetchGMCombat()

      toast.success('Joined combat successfully!')
      setShowJoinModal(false)
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } } }
      toast.error(error.response?.data?.error || 'Failed to join combat')
      throw err
    }
  }

  // Check if player is already in the GM combat
  const isInGMCombat = gmCombat.participants.some((p) => p.character_id === activeCharacterId)
  const canJoinGMCombat = gmCombat.combat && !isInGMCombat

  if (!activeCharacter) {
    return (
      <div className="text-center py-12 bg-background-panel border border-border rounded-xl">
        <Icon name="Swords" className="w-12 h-12 text-text-muted mx-auto mb-4" />
        <h3 className="text-lg font-medium text-text mb-2">No Character Selected</h3>
        <p className="text-text-muted">Select a character to use the combat assistant.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4" id="player-combat">
      {/* Your Turn Banner */}
      {gmCombat.isMyTurn && (
        <div className="bg-gradient-to-r from-primary/20 via-primary/30 to-primary/20 border-2 border-primary rounded-xl p-4 animate-pulse-slow">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <Icon name="Swords" className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-primary">It's Your Turn!</h3>
              <p className="text-sm text-text-muted">
                Take your action, bonus action, and movement
              </p>
            </div>
            <div className="flex-shrink-0 text-3xl animate-bounce">⚔️</div>
          </div>
        </div>
      )}

      {/* GM Combat Join Prompt */}
      {canJoinGMCombat && (
        <div className="bg-primary/10 border-2 border-primary/50 rounded-xl p-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Icon name="Users" className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-text mb-1">Active GM Combat</h3>
              <p className="text-sm text-text-muted mb-3">
                {gmCombat.combat?.name} • Round {(gmCombat.combat?.current_round ?? 0) + 1}
              </p>
              <button
                onClick={() => setShowJoinModal(true)}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium inline-flex items-center gap-2"
              >
                <Icon name="UserPlus" className="w-4 h-4" />
                Join Combat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text flex items-center gap-2">
            <Icon name="Swords" className="w-5 h-5 text-red-400" />
            Combat Assistant
          </h2>
          <p className="text-sm text-text-muted mt-1">
            Track HP, conditions, concentration, and reactions.
          </p>
        </div>
        {combat.is_in_combat ? (
          <button
            onClick={handleEndCombat}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <Icon name="Square" className="w-4 h-4" />
            End Combat
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={initiativeRoll}
              onChange={(e) => setInitiativeRoll(e.target.value)}
              placeholder="Initiative"
              className="w-24 px-3 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary"
            />
            <button
              onClick={handleStartCombat}
              disabled={!initiativeRoll}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Icon name="Swords" className="w-4 h-4" />
              Start Combat
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* GM Combat Sync Panel */}
      {gmCombat.combat && (
        <div
          className={`bg-background-panel border rounded-xl p-4 ${gmCombat.isMyTurn ? 'border-primary ring-2 ring-primary/30' : 'border-border'}`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-text flex items-center gap-2">
                <Icon
                  name="Zap"
                  className={`w-5 h-5 ${wsConnected ? 'text-green-400' : 'text-amber-400'}`}
                />
                {gmCombat.combat.name}
              </h3>
              <span className="text-sm text-text-muted">
                Round {gmCombat.combat.current_round + 1}
              </span>
            </div>
            {wsConnected && (
              <span className="text-xs text-green-400 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Live
              </span>
            )}
          </div>

          {/* Your Turn Banner */}
          {gmCombat.isMyTurn && (
            <div className="mb-4 p-3 bg-primary/20 border border-primary/50 rounded-lg text-center">
              <span className="text-primary font-bold text-lg">It&apos;s Your Turn!</span>
            </div>
          )}

          {/* Initiative Order */}
          <div className="space-y-2">
            {gmCombat.participants.map((participant, index) => {
              const isCurrentTurn = index === gmCombat.combat?.current_turn
              const isMe = participant.character_id === activeCharacterId

              return (
                <div
                  key={participant.id}
                  className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                    isCurrentTurn
                      ? 'bg-primary/20 border border-primary/50'
                      : isMe
                        ? 'bg-blue-500/10 border border-blue-500/30'
                        : 'bg-background'
                  }`}
                >
                  <span className="w-8 h-8 rounded-full bg-background-panel border border-border flex items-center justify-center text-sm font-bold text-text">
                    {participant.initiative}
                  </span>
                  <span className={`flex-1 font-medium ${isMe ? 'text-blue-400' : 'text-text'}`}>
                    {participant.name}
                    {isMe && <span className="text-xs text-blue-400/70 ml-2">(You)</span>}
                  </span>
                  {isCurrentTurn && (
                    <span className="text-xs text-primary font-medium">Current</span>
                  )}
                  {participant.current_hp !== undefined &&
                    participant.max_hp !== undefined &&
                    participant.max_hp > 0 && (
                      <span className="text-sm text-text-muted">
                        {participant.current_hp}/{participant.max_hp}
                      </span>
                    )}
                </div>
              )
            })}
          </div>

          {/* Not in combat yet hint */}
          {!gmCombat.participants.some((p) => p.character_id === activeCharacterId) && (
            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-amber-300 text-sm">
                <Icon name="Info" className="w-4 h-4 inline mr-2" />
                Your character hasn&apos;t joined this combat yet. Enter your initiative above to
                join.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Main Combat Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* HP Tracker */}
        <div className="bg-background-panel border border-border rounded-xl p-4">
          <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
            <Icon name="AlertCircle" className="w-5 h-5 text-red-400" />
            Hit Points
          </h3>
          <HPTracker characterId={activeCharacterId!} />
        </div>

        {/* Combat Status */}
        <div className="bg-background-panel border border-border rounded-xl p-4">
          <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
            <Icon name="Swords" className="w-5 h-5 text-amber-400" />
            Combat Status
          </h3>

          <div className="space-y-4">
            {/* Initiative */}
            {combat.is_in_combat && combat.initiative !== undefined && (
              <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                <span className="text-text-muted">Initiative</span>
                <span className="text-2xl font-bold text-text">{combat.initiative}</span>
              </div>
            )}

            {/* Reaction */}
            <div className="flex items-center justify-between p-3 bg-background rounded-lg">
              <span className="text-text-muted">Reaction</span>
              <button
                onClick={() => activeCharacterId && toggleReaction(activeCharacterId)}
                disabled={!combat.is_in_combat}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  combat.reaction_used
                    ? 'bg-gray-500/20 text-gray-400'
                    : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                } ${!combat.is_in_combat ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {combat.reaction_used ? 'Used' : 'Available'}
              </button>
            </div>

            {/* Concentration */}
            <div className="p-3 bg-background rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-text-muted">Concentration</span>
                {combat.concentration_spell && (
                  <button
                    onClick={handleDropConcentration}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Drop
                  </button>
                )}
              </div>
              {combat.concentration_spell ? (
                <div className="flex items-center gap-2">
                  <Icon name="Sparkles" className="w-4 h-4 text-purple-400" />
                  <span className="text-text font-medium">{combat.concentration_spell}</span>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={concentrationSpell}
                    onChange={(e) => setConcentrationSpell(e.target.value)}
                    placeholder="Spell name..."
                    className="flex-1 px-3 py-1.5 bg-background-panel border border-border rounded-lg text-text placeholder-text-muted text-sm focus:outline-none focus:border-primary"
                  />
                  <button
                    onClick={handleSetConcentration}
                    disabled={!concentrationSpell.trim()}
                    className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Set
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Conditions */}
      <div className="bg-background-panel border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text flex items-center gap-2">
            <Icon name="AlertTriangle" className="w-5 h-5 text-amber-400" />
            Active Conditions
          </h3>
          <button
            onClick={() => setShowConditionPicker(true)}
            className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg transition-colors flex items-center gap-1 text-sm"
          >
            <Icon name="Plus" className="w-4 h-4" />
            Add Condition
          </button>
        </div>

        {combat.conditions.length === 0 ? (
          <p className="text-text-muted text-center py-4">No active conditions</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {combat.conditions.map((condition) => {
              const info = CONDITION_INFO[condition.type]
              return (
                <div
                  key={condition.type}
                  className="group relative flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg"
                >
                  <span className="text-amber-300 font-medium">{info.name}</span>
                  {condition.source && (
                    <span className="text-amber-300/60 text-sm">({condition.source})</span>
                  )}
                  <button
                    onClick={() =>
                      activeCharacterId && removeCondition(activeCharacterId, condition.type)
                    }
                    className="p-1 hover:bg-amber-500/20 rounded text-amber-300/60 hover:text-amber-300"
                  >
                    <Icon name="X" className="w-3 h-3" />
                  </button>

                  {/* Tooltip */}
                  <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10">
                    <div className="bg-background-panel border border-border rounded-lg p-3 shadow-lg max-w-xs">
                      <p className="text-text font-medium mb-1">{info.name}</p>
                      <p className="text-text-muted text-sm">{info.description}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick Reference */}
      <div className="bg-background-panel border border-border rounded-xl p-4">
        <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
          <Icon name="BookOpen" className="w-5 h-5 text-blue-400" />
          Combat Quick Reference
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <h4 className="text-text font-medium mb-2">Your Turn</h4>
            <ul className="text-text-muted space-y-1">
              <li>• Move (up to your speed)</li>
              <li>• Action (Attack, Cast, Dash, etc.)</li>
              <li>• Bonus Action (if available)</li>
              <li>• Free interaction (draw weapon, etc.)</li>
            </ul>
          </div>
          <div>
            <h4 className="text-text font-medium mb-2">Actions</h4>
            <ul className="text-text-muted space-y-1">
              <li>• Attack / Cast a Spell</li>
              <li>• Dash (double movement)</li>
              <li>• Dodge (attacks have disadvantage)</li>
              <li>• Help / Hide / Ready</li>
            </ul>
          </div>
          <div>
            <h4 className="text-text font-medium mb-2">Concentration</h4>
            <ul className="text-text-muted space-y-1">
              <li>• Con save when taking damage</li>
              <li>• DC = 10 or half damage (higher)</li>
              <li>• Only one spell at a time</li>
              <li>• Broken by incapacitation</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Condition Picker Modal */}
      {showConditionPicker && activeCharacterId && (
        <ConditionPicker
          characterId={activeCharacterId}
          onClose={() => setShowConditionPicker(false)}
        />
      )}

      {/* Join Combat Modal */}
      {showJoinModal && activeCharacter && gmCombat.combat && (
        <JoinCombatModal
          characterId={activeCharacter.id}
          characterName={activeCharacter.name}
          initiativeBonus={activeCharacter.initiative ?? 0}
          combatName={gmCombat.combat.name}
          onJoin={handleJoinGMCombat}
          onClose={() => setShowJoinModal(false)}
        />
      )}
    </div>
  )
}
