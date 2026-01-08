import { useState, useEffect, useRef } from 'react'
import { GeneratorLayout } from './GeneratorLayout'
import { FormField } from '@/components/ui/FormField'
import { ActionsBar } from '@/components/ui/ActionsBar'
import { useCampaignStore } from '../../store/campaignStore'
import Icon from '../common/Icon'
import CampaignSelector from '../common/CampaignSelector'
import AISettings, { AIGenerationSettings, getMaxTokensFromSettings } from './AISettings'
import { emitContentSaved } from '@/lib/contentEvents'
import {
  generateTrap as generateTrapApi,
  saveTrap as saveTrapApi,
  getErrorMessage,
} from '@/api/generators'
import { normalizeStringArray } from '@/utils/aiResponseNormalizer'
import { logger } from '@/utils/logger'

// Expected trap structure
interface TrapData {
  name: string
  trap_type: string
  difficulty: string
  description: string
  environment: string
  trigger: string
  effect: string
  damage: string
  detection: Detection
  solution_paths: SolutionPath[]
  complications: string[]
  rewards: string[]
  scaling: Scaling
  dm_notes: string
  // For any unexpected fields from AI
  _raw?: Record<string, unknown>
  _parseError?: string
}

interface Detection {
  passive_perception_dc: number | null
  investigation_dc: number | null
  clues: string[]
}

interface SolutionPath {
  approach: string
  skill: string
  dc: number | null
  description: string
  time: string
  failure: string
}

interface Scaling {
  easier: string
  harder: string
}

/**
 * Normalize detection object
 */
function normalizeDetection(value: unknown): Detection {
  const result: Detection = {
    passive_perception_dc: null,
    investigation_dc: null,
    clues: [],
  }

  if (!value || typeof value !== 'object') return result

  const det = value as Record<string, unknown>

  // Handle passive perception DC from various field names
  const passiveDC = det.passive_perception_dc || det.passive_dc || det.perception_dc || det.dc
  if (passiveDC !== undefined && passiveDC !== null) {
    result.passive_perception_dc = Number(passiveDC) || null
  }

  // Handle investigation DC
  const invDC = det.investigation_dc || det.search_dc
  if (invDC !== undefined && invDC !== null) {
    result.investigation_dc = Number(invDC) || null
  }

  // Handle clues
  result.clues = normalizeStringArray(det.clues || det.hints)

  return result
}

/**
 * Normalize a single solution path
 */
function normalizeSolutionPath(value: unknown): SolutionPath | null {
  if (!value) return null

  if (typeof value === 'string') {
    return {
      approach: value,
      skill: '',
      dc: null,
      description: '',
      time: '',
      failure: '',
    }
  }

  if (typeof value === 'object' && value !== null) {
    const path = value as Record<string, unknown>
    return {
      approach: String(path.approach || path.method || path.name || 'Unknown Approach'),
      skill: String(path.skill || path.ability || path.check || ''),
      dc: path.dc !== undefined && path.dc !== null ? Number(path.dc) : null,
      description: String(path.description || ''),
      time: String(path.time || ''),
      failure: String(path.failure || path.on_failure || path.failure_effect || ''),
    }
  }

  return null
}

/**
 * Normalize solution paths array
 */
function normalizeSolutionPaths(value: unknown): SolutionPath[] {
  if (!value || !Array.isArray(value)) return []

  return value
    .map((path) => normalizeSolutionPath(path))
    .filter((path): path is SolutionPath => path !== null)
}

/**
 * Normalize scaling object
 */
function normalizeScaling(value: unknown): Scaling {
  const result: Scaling = {
    easier: '',
    harder: '',
  }

  if (!value || typeof value !== 'object') return result

  const scaling = value as Record<string, unknown>

  result.easier = String(scaling.easier || scaling.lower_level || scaling.easy || '')
  result.harder = String(scaling.harder || scaling.higher_level || scaling.hard || '')

  return result
}

/**
 * Main normalization function - converts raw AI response to typed TrapData
 */
