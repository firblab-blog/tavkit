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
  generateCritter as generateCritterApi,
  saveCritter as saveCritterApi,
  getErrorMessage,
} from '@/api/generators'
import { normalizeStringArray } from '@/utils/aiResponseNormalizer'
import { logger } from '@/utils/logger'

// Expected critter structure
interface CritterData {
  name: string
  species: string
  critter_type: string
  size: string
  temperament: string
  habitat: string
  description: string
  behavior: string
  stats: Stats
  special_abilities: SpecialAbility[]
  uses: string[]
  training_difficulty: string
  diet: string
  lifespan: string
  interesting_facts: string[]
  encounter_notes: string
  // For any unexpected fields from AI
  _raw?: Record<string, unknown>
  _parseError?: string
}

interface Stats {
  ac: number | null
  hp: number | null
  speed: string
  str: number | null
  dex: number | null
  con: number | null
  int: number | null
  wis: number | null
  cha: number | null
}

interface SpecialAbility {
  name: string
  description: string
}

/**
 * Normalize stats object
 */
function normalizeStats(value: unknown): Stats {
  const result: Stats = {
    ac: null,
    hp: null,
    speed: '',
    str: null,
    dex: null,
    con: null,
    int: null,
    wis: null,
    cha: null,
  }

  if (!value || typeof value !== 'object') return result

  const stats = value as Record<string, unknown>

  // Helper to extract number
  const toNumber = (v: unknown): number | null => {
    if (v === null || v === undefined) return null
    if (typeof v === 'number') return v
    if (typeof v === 'string') {
      const parsed = parseInt(v, 10)
      return isNaN(parsed) ? null : parsed
    }
    return null
  }

  result.ac = toNumber(stats.ac || stats.armor_class)
  result.hp = toNumber(stats.hp || stats.hit_points)
  result.speed = String(stats.speed || '')
  result.str = toNumber(stats.str || stats.strength)
  result.dex = toNumber(stats.dex || stats.dexterity)
  result.con = toNumber(stats.con || stats.constitution)
  result.int = toNumber(stats.int || stats.intelligence)
  result.wis = toNumber(stats.wis || stats.wisdom)
  result.cha = toNumber(stats.cha || stats.charisma)

  return result
}

/**
 * Normalize a single special ability
 */
function normalizeSpecialAbility(value: unknown): SpecialAbility | null {
  if (!value) return null

  if (typeof value === 'string') {
    return { name: value, description: '' }
  }

  if (typeof value === 'object' && value !== null) {
    const ability = value as Record<string, unknown>
    return {
      name: String(ability.name || ability.title || ability.ability || 'Unknown Ability'),
      description: String(ability.description || ability.desc || ability.effect || ''),
    }
  }

  return null
}

/**
 * Normalize special abilities array
 */
function normalizeSpecialAbilities(value: unknown): SpecialAbility[] {
  if (!value || !Array.isArray(value)) return []

  return value
    .map((ability) => normalizeSpecialAbility(ability))
    .filter((ability): ability is SpecialAbility => ability !== null)
}

/**
 * Main normalization function - converts raw AI response to typed CritterData
 */
