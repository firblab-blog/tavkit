import { useState, useEffect, useRef } from 'react'
import { GeneratorLayout } from './GeneratorLayout'
import { FormField } from '@/components/ui/FormField'
import { ActionsBar } from '@/components/ui/ActionsBar'
import Icon from '../common/Icon'
import CampaignSelector from '../common/CampaignSelector'
import { useCampaignStore } from '../../store/campaignStore'
import AISettings, { AIGenerationSettings, getMaxTokensFromSettings } from './AISettings'
import { emitContentSaved } from '@/lib/contentEvents'
import {
  generateEncounter as generateEncounterApi,
  saveEncounter as saveEncounterApi,
  getErrorMessage,
} from '@/api/generators'
import { normalizeStringArray } from '@/utils/aiResponseNormalizer'
import { logger } from '@/utils/logger'

// Expected encounter structure
interface EncounterData {
  name: string
  description: string
  difficulty: string
  expected_duration: string
  environment: EnvironmentData
  creatures: CreatureData[]
  treasure: TreasureData
  xp_total: number
  xp_per_player: number
  // For any unexpected fields from AI
  _raw?: Record<string, unknown>
  _parseError?: string
}

interface EnvironmentData {
  setting: string
  features: string[]
  lighting: string
}

interface CreatureData {
  name: string
  count: number
  cr: number
  role: string
  tactics: string
}

interface TreasureData {
  coins: Record<string, number>
  items: string[]
}

/**
 * Normalize environment to proper structure
 */
function normalizeEnvironment(value: unknown): EnvironmentData {
  const defaultEnv: EnvironmentData = {
    setting: '',
    features: [],
    lighting: '',
  }

  if (!value) return defaultEnv

  if (typeof value === 'string') {
    return { ...defaultEnv, setting: value }
  }

  if (typeof value === 'object' && value !== null) {
    const env = value as Record<string, unknown>
    return {
      setting: String(env.setting || env.terrain || env.location || ''),
      features: normalizeStringArray(env.features || env.environmental_features || env.hazards),
      lighting: String(env.lighting || env.light || env.visibility || ''),
    }
  }

  return defaultEnv
}

/**
 * Normalize a single creature to proper structure
 */
function normalizeCreature(value: unknown): CreatureData | null {
  if (!value || typeof value !== 'object') return null

  const creature = value as Record<string, unknown>

  return {
    name: String(creature.name || creature.creature || 'Unknown Creature'),
    count: Number(creature.count || creature.quantity || creature.number || 1),
    cr: Number(creature.cr || creature.challenge_rating || creature.challenge || 1),
    role: String(creature.role || creature.type || ''),
    tactics: String(creature.tactics || creature.strategy || creature.behavior || ''),
  }
}

/**
 * Normalize creatures array
 */
function normalizeCreatures(value: unknown): CreatureData[] {
  if (!value) return []

  if (!Array.isArray(value)) {
    // Single creature object
    const creature = normalizeCreature(value)
    return creature ? [creature] : []
  }

  return value.map((c) => normalizeCreature(c)).filter((c): c is CreatureData => c !== null)
}

/**
 * Normalize treasure to proper structure
 */
function normalizeTreasure(value: unknown): TreasureData {
  const defaultTreasure: TreasureData = {
    coins: {},
    items: [],
  }

  if (!value) return defaultTreasure

  if (typeof value !== 'object' || value === null) return defaultTreasure

  const treasure = value as Record<string, unknown>

  // Normalize coins
  let coins: Record<string, number> = {}
  if (treasure.coins && typeof treasure.coins === 'object') {
    const rawCoins = treasure.coins as Record<string, unknown>
    for (const [key, val] of Object.entries(rawCoins)) {
      coins[key] = Number(val) || 0
    }
  }

  // Normalize items
  const items = normalizeStringArray(treasure.items || treasure.loot || treasure.rewards)

  return { coins, items }
}

/**
 * Main normalization function - converts raw AI response to typed EncounterData
 */
