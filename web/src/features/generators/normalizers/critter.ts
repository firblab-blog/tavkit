// Normalizer for Critter generator responses

import { normalizeStringArray } from '@/utils/aiResponseNormalizer'
import { logger } from '@/utils/logger'

// Stats structure
export interface CritterStats {
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

// Special ability structure
export interface SpecialAbility {
  name: string
  description: string
}

// Generated critter data
export interface GeneratedCritterData {
  name: string
  species: string
  critter_type: string
  size: string
  temperament: string
  habitat: string
  description: string
  behavior: string
  stats: CritterStats
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

function normalizeStats(value: unknown): CritterStats {
  const result: CritterStats = {
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

export function normalizeCritterResponse(raw: Record<string, unknown>): GeneratedCritterData {
  logger.debug('[CritterNormalizer] normalizeCritterResponse input:', raw)

  let processedRaw = raw
  if (raw.description && typeof raw.description === 'string') {
    const descStr = (raw.description as string).trim()
    if (descStr.startsWith('{') && descStr.endsWith('}')) {
      try {
        const parsedCritter = JSON.parse(descStr)
        processedRaw = parsedCritter
      } catch (e) {
        logger.warn('[CritterNormalizer] Failed to parse description as JSON:', e)
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

export function hasValidCritterContent(critter: GeneratedCritterData): boolean {
  return !!(
    critter.name &&
    critter.name !== 'Unknown Critter' &&
    (critter.description || critter.behavior || critter.special_abilities.length > 0)
  )
}