function normalizeCritterResponse(raw: Record<string, unknown>): CritterData {
  logger.debug('[CritterGenerator] normalizeCritterResponse input:', raw)

  // Handle case where description contains the entire JSON response
  let processedRaw = raw
  if (raw.description && typeof raw.description === 'string') {
    const descStr = (raw.description as string).trim()
    if (descStr.startsWith('{') && descStr.endsWith('}')) {
      try {
        const parsedCritter = JSON.parse(descStr)
        logger.debug('[CritterGenerator] Parsed critter from JSON description:', parsedCritter)
        processedRaw = parsedCritter
      } catch (e) {
        logger.warn('[CritterGenerator] Failed to parse description as JSON:', e)
      }
    }
  }

  // Expected fields for tracking unexpected ones
  const expectedFields = [
    'name',
    'title',
    'creature_name',
    'species',
    'critter_type',
    'type',
    'creature_type',
    'size',
    'temperament',
    'habitat',
    'description',
    'behavior',
    'stats',
    'special_abilities',
    'abilities',
    'traits',
    'uses',
    'purposes',
    'utility',
    'training_difficulty',
    'diet',
    'lifespan',
    'interesting_facts',
    'facts',
    'trivia',
    'encounter_notes',
    'notes',
    'dm_notes',
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

  // Get special abilities from various possible field names
  let specialAbilities = normalizeSpecialAbilities(processedRaw.special_abilities)
  if (specialAbilities.length === 0) {
    specialAbilities = normalizeSpecialAbilities(processedRaw.abilities || processedRaw.traits)
  }

  // Get uses from various possible field names
  let uses = normalizeStringArray(processedRaw.uses)
  if (uses.length === 0) {
    uses = normalizeStringArray(processedRaw.purposes || processedRaw.utility)
  }

  // Get interesting_facts from various possible field names
  let interestingFacts = normalizeStringArray(processedRaw.interesting_facts)
  if (interestingFacts.length === 0) {
    interestingFacts = normalizeStringArray(processedRaw.facts || processedRaw.trivia)
  }

  const result: CritterData = {
    name: String(
      processedRaw.name || processedRaw.title || processedRaw.creature_name || 'Unknown Critter'
    ),
    species: String(processedRaw.species || ''),
    critter_type: String(
      processedRaw.critter_type || processedRaw.type || processedRaw.creature_type || ''
    ),
    size: String(processedRaw.size || ''),
    temperament: String(processedRaw.temperament || ''),
    habitat: String(processedRaw.habitat || ''),
    description: description,
    behavior: String(processedRaw.behavior || ''),
    stats: normalizeStats(processedRaw.stats),
    special_abilities: specialAbilities,
    uses: uses,
    training_difficulty: String(processedRaw.training_difficulty || ''),
    diet: String(processedRaw.diet || ''),
    lifespan: String(processedRaw.lifespan || ''),
    interesting_facts: interestingFacts,
    encounter_notes: String(
      processedRaw.encounter_notes || processedRaw.notes || processedRaw.dm_notes || ''
    ),
    _raw: Object.keys(unexpectedFields).length > 0 ? unexpectedFields : undefined,
  }

  logger.debug('[CritterGenerator] Normalized result:', result)
  return result
}

/**
 * Check if critter has valid essential content
 */
function hasValidCritterContent(critter: CritterData): boolean {
  return !!(
    critter.name &&
    critter.name !== 'Unknown Critter' &&
    (critter.description || critter.behavior || critter.special_abilities.length > 0)
  )
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function CritterGenerator() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [critter, setCritter] = useState<CritterData | null>(null)
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
  const [critterType, setCritterType] = useState('mammal')
  const [size, setSize] = useState('medium')
  const [temperament, setTemperament] = useState('neutral')
  const [habitat, setHabitat] = useState('forest')
  const [specialRequests, setSpecialRequests] = useState('')

  // AI settings
  const [aiSettings, setAiSettings] = useState<AIGenerationSettings>({
    detailLevel: 'high',
    timeout: 120,
  })

  const generateCritter = async () => {
    setLoading(true)
    setError(null)
    setCritter(null)
    setShowRawResponse(false)
    setIsSaved(false)

    try {
      const data = await generateCritterApi(
        {
          campaign_id: campaignId || undefined,
          critter_type: critterType,
          size,
          temperament,
          habitat,
          special_requests: specialRequests || undefined,
          max_tokens: getMaxTokensFromSettings(aiSettings),
          timeout: aiSettings.timeout,
        },
        aiSettings.timeout
      )
      logger.debug('[CritterGenerator] Raw API response:', data)

      // Normalize the response
      if (data.critter) {
        const normalized = normalizeCritterResponse(data.critter)

        if (!hasValidCritterContent(normalized)) {
          normalized._parseError =
            'AI response missing essential critter content. Showing raw response.'
          setShowRawResponse(true)
        }

        setCritter(normalized)
      } else {
        // No critter wrapper - try to normalize the raw response
        const normalized = normalizeCritterResponse(data as unknown as Record<string, unknown>)
        normalized._parseError = 'Unexpected response format. Attempting to display.'
        setShowRawResponse(true)
        setCritter(normalized)
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const saveCritter = async () => {
    if (!critter) return

    try {
      await saveCritterApi({
        name: critter.name || 'Unnamed Critter',
        species: critter.species || '',
        critter_type: critter.critter_type || critterType,
        size: critter.size || size,
        temperament: critter.temperament || temperament,
        habitat: critter.habitat || habitat,
        description: critter.description || '',
        behavior: critter.behavior || '',
        stats: critter.stats || {},
        special_abilities: critter.special_abilities || [],
        uses: critter.uses || [],
        training_difficulty: critter.training_difficulty || '',
        diet: critter.diet || '',
        lifespan: critter.lifespan || '',
        interesting_facts: critter.interesting_facts || [],
        encounter_notes: critter.encounter_notes || '',
        campaign_id: campaignId || undefined,
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
    if (!critter) return
    const text = `${critter.name}${critter.species ? ` (${critter.species})` : ''}
${critter.critter_type} • ${critter.size}${critter.temperament ? ` • ${critter.temperament}` : ''}${critter.habitat ? ` • ${critter.habitat}` : ''}

${critter.description || ''}

Behavior: ${critter.behavior || 'N/A'}

Stats:
${
  critter.stats
    ? `AC: ${critter.stats.ac ?? 'N/A'}, HP: ${critter.stats.hp ?? 'N/A'}, Speed: ${critter.stats.speed || 'N/A'}
Abilities: STR ${critter.stats.str ?? '-'}, DEX ${critter.stats.dex ?? '-'}, CON ${critter.stats.con ?? '-'}, INT ${critter.stats.int ?? '-'}, WIS ${critter.stats.wis ?? '-'}, CHA ${critter.stats.cha ?? '-'}`
    : 'N/A'
}

${critter.special_abilities?.length ? `Special Abilities:\n${critter.special_abilities.map((a) => `- ${a.name}: ${a.description}`).join('\n')}` : ''}

${critter.uses?.length ? `Potential Uses:\n${critter.uses.map((u) => `- ${u}`).join('\n')}` : ''}

${critter.training_difficulty ? `Training: ${critter.training_difficulty}` : ''}
${critter.diet ? `Diet: ${critter.diet}` : ''}
${critter.lifespan ? `Lifespan: ${critter.lifespan}` : ''}

${critter.interesting_facts?.length ? `Interesting Facts:\n${critter.interesting_facts.map((f) => `- ${f}`).join('\n')}` : ''}

${critter.encounter_notes ? `Encounter Notes: ${critter.encounter_notes}` : ''}`
    navigator.clipboard.writeText(text)
  }

  const formContent = (
    <>
      <AISettings generatorType="critter" onSettingsChange={setAiSettings} />
      <CampaignSelector
        selectedCampaignId={campaignId}
        onSelect={(id) => {
          hasUserSelectedCampaign.current = true
          setCampaignId(id)
        }}
      />

      <FormField label="Type of Critter">
        <select
          value={critterType}
          onChange={(e) => setCritterType(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="bird">Bird</option>
          <option value="mammal">Mammal</option>
          <option value="reptile">Reptile</option>
          <option value="amphibian">Amphibian</option>
          <option value="insect">Insect</option>
          <option value="aquatic">Aquatic</option>
          <option value="magical">Magical</option>
          <option value="hybrid">Hybrid</option>
        </select>
      </FormField>

      <FormField label="Size">
        <select
          value={size}
          onChange={(e) => setSize(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="tiny">Tiny</option>
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
          <option value="huge">Huge</option>
        </select>
      </FormField>

      <FormField label="Temperament">
        <select
          value={temperament}
          onChange={(e) => setTemperament(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="docile">Docile</option>
          <option value="neutral">Neutral</option>
          <option value="skittish">Skittish</option>
          <option value="territorial">Territorial</option>
          <option value="aggressive">Aggressive</option>
          <option value="curious">Curious</option>
        </select>
      </FormField>

      <FormField label="Habitat">
        <select
          value={habitat}
          onChange={(e) => setHabitat(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="forest">Forest</option>
          <option value="mountain">Mountain</option>
          <option value="desert">Desert</option>
          <option value="swamp">Swamp</option>
          <option value="plains">Plains</option>
          <option value="arctic">Arctic</option>
          <option value="underground">Underground</option>
          <option value="coastal">Coastal</option>
          <option value="urban">Urban</option>
        </select>
      </FormField>

      <FormField label="Special Requests" description="(optional)">
        <textarea
          value={specialRequests}
          onChange={(e) => setSpecialRequests(e.target.value)}
          placeholder="e.g., 'Can be trained as a mount' or 'Has bioluminescence' or 'Native to the Feywild'"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={3}
        />
      </FormField>
    </>
  )

  const generatedContent = critter ? (
    <div className="space-y-6">
      {/* Parse warning */}
      {critter._parseError && (
        <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-400 font-semibold mb-2">
            <Icon name="AlertCircle" className="w-5 h-5" />
            Response Format Warning
          </div>
          <p className="text-text-muted text-sm">{critter._parseError}</p>
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-primary">
          {critter.name}
          {critter.species && (
            <span className="text-text-muted font-normal"> ({critter.species})</span>
          )}
        </h2>
        <p className="text-sm text-text-muted capitalize">
          {critter.critter_type} • {critter.size}
          {critter.temperament && ` • ${critter.temperament}`}
          {critter.habitat && ` • ${critter.habitat}`}
        </p>
      </div>

      {/* Description */}
      {critter.description && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="FileText" className="w-5 h-5 text-primary" />
            Description
          </h3>
          <p className="text-text">{critter.description}</p>
        </div>
      )}

      {/* Behavior */}
      {critter.behavior && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="BarChart3" className="w-5 h-5 text-primary" />
            Behavior
          </h3>
          <p className="text-text">{critter.behavior}</p>
        </div>
      )}

      {/* Stats */}
      {critter.stats &&
        (critter.stats.ac !== null || critter.stats.hp !== null || critter.stats.speed) && (
          <div>
            <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
              <Icon name="Shield" className="w-5 h-5 text-primary" />
              Stats
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {critter.stats.ac !== null && (
                <div className="bg-background p-3 rounded border border-border">
                  <p className="text-xs text-text-muted mb-1">Armor Class</p>
                  <p className="text-xl font-bold text-primary">{critter.stats.ac}</p>
                </div>
              )}
              {critter.stats.hp !== null && (
                <div className="bg-background p-3 rounded border border-border">
                  <p className="text-xs text-text-muted mb-1">Hit Points</p>
                  <p className="text-xl font-bold text-red-400">{critter.stats.hp}</p>
                </div>
              )}
              {critter.stats.speed && (
                <div className="bg-background p-3 rounded border border-border">
                  <p className="text-xs text-text-muted mb-1">Speed</p>
                  <p className="text-xl font-bold text-blue-400">{critter.stats.speed}</p>
                </div>
              )}
            </div>

            {/* Ability Scores */}
            {(critter.stats.str !== null ||
              critter.stats.dex !== null ||
              critter.stats.con !== null ||
              critter.stats.int !== null ||
              critter.stats.wis !== null ||
              critter.stats.cha !== null) && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3">
                {critter.stats.str !== null && (
                  <div className="bg-background p-2 rounded border border-border text-center">
                    <p className="text-xs text-text-muted mb-1">STR</p>
                    <p className="text-lg font-bold text-text">{critter.stats.str}</p>
                  </div>
                )}
                {critter.stats.dex !== null && (
                  <div className="bg-background p-2 rounded border border-border text-center">
                    <p className="text-xs text-text-muted mb-1">DEX</p>
                    <p className="text-lg font-bold text-text">{critter.stats.dex}</p>
                  </div>
                )}
                {critter.stats.con !== null && (
                  <div className="bg-background p-2 rounded border border-border text-center">
                    <p className="text-xs text-text-muted mb-1">CON</p>
                    <p className="text-lg font-bold text-text">{critter.stats.con}</p>
                  </div>
                )}
                {critter.stats.int !== null && (
                  <div className="bg-background p-2 rounded border border-border text-center">
                    <p className="text-xs text-text-muted mb-1">INT</p>
                    <p className="text-lg font-bold text-text">{critter.stats.int}</p>
                  </div>
                )}
                {critter.stats.wis !== null && (
                  <div className="bg-background p-2 rounded border border-border text-center">
                    <p className="text-xs text-text-muted mb-1">WIS</p>
                    <p className="text-lg font-bold text-text">{critter.stats.wis}</p>
                  </div>
                )}
                {critter.stats.cha !== null && (
                  <div className="bg-background p-2 rounded border border-border text-center">
                    <p className="text-xs text-text-muted mb-1">CHA</p>
                    <p className="text-lg font-bold text-text">{critter.stats.cha}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      {/* Special Abilities */}
      {critter.special_abilities.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Sparkles" className="w-5 h-5 text-primary" />
            Special Abilities
          </h3>
          <div className="space-y-3">
            {critter.special_abilities.map((ability, idx) => (
              <div key={idx} className="bg-background p-4 rounded border border-primary/30">
                <h4 className="font-medium text-primary mb-2">{ability.name}</h4>
                {ability.description && <p className="text-text text-sm">{ability.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uses */}
      {critter.uses.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Wrench" className="w-5 h-5 text-primary" />
            Potential Uses
          </h3>
          <ul className="space-y-2">
            {critter.uses.map((use, idx) => (
              <li key={idx} className="flex items-start gap-2 text-text">
                <Icon name="ChevronRight" className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>{use}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Training, Diet, Lifespan Grid */}
      {(critter.training_difficulty || critter.diet || critter.lifespan) && (
        <div className="grid md:grid-cols-3 gap-4">
          {critter.training_difficulty && (
            <div>
              <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
                <Icon name="Shield" className="w-5 h-5 text-primary" />
                Training
              </h3>
              <p className="text-text">{critter.training_difficulty}</p>
            </div>
          )}
          {critter.diet && (
            <div>
              <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
                <Icon name="Package" className="w-5 h-5 text-primary" />
                Diet
              </h3>
              <p className="text-text">{critter.diet}</p>
            </div>
          )}
          {critter.lifespan && (
            <div>
              <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
                <Icon name="Clock" className="w-5 h-5 text-primary" />
                Lifespan
              </h3>
              <p className="text-text">{critter.lifespan}</p>
            </div>
          )}
        </div>
      )}

      {/* Interesting Facts */}
      {critter.interesting_facts.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="BookOpen" className="w-5 h-5 text-primary" />
            Interesting Facts
          </h3>
          <ul className="space-y-2">
            {critter.interesting_facts.map((fact, idx) => (
              <li key={idx} className="flex items-start gap-2 text-text">
                <span className="text-primary mt-0.5">•</span>
                <span>{fact}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Encounter Notes */}
      {critter.encounter_notes && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="MessageSquare" className="w-5 h-5 text-primary" />
            Encounter Notes
          </h3>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <p className="text-text">{critter.encounter_notes}</p>
          </div>
        </div>
      )}

      {/* Raw/unexpected fields - collapsible */}
      {critter._raw && Object.keys(critter._raw).length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setShowRawResponse(!showRawResponse)}
            className="w-full px-4 py-3 bg-background-panel flex items-center justify-between text-left hover:bg-tavern-dark transition-colors"
          >
            <span className="flex items-center gap-2 text-text-muted">
              <Icon name="FileText" className="w-5 h-5" />
              Additional AI Response Data ({Object.keys(critter._raw).length} fields)
            </span>
            <Icon
              name={showRawResponse ? 'ChevronUp' : 'ChevronDown'}
              className="w-5 h-5 text-text-muted"
            />
          </button>
          {showRawResponse && (
            <div className="p-4 bg-background border-t border-border">
              <pre className="text-xs text-text-muted overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(critter._raw, null, 2)}
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
        title="Critter Generator"
        description="Generate wildlife, companions, and creatures for your campaign"
        icon="PawPrint"
        formTitle="Critter Details"
        formIcon="Settings"
        resultsTitle="Generated Critter"
        formContent={formContent}
        generatedContent={generatedContent}
        isGenerating={loading}
        onGenerate={generateCritter}
        generateButtonText="Generate Critter"
        error={error || undefined}
      />

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background-panel rounded-lg border border-border p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-text mb-4">Save Critter</h3>
            <p className="text-text-muted mb-6">
              Save this critter to your collection?{' '}
              {campaignId && 'It will be linked to your selected campaign.'}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-text hover:bg-background-panel transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveCritter}
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