function normalizeEncounterResponse(raw: Record<string, unknown>): EncounterData {
  logger.debug('[EncounterBuilder] normalizeEncounterResponse input:', raw)

  // Handle case where description contains the entire JSON response
  let processedRaw = raw
  if (raw.description && typeof raw.description === 'string') {
    const descStr = (raw.description as string).trim()
    if (descStr.startsWith('{') && descStr.endsWith('}')) {
      try {
        const parsedEncounter = JSON.parse(descStr)
        logger.debug('[EncounterBuilder] Parsed encounter from JSON description:', parsedEncounter)
        processedRaw = parsedEncounter
      } catch (e) {
        logger.warn('[EncounterBuilder] Failed to parse description as JSON:', e)
      }
    }
  }

  // Expected fields for tracking unexpected ones
  const expectedFields = [
    'name',
    'title',
    'description',
    'difficulty',
    'expected_duration',
    'duration',
    'environment',
    'creatures',
    'monsters',
    'enemies',
    'treasure',
    'loot',
    'rewards',
    'xp_total',
    'xp_per_player',
    'total_xp',
    'experience',
    'provider',
    '_parse_warning',
  ]

  // Collect unexpected fields for debugging
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
  if (!description && processedRaw.summary) {
    description = String(processedRaw.summary)
  }

  const result: EncounterData = {
    name: String(processedRaw.name || processedRaw.title || 'Generated Encounter'),
    description: description,
    difficulty: String(processedRaw.difficulty || ''),
    expected_duration: String(processedRaw.expected_duration || processedRaw.duration || ''),
    environment: normalizeEnvironment(processedRaw.environment),
    creatures: normalizeCreatures(
      processedRaw.creatures || processedRaw.monsters || processedRaw.enemies
    ),
    treasure: normalizeTreasure(processedRaw.treasure || processedRaw.loot || processedRaw.rewards),
    xp_total: Number(
      processedRaw.xp_total || processedRaw.total_xp || processedRaw.experience || 0
    ),
    xp_per_player: Number(processedRaw.xp_per_player || 0),
    _raw: Object.keys(unexpectedFields).length > 0 ? unexpectedFields : undefined,
  }

  logger.debug('[EncounterBuilder] Normalized result:', result)
  return result
}

/**
 * Check if encounter has valid essential content
 */
