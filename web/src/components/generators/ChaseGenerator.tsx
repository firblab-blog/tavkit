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
  generateChaseScenario as generateChaseApi,
  saveChase as saveChaseApi,
  getErrorMessage,
} from '@/api/generators'
import { normalizeStringArray } from '@/utils/aiResponseNormalizer'
import { logger } from '@/utils/logger'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Obstacle {
  name: string
  description: string
  check: string
  failure: string
}

interface Shortcut {
  name: string
  description: string
  benefit: string
}

interface ChasePhase {
  round: string | number
  description: string
  difficulty: string
}

interface Participants {
  quarry: string
  pursuers: string
}

interface EndingConditions {
  success: string
  failure: string
  alternative: string
}

interface Rewards {
  success: string
  partial: string
  failure: string
}

interface ChaseData {
  name: string
  chase_type: string
  terrain: string
  difficulty: string
  description: string
  setting: string
  participants: Participants
  starting_conditions: string
  obstacles: Obstacle[]
  complications: string[]
  shortcuts: Shortcut[]
  chase_phases: ChasePhase[]
  ending_conditions: EndingConditions
  rewards: Rewards
  special_rules: string
  environmental_factors: string[]
  // For any unexpected fields from AI
  _raw?: Record<string, unknown>
  _parseError?: string
}

/**
 * Normalize a single obstacle
 */
function normalizeObstacle(value: unknown): Obstacle | null {
  if (!value) return null

  if (typeof value === 'string') {
    return { name: value, description: '', check: '', failure: '' }
  }

  if (typeof value === 'object' && value !== null) {
    const obs = value as Record<string, unknown>
    return {
      name: String(obs.name || obs.title || obs.obstacle || 'Unknown Obstacle'),
      description: String(obs.description || obs.desc || ''),
      check: String(obs.check || obs.skill_check || obs.dc || ''),
      failure: String(obs.failure || obs.on_failure || obs.consequence || ''),
    }
  }

  return null
}

/**
 * Normalize obstacles array
 */
function normalizeObstacles(value: unknown): Obstacle[] {
  if (!value || !Array.isArray(value)) return []

  return value.map((obs) => normalizeObstacle(obs)).filter((obs): obs is Obstacle => obs !== null)
}

/**
 * Normalize a single shortcut
 */
function normalizeShortcut(value: unknown): Shortcut | null {
  if (!value) return null

  if (typeof value === 'string') {
    return { name: value, description: '', benefit: '' }
  }

  if (typeof value === 'object' && value !== null) {
    const sc = value as Record<string, unknown>
    return {
      name: String(sc.name || sc.title || sc.route || 'Unknown Shortcut'),
      description: String(sc.description || sc.desc || ''),
      benefit: String(sc.benefit || sc.advantage || sc.effect || ''),
    }
  }

  return null
}

/**
 * Normalize shortcuts array
 */
function normalizeShortcuts(value: unknown): Shortcut[] {
  if (!value || !Array.isArray(value)) return []

  return value.map((sc) => normalizeShortcut(sc)).filter((sc): sc is Shortcut => sc !== null)
}

/**
 * Normalize a single chase phase
 */
function normalizeChasePhase(value: unknown, index: number): ChasePhase | null {
  if (!value) return null

  if (typeof value === 'string') {
    return { round: String(index + 1), description: value, difficulty: 'Medium' }
  }

  if (typeof value === 'object' && value !== null) {
    const phase = value as Record<string, unknown>
    return {
      round: String(phase.round || phase.number || phase.turn || index + 1),
      description: String(phase.description || phase.desc || phase.event || ''),
      difficulty: String(phase.difficulty || phase.dc || phase.level || 'Medium'),
    }
  }

  return null
}

/**
 * Normalize chase phases array
 */
function normalizeChasePhases(value: unknown): ChasePhase[] {
  if (!value || !Array.isArray(value)) return []

  return value
    .map((phase, idx) => normalizeChasePhase(phase, idx))
    .filter((phase): phase is ChasePhase => phase !== null)
}

/**
 * Normalize participants object
 */
function normalizeParticipants(value: unknown): Participants {
  const result: Participants = { quarry: '', pursuers: '' }

  if (!value || typeof value !== 'object') return result

  const p = value as Record<string, unknown>
  result.quarry = String(p.quarry || p.target || p.prey || '')
  result.pursuers = String(p.pursuers || p.chasers || p.hunters || '')

  return result
}

