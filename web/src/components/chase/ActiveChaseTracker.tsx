import { useState, useMemo } from 'react'
import Icon from '../common/Icon'
import DistanceTracker from './DistanceTracker'
import ParticipantCard from './ParticipantCard'
import type {
  Chase,
  ChaseParticipant,
  ChaseChallenge,
  ChaseComplication,
  ChaseEvent,
} from '../../types/chase'

// Character type from roster
interface Character {
  id: string
  name: string
  race: string
  class_info: string
  level: number
  speed?: number
  dexterity?: number
  strength?: number
  constitution?: number
}

// Obstacle from AI-generated chase
interface Obstacle {
  name: string
  description?: string
  check: string
  failure: string
}

// Shortcut from AI-generated chase
interface Shortcut {
  name: string
  description: string
  benefit: string
}

// Chase phase from AI-generated chase
interface ChasePhase {
  round: string | number
  description: string
  difficulty: string
}

// Ending conditions
interface EndingConditions {
  success?: string
  failure?: string
  alternative?: string
}

// Rewards
interface Rewards {
  success?: string
  partial?: string
  failure?: string
}

// Participants structure from AI
interface ParticipantsData {
  quarry?: string
  pursuers?: string
}

interface ActiveChaseTrackerProps {
  chase: Chase
  participants: ChaseParticipant[]
  challenges: ChaseChallenge[]
  complications: ChaseComplication[]
  events: ChaseEvent[]
  characters: Character[]
  onUpdateChase: (updates: Partial<Chase>) => Promise<void>
  onAddEvent: (event: Omit<ChaseEvent, 'id' | 'created_at'>) => Promise<void>
  onAddParticipant: (participant: Omit<ChaseParticipant, 'id' | 'created_at'>) => Promise<void>
  onUpdateParticipant: (id: string, updates: Partial<ChaseParticipant>) => Promise<void>
  onRemoveParticipant: (id: string) => Promise<void>
  onClearEvents: () => Promise<void>
  onEnd: () => void
}

