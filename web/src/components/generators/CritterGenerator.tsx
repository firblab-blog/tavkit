import { useState, useEffect, useRef } from 'react'
import { GeneratorLayout } from './GeneratorLayout'
import { FormField } from '@/components/ui/FormField'
import { ActionsBar } from '@/components/ui/ActionsBar'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'
import { useCampaignStore } from '../../store/campaignStore'
import Icon from '../common/Icon'
import CampaignSelector from '../common/CampaignSelector'
import AISettings, { AIGenerationSettings, getMaxTokensFromSettings } from './AISettings'
import { emitContentSaved } from '@/lib/contentEvents'
import { EntryModeToggle, type EntryMode } from './shared/EntryModeToggle'
import { ArrayFieldEditor, ObjectArrayEditor, AbilityScoresEditor } from './shared/fields'
import { SaveModal, ParseWarning, RawDataViewer, ManualEntryPreview } from './shared'
import {
  defaultCritterData,
  critterTypeOptions,
  sizeOptions,
  temperamentOptions,
  habitatOptions,
  type ManualCritterData,
} from './shared/schemas/critterSchema'
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

function normalizeSpecialAbility(value: unknown): SpecialAbility | null {
  if (!value) return null
  if (typeof value === 'string') return { name: value, description: '' }
  if (typeof value === 'object' && value !== null) {
    const ability = value as Record<string, unknown>
    return {
      name: String(ability.name || ability.title || ability.ability || 'Unknown Ability'),
      description: String(ability.description || ability.desc || ability.effect || ''),
    }
  }
  return null
}

function normalizeSpecialAbilities(value: unknown): SpecialAbility[] {
  if (!value || !Array.isArray(value)) return []
  return value
    .map((ability) => normalizeSpecialAbility(ability))
    .filter((ability): ability is SpecialAbility => ability !== null)
}