function normalizeTrapResponse(raw: Record<string, unknown>): TrapData {
  logger.debug('[TrapGenerator] normalizeTrapResponse input:', raw)

  // Handle case where description contains the entire JSON response
  let processedRaw = raw
  if (raw.description && typeof raw.description === 'string') {
    const descStr = (raw.description as string).trim()
    if (descStr.startsWith('{') && descStr.endsWith('}')) {
      try {
        const parsedTrap = JSON.parse(descStr)
        logger.debug('[TrapGenerator] Parsed trap from JSON description:', parsedTrap)
        processedRaw = parsedTrap
      } catch (e) {
        logger.warn('[TrapGenerator] Failed to parse description as JSON:', e)
      }
    }
  }

  // Expected fields for tracking unexpected ones
  const expectedFields = [
    'name',
    'title',
    'trap_type',
    'type',
    'difficulty',
    'description',
    'environment',
    'trigger',
    'effect',
    'damage',
    'detection',
    'save',
    'solution_paths',
    'solutions',
    'disarm',
    'complications',
    'rewards',
    'loot',
    'treasure',
    'scaling',
    'dm_notes',
    'notes',
    'gm_notes',
    'provider',
    '_parse_warning',
  ]

  // Collect unexpected fields
  const unexpectedFields: Record<string, unknown> = {}
  for (const key of Object.keys(processedRaw)) {
    if (!expectedFields.includes(key)) {
      unexpectedFields[key] = processedRaw[key]
    }
  }

  // Build description
  let description = ''
  if (processedRaw.description && typeof processedRaw.description === 'string') {
    const descText = processedRaw.description as string
    if (!descText.trim().startsWith('{')) {
      description = descText
    }
  }

  // Get solution paths from various possible field names
  let solutionPaths = normalizeSolutionPaths(processedRaw.solution_paths)
  if (solutionPaths.length === 0) {
    solutionPaths = normalizeSolutionPaths(processedRaw.solutions)
  }
  // Convert disarm to solution path if present and no paths found
  if (solutionPaths.length === 0 && processedRaw.disarm) {
    const disarm = processedRaw.disarm as Record<string, unknown>
    if (typeof disarm === 'object') {
      solutionPaths = [
        {
          approach: 'Disarm',
          skill: String(disarm.method || disarm.skill || ''),
          dc: disarm.dc !== undefined ? Number(disarm.dc) : null,
          description: String(disarm.description || ''),
          time: '1 action',
          failure: 'Triggers the trap',
        },
      ]
    }
  }

  // Get rewards from various possible field names
  let rewards = normalizeStringArray(processedRaw.rewards)
  if (rewards.length === 0) {
    rewards = normalizeStringArray(processedRaw.loot || processedRaw.treasure)
  }

  const result: TrapData = {
    name: String(processedRaw.name || processedRaw.title || 'Unknown Trap'),
    trap_type: String(processedRaw.trap_type || processedRaw.type || ''),
    difficulty: String(processedRaw.difficulty || ''),
    description: description,
    environment: String(processedRaw.environment || ''),
    trigger: String(processedRaw.trigger || ''),
    effect: String(processedRaw.effect || ''),
    damage: String(processedRaw.damage || ''),
    detection: normalizeDetection(processedRaw.detection),
    solution_paths: solutionPaths,
    complications: normalizeStringArray(processedRaw.complications),
    rewards: rewards,
    scaling: normalizeScaling(processedRaw.scaling),
    dm_notes: String(processedRaw.dm_notes || processedRaw.notes || processedRaw.gm_notes || ''),
    _raw: Object.keys(unexpectedFields).length > 0 ? unexpectedFields : undefined,
  }

  logger.debug('[TrapGenerator] Normalized result:', result)
  return result
}

/**
 * Check if trap has valid essential content
 */