/**
 * Normalize ending conditions object
 */
function normalizeEndingConditions(value: unknown): EndingConditions {
  const result: EndingConditions = { success: '', failure: '', alternative: '' }

  if (!value || typeof value !== 'object') return result

  const ec = value as Record<string, unknown>
  result.success = String(ec.success || ec.win || ec.escape || '')
  result.failure = String(ec.failure || ec.lose || ec.caught || '')
  result.alternative = String(ec.alternative || ec.other || ec.partial || '')

  return result
}

/**
 * Normalize rewards object
 */
function normalizeRewards(value: unknown): Rewards {
  const result: Rewards = { success: '', partial: '', failure: '' }

  if (!value || typeof value !== 'object') return result

  const r = value as Record<string, unknown>
  result.success = String(r.success || r.win || '')
  result.partial = String(r.partial || r.some || '')
  result.failure = String(r.failure || r.lose || '')

  return result
}

/**
 * Normalize special_rules which can be string or object
 */
function normalizeSpecialRules(value: unknown): string {
  if (!value) return ''

  if (typeof value === 'string') return value

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return ''
    }
  }

  return String(value)
}

/**
 * Main normalization function - converts raw AI response to typed ChaseData
 */
function normalizeChaseResponse(
  raw: Record<string, unknown>,
  formData: { chaseType: string; terrain: string; difficulty: string }
): ChaseData {
  logger.debug('[ChaseGenerator] normalizeChaseResponse input:', raw)

  // Handle case where description contains the entire JSON response
  let processedRaw = raw
  if (raw.description && typeof raw.description === 'string') {
    const descStr = (raw.description as string).trim()
    if (descStr.startsWith('{') && descStr.endsWith('}')) {
      try {
        const parsedChase = JSON.parse(descStr)
        logger.debug('[ChaseGenerator] Parsed chase from JSON description:', parsedChase)
        processedRaw = parsedChase
      } catch (e) {
        logger.warn('[ChaseGenerator] Failed to parse description as JSON:', e)
      }
    }
  }

  // Expected fields for tracking unexpected ones
  const expectedFields = [
    'name',
    'title',
    'scene_name',
    'chase_type',
    'type',
    'terrain',
    'environment',
    'difficulty',
    'description',
    'setting',
    'participants',
    'target',
    'prey',
    'chasers',
    'hunters',
    'starting_conditions',
    'obstacles',
    'challenges',
    'hazards',
    'complications',
    'shortcuts',
    'chase_phases',
    'phases',
    'rounds',
    'ending_conditions',
    'victory',
    'defeat',
    'escape',
    'caught',
    'rewards',
    'special_rules',
    'rules',
    'mechanics',
    'environmental_factors',
    'environment_effects',
    'weather',
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

  // Get obstacles from various possible field names
  let obstacles = normalizeObstacles(processedRaw.obstacles)
  if (obstacles.length === 0) {
    obstacles = normalizeObstacles(processedRaw.challenges || processedRaw.hazards)
  }

  // Get chase_phases from various possible field names
  let chasePhases = normalizeChasePhases(processedRaw.chase_phases)
  if (chasePhases.length === 0) {
    chasePhases = normalizeChasePhases(processedRaw.phases || processedRaw.rounds)
  }

  // Get environmental_factors from various possible field names
  let environmentalFactors = normalizeStringArray(processedRaw.environmental_factors)
  if (environmentalFactors.length === 0) {
    environmentalFactors = normalizeStringArray(
      processedRaw.environment_effects || processedRaw.weather
    )
  }

  const result: ChaseData = {
    name: String(
      processedRaw.name || processedRaw.title || processedRaw.scene_name || 'Unknown Chase'
    ),
    chase_type: String(processedRaw.chase_type || processedRaw.type || formData.chaseType),
    terrain: String(processedRaw.terrain || processedRaw.environment || formData.terrain),
    difficulty: String(processedRaw.difficulty || formData.difficulty),
    description: description,
    setting: String(processedRaw.setting || ''),
    participants: normalizeParticipants(processedRaw.participants),
    starting_conditions: String(processedRaw.starting_conditions || ''),
    obstacles: obstacles,
    complications: normalizeStringArray(processedRaw.complications),
    shortcuts: normalizeShortcuts(processedRaw.shortcuts),
    chase_phases: chasePhases,
    ending_conditions: normalizeEndingConditions(processedRaw.ending_conditions),
    rewards: normalizeRewards(processedRaw.rewards),
    special_rules: normalizeSpecialRules(
      processedRaw.special_rules || processedRaw.rules || processedRaw.mechanics
    ),
    environmental_factors: environmentalFactors,
    _raw: Object.keys(unexpectedFields).length > 0 ? unexpectedFields : undefined,
  }

  logger.debug('[ChaseGenerator] Normalized result:', result)
  return result
}

/**
 * Check if chase has valid essential content
 */
function hasValidChaseContent(chase: ChaseData): boolean {
  return !!(
    chase.name &&
    chase.name !== 'Unknown Chase' &&
    (chase.description || chase.obstacles.length > 0 || chase.chase_phases.length > 0)
  )
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function ChaseGenerator() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chase, setChase] = useState<ChaseData | null>(null)
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
  const [chaseType, setChaseType] = useState('foot_chase')
  const [terrain, setTerrain] = useState('urban')
  const [difficulty, setDifficulty] = useState('medium')
  const [partyLevel, setPartyLevel] = useState(5)
  const [specialRequests, setSpecialRequests] = useState('')

  // AI settings
  const [aiSettings, setAiSettings] = useState<AIGenerationSettings>({
    detailLevel: 'high',
    timeout: 120,
  })

  const generateChase = async () => {
    setLoading(true)
    setError(null)
    setChase(null)
    setShowRawResponse(false)
    setIsSaved(false)

    try {
      const data = await generateChaseApi(
        {
          campaign_id: campaignId || undefined,
          chase_type: chaseType,
          terrain,
          difficulty,
          party_level: String(partyLevel),
          special_requests: specialRequests || undefined,
          max_tokens: getMaxTokensFromSettings(aiSettings),
          timeout: aiSettings.timeout,
        },
        aiSettings.timeout
      )
      logger.debug('[ChaseGenerator] Raw API response:', data)

      // Normalize the response
      if (data.chase) {
        const normalized = normalizeChaseResponse(data.chase, { chaseType, terrain, difficulty })

        if (!hasValidChaseContent(normalized)) {
          normalized._parseError =
            'AI response missing essential chase content. Showing raw response.'
          setShowRawResponse(true)
        }

        setChase(normalized)
      } else {
        // No chase wrapper - try to normalize the raw response
        const normalized = normalizeChaseResponse(data as unknown as Record<string, unknown>, {
          chaseType,
          terrain,
          difficulty,
        })
        normalized._parseError = 'Unexpected response format. Attempting to display.'
        setShowRawResponse(true)
        setChase(normalized)
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const saveChase = async () => {
    if (!chase) return

    try {
      await saveChaseApi({
        campaign_id: campaignId || undefined,
        name: chase.name || 'Unnamed Chase',
        chase_type: chase.chase_type || chaseType,
        terrain: chase.terrain || terrain,
        difficulty: chase.difficulty || difficulty,
        description: chase.description || '',
        setting: chase.setting || '',
        participants: chase.participants || {},
        starting_conditions: chase.starting_conditions || '',
        obstacles: chase.obstacles || [],
        complications: chase.complications || [],
        shortcuts: chase.shortcuts || [],
        chase_phases: chase.chase_phases || [],
        ending_conditions: chase.ending_conditions || {},
        rewards: chase.rewards || {},
        special_rules: chase.special_rules || '',
        environmental_factors: chase.environmental_factors || [],
        ai_generated: true,
        starting_distance: 3,
        catch_threshold: 0,
        escape_threshold: 7,
      })

      setShowSaveModal(false)
      setIsSaved(true)
      emitContentSaved()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const handleCopy = () => {
    if (!chase) return
    const chaseTypeLabel = chase.chase_type ? chase.chase_type.replace(/_/g, ' ') : 'Chase'
    const terrainLabel = chase.terrain ? chase.terrain.replace(/_/g, ' ') : 'Unknown'
    let text = `${chase.name || 'Unnamed Chase'}\n${chaseTypeLabel} • ${terrainLabel} • ${chase.difficulty || 'Medium'}\n\n${chase.description || ''}`

    if (chase.setting) {
      text += `\n\nSetting: ${chase.setting}`
    }

    if (chase.participants && (chase.participants.quarry || chase.participants.pursuers)) {
      text += `\n\nParticipants:\nQuarry: ${chase.participants.quarry}\nPursuers: ${chase.participants.pursuers}`
    }

    if (chase.starting_conditions) {
      text += `\n\nStarting Conditions: ${chase.starting_conditions}`
    }

    if (chase.obstacles.length > 0) {
      text += '\n\nObstacles:\n'
      chase.obstacles.forEach((obstacle) => {
        text += `${obstacle.name}\n${obstacle.description}\nCheck: ${obstacle.check}\nFailure: ${obstacle.failure}\n\n`
      })
    }

    if (chase.complications.length > 0) {
      text += '\nComplications:\n'
      chase.complications.forEach((comp) => {
        text += `- ${comp}\n`
      })
    }

    if (chase.shortcuts.length > 0) {
      text += '\nShortcuts:\n'
      chase.shortcuts.forEach((sc) => {
        text += `${sc.name}: ${sc.description} (${sc.benefit})\n`
      })
    }

    if (chase.chase_phases.length > 0) {
      text += '\nChase Phases:\n'
      chase.chase_phases.forEach((phase) => {
        text += `Round ${phase.round} (${phase.difficulty}): ${phase.description}\n`
      })
    }

    if (chase.environmental_factors.length > 0) {
      text += '\nEnvironmental Factors:\n'
      chase.environmental_factors.forEach((factor) => {
        text += `- ${factor}\n`
      })
    }

    if (chase.special_rules) {
      text += `\nSpecial Rules: ${chase.special_rules}`
    }

    if (
      chase.ending_conditions &&
      (chase.ending_conditions.success || chase.ending_conditions.failure)
    ) {
      text += '\n\nEnding Conditions:'
      if (chase.ending_conditions.success) text += `\nSuccess: ${chase.ending_conditions.success}`
      if (chase.ending_conditions.failure) text += `\nFailure: ${chase.ending_conditions.failure}`
      if (chase.ending_conditions.alternative)
        text += `\nAlternative: ${chase.ending_conditions.alternative}`
    }

    if (chase.rewards && chase.rewards.success) {
      text += '\n\nRewards:'
      if (chase.rewards.success) text += `\nSuccess: ${chase.rewards.success}`
      if (chase.rewards.partial) text += `\nPartial: ${chase.rewards.partial}`
      if (chase.rewards.failure) text += `\nFailure: ${chase.rewards.failure}`
    }

    navigator.clipboard.writeText(text)
  }

  const formContent = (
    <>
      <AISettings generatorType="chase" onSettingsChange={setAiSettings} />
      <CampaignSelector
        selectedCampaignId={campaignId}
        onSelect={(id) => {
          hasUserSelectedCampaign.current = true
          setCampaignId(id)
        }}
      />

      <FormField label="Chase Type">
        <select
          value={chaseType}
          onChange={(e) => setChaseType(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="foot_chase">Foot Chase</option>
          <option value="mounted_chase">Mounted Chase</option>
          <option value="vehicle_chase">Vehicle Chase</option>
          <option value="flying_chase">Flying Chase</option>
          <option value="underwater_chase">Underwater Chase</option>
          <option value="rooftop_chase">Rooftop Chase</option>
        </select>
      </FormField>

      <FormField label="Terrain">
        <select
          value={terrain}
          onChange={(e) => setTerrain(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="urban">Urban (City Streets)</option>
          <option value="forest">Forest</option>
          <option value="mountain">Mountain</option>
          <option value="desert">Desert</option>
          <option value="swamp">Swamp</option>
          <option value="underground">Underground</option>
          <option value="market">Crowded Market</option>
          <option value="docks">Docks/Harbor</option>
        </select>
      </FormField>

      <FormField label="Difficulty">
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
          <option value="deadly">Deadly</option>
        </select>
      </FormField>

      <FormField label="Party Level">
        <input
          type="number"
          min={1}
          max={20}
          value={partyLevel}
          onChange={(e) => setPartyLevel(parseInt(e.target.value) || 5)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      <FormField label="Special Requests" description="(optional)">
        <textarea
          value={specialRequests}
          onChange={(e) => setSpecialRequests(e.target.value)}
          placeholder="e.g., 'Players are chasing a thief through a crowded festival' or 'Include a river crossing'"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={3}
        />
      </FormField>
    </>
  )

  const generatedContent = chase ? (
    <div className="space-y-6">
      {/* Parse warning */}
      {chase._parseError && (
        <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-400 font-semibold mb-2">
            <Icon name="AlertCircle" className="w-5 h-5" />
            Response Format Warning
          </div>
          <p className="text-text-muted text-sm">{chase._parseError}</p>
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-primary">{chase.name}</h2>
        <p className="text-sm text-text-muted capitalize">
          {chase.chase_type.replace(/_/g, ' ')} • {chase.terrain.replace(/_/g, ' ')} •{' '}
          {chase.difficulty}
        </p>
      </div>

      {/* Description */}
      {chase.description && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="FileText" className="w-5 h-5 text-primary" />
            Description
          </h3>
          <p className="text-text">{chase.description}</p>
        </div>
      )}

      {/* Setting */}
      {chase.setting && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="MapPin" className="w-5 h-5 text-primary" />
            Setting
          </h3>
          <p className="text-text">{chase.setting}</p>
        </div>
      )}

      {/* Participants */}
      {(chase.participants.quarry || chase.participants.pursuers) && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Users" className="w-5 h-5 text-primary" />
            Participants
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {chase.participants.quarry && (
              <div className="bg-background p-3 rounded border border-border">
                <span className="text-primary font-medium">Quarry:</span>
                <p className="text-text mt-1">{chase.participants.quarry}</p>
              </div>
            )}
            {chase.participants.pursuers && (
              <div className="bg-background p-3 rounded border border-border">
                <span className="text-primary font-medium">Pursuers:</span>
                <p className="text-text mt-1">{chase.participants.pursuers}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Starting Conditions */}
      {chase.starting_conditions && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="MapPin" className="w-5 h-5 text-primary" />
            Starting Conditions
          </h3>
          <p className="text-text">{chase.starting_conditions}</p>
        </div>
      )}

      {/* Obstacles */}
      {chase.obstacles.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="AlertCircle" className="w-5 h-5 text-primary" />
            Obstacles
          </h3>
          <div className="space-y-3">
            {chase.obstacles.map((obstacle, idx) => (
              <div key={idx} className="bg-background p-4 rounded border border-border">
                <h4 className="font-semibold text-primary mb-2">{obstacle.name}</h4>
                {obstacle.description && (
                  <p className="text-text-muted text-sm mb-3">{obstacle.description}</p>
                )}
                <div className="grid md:grid-cols-2 gap-2 text-sm">
                  {obstacle.check && (
                    <div>
                      <span className="text-primary font-medium">Check:</span>
                      <p className="text-text">{obstacle.check}</p>
                    </div>
                  )}
                  {obstacle.failure && (
                    <div>
                      <span className="text-red-400 font-medium">Failure:</span>
                      <p className="text-text">{obstacle.failure}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Complications */}
      {chase.complications.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="AlertCircle" className="w-5 h-5 text-primary" />
            Complications
          </h3>
          <ul className="space-y-2">
            {chase.complications.map((complication, idx) => (
              <li key={idx} className="flex items-start gap-2 text-text">
                <span className="text-primary">•</span>
                <span>{complication}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Shortcuts */}
      {chase.shortcuts.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Sparkles" className="w-5 h-5 text-primary" />
            Shortcuts & Alternate Routes
          </h3>
          <div className="space-y-2">
            {chase.shortcuts.map((shortcut, idx) => (
              <div key={idx} className="bg-background p-3 rounded border-2 border-primary/30">
                <h4 className="font-semibold text-text mb-1">{shortcut.name}</h4>
                {shortcut.description && (
                  <p className="text-text-muted text-sm mb-1">{shortcut.description}</p>
                )}
                {shortcut.benefit && (
                  <p className="text-primary text-sm font-medium">✓ {shortcut.benefit}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chase Phases */}
      {chase.chase_phases.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="ArrowRight" className="w-5 h-5 text-primary" />
            Chase Phases
          </h3>
          <div className="space-y-2">
            {chase.chase_phases.map((phase, idx) => (
              <div key={idx} className="bg-background p-3 rounded border border-border">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-primary">Round {phase.round}</span>
                  <span className="text-sm px-2 py-0.5 bg-primary/20 text-primary rounded">
                    {phase.difficulty}
                  </span>
                </div>
                <p className="text-text text-sm">{phase.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Environmental Factors */}
      {chase.environmental_factors.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Globe" className="w-5 h-5 text-primary" />
            Environmental Factors
          </h3>
          <ul className="space-y-2">
            {chase.environmental_factors.map((factor, idx) => (
              <li key={idx} className="flex items-start gap-2 text-text">
                <span className="text-primary">•</span>
                <span>{factor}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Special Rules */}
      {chase.special_rules && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="Book" className="w-5 h-5 text-primary" />
            Special Rules
          </h3>
          <p className="text-text">{chase.special_rules}</p>
        </div>
      )}

      {/* Ending Conditions */}
      {(chase.ending_conditions.success || chase.ending_conditions.failure) && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Shield" className="w-5 h-5 text-primary" />
            Ending Conditions
          </h3>
          <div className="space-y-2">
            {chase.ending_conditions.success && (
              <div className="bg-green-500/10 p-3 rounded border border-green-500/30">
                <span className="font-medium text-green-400">Success:</span>
                <p className="text-text mt-1">{chase.ending_conditions.success}</p>
              </div>
            )}
            {chase.ending_conditions.failure && (
              <div className="bg-red-500/10 p-3 rounded border border-red-500/30">
                <span className="font-medium text-red-400">Failure:</span>
                <p className="text-text mt-1">{chase.ending_conditions.failure}</p>
              </div>
            )}
            {chase.ending_conditions.alternative && (
              <div className="bg-primary/10 p-3 rounded border border-primary/30">
                <span className="font-medium text-primary">Alternative:</span>
                <p className="text-text mt-1">{chase.ending_conditions.alternative}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rewards */}
      {chase.rewards.success && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Package" className="w-5 h-5 text-primary" />
            Rewards
          </h3>
          <div className="space-y-2">
            <div className="bg-background p-3 rounded border border-border">
              <span className="font-medium text-primary">Success:</span>
              <p className="text-text mt-1">{chase.rewards.success}</p>
            </div>
            {chase.rewards.partial && (
              <div className="bg-background p-3 rounded border border-border">
                <span className="font-medium text-primary">Partial Success:</span>
                <p className="text-text mt-1">{chase.rewards.partial}</p>
              </div>
            )}
            {chase.rewards.failure && (
              <div className="bg-background p-3 rounded border border-border">
                <span className="font-medium text-text-muted">Failure:</span>
                <p className="text-text mt-1">{chase.rewards.failure}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Raw/unexpected fields - collapsible */}
      {chase._raw && Object.keys(chase._raw).length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setShowRawResponse(!showRawResponse)}
            className="w-full px-4 py-3 bg-background-panel flex items-center justify-between text-left hover:bg-tavern-dark transition-colors"
          >
            <span className="flex items-center gap-2 text-text-muted">
              <Icon name="FileText" className="w-5 h-5" />
              Additional AI Response Data ({Object.keys(chase._raw).length} fields)
            </span>
            <Icon
              name={showRawResponse ? 'ChevronUp' : 'ChevronDown'}
              className="w-5 h-5 text-text-muted"
            />
          </button>
          {showRawResponse && (
            <div className="p-4 bg-background border-t border-border">
              <pre className="text-xs text-text-muted overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(chase._raw, null, 2)}
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
        title="Chase & Pursuit Generator"
        description="Generate exciting chase sequences and pursuit scenes"
        icon="Zap"
        formTitle="Chase Details"
        formIcon="Settings"
        resultsTitle="Generated Chase"
        formContent={formContent}
        generatedContent={generatedContent}
        isGenerating={loading}
        onGenerate={generateChase}
        generateButtonText="Generate Chase"
        error={error || undefined}
      />

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background-panel rounded-lg border border-border max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-text mb-4">Save Chase</h3>
            <p className="text-text-muted mb-6">
              Save "{chase?.name}" {campaignId ? 'to your campaign' : 'to your saved chases'}? You
              can run it later in the Chase Manager.
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
                onClick={saveChase}
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