export default function ActiveChaseTracker({
  chase,
  participants,
  events,
  characters,
  onUpdateChase,
  onAddEvent,
  onAddParticipant,
  onUpdateParticipant,
  onRemoveParticipant,
  onClearEvents,
  onEnd,
}: ActiveChaseTrackerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'run' | 'log'>('overview')
  const [showAddParticipant, setShowAddParticipant] = useState(false)
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('')
  const [participantRole, setParticipantRole] = useState<'pursuer' | 'quarry'>('pursuer')
  const [usedShortcuts, setUsedShortcuts] = useState<Set<string>>(new Set())
  const [triggeredComplications, setTriggeredComplications] = useState<Set<number>>(new Set())
  const [resolvedObstacles, setResolvedObstacles] = useState<Set<number>>(new Set())

  // Parse JSON fields from chase
  const obstacles: Obstacle[] = useMemo(() => {
    if (!chase.obstacles) return []
    if (Array.isArray(chase.obstacles)) return chase.obstacles
    try {
      return JSON.parse(chase.obstacles as unknown as string) || []
    } catch {
      return []
    }
  }, [chase.obstacles])

  const shortcuts: Shortcut[] = useMemo(() => {
    if (!chase.shortcuts) return []
    if (Array.isArray(chase.shortcuts)) return chase.shortcuts
    try {
      return JSON.parse(chase.shortcuts as unknown as string) || []
    } catch {
      return []
    }
  }, [chase.shortcuts])

  const chasePhases: ChasePhase[] = useMemo(() => {
    if (!chase.chase_phases) return []
    if (Array.isArray(chase.chase_phases)) return chase.chase_phases
    try {
      return JSON.parse(chase.chase_phases as unknown as string) || []
    } catch {
      return []
    }
  }, [chase.chase_phases])

  const complicationsList: string[] = useMemo(() => {
    if (!chase.complications) return []
    if (Array.isArray(chase.complications)) return chase.complications
    try {
      return JSON.parse(chase.complications as unknown as string) || []
    } catch {
      return []
    }
  }, [chase.complications])

  const environmentalFactors: string[] = useMemo(() => {
    if (!chase.environmental_factors) return []
    if (Array.isArray(chase.environmental_factors)) return chase.environmental_factors
    try {
      return JSON.parse(chase.environmental_factors as unknown as string) || []
    } catch {
      return []
    }
  }, [chase.environmental_factors])

  const participantsData: ParticipantsData = useMemo(() => {
    if (!chase.participants) return {}
    if (typeof chase.participants === 'object' && !Array.isArray(chase.participants)) {
      return chase.participants as ParticipantsData
    }
    try {
      return JSON.parse(chase.participants as unknown as string) || {}
    } catch {
      return {}
    }
  }, [chase.participants])

  const endingConditions: EndingConditions = useMemo(() => {
    if (!chase.ending_conditions) return {}
    if (typeof chase.ending_conditions === 'object')
      return chase.ending_conditions as EndingConditions
    try {
      return JSON.parse(chase.ending_conditions as unknown as string) || {}
    } catch {
      return {}
    }
  }, [chase.ending_conditions])

  const rewards: Rewards = useMemo(() => {
    if (!chase.rewards) return {}
    if (typeof chase.rewards === 'object') return chase.rewards as Rewards
    try {
      return JSON.parse(chase.rewards as unknown as string) || {}
    } catch {
      return {}
    }
  }, [chase.rewards])

  // Get current phase based on round
  const currentPhase = useMemo(() => {
    if (chasePhases.length === 0) return null
    // Find phase that matches current round
    const round = chase.current_round || 1
    for (const phase of chasePhases) {
      const phaseRound = phase.round.toString()
      // Handle ranges like "1-2", "3-4", etc.
      if (phaseRound.includes('-')) {
        const [start, end] = phaseRound.split('-').map(Number)
        if (round >= start && round <= end) return phase
      } else if (parseInt(phaseRound) === round) {
        return phase
      }
    }
    // Default to last phase if beyond defined rounds
    return chasePhases[chasePhases.length - 1]
  }, [chasePhases, chase.current_round])

  // Handle adding a PC as participant
  const handleAddCharacterAsParticipant = async () => {
    const character = characters.find((c) => c.id === selectedCharacterId)
    if (!character) return

    await onAddParticipant({
      chase_id: chase.id,
      participant_type: 'pc',
      character_id: character.id,
      name: character.name,
      role: participantRole,
      movement_speed: character.speed || 30,
      current_position: participantRole === 'quarry' ? chase.starting_distance : 0,
      stamina: 3,
      max_stamina: 3,
      has_dashed: false,
      movement_this_round: 0,
      conditions: [],
    })

    setShowAddParticipant(false)
    setSelectedCharacterId('')
  }

  // Handle advancing round
  const handleNextRound = async () => {
    const newRound = (chase.current_round || 0) + 1
    await onUpdateChase({ current_round: newRound })
    await onAddEvent({
      chase_id: chase.id,
      round: newRound,
      action: 'round_advance',
      effect: `Round ${newRound} begins`,
    })
  }

  // Handle starting the chase
  const handleStartChase = async () => {
    await onUpdateChase({ status: 'active', current_round: 1 })
    await onAddEvent({
      chase_id: chase.id,
      round: 1,
      action: 'chase_started',
      effect: 'The chase begins!',
    })
  }

  // Handle ending the chase
  const handleEndChase = async (outcome: Chase['outcome']) => {
    await onUpdateChase({ status: 'completed', outcome })
    await onAddEvent({
      chase_id: chase.id,
      round: chase.current_round || 1,
      action: 'chase_ended',
      effect: `Chase ended: ${outcome}`,
    })
    onEnd()
  }

  // Handle re-running the chase (reset to setup state)
  const handleRerunChase = async () => {
    if (!confirm('Reset this chase to run again? This will clear all events from the log.')) return

    // Reset chase state
    await onUpdateChase({ status: 'setup', current_round: 0, outcome: undefined })
    // Clear all events
    await onClearEvents()
    // Reset local UI state
    setUsedShortcuts(new Set())
    setTriggeredComplications(new Set())
    setResolvedObstacles(new Set())
    setActiveTab('overview')
  }

  // Log obstacle result
  const handleObstacleResult = async (
    obstacleIndex: number,
    success: boolean,
    participantName?: string
  ) => {
    const obstacle = obstacles[obstacleIndex]
    if (!obstacle) return

    setResolvedObstacles((prev) => new Set(prev).add(obstacleIndex))

    await onAddEvent({
      chase_id: chase.id,
      round: chase.current_round || 1,
      participant_name: participantName,
      action: `obstacle_${success ? 'success' : 'failure'}`,
      success,
      effect: `${obstacle.name}: ${success ? 'Passed!' : obstacle.failure}`,
    })
  }

  // Log shortcut use
  const handleUseShortcut = async (shortcutName: string) => {
    setUsedShortcuts((prev) => new Set(prev).add(shortcutName))
    await onAddEvent({
      chase_id: chase.id,
      round: chase.current_round || 1,
      action: 'shortcut_used',
      effect: `Used shortcut: ${shortcutName}`,
    })
  }

  // Trigger complication
  const handleTriggerComplication = async (index: number) => {
    setTriggeredComplications((prev) => new Set(prev).add(index))
    await onAddEvent({
      chase_id: chase.id,
      round: chase.current_round || 1,
      action: 'complication_triggered',
      effect: complicationsList[index],
    })
  }

  const isChaseActive = chase.status === 'active'
  const isChaseSetup = chase.status === 'setup' || !chase.status

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background-panel border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text">{chase.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-text-muted capitalize">
                {chase.chase_type?.replace(/_/g, ' ')} • {chase.terrain?.replace(/_/g, ' ')} •{' '}
                {chase.difficulty}
              </span>
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded ${
                  isChaseActive
                    ? 'bg-green-500/20 text-green-400'
                    : chase.status === 'completed'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                }`}
              >
                {chase.status || 'setup'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isChaseActive && (
              <div className="flex items-center gap-2 px-4 py-2 bg-primary/20 rounded-lg">
                <Icon name="Clock" className="w-5 h-5 text-primary" />
                <span className="text-lg font-bold text-primary">
                  Round {chase.current_round || 1}
                </span>
              </div>
            )}
            {isChaseSetup && participants.length > 0 && (
              <button
                onClick={handleStartChase}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Icon name="Play" className="w-5 h-5" />
                Start Chase
              </button>
            )}
            {isChaseActive && (
              <button
                onClick={() => handleEndChase('alternate')}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Icon name="Square" className="w-5 h-5" />
                End Chase
              </button>
            )}
            {(isChaseActive || chase.status === 'completed') && (
              <button
                onClick={handleRerunChase}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Icon name="RotateCcw" className="w-5 h-5" />
                Re-Run
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          {(['overview', 'run', 'log'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === tab
                  ? 'bg-background text-primary border-t border-x border-border'
                  : 'text-text-muted hover:text-text hover:bg-background/50'
              }`}
            >
              {tab === 'overview' && <Icon name="FileText" className="w-4 h-4 inline mr-2" />}
              {tab === 'run' && <Icon name="Play" className="w-4 h-4 inline mr-2" />}
              {tab === 'log' && <Icon name="ScrollText" className="w-4 h-4 inline mr-2" />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6 max-w-5xl">
            {/* Description */}
            {chase.description && (
              <div className="p-4 bg-background-panel rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
                  <Icon name="FileText" className="w-5 h-5 text-primary" />
                  Description
                </h3>
                <p className="text-text-muted">{chase.description}</p>
              </div>
            )}

            {/* Setting */}
            {chase.setting && (
              <div className="p-4 bg-background-panel rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
                  <Icon name="MapPin" className="w-5 h-5 text-primary" />
                  Setting
                </h3>
                <p className="text-text-muted">{chase.setting}</p>
              </div>
            )}

            {/* Participants (from AI) */}
            {(participantsData.quarry || participantsData.pursuers) && (
              <div className="p-4 bg-background-panel rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
                  <Icon name="Users" className="w-5 h-5 text-primary" />
                  Participants
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {participantsData.quarry && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                      <span className="text-amber-400 font-medium text-sm">Quarry</span>
                      <p className="text-text mt-1">{participantsData.quarry}</p>
                    </div>
                  )}
                  {participantsData.pursuers && (
                    <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <span className="text-blue-400 font-medium text-sm">Pursuers</span>
                      <p className="text-text mt-1">{participantsData.pursuers}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Starting Conditions */}
            {chase.starting_conditions && (
              <div className="p-4 bg-background-panel rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
                  <Icon name="Flag" className="w-5 h-5 text-primary" />
                  Starting Conditions
                </h3>
                <p className="text-text-muted">{chase.starting_conditions}</p>
              </div>
            )}

            {/* Obstacles */}
            {obstacles.length > 0 && (
              <div className="p-4 bg-background-panel rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
                  <Icon name="AlertTriangle" className="w-5 h-5 text-primary" />
                  Obstacles ({obstacles.length})
                </h3>
                <div className="space-y-3">
                  {obstacles.map((obstacle, idx) => (
                    <div key={idx} className="p-3 bg-background rounded-lg border border-border">
                      <h4 className="font-semibold text-text">{obstacle.name}</h4>
                      {obstacle.description && (
                        <p className="text-text-muted text-sm mt-1">{obstacle.description}</p>
                      )}
                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                        <div className="p-2 bg-green-500/10 rounded border border-green-500/20">
                          <span className="text-green-400 font-medium">Check:</span>
                          <p className="text-text-muted">{obstacle.check}</p>
                        </div>
                        <div className="p-2 bg-red-500/10 rounded border border-red-500/20">
                          <span className="text-red-400 font-medium">Failure:</span>
                          <p className="text-text-muted">{obstacle.failure}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Complications */}
            {complicationsList.length > 0 && (
              <div className="p-4 bg-background-panel rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
                  <Icon name="Zap" className="w-5 h-5 text-primary" />
                  Complications ({complicationsList.length})
                </h3>
                <ul className="space-y-2">
                  {complicationsList.map((complication, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-text-muted">
                      <span className="text-primary mt-1">•</span>
                      <span>{complication}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Shortcuts */}
            {shortcuts.length > 0 && (
              <div className="p-4 bg-background-panel rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
                  <Icon name="Route" className="w-5 h-5 text-primary" />
                  Shortcuts & Alternate Routes ({shortcuts.length})
                </h3>
                <div className="space-y-3">
                  {shortcuts.map((shortcut, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-primary/10 rounded-lg border border-primary/30"
                    >
                      <h4 className="font-semibold text-text">{shortcut.name}</h4>
                      <p className="text-text-muted text-sm mt-1">{shortcut.description}</p>
                      <p className="text-primary text-sm mt-2 font-medium">✓ {shortcut.benefit}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chase Phases */}
            {chasePhases.length > 0 && (
              <div className="p-4 bg-background-panel rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
                  <Icon name="ListOrdered" className="w-5 h-5 text-primary" />
                  Chase Phases ({chasePhases.length})
                </h3>
                <div className="space-y-3">
                  {chasePhases.map((phase, idx) => (
                    <div key={idx} className="p-3 bg-background rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-primary">Round {phase.round}</span>
                        <span
                          className={`px-2 py-0.5 text-xs rounded ${
                            phase.difficulty.toLowerCase() === 'easy'
                              ? 'bg-green-500/20 text-green-400'
                              : phase.difficulty.toLowerCase() === 'hard'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                          }`}
                        >
                          {phase.difficulty}
                        </span>
                      </div>
                      <p className="text-text-muted text-sm">{phase.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Environmental Factors */}
            {environmentalFactors.length > 0 && (
              <div className="p-4 bg-background-panel rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
                  <Icon name="Cloud" className="w-5 h-5 text-primary" />
                  Environmental Factors
                </h3>
                <ul className="space-y-2">
                  {environmentalFactors.map((factor, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-text-muted">
                      <span className="text-primary mt-1">•</span>
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Special Rules */}
            {chase.special_rules && (
              <div className="p-4 bg-background-panel rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
                  <Icon name="Book" className="w-5 h-5 text-primary" />
                  Special Rules
                </h3>
                <p className="text-text-muted whitespace-pre-wrap">{chase.special_rules}</p>
              </div>
            )}

            {/* Ending Conditions */}
            {(endingConditions.success || endingConditions.failure) && (
              <div className="p-4 bg-background-panel rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
                  <Icon name="Target" className="w-5 h-5 text-primary" />
                  Ending Conditions
                </h3>
                <div className="space-y-3">
                  {endingConditions.success && (
                    <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                      <span className="text-green-400 font-medium">Success:</span>
                      <p className="text-text mt-1">{endingConditions.success}</p>
                    </div>
                  )}
                  {endingConditions.failure && (
                    <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/30">
                      <span className="text-red-400 font-medium">Failure:</span>
                      <p className="text-text mt-1">{endingConditions.failure}</p>
                    </div>
                  )}
                  {endingConditions.alternative && (
                    <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
                      <span className="text-primary font-medium">Alternative:</span>
                      <p className="text-text mt-1">{endingConditions.alternative}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Rewards */}
            {(rewards.success || rewards.partial || rewards.failure) && (
              <div className="p-4 bg-background-panel rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
                  <Icon name="Gift" className="w-5 h-5 text-primary" />
                  Rewards
                </h3>
                <div className="space-y-3">
                  {rewards.success && (
                    <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                      <span className="text-green-400 font-medium">Success:</span>
                      <p className="text-text mt-1">{rewards.success}</p>
                    </div>
                  )}
                  {rewards.partial && (
                    <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                      <span className="text-yellow-400 font-medium">Partial Success:</span>
                      <p className="text-text mt-1">{rewards.partial}</p>
                    </div>
                  )}
                  {rewards.failure && (
                    <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/30">
                      <span className="text-red-400 font-medium">Failure:</span>
                      <p className="text-text mt-1">{rewards.failure}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* RUN TAB - Interactive Chase Runner */}
        {activeTab === 'run' && (
          <div className="space-y-6">
            {/* Current Phase Banner */}
            {currentPhase && isChaseActive && (
              <div className="p-4 bg-gradient-to-r from-primary/20 to-primary/10 rounded-lg border border-primary/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-primary">
                    Round {chase.current_round} - {currentPhase.difficulty}
                  </span>
                </div>
                <p className="text-text">{currentPhase.description}</p>
              </div>
            )}

            {/* Distance Tracker */}
            {participants.length > 0 && (
              <DistanceTracker
                participants={participants}
                catchThreshold={chase.catch_threshold || 0}
                escapeThreshold={chase.escape_threshold || 7}
                terrain={chase.terrain || 'urban'}
              />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Obstacles & Shortcuts */}
              <div className="lg:col-span-2 space-y-6">
                {/* Active Obstacles */}
                {obstacles.length > 0 && (
                  <div className="p-4 bg-background-panel rounded-lg border border-border">
                    <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
                      <Icon name="AlertTriangle" className="w-5 h-5 text-orange-400" />
                      Obstacles
                    </h3>
                    <div className="space-y-3">
                      {obstacles.map((obstacle, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg border ${
                            resolvedObstacles.has(idx)
                              ? 'bg-background/50 border-border opacity-50'
                              : 'bg-orange-500/10 border-orange-500/30'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-text">{obstacle.name}</h4>
                              {obstacle.description && (
                                <p className="text-text-muted text-sm mt-1">
                                  {obstacle.description}
                                </p>
                              )}
                              <p className="text-sm mt-2">
                                <span className="text-green-400 font-medium">Check:</span>{' '}
                                <span className="text-text-muted">{obstacle.check}</span>
                              </p>
                              <p className="text-sm">
                                <span className="text-red-400 font-medium">Failure:</span>{' '}
                                <span className="text-text-muted">{obstacle.failure}</span>
                              </p>
                            </div>
                            {isChaseActive && !resolvedObstacles.has(idx) && (
                              <div className="flex gap-2 ml-4">
                                <button
                                  onClick={() => handleObstacleResult(idx, true)}
                                  className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-sm rounded transition-colors"
                                >
                                  ✓ Pass
                                </button>
                                <button
                                  onClick={() => handleObstacleResult(idx, false)}
                                  className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-sm rounded transition-colors"
                                >
                                  ✗ Fail
                                </button>
                              </div>
                            )}
                            {resolvedObstacles.has(idx) && (
                              <span className="text-text-muted text-sm">Resolved</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Shortcuts */}
                {shortcuts.length > 0 && (
                  <div className="p-4 bg-background-panel rounded-lg border border-border">
                    <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
                      <Icon name="Route" className="w-5 h-5 text-primary" />
                      Shortcuts
                    </h3>
                    <div className="space-y-3">
                      {shortcuts.map((shortcut, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg border ${
                            usedShortcuts.has(shortcut.name)
                              ? 'bg-background/50 border-border opacity-50'
                              : 'bg-primary/10 border-primary/30'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-text">{shortcut.name}</h4>
                              <p className="text-text-muted text-sm mt-1">{shortcut.description}</p>
                              <p className="text-primary text-sm mt-2 font-medium">
                                ✓ {shortcut.benefit}
                              </p>
                            </div>
                            {isChaseActive && !usedShortcuts.has(shortcut.name) && (
                              <button
                                onClick={() => handleUseShortcut(shortcut.name)}
                                className="px-3 py-1 bg-primary hover:bg-primary/80 text-white text-sm rounded transition-colors ml-4"
                              >
                                Use
                              </button>
                            )}
                            {usedShortcuts.has(shortcut.name) && (
                              <span className="text-text-muted text-sm">Used</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Complications */}
                {complicationsList.length > 0 && (
                  <div className="p-4 bg-background-panel rounded-lg border border-border">
                    <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
                      <Icon name="Zap" className="w-5 h-5 text-red-400" />
                      Complications
                    </h3>
                    <div className="space-y-2">
                      {complicationsList.map((complication, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg border flex items-start justify-between ${
                            triggeredComplications.has(idx)
                              ? 'bg-red-500/10 border-red-500/30'
                              : 'bg-background border-border'
                          }`}
                        >
                          <p className="text-text-muted flex-1">{complication}</p>
                          {isChaseActive && !triggeredComplications.has(idx) && (
                            <button
                              onClick={() => handleTriggerComplication(idx)}
                              className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-sm rounded transition-colors ml-4"
                            >
                              Trigger
                            </button>
                          )}
                          {triggeredComplications.has(idx) && (
                            <span className="text-red-400 text-sm font-medium">Active!</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Participants */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-text flex items-center gap-2">
                    <Icon name="Users" className="w-5 h-5 text-primary" />
                    Participants ({participants.length})
                  </h3>
                  <button
                    onClick={() => setShowAddParticipant(true)}
                    className="px-3 py-1 bg-primary hover:bg-primary/80 text-white text-sm rounded transition-colors flex items-center gap-1"
                  >
                    <Icon name="Plus" className="w-4 h-4" />
                    Add
                  </button>
                </div>

                {participants.length === 0 ? (
                  <div className="p-4 bg-background-panel rounded-lg border border-border text-center">
                    <Icon
                      name="Users"
                      className="w-12 h-12 text-text-muted mx-auto mb-2 opacity-30"
                    />
                    <p className="text-text-muted text-sm">No participants yet</p>
                    <p className="text-text-muted text-xs mt-1">
                      Add party members from your Guild Roster
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {participants.map((participant) => (
                      <div key={participant.id} className="relative group">
                        <ParticipantCard
                          participant={participant}
                          onUpdate={(updates) => onUpdateParticipant(participant.id, updates)}
                          showControls={isChaseActive}
                        />
                        {isChaseSetup && (
                          <button
                            onClick={() => {
                              if (confirm(`Remove ${participant.name} from the chase?`)) {
                                onRemoveParticipant(participant.id)
                              }
                            }}
                            className="absolute top-2 right-2 p-1.5 bg-red-600/80 hover:bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove participant"
                          >
                            <Icon name="X" className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Environmental Reminders */}
                {environmentalFactors.length > 0 && (
                  <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                    <h4 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
                      <Icon name="Info" className="w-4 h-4" />
                      Environmental Factors
                    </h4>
                    <ul className="space-y-1">
                      {environmentalFactors.slice(0, 3).map((factor, idx) => (
                        <li key={idx} className="text-text-muted text-sm">
                          • {factor}
                        </li>
                      ))}
                      {environmentalFactors.length > 3 && (
                        <li className="text-text-muted text-sm opacity-60">
                          +{environmentalFactors.length - 3} more...
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Round Controls */}
            {isChaseActive && (
              <div className="flex items-center justify-between p-4 bg-background-panel rounded-lg border border-border">
                <div className="flex items-center gap-4">
                  <span className="text-text-muted">Round {chase.current_round || 1}</span>
                  {chase.max_rounds && (
                    <span className="text-text-muted">of {chase.max_rounds}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleEndChase('caught')}
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors"
                  >
                    Quarry Caught
                  </button>
                  <button
                    onClick={() => handleEndChase('escaped')}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
                  >
                    Quarry Escaped
                  </button>
                  <button
                    onClick={handleNextRound}
                    className="px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    Next Round
                    <Icon name="ChevronRight" className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* LOG TAB - Event History */}
        {activeTab === 'log' && (
          <div className="max-w-3xl">
            <div className="p-4 bg-background-panel rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
                <Icon name="ScrollText" className="w-5 h-5 text-primary" />
                Event Log
              </h3>
              {events.length === 0 ? (
                <div className="text-center py-8">
                  <Icon
                    name="Clock"
                    className="w-12 h-12 text-text-muted mx-auto mb-2 opacity-30"
                  />
                  <p className="text-text-muted">No events recorded yet</p>
                  <p className="text-text-muted text-sm mt-1">
                    Events will appear here as the chase progresses
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {events
                    .slice()
                    .reverse()
                    .map((event) => (
                      <div
                        key={event.id}
                        className="p-3 bg-background rounded-lg border border-border"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-primary font-medium text-sm">
                                Round {event.round}
                              </span>
                              {event.participant_name && (
                                <span className="text-text-muted text-sm">
                                  • {event.participant_name}
                                </span>
                              )}
                            </div>
                            <p className="text-text">{event.effect}</p>
                          </div>
                          {event.success !== undefined && (
                            <span
                              className={`px-2 py-0.5 text-xs rounded ${
                                event.success
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}
                            >
                              {event.success ? 'Success' : 'Failure'}
                            </span>
                          )}
                        </div>
                        {event.roll !== undefined && (
                          <p className="text-text-muted text-xs mt-1">Roll: {event.roll}</p>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Participant Modal */}
      {showAddParticipant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background-panel rounded-lg border border-border max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-text mb-4">Add Participant</h3>

            {characters.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-text-muted">No characters in your roster</p>
                <p className="text-text-muted text-sm mt-1">
                  Import characters from D&D Beyond in the Guild Roster first
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-2">Character</label>
                  <select
                    value={selectedCharacterId}
                    onChange={(e) => setSelectedCharacterId(e.target.value)}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text"
                  >
                    <option value="">Select a character...</option>
                    {characters
                      .filter((c) => !participants.some((p) => p.character_id === c.id))
                      .map((character) => (
                        <option key={character.id} value={character.id}>
                          {character.name} (Lv {character.level} {character.race}{' '}
                          {character.class_info})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text mb-2">Role</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="role"
                        value="pursuer"
                        checked={participantRole === 'pursuer'}
                        onChange={() => setParticipantRole('pursuer')}
                        className="text-primary"
                      />
                      <span className="text-text">Pursuer</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="role"
                        value="quarry"
                        checked={participantRole === 'quarry'}
                        onChange={() => setParticipantRole('quarry')}
                        className="text-primary"
                      />
                      <span className="text-text">Quarry</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddParticipant(false)}
                className="flex-1 px-4 py-2 bg-background border border-border text-text rounded-lg hover:bg-background/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCharacterAsParticipant}
                disabled={!selectedCharacterId}
                className="flex-1 px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