function hasValidTrapContent(trap: TrapData): boolean {
  return !!(
    trap.name &&
    trap.name !== 'Unknown Trap' &&
    (trap.description || trap.trigger || trap.effect)
  )
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function TrapGenerator() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [trap, setTrap] = useState<TrapData | null>(null)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showRawResponse, setShowRawResponse] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const { activeCampaignId } = useCampaignStore()

  // Track if user has made an explicit campaign selection
  const hasUserSelectedCampaign = useRef(false)

  // Auto-select active campaign ONLY on initial mount
  useEffect(() => {
    if (activeCampaignId && !hasUserSelectedCampaign.current) {
      setCampaignId(activeCampaignId)
    }
  }, [activeCampaignId])

  // Form inputs
  const [trapType, setTrapType] = useState('mechanical')
  const [difficulty, setDifficulty] = useState('medium')
  const [partyLevel, setPartyLevel] = useState(5)
  const [environment, setEnvironment] = useState('dungeon')
  const [specialRequests, setSpecialRequests] = useState('')

  // AI settings
  const [aiSettings, setAiSettings] = useState<AIGenerationSettings>({
    detailLevel: 'high',
    timeout: 120,
  })

  const generateTrap = async () => {
    setLoading(true)
    setError(null)
    setTrap(null)
    setShowRawResponse(false)
    setIsSaved(false)

    try {
      const data = await generateTrapApi(
        {
          campaign_id: campaignId || undefined,
          trap_type: trapType,
          difficulty,
          party_level: String(partyLevel),
          environment,
          special_requests: specialRequests || undefined,
          max_tokens: getMaxTokensFromSettings(aiSettings),
          timeout: aiSettings.timeout,
        },
        aiSettings.timeout
      )
      logger.debug('[TrapGenerator] Raw API response:', data)

      // Normalize the response
      if (data.trap) {
        const normalized = normalizeTrapResponse(data.trap)

        if (!hasValidTrapContent(normalized)) {
          normalized._parseError =
            'AI response missing essential trap content. Showing raw response.'
          setShowRawResponse(true)
        }

        setTrap(normalized)
      } else {
        // No trap wrapper - try to normalize the raw response
        const normalized = normalizeTrapResponse(data as unknown as Record<string, unknown>)
        normalized._parseError = 'Unexpected response format. Attempting to display.'
        setShowRawResponse(true)
        setTrap(normalized)
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const saveTrap = async () => {
    if (!trap) return

    try {
      await saveTrapApi({
        campaign_id: campaignId || undefined,
        name: trap.name || 'Unnamed Trap',
        trap_type: trap.trap_type || trapType,
        difficulty: trap.difficulty || difficulty,
        description: trap.description || '',
        environment: trap.environment || environment,
        trigger: trap.trigger || '',
        effect: trap.effect || '',
        damage: trap.damage || '',
        detection: trap.detection || {},
        solution_paths: trap.solution_paths || [],
        complications: trap.complications || [],
        rewards: trap.rewards || [],
        scaling: trap.scaling || {},
        dm_notes: trap.dm_notes || '',
        ai_generated: true,
      })

      setShowSaveModal(false)
      setIsSaved(true)
      emitContentSaved()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const handleCopy = () => {
    if (!trap) return
    let text = `${trap.name}\n${trap.trap_type} • ${trap.difficulty}${trap.environment ? ` • ${trap.environment}` : ''}\n\n${trap.description}`

    if (trap.trigger) {
      text += `\n\nTrigger: ${trap.trigger}`
    }

    if (trap.effect) {
      text += `\n\nEffect: ${trap.effect}`
    }

    if (trap.damage) {
      text += `\nDamage: ${trap.damage}`
    }

    if (trap.detection) {
      text += '\n\nDetection:\n'
      if (trap.detection.passive_perception_dc) {
        text += `Passive Perception DC: ${trap.detection.passive_perception_dc}\n`
      }
      if (trap.detection.investigation_dc) {
        text += `Investigation DC: ${trap.detection.investigation_dc}\n`
      }
      if (trap.detection.clues && trap.detection.clues.length > 0) {
        text += 'Clues:\n'
        trap.detection.clues.forEach((clue) => {
          text += `- ${clue}\n`
        })
      }
    }

    if (trap.solution_paths && trap.solution_paths.length > 0) {
      text += '\nSolution Paths:\n'
      trap.solution_paths.forEach((path) => {
        text += `\n${path.approach} (${path.skill}${path.dc ? `, DC ${path.dc}` : ''})\n${path.description}\nTime: ${path.time}\nOn Failure: ${path.failure}\n`
      })
    }

    if (trap.complications && trap.complications.length > 0) {
      text += '\nComplications:\n'
      trap.complications.forEach((comp) => {
        text += `- ${comp}\n`
      })
    }

    if (trap.rewards && trap.rewards.length > 0) {
      text += '\nRewards:\n'
      trap.rewards.forEach((reward) => {
        text += `- ${reward}\n`
      })
    }

    if (trap.dm_notes) {
      text += `\nDM Notes: ${trap.dm_notes}`
    }

    navigator.clipboard.writeText(text)
  }

  const formContent = (
    <>
      <AISettings generatorType="trap" onSettingsChange={setAiSettings} />
      <CampaignSelector
        selectedCampaignId={campaignId}
        onSelect={(id) => {
          hasUserSelectedCampaign.current = true
          setCampaignId(id)
        }}
      />

      <FormField label="Trap Type">
        <select
          value={trapType}
          onChange={(e) => setTrapType(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="mechanical">Mechanical Trap</option>
          <option value="magical">Magical Trap</option>
          <option value="puzzle">Puzzle</option>
          <option value="environmental">Environmental Hazard</option>
          <option value="illusion">Illusion Trap</option>
          <option value="curse">Curse/Magical Ward</option>
        </select>
      </FormField>

      <FormField label="Difficulty">
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="trivial">Trivial (DC 5-10)</option>
          <option value="easy">Easy (DC 10-12)</option>
          <option value="medium">Medium (DC 13-15)</option>
          <option value="hard">Hard (DC 16-18)</option>
          <option value="deadly">Deadly (DC 19+)</option>
        </select>
      </FormField>

      <FormField label="Party Level" description="Determines appropriate damage and DCs">
        <input
          type="number"
          min="1"
          max="20"
          value={partyLevel}
          onChange={(e) => setPartyLevel(parseInt(e.target.value) || 1)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      <FormField label="Environment">
        <select
          value={environment}
          onChange={(e) => setEnvironment(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="dungeon">Dungeon</option>
          <option value="tomb">Tomb/Crypt</option>
          <option value="temple">Temple/Shrine</option>
          <option value="castle">Castle/Keep</option>
          <option value="cave">Cave/Cavern</option>
          <option value="forest">Forest/Wilderness</option>
          <option value="urban">Urban/City</option>
          <option value="underwater">Underwater</option>
        </select>
      </FormField>

      <FormField label="Special Requests" description="(optional)">
        <textarea
          value={specialRequests}
          onChange={(e) => setSpecialRequests(e.target.value)}
          placeholder="e.g., 'Uses a riddle to disarm' or 'Connected to the main villain' or 'Can be repurposed by clever players'"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={3}
        />
      </FormField>
    </>
  )

  const generatedContent = trap ? (
    <div className="space-y-6">
      {/* Parse warning */}
      {trap._parseError && (
        <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-400 font-semibold mb-2">
            <Icon name="AlertCircle" className="w-5 h-5" />
            Response Format Warning
          </div>
          <p className="text-text-muted text-sm">{trap._parseError}</p>
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-primary">{trap.name}</h2>
        <p className="text-sm text-text-muted capitalize">
          {trap.trap_type} • {trap.difficulty}
          {trap.environment && ` • ${trap.environment}`}
        </p>
      </div>

      {/* Description */}
      {trap.description && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="FileText" className="w-5 h-5 text-primary" />
            Description
          </h3>
          <p className="text-text">{trap.description}</p>
        </div>
      )}

      {/* Trigger, Effect, Damage */}
      <div className="grid md:grid-cols-2 gap-4">
        {trap.trigger && (
          <div>
            <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
              <Icon name="Sparkles" className="w-5 h-5 text-yellow-400" />
              Trigger
            </h3>
            <p className="text-text">{trap.trigger}</p>
          </div>
        )}
        {trap.effect && (
          <div>
            <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
              <Icon name="AlertCircle" className="w-5 h-5 text-primary" />
              Effect
            </h3>
            <p className="text-text">{trap.effect}</p>
          </div>
        )}
        {trap.damage && (
          <div>
            <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
              <Icon name="Skull" className="w-5 h-5 text-red-400" />
              Damage
            </h3>
            <p className="text-red-400 font-mono font-bold text-xl">{trap.damage}</p>
          </div>
        )}
      </div>

      {/* Detection */}
      {trap.detection &&
        (trap.detection.passive_perception_dc ||
          trap.detection.investigation_dc ||
          trap.detection.clues.length > 0) && (
          <div>
            <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
              <Icon name="Eye" className="w-5 h-5 text-primary" />
              Detection
            </h3>
            <div className="bg-background p-4 rounded border border-border space-y-2">
              {trap.detection.passive_perception_dc && (
                <p className="text-text">
                  <span className="font-medium">Passive Perception DC:</span>{' '}
                  {trap.detection.passive_perception_dc}
                </p>
              )}
              {trap.detection.investigation_dc && (
                <p className="text-text">
                  <span className="font-medium">Investigation DC:</span>{' '}
                  {trap.detection.investigation_dc}
                </p>
              )}
              {trap.detection.clues.length > 0 && (
                <div>
                  <p className="font-medium text-text mb-1">Clues:</p>
                  <ul className="space-y-1">
                    {trap.detection.clues.map((clue, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-text-muted">
                        <span className="text-primary">•</span>
                        <span>{clue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

      {/* Solution Paths */}
      {trap.solution_paths.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Map" className="w-5 h-5 text-primary" />
            Solution Paths
          </h3>
          <div className="space-y-3">
            {trap.solution_paths.map((path, idx) => (
              <div key={idx} className="bg-background p-4 rounded border-2 border-primary/30">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-text capitalize">{path.approach}</span>
                  {path.dc && (
                    <span className="px-2 py-1 bg-primary/20 text-primary rounded text-sm font-mono font-bold">
                      DC {path.dc}
                    </span>
                  )}
                </div>
                {path.skill && (
                  <p className="text-sm text-primary mb-2">
                    <span className="font-medium">Skill:</span> {path.skill}
                  </p>
                )}
                {path.description && <p className="text-text mb-2">{path.description}</p>}
                {path.time && (
                  <div className="flex gap-4 text-xs text-text-muted">
                    <span>Time: {path.time}</span>
                  </div>
                )}
                {path.failure && (
                  <p className="text-sm text-red-400 mt-2">
                    <span className="font-medium">On Failure:</span> {path.failure}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Complications */}
      {trap.complications.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="AlertCircle" className="w-5 h-5 text-orange-400" />
            Complications
          </h3>
          <ul className="space-y-2">
            {trap.complications.map((complication, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-text bg-orange-500/10 p-3 rounded border border-orange-500/20"
              >
                <span className="text-orange-400">⚠</span>
                <span>{complication}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Rewards */}
      {trap.rewards.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Package" className="w-5 h-5 text-primary" />
            Rewards
          </h3>
          <ul className="space-y-2">
            {trap.rewards.map((reward, idx) => (
              <li key={idx} className="flex items-start gap-2 text-text">
                <span className="text-primary">•</span>
                <span>{reward}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Scaling */}
      {(trap.scaling.easier || trap.scaling.harder) && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Settings" className="w-5 h-5 text-primary" />
            Difficulty Scaling
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {trap.scaling.easier && (
              <div className="bg-green-500/10 p-4 rounded border border-green-500/20">
                <p className="font-medium text-green-400 mb-2">Make It Easier:</p>
                <p className="text-text">{trap.scaling.easier}</p>
              </div>
            )}
            {trap.scaling.harder && (
              <div className="bg-red-500/10 p-4 rounded border border-red-500/20">
                <p className="font-medium text-red-400 mb-2">Make It Harder:</p>
                <p className="text-text">{trap.scaling.harder}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DM Notes */}
      {trap.dm_notes && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="BookOpen" className="w-5 h-5 text-primary" />
            DM Notes
          </h3>
          <div className="bg-primary/10 p-4 rounded border border-primary/20">
            <p className="text-text">{trap.dm_notes}</p>
          </div>
        </div>
      )}

      {/* Raw/unexpected fields - collapsible */}
      {trap._raw && Object.keys(trap._raw).length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setShowRawResponse(!showRawResponse)}
            className="w-full px-4 py-3 bg-background-panel flex items-center justify-between text-left hover:bg-tavern-dark transition-colors"
          >
            <span className="flex items-center gap-2 text-text-muted">
              <Icon name="FileText" className="w-5 h-5" />
              Additional AI Response Data ({Object.keys(trap._raw).length} fields)
            </span>
            <Icon
              name={showRawResponse ? 'ChevronUp' : 'ChevronDown'}
              className="w-5 h-5 text-text-muted"
            />
          </button>
          {showRawResponse && (
            <div className="p-4 bg-background border-t border-border">
              <pre className="text-xs text-text-muted overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(trap._raw, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      <ActionsBar
        onCopy={handleCopy}
        onSave={isSaved ? undefined : () => setShowSaveModal(true)}
        showRegenerate={false}
        isSaved={isSaved}
      />
    </div>
  ) : null

  return (
    <>
      <GeneratorLayout
        title="Trap & Puzzle Generator"
        description="Generate traps and puzzles with multiple solution paths for your campaign"
        icon="Skull"
        formTitle="Trap Details"
        formIcon="Settings"
        resultsTitle="Generated Trap"
        formContent={formContent}
        generatedContent={generatedContent}
        isGenerating={loading}
        onGenerate={generateTrap}
        generateButtonText="Generate Trap"
        error={error || undefined}
      />

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background-panel rounded-lg border border-border max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-text mb-4">Save Trap</h3>
            <p className="text-text-muted mb-6">
              Save "{trap?.name}" to your campaign for future reference?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="flex-1 px-4 py-2 bg-background border border-border hover:bg-tavern-dark text-text rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveTrap}
                className="flex-1 px-4 py-2 bg-primary hover:bg-primary-dark text-tavern-darkest font-medium rounded-lg transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