function hasValidEncounterContent(encounter: EncounterData): boolean {
  return !!(
    encounter.name &&
    encounter.name !== 'Generated Encounter' &&
    (encounter.description || encounter.creatures.length > 0)
  )
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function EncounterBuilder() {
  const [specialRequests, setSpecialRequests] = useState('')
  const [partyLevel, setPartyLevel] = useState<number | ''>(5)
  const [partySize, setPartySize] = useState<number | ''>(4)
  const [difficulty, setDifficulty] = useState('medium')
  const [encounterType, setEncounterType] = useState('random')
  const [environment, setEnvironment] = useState('random')
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [encounter, setEncounter] = useState<EncounterData | null>(null)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showRawResponse, setShowRawResponse] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  // Track if user has made an explicit campaign selection
  const hasUserSelectedCampaign = useRef(false)

  // AI settings for controlling token generation
  const [aiSettings, setAiSettings] = useState<AIGenerationSettings>({
    detailLevel: 'high',
    timeout: 120,
  })

  const { fetchCampaigns, activeCampaignId } = useCampaignStore()

  // Fetch campaigns on mount
  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  // Auto-select active campaign ONLY on initial mount (not after user interaction)
  useEffect(() => {
    if (activeCampaignId && !hasUserSelectedCampaign.current) {
      setCampaignId(activeCampaignId)
    }
  }, [activeCampaignId])

  const handleGenerate = async () => {
    setLoading(true)
    setError('')
    setEncounter(null)
    setShowRawResponse(false)
    setIsSaved(false)

    try {
      const data = await generateEncounterApi(
        {
          campaign_id: campaignId || undefined,
          party_level: typeof partyLevel === 'number' ? partyLevel : 5,
          party_size: typeof partySize === 'number' ? partySize : 4,
          difficulty: difficulty || 'medium',
          environment: environment !== 'random' ? environment : 'random',
          special_requests: specialRequests || undefined,
          max_tokens: getMaxTokensFromSettings(aiSettings),
          timeout: aiSettings.timeout,
        },
        aiSettings.timeout
      )
      logger.debug('[EncounterBuilder] Raw API response:', data)

      // Normalize the response to handle missing/unexpected fields
      if (data.encounter) {
        const normalized = normalizeEncounterResponse(data.encounter)

        // Check if we got valid encounter content
        if (!hasValidEncounterContent(normalized)) {
          normalized._parseError =
            'AI response missing essential encounter content. Showing raw response.'
          setShowRawResponse(true)
        }

        setEncounter(normalized)
      } else {
        // No encounter wrapper - try to normalize the raw response
        const normalized = normalizeEncounterResponse(data as unknown as Record<string, unknown>)
        normalized._parseError = 'Unexpected response format. Attempting to display.'
        setShowRawResponse(true)
        setEncounter(normalized)
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!encounter) return

    setError('')

    try {
      const activeCampaignId = useCampaignStore.getState().activeCampaignId

      await saveEncounterApi({
        name: encounter.name || 'Unnamed Encounter',
        party_level: typeof partyLevel === 'number' ? partyLevel : 5,
        party_size: typeof partySize === 'number' ? partySize : 4,
        difficulty: encounter.difficulty || difficulty,
        description: encounter.description,
        environment: encounter.environment,
        creatures: encounter.creatures,
        treasure: encounter.treasure,
        xp_total: encounter.xp_total,
        xp_per_player: encounter.xp_per_player,
        notes: encounter.expected_duration
          ? `Expected Duration: ${encounter.expected_duration}`
          : '',
        campaign_id: activeCampaignId || undefined,
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
    if (!encounter) return
    let text = `${encounter.name}\n${encounter.difficulty} Encounter\n\n${encounter.description}`

    if (encounter.environment.setting) {
      text += `\n\nEnvironment: ${encounter.environment.setting}`
    }
    if (encounter.environment.lighting) {
      text += `\nLighting: ${encounter.environment.lighting}`
    }
    if (encounter.environment.features.length > 0) {
      text += `\n\nEnvironmental Features:\n${encounter.environment.features.map((f) => `- ${f}`).join('\n')}`
    }

    if (encounter.creatures.length > 0) {
      text += '\n\nCreatures:'
      encounter.creatures.forEach((creature) => {
        text += `\n\n${creature.count}x ${creature.name} (CR ${creature.cr})`
        if (creature.role) text += `\nRole: ${creature.role}`
        if (creature.tactics) text += `\nTactics: ${creature.tactics}`
      })
    }

    if (encounter.xp_total > 0) {
      text += `\n\nXP Total: ${encounter.xp_total.toLocaleString()}`
    }
    if (encounter.xp_per_player > 0) {
      text += `\nXP per Player: ${encounter.xp_per_player.toLocaleString()}`
    }
    if (encounter.expected_duration) {
      text += `\n\nExpected Duration: ${encounter.expected_duration}`
    }

    if (encounter.treasure.coins && Object.keys(encounter.treasure.coins).length > 0) {
      text += '\n\nTreasure (Coins):'
      Object.entries(encounter.treasure.coins).forEach(([type, amount]) => {
        text += `\n${amount} ${type}`
      })
    }

    if (encounter.treasure.items && encounter.treasure.items.length > 0) {
      text += '\n\nTreasure (Items):'
      encounter.treasure.items.forEach((item) => {
        text += `\n- ${item}`
      })
    }

    navigator.clipboard.writeText(text)
  }

  const formContent = (
    <>
      <AISettings generatorType="encounter" onSettingsChange={setAiSettings} />
      <CampaignSelector
        selectedCampaignId={campaignId}
        onSelect={(id) => {
          hasUserSelectedCampaign.current = true
          setCampaignId(id)
        }}
      />

      <FormField label="Party Level" description="Average level of the party">
        <input
          type="number"
          min="1"
          max="20"
          value={partyLevel}
          onChange={(e) => setPartyLevel(e.target.value ? parseInt(e.target.value) : '')}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      <FormField label="Party Size" description="Number of players">
        <input
          type="number"
          min="1"
          max="10"
          value={partySize}
          onChange={(e) => setPartySize(e.target.value ? parseInt(e.target.value) : '')}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      <FormField label="Difficulty">
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="easy">Easy (low risk)</option>
          <option value="medium">Medium (balanced)</option>
          <option value="hard">Hard (challenging)</option>
          <option value="deadly">Deadly (extreme risk)</option>
        </select>
      </FormField>

      <FormField label="Encounter Type">
        <select
          value={encounterType}
          onChange={(e) => setEncounterType(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="random">Random</option>
          <option value="combat">Combat</option>
          <option value="social">Social</option>
          <option value="exploration">Exploration</option>
          <option value="puzzle">Puzzle</option>
          <option value="mixed">Mixed</option>
        </select>
      </FormField>

      <FormField label="Environment">
        <select
          value={environment}
          onChange={(e) => setEnvironment(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="random">Random</option>
          <option value="dungeon">Dungeon</option>
          <option value="forest">Forest</option>
          <option value="mountain">Mountain</option>
          <option value="swamp">Swamp</option>
          <option value="desert">Desert</option>
          <option value="urban">Urban</option>
          <option value="aquatic">Aquatic</option>
          <option value="arctic">Arctic</option>
          <option value="planar">Planar</option>
        </select>
      </FormField>

      <FormField label="Special Requests" description="(optional)">
        <textarea
          value={specialRequests}
          onChange={(e) => setSpecialRequests(e.target.value)}
          placeholder="e.g., 'Include a trap involving poison darts' or 'The enemies should use stealth tactics' or 'Add environmental hazards'"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={3}
        />
      </FormField>
    </>
  )

  const generatedContent = encounter ? (
    <div className="space-y-6">
      {/* Parse warning */}
      {encounter._parseError && (
        <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-400 font-semibold mb-2">
            <Icon name="AlertCircle" className="w-5 h-5" />
            Response Format Warning
          </div>
          <p className="text-text-muted text-sm">{encounter._parseError}</p>
        </div>
      )}

      {/* Header - styled like Monster/NPC */}
      <div>
        <h2 className="text-2xl font-bold text-primary">{encounter.name}</h2>
        <p className="text-sm text-text-muted capitalize">{encounter.difficulty} Encounter</p>
      </div>

      {/* Description - with colored border card */}
      {encounter.description && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="FileText" className="w-5 h-5 text-primary" />
            Description
          </h3>
          <div className="bg-background p-4 rounded border border-primary/30">
            <p className="text-text whitespace-pre-line">{encounter.description}</p>
          </div>
        </div>
      )}

      {/* Environment - styled with green accent */}
      {(encounter.environment.setting || encounter.environment.features.length > 0) && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Map" className="w-5 h-5 text-green-400" />
            Environment
          </h3>
          <div className="bg-green-500/10 p-4 rounded border border-green-500/30 space-y-2">
            {encounter.environment.setting && (
              <p className="text-text">
                <strong className="text-green-400">Setting:</strong> {encounter.environment.setting}
              </p>
            )}
            {encounter.environment.lighting && (
              <p className="text-text">
                <strong className="text-green-400">Lighting:</strong>{' '}
                {encounter.environment.lighting}
              </p>
            )}
            {encounter.environment.features.length > 0 && (
              <div className="mt-2">
                <strong className="text-green-400">Environmental Features:</strong>
                <ul className="mt-1 space-y-1">
                  {encounter.environment.features.map((feature, idx) => (
                    <li key={idx} className="text-text flex items-start gap-2">
                      <span className="text-green-400">•</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Creatures - styled with red accent like Monster Actions */}
      {encounter.creatures.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Skull" className="w-5 h-5 text-red-400" />
            Creatures
          </h3>
          <div className="space-y-3">
            {encounter.creatures.map((creature, idx) => (
              <div key={idx} className="bg-red-500/10 p-4 rounded border border-red-500/30">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="text-lg font-medium text-red-400">
                      {creature.count}x {creature.name}
                    </h4>
                    <p className="text-sm text-text-muted">CR {creature.cr}</p>
                  </div>
                  {creature.role && (
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-sm font-medium">
                      {creature.role}
                    </span>
                  )}
                </div>
                {creature.tactics && (
                  <p className="text-text text-sm">
                    <strong className="text-red-400">Tactics:</strong> {creature.tactics}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* XP - styled stat cards like Monster */}
      {(encounter.xp_total > 0 || encounter.xp_per_player > 0) && (
        <div className="grid md:grid-cols-2 gap-3">
          {encounter.xp_total > 0 && (
            <div className="bg-background p-3 rounded border border-border">
              <p className="text-xs text-text-muted mb-1">XP Total</p>
              <p className="text-xl font-bold text-amber-400">
                {encounter.xp_total.toLocaleString()}
              </p>
            </div>
          )}
          {encounter.xp_per_player > 0 && (
            <div className="bg-background p-3 rounded border border-border">
              <p className="text-xs text-text-muted mb-1">XP per Player</p>
              <p className="text-xl font-bold text-amber-400">
                {encounter.xp_per_player.toLocaleString()}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Treasure - styled with amber/gold accent */}
      {(Object.keys(encounter.treasure.coins).length > 0 ||
        encounter.treasure.items.length > 0) && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Sparkles" className="w-5 h-5 text-amber-400" />
            Treasure
          </h3>
          {Object.keys(encounter.treasure.coins).length > 0 && (
            <div className="mb-3">
              <h4 className="font-medium text-amber-400 mb-2">Coins</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(encounter.treasure.coins).map(([type, amount]) => (
                  <div
                    key={type}
                    className="bg-amber-500/10 border border-amber-500/30 rounded p-2"
                  >
                    <span className="text-amber-400 font-medium">
                      {amount} <span className="text-text-muted uppercase">{type}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {encounter.treasure.items.length > 0 && (
            <div>
              <h4 className="font-medium text-amber-400 mb-2">Items</h4>
              <ul className="space-y-1">
                {encounter.treasure.items.map((item, idx) => (
                  <li key={idx} className="text-text flex items-start gap-2">
                    <span className="text-amber-400">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Expected Duration - styled info card */}
      {encounter.expected_duration && (
        <div className="bg-background p-4 rounded border border-primary/30">
          <p className="text-text">
            <strong className="text-primary">Expected Duration:</strong>{' '}
            {encounter.expected_duration}
          </p>
        </div>
      )}

      {/* Raw/unexpected fields - collapsible */}
      {encounter._raw && Object.keys(encounter._raw).length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setShowRawResponse(!showRawResponse)}
            className="w-full px-4 py-3 bg-background-panel flex items-center justify-between text-left hover:bg-tavern-dark transition-colors"
          >
            <span className="flex items-center gap-2 text-text-muted">
              <Icon name="FileText" className="w-5 h-5" />
              Additional AI Response Data ({Object.keys(encounter._raw).length} fields)
            </span>
            <Icon
              name={showRawResponse ? 'ChevronUp' : 'ChevronDown'}
              className="w-5 h-5 text-text-muted"
            />
          </button>
          {showRawResponse && (
            <div className="p-4 bg-background border-t border-border">
              <pre className="text-xs text-text-muted overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(encounter._raw, null, 2)}
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
        title="Encounter Builder"
        description="Create balanced combat encounters with creatures, environment, and treasure"
        icon="Swords"
        formTitle="Encounter Parameters"
        formIcon="Settings"
        resultsTitle="Generated Encounter"
        formContent={formContent}
        generatedContent={generatedContent}
        isGenerating={loading}
        onGenerate={handleGenerate}
        generateButtonText="Generate Encounter"
        error={error}
      />

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background-panel rounded-lg border border-border max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-text mb-4">Save Encounter</h3>
            <p className="text-text-muted mb-6">
              Save "{encounter?.name}" to your campaign for future reference?
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
                onClick={handleSave}
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