function normalizeCritterResponse(raw: Record<string, unknown>): CritterData {
  logger.debug('[CritterGenerator] normalizeCritterResponse input:', raw)

  let processedRaw = raw
  if (raw.description && typeof raw.description === 'string') {
    const descStr = (raw.description as string).trim()
    if (descStr.startsWith('{') && descStr.endsWith('}')) {
      try {
        const parsedCritter = JSON.parse(descStr)
        processedRaw = parsedCritter
      } catch (e) {
        logger.warn('[CritterGenerator] Failed to parse description as JSON:', e)
      }
    }
  }

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

  const unexpectedFields: Record<string, unknown> = {}
  for (const key of Object.keys(processedRaw)) {
    if (!expectedFields.includes(key)) {
      unexpectedFields[key] = processedRaw[key]
    }
  }

  let description = ''
  if (processedRaw.description && typeof processedRaw.description === 'string') {
    const descText = processedRaw.description as string
    if (!descText.trim().startsWith('{')) {
      description = descText
    }
  }

  let specialAbilities = normalizeSpecialAbilities(processedRaw.special_abilities)
  if (specialAbilities.length === 0) {
    specialAbilities = normalizeSpecialAbilities(processedRaw.abilities || processedRaw.traits)
  }

  let uses = normalizeStringArray(processedRaw.uses)
  if (uses.length === 0) {
    uses = normalizeStringArray(processedRaw.purposes || processedRaw.utility)
  }

  let interestingFacts = normalizeStringArray(processedRaw.interesting_facts)
  if (interestingFacts.length === 0) {
    interestingFacts = normalizeStringArray(processedRaw.facts || processedRaw.trivia)
  }

  return {
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
}

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
  // Entry mode
  const [entryMode, setEntryMode] = useState<EntryMode>('ai')

  // Manual entry state
  const [manualData, setManualData] = useState<ManualCritterData>(defaultCritterData)
  const [manualSaving, setManualSaving] = useState(false)
  const [manualSaved, setManualSaved] = useState(false)

  // AI generation state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [critter, setCritter] = useState<CritterData | null>(null)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showRawResponse, setShowRawResponse] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const { activeCampaignId } = useCampaignStore()

  const hasUserSelectedCampaign = useRef(false)

  useEffect(() => {
    if (activeCampaignId && !hasUserSelectedCampaign.current) {
      setCampaignId(activeCampaignId)
    }
  }, [activeCampaignId])

  useEffect(() => {
    setManualSaved(false)
  }, [entryMode, manualData])

  // AI form inputs
  const [critterType, setCritterType] = useState('mammal')
  const [size, setSize] = useState('medium')
  const [temperament, setTemperament] = useState('neutral')
  const [habitat, setHabitat] = useState('forest')
  const [specialRequests, setSpecialRequests] = useState('')
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

      if (data.critter) {
        const normalized = normalizeCritterResponse(data.critter)
        if (!hasValidCritterContent(normalized)) {
          normalized._parseError =
            'AI response missing essential critter content. Showing raw response.'
          setShowRawResponse(true)
        }
        setCritter(normalized)
      } else {
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

  const handleManualSave = async () => {
    if (!manualData.name.trim()) return

    setManualSaving(true)
    setError(null)

    try {
      await saveCritterApi({
        name: manualData.name,
        species: manualData.species || '',
        critter_type: manualData.critter_type,
        size: manualData.size,
        temperament: manualData.temperament,
        habitat: manualData.habitat,
        description: manualData.description || '',
        behavior: manualData.behavior || '',
        stats: manualData.stats || {},
        special_abilities: manualData.special_abilities || [],
        uses: manualData.uses || [],
        training_difficulty: manualData.training_difficulty || '',
        diet: manualData.diet || '',
        lifespan: manualData.lifespan || '',
        interesting_facts: manualData.interesting_facts || [],
        encounter_notes: manualData.encounter_notes || '',
        campaign_id: campaignId || undefined,
        ai_generated: false,
      })

      setManualSaved(true)
      emitContentSaved()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setManualSaving(false)
    }
  }

  const handleManualReset = () => {
    setManualData(defaultCritterData)
    setManualSaved(false)
    setError(null)
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

  // AI Form content
  const aiFormContent = (
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
          {critterTypeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Size">
        <select
          value={size}
          onChange={(e) => setSize(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {sizeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Temperament">
        <select
          value={temperament}
          onChange={(e) => setTemperament(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {temperamentOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Habitat">
        <select
          value={habitat}
          onChange={(e) => setHabitat(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {habitatOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
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

  // Manual entry form content
  const manualFormContent = (
    <>
      <CampaignSelector
        selectedCampaignId={campaignId}
        onSelect={(id) => {
          hasUserSelectedCampaign.current = true
          setCampaignId(id)
        }}
      />

      {/* Basic Information */}
      <FormField label="Critter Name" required>
        <input
          type="text"
          value={manualData.name}
          onChange={(e) => setManualData({ ...manualData, name: e.target.value })}
          placeholder="e.g., 'Glimmerwing', 'Forest Prowler'"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      <FormField label="Species" description="Scientific or common species name">
        <input
          type="text"
          value={manualData.species}
          onChange={(e) => setManualData({ ...manualData, species: e.target.value })}
          placeholder="e.g., 'Felis luminosa', 'Giant Beetle'"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Type">
          <select
            value={manualData.critter_type}
            onChange={(e) => setManualData({ ...manualData, critter_type: e.target.value })}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {critterTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Size">
          <select
            value={manualData.size}
            onChange={(e) => setManualData({ ...manualData, size: e.target.value })}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {sizeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Temperament">
          <select
            value={manualData.temperament}
            onChange={(e) => setManualData({ ...manualData, temperament: e.target.value })}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {temperamentOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Habitat">
          <select
            value={manualData.habitat}
            onChange={(e) => setManualData({ ...manualData, habitat: e.target.value })}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {habitatOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField label="Description">
        <textarea
          value={manualData.description}
          onChange={(e) => setManualData({ ...manualData, description: e.target.value })}
          placeholder="Physical appearance, coloring, distinguishing features..."
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={3}
        />
      </FormField>

      <FormField label="Behavior">
        <textarea
          value={manualData.behavior}
          onChange={(e) => setManualData({ ...manualData, behavior: e.target.value })}
          placeholder="How it acts, hunting patterns, social structure..."
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={2}
        />
      </FormField>

      {/* Stats Section */}
      <CollapsibleSection title="Stats" icon="Shield" defaultExpanded={false}>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <FormField label="AC">
              <input
                type="number"
                value={manualData.stats.ac ?? ''}
                onChange={(e) =>
                  setManualData({
                    ...manualData,
                    stats: {
                      ...manualData.stats,
                      ac: e.target.value ? parseInt(e.target.value) : null,
                    },
                  })
                }
                placeholder="-"
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </FormField>
            <FormField label="HP">
              <input
                type="number"
                value={manualData.stats.hp ?? ''}
                onChange={(e) =>
                  setManualData({
                    ...manualData,
                    stats: {
                      ...manualData.stats,
                      hp: e.target.value ? parseInt(e.target.value) : null,
                    },
                  })
                }
                placeholder="-"
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </FormField>
            <FormField label="Speed">
              <input
                type="text"
                value={manualData.stats.speed}
                onChange={(e) =>
                  setManualData({
                    ...manualData,
                    stats: { ...manualData.stats, speed: e.target.value },
                  })
                }
                placeholder="30 ft."
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </FormField>
          </div>

          <AbilityScoresEditor
            values={manualData.stats}
            onChange={(stats) =>
              setManualData({ ...manualData, stats: { ...manualData.stats, ...stats } })
            }
          />
        </div>
      </CollapsibleSection>

      {/* Special Abilities */}
      <CollapsibleSection title="Special Abilities" icon="Sparkles" defaultExpanded={false}>
        <ObjectArrayEditor
          label=""
          values={manualData.special_abilities.map((a) => ({
            name: a.name,
            description: a.description,
          }))}
          onChange={(abilities) =>
            setManualData({
              ...manualData,
              special_abilities: abilities.map((a) => ({
                name: a.name,
                description: a.description,
              })),
            })
          }
          nameLabel="Ability Name"
          descriptionLabel="Effect"
          namePlaceholder="e.g., 'Keen Senses'"
          descriptionPlaceholder="What this ability does..."
        />
      </CollapsibleSection>

      {/* Uses */}
      <CollapsibleSection title="Potential Uses" icon="Wrench" defaultExpanded={false}>
        <ArrayFieldEditor
          label=""
          values={manualData.uses}
          onChange={(uses) => setManualData({ ...manualData, uses })}
          placeholder="Add a use..."
          description="How adventurers might use this critter"
        />
      </CollapsibleSection>

      {/* Additional Details */}
      <CollapsibleSection title="Additional Details" icon="FileText" defaultExpanded={false}>
        <div className="space-y-4">
          <FormField label="Training Difficulty">
            <input
              type="text"
              value={manualData.training_difficulty}
              onChange={(e) =>
                setManualData({ ...manualData, training_difficulty: e.target.value })
              }
              placeholder="e.g., 'Easy', 'Moderate', 'Nearly Impossible'"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </FormField>

          <FormField label="Diet">
            <input
              type="text"
              value={manualData.diet}
              onChange={(e) => setManualData({ ...manualData, diet: e.target.value })}
              placeholder="e.g., 'Carnivore', 'Omnivore', 'Magical energy'"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </FormField>

          <FormField label="Lifespan">
            <input
              type="text"
              value={manualData.lifespan}
              onChange={(e) => setManualData({ ...manualData, lifespan: e.target.value })}
              placeholder="e.g., '5-10 years', 'Centuries', 'Unknown'"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </FormField>

          <ArrayFieldEditor
            label="Interesting Facts"
            values={manualData.interesting_facts}
            onChange={(facts) => setManualData({ ...manualData, interesting_facts: facts })}
            placeholder="Add a fact..."
          />

          <FormField label="Encounter Notes">
            <textarea
              value={manualData.encounter_notes}
              onChange={(e) => setManualData({ ...manualData, encounter_notes: e.target.value })}
              placeholder="DM notes for encounters..."
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={2}
            />
          </FormField>
        </div>
      </CollapsibleSection>

      {/* Manual save button */}
      <button
        onClick={handleManualSave}
        disabled={!manualData.name.trim() || manualSaving || manualSaved}
        className="w-full py-3 px-6 rounded-lg font-semibold bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed text-white transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
      >
        {manualSaving ? (
          <>
            <Icon name="Loader2" className="w-5 h-5 animate-spin" />
            Saving...
          </>
        ) : manualSaved ? (
          <>
            <Icon name="Check" className="w-5 h-5" />
            Saved!
          </>
        ) : (
          <>
            <Icon name="Save" className="w-5 h-5" />
            Save Critter
          </>
        )}
      </button>

      {manualSaved && (
        <button
          onClick={handleManualReset}
          className="w-full py-2 px-4 text-sm text-text-muted hover:text-text border border-border rounded-lg transition-colors"
        >
          Create Another Critter
        </button>
      )}
    </>
  )

  const formContent = (
    <>
      <EntryModeToggle mode={entryMode} onChange={setEntryMode} disabled={loading} />
      {entryMode === 'ai' ? aiFormContent : manualFormContent}
    </>
  )

  // Manual mode: no preview needed, just show a simple message
  const manualPreviewContent = <ManualEntryPreview entityType="critter" />

  // AI generated content - keep the existing display logic
  const aiGeneratedContent = critter ? (
    <div className="space-y-6">
      {critter._parseError && <ParseWarning message={critter._parseError} />}

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

      {critter.description && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="FileText" className="w-5 h-5 text-primary" />
            Description
          </h3>
          <p className="text-text">{critter.description}</p>
        </div>
      )}

      {critter.behavior && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="BarChart3" className="w-5 h-5 text-primary" />
            Behavior
          </h3>
          <p className="text-text">{critter.behavior}</p>
        </div>
      )}

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

      {critter._raw && <RawDataViewer data={critter._raw} defaultExpanded={showRawResponse} />}

      <ActionsBar
        onCopy={handleCopy}
        onSave={isSaved ? undefined : () => setShowSaveModal(true)}
        showRegenerate={false}
        isSaved={isSaved}
      />
    </div>
  ) : null

  const generatedContent = entryMode === 'manual' ? manualPreviewContent : aiGeneratedContent

  return (
    <>
      <GeneratorLayout
        title="Critter Generator"
        description="Generate wildlife, companions, and creatures for your campaign"
        icon="PawPrint"
        formTitle={entryMode === 'ai' ? 'Critter Details' : 'Create Critter'}
        formIcon={entryMode === 'ai' ? 'Settings' : 'Pencil'}
        resultsTitle={entryMode === 'ai' ? 'Generated Critter' : 'Preview'}
        formContent={formContent}
        generatedContent={generatedContent}
        isGenerating={loading}
        onGenerate={generateCritter}
        generateButtonText="Generate Critter"
        hideGenerateButton={entryMode === 'manual'}
        error={error || undefined}
      />

      <SaveModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={saveCritter}
        entityName={critter?.name || 'Critter'}
        campaignId={campaignId}
      />
    </>
  )
}
