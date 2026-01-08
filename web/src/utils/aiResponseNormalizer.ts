/**
 * AI Response Normalizer
 *
 * Utilities for safely parsing and normalizing AI-generated content.
 * Prevents crashes from missing or malformed data while preserving unexpected fields.
 */

// Type for any raw AI response
export type RawAIResponse = Record<string, unknown>

// Base interface for all normalized responses
export interface NormalizedResponse {
  _raw?: Record<string, unknown> // Unexpected fields
  _parseError?: string // Parse/validation warnings
  _provider?: string // Which AI provider generated this
}

/**
 * Safely extract a string value from an object
 */
export function getString(obj: unknown, ...keys: string[]): string {
  if (typeof obj !== 'object' || obj === null) return ''

  const record = obj as Record<string, unknown>
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) {
      return String(record[key])
    }
  }
  return ''
}

/**
 * Safely extract a number value from an object
 */
export function getNumber(obj: unknown, key: string, defaultValue: number = 0): number {
  if (typeof obj !== 'object' || obj === null) return defaultValue

  const record = obj as Record<string, unknown>
  const value = record[key]
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? defaultValue : parsed
  }
  return defaultValue
}

/**
 * Safely extract a boolean value from an object
 */
export function getBoolean(obj: unknown, key: string, defaultValue: boolean = false): boolean {
  if (typeof obj !== 'object' || obj === null) return defaultValue

  const record = obj as Record<string, unknown>
  const value = record[key]
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value.toLowerCase() === 'true'
  return defaultValue
}

/**
 * Safely extract an array of strings from an object
 */
export function getStringArray(obj: unknown, ...keys: string[]): string[] | undefined {
  if (typeof obj !== 'object' || obj === null) return undefined

  const record = obj as Record<string, unknown>
  for (const key of keys) {
    const value = record[key]
    if (Array.isArray(value)) {
      return value.map((item) => String(item)).filter(Boolean)
    }
  }
  return undefined
}

/**
 * Normalizes any value to a string array
 * Handles: null, undefined, string (comma-separated), array of strings, array of objects
 * This is a more flexible version used by generators to handle varied AI responses
 */
export function normalizeToStringArray(value: unknown): string[] {
  if (!value) return []

  // Already an array
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item
        if (typeof item === 'object' && item !== null) {
          const obj = item as Record<string, unknown>
          // Try to extract meaningful text from object
          if (obj.text) return String(obj.text)
          if (obj.description) return String(obj.description)
          if (obj.name) {
            let str = String(obj.name)
            if (obj.role) str += ` - ${obj.role}`
            if (obj.description) str += `: ${obj.description}`
            return str
          }
          return JSON.stringify(obj)
        }
        return String(item)
      })
      .filter(Boolean)
  }

  // String - might be comma-separated or newline-separated
  if (typeof value === 'string') {
    if (!value.trim()) return []
    return value
      .split(/[,\n]+/)
      .map((s) => s.trim())
      .filter(Boolean)
  }

  // Single non-string value
  return [String(value)]
}

/**
 * Flatten categorized data (e.g., equipment returned as { Weapons: [...], Armor: [...] })
 */
export function flattenCategorizedArray(value: unknown): string[] {
  if (!value) return []

  if (Array.isArray(value)) {
    return normalizeToStringArray(value)
  }

  if (typeof value === 'object' && value !== null) {
    const catMap = value as Record<string, unknown>
    const result: string[] = []
    for (const items of Object.values(catMap)) {
      if (Array.isArray(items)) {
        result.push(...normalizeToStringArray(items))
      } else if (typeof items === 'string') {
        result.push(items)
      }
    }
    return result
  }

  if (typeof value === 'string') {
    return [value]
  }

  return []
}

/**
 * Safely extract an object from a parent object
 */
export function getObject(obj: unknown, key: string): Record<string, unknown> | undefined {
  if (typeof obj !== 'object' || obj === null) return undefined

  const record = obj as Record<string, unknown>
  const value = record[key]
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return undefined
}

/**
 * Safely extract an array from an object
 */
export function getArray(obj: unknown, key: string): unknown[] | undefined {
  if (typeof obj !== 'object' || obj === null) return undefined

  const record = obj as Record<string, unknown>
  const value = record[key]
  if (Array.isArray(value)) {
    return value
  }
  return undefined
}

/**
 * Collect unexpected fields from a raw response
 */
export function collectUnexpectedFields(
  raw: RawAIResponse,
  expectedFields: string[]
): Record<string, unknown> {
  const unexpected: Record<string, unknown> = {}

  for (const key of Object.keys(raw)) {
    if (!expectedFields.includes(key)) {
      unexpected[key] = raw[key]
    }
  }

  return unexpected
}

/**
 * Check if an object has any of the specified keys with non-empty values
 */
export function hasAnyContent(obj: unknown, keys: string[]): boolean {
  if (typeof obj !== 'object' || obj === null) return false

  const record = obj as Record<string, unknown>
  return keys.some((key) => {
    const value = record[key]
    if (value === undefined || value === null) return false
    if (typeof value === 'string') return value.trim().length > 0
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === 'object') return Object.keys(value).length > 0
    return true
  })
}

// ============================================================================
// SHARED GENERATOR NORMALIZERS
// These are used by multiple generator components to handle varied AI response formats
// ============================================================================

/**
 * Simple string array normalizer (used by most generators)
 * Unlike normalizeToStringArray, this doesn't split comma-separated strings
 */
export function normalizeStringArray(value: unknown): string[] {
  if (!value) return []

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item
        if (typeof item === 'object' && item !== null) {
          const obj = item as Record<string, unknown>
          if (obj.text) return String(obj.text)
          if (obj.description) return String(obj.description)
          if (obj.name) return String(obj.name)
          return JSON.stringify(obj)
        }
        return String(item)
      })
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    return value ? [value] : []
  }

  return []
}

/**
 * Normalizes action/trait arrays (used by Monster, Encounter generators)
 */
export interface ActionItem {
  name: string
  description: string
  attack_bonus?: string
  damage?: string
}

export function normalizeActionArray(value: unknown): ActionItem[] {
  if (!value || !Array.isArray(value)) return []

  return value.map((item: unknown) => {
    if (typeof item === 'string') {
      return { name: 'Action', description: item }
    }
    if (typeof item === 'object' && item !== null) {
      const obj = item as Record<string, unknown>
      return {
        name: String(obj.name || 'Unknown'),
        description: String(obj.description || obj.desc || ''),
        attack_bonus: obj.attack_bonus ? String(obj.attack_bonus) : undefined,
        damage: obj.damage ? String(obj.damage) : undefined,
      }
    }
    return { name: 'Unknown', description: String(item) }
  })
}

/**
 * Normalizes hit points to proper structure (used by Monster generator)
 */
export interface HitPoints {
  average: number
  dice: string
}

export function normalizeHitPoints(value: unknown): HitPoints {
  if (!value) return { average: 10, dice: '2d8' }

  if (typeof value === 'number') {
    return { average: value, dice: '' }
  }

  if (typeof value === 'string') {
    // Try to parse "45 (10d8)" format
    const match = value.match(/(\d+)\s*\(([^)]+)\)/)
    if (match) {
      return { average: parseInt(match[1], 10), dice: match[2] }
    }
    // Just a number string
    const num = parseInt(value, 10)
    if (!isNaN(num)) {
      return { average: num, dice: '' }
    }
    // Might be just dice notation like "10d8+20"
    return { average: 0, dice: value }
  }

  if (typeof value === 'object' && value !== null) {
    const hp = value as Record<string, unknown>
    return {
      average:
        typeof hp.average === 'number'
          ? hp.average
          : parseInt(String(hp.average || hp.value || 10), 10),
      dice: String(hp.dice || hp.formula || hp.hit_dice || ''),
    }
  }

  return { average: 10, dice: '2d8' }
}

/**
 * Normalizes speed values (used by Monster, Critter generators)
 */
export function normalizeSpeed(value: unknown): Record<string, number> {
  if (!value) return { walk: 30 }

  if (typeof value === 'number') {
    return { walk: value }
  }

  if (typeof value === 'string') {
    // Parse "30 ft." or "30 ft., fly 60 ft."
    const speeds: Record<string, number> = {}
    const parts = value.split(',')
    for (const part of parts) {
      const match = part.match(/(\w+)?\s*(\d+)\s*ft\.?/)
      if (match) {
        const type = match[1]?.toLowerCase() || 'walk'
        speeds[type] = parseInt(match[2], 10)
      }
    }
    return Object.keys(speeds).length > 0 ? speeds : { walk: 30 }
  }

  if (typeof value === 'object' && value !== null) {
    const speedObj = value as Record<string, unknown>
    const result: Record<string, number> = {}
    for (const [key, val] of Object.entries(speedObj)) {
      if (typeof val === 'number') {
        result[key] = val
      } else if (typeof val === 'string') {
        const num = parseInt(val, 10)
        if (!isNaN(num)) result[key] = num
      }
    }
    return Object.keys(result).length > 0 ? result : { walk: 30 }
  }

  return { walk: 30 }
}

/**
 * Normalizes ability scores (used by Monster, NPC, Critter generators)
 */
export interface AbilityScores {
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
}

export function normalizeAbilityScores(value: unknown): AbilityScores {
  const defaults: AbilityScores = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }

  if (!value || typeof value !== 'object') return defaults

  const scores = value as Record<string, unknown>
  return {
    str: getNumber(scores, 'str', getNumber(scores, 'strength', 10)),
    dex: getNumber(scores, 'dex', getNumber(scores, 'dexterity', 10)),
    con: getNumber(scores, 'con', getNumber(scores, 'constitution', 10)),
    int: getNumber(scores, 'int', getNumber(scores, 'intelligence', 10)),
    wis: getNumber(scores, 'wis', getNumber(scores, 'wisdom', 10)),
    cha: getNumber(scores, 'cha', getNumber(scores, 'charisma', 10)),
  }
}

/**
 * Normalize a boolean from various formats
 */
export function normalizeBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim()
    return lower === 'true' || lower === 'yes' || lower === '1'
  }
  if (typeof value === 'number') return value !== 0
  return false
}

/**
 * Normalize a numeric field that might be string or number
 */
export function normalizeNumericField(
  value: unknown,
  defaultValue: number,
  parseAs: 'int' | 'float' = 'int'
): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    // Handle values like "10 gp" or "5 lbs"
    const cleaned = value.replace(/[^\d.-]/g, '')
    const parsed = parseAs === 'int' ? parseInt(cleaned, 10) : parseFloat(cleaned)
    return isNaN(parsed) ? defaultValue : parsed
  }
  return defaultValue
}

/**
 * Normalize a field that could be string or object (used by Item generator)
 */
export function normalizeFlexibleField(value: unknown): string | Record<string, unknown> {
  if (!value) return ''

  if (typeof value === 'string') return value

  if (typeof value === 'object' && value !== null) {
    // If it has a simple structure, try to convert to string
    const obj = value as Record<string, unknown>
    if (obj.description) return String(obj.description)
    if (obj.text) return String(obj.text)
    // Return as object for complex structures
    return obj
  }

  return String(value)
}

// ============================================================================
// DIALOGUE NORMALIZER
// ============================================================================

export interface DialogueTree {
  friendly: { player_option: string; npc_response: string; outcome: string }
  neutral: { player_option: string; npc_response: string; outcome: string }
  hostile: { player_option: string; npc_response: string; outcome: string }
}

export interface SkillCheck {
  skill: string
  dc: number
  success: string
  failure: string
}

export interface NormalizedDialogue extends NormalizedResponse {
  character_name: string
  scene_setting: string
  mood: string
  opening_line: string
  dialogue_tree: DialogueTree
  skill_checks?: SkillCheck[]
  body_language: string
  information_revealed?: string[]
  potential_quests?: string[]
}

const DEFAULT_DIALOGUE_TREE: DialogueTree = {
  friendly: { player_option: '', npc_response: '', outcome: '' },
  neutral: { player_option: '', npc_response: '', outcome: '' },
  hostile: { player_option: '', npc_response: '', outcome: '' },
}

const DIALOGUE_EXPECTED_FIELDS = [
  'character_name',
  'name',
  'scene_setting',
  'setting',
  'mood',
  'tone',
  'opening_line',
  'greeting',
  'dialogue_tree',
  'skill_checks',
  'body_language',
  'information_revealed',
  'potential_quests',
  'provider',
]

function normalizeDialogueOption(option: unknown): {
  player_option: string
  npc_response: string
  outcome: string
} {
  if (typeof option !== 'object' || option === null) {
    return { player_option: '', npc_response: '', outcome: '' }
  }
  const opt = option as Record<string, unknown>
  return {
    player_option: getString(opt, 'player_option', 'player'),
    npc_response: getString(opt, 'npc_response', 'response', 'npc'),
    outcome: getString(opt, 'outcome', 'result'),
  }
}

export function normalizeDialogue(raw: RawAIResponse): NormalizedDialogue {
  const unexpected = collectUnexpectedFields(raw, DIALOGUE_EXPECTED_FIELDS)

  // Normalize dialogue_tree
  let dialogueTree = DEFAULT_DIALOGUE_TREE
  const dtRaw = getObject(raw, 'dialogue_tree')
  if (dtRaw) {
    dialogueTree = {
      friendly: normalizeDialogueOption(dtRaw.friendly),
      neutral: normalizeDialogueOption(dtRaw.neutral),
      hostile: normalizeDialogueOption(dtRaw.hostile),
    }
  }

  // Normalize skill_checks
  let skillChecks: SkillCheck[] | undefined
  const scRaw = getArray(raw, 'skill_checks')
  if (scRaw) {
    skillChecks = scRaw.map((sc: unknown) => {
      if (typeof sc !== 'object' || sc === null) {
        return { skill: 'Unknown', dc: 10, success: '', failure: '' }
      }
      const check = sc as Record<string, unknown>
      return {
        skill: getString(check, 'skill') || 'Unknown',
        dc: getNumber(check, 'dc', 10),
        success: getString(check, 'success'),
        failure: getString(check, 'failure'),
      }
    })
  }

  const result: NormalizedDialogue = {
    character_name: getString(raw, 'character_name', 'name') || 'Unknown Character',
    scene_setting: getString(raw, 'scene_setting', 'setting'),
    mood: getString(raw, 'mood', 'tone'),
    opening_line: getString(raw, 'opening_line', 'greeting'),
    dialogue_tree: dialogueTree,
    skill_checks: skillChecks,
    body_language: getString(raw, 'body_language'),
    information_revealed: getStringArray(raw, 'information_revealed'),
    potential_quests: getStringArray(raw, 'potential_quests'),
    _provider: getString(raw, 'provider'),
  }

  // Add unexpected fields if any
  if (Object.keys(unexpected).length > 0) {
    result._raw = unexpected
  }

  // Check if dialogue tree is valid
  const hasValidTree =
    hasAnyContent(dialogueTree.friendly, ['player_option', 'npc_response']) ||
    hasAnyContent(dialogueTree.neutral, ['player_option', 'npc_response']) ||
    hasAnyContent(dialogueTree.hostile, ['player_option', 'npc_response'])

  if (!hasValidTree && !result.opening_line) {
    result._parseError = 'AI response missing expected dialogue structure. Showing available data.'
  }

  return result
}

// ============================================================================
// NPC NORMALIZER
// ============================================================================

export interface NormalizedNPC extends NormalizedResponse {
  name: string
  race: string
  class: string
  level: number
  background: string
  personality: string
  appearance: string
  motivations: string
  secrets: string
  connections: string[]
  stats: Record<string, number>
  skills: string[]
  equipment: string[]
  roleplaying_tips: string
}

const NPC_EXPECTED_FIELDS = [
  'name',
  'race',
  'class',
  'level',
  'background',
  'personality',
  'appearance',
  'motivations',
  'secrets',
  'connections',
  'stats',
  'skills',
  'equipment',
  'roleplaying_tips',
  'provider',
]

export function normalizeNPC(raw: RawAIResponse): NormalizedNPC {
  const unexpected = collectUnexpectedFields(raw, NPC_EXPECTED_FIELDS)

  // Normalize stats
  let stats: Record<string, number> = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }
  const statsRaw = getObject(raw, 'stats')
  if (statsRaw) {
    stats = {
      str: getNumber(statsRaw, 'str', 10),
      dex: getNumber(statsRaw, 'dex', 10),
      con: getNumber(statsRaw, 'con', 10),
      int: getNumber(statsRaw, 'int', 10),
      wis: getNumber(statsRaw, 'wis', 10),
      cha: getNumber(statsRaw, 'cha', 10),
    }
  }

  const result: NormalizedNPC = {
    name: getString(raw, 'name') || 'Unknown NPC',
    race: getString(raw, 'race'),
    class: getString(raw, 'class'),
    level: getNumber(raw, 'level', 1),
    background: getString(raw, 'background'),
    personality: getString(raw, 'personality'),
    appearance: getString(raw, 'appearance'),
    motivations: getString(raw, 'motivations'),
    secrets: getString(raw, 'secrets'),
    connections: getStringArray(raw, 'connections') || [],
    stats,
    skills: getStringArray(raw, 'skills') || [],
    equipment: getStringArray(raw, 'equipment') || [],
    roleplaying_tips: getString(raw, 'roleplaying_tips'),
    _provider: getString(raw, 'provider'),
  }

  if (Object.keys(unexpected).length > 0) {
    result._raw = unexpected
  }

  if (!result.name || result.name === 'Unknown NPC') {
    result._parseError = 'AI response missing expected NPC name.'
  }

  return result
}

// ============================================================================
// ITEM NORMALIZER
// ============================================================================

export interface NormalizedItem extends NormalizedResponse {
  name: string
  type: string
  rarity: string
  description: string
  properties: Record<string, unknown>
  history: string
  attunement: boolean
  value: string
}

const ITEM_EXPECTED_FIELDS = [
  'name',
  'type',
  'rarity',
  'description',
  'properties',
  'history',
  'attunement',
  'value',
  'weight',
  'quirks',
  'provider',
]

export function normalizeItem(raw: RawAIResponse): NormalizedItem {
  const unexpected = collectUnexpectedFields(raw, ITEM_EXPECTED_FIELDS)

  const result: NormalizedItem = {
    name: getString(raw, 'name') || 'Unknown Item',
    type: getString(raw, 'type'),
    rarity: getString(raw, 'rarity'),
    description: getString(raw, 'description'),
    properties: getObject(raw, 'properties') || {},
    history: getString(raw, 'history'),
    attunement: getBoolean(raw, 'attunement'),
    value: getString(raw, 'value'),
    _provider: getString(raw, 'provider'),
  }

  if (Object.keys(unexpected).length > 0) {
    result._raw = unexpected
  }

  return result
}

// ============================================================================
// LOCATION NORMALIZER
// ============================================================================

export interface NormalizedLocation extends NormalizedResponse {
  name: string
  type: string
  description: string
  atmosphere: string
  notable_features: string[]
  inhabitants: string[]
  secrets: string[]
  hooks: string[]
  connections: string[]
}

const LOCATION_EXPECTED_FIELDS = [
  'name',
  'type',
  'description',
  'atmosphere',
  'notable_features',
  'inhabitants',
  'secrets',
  'hooks',
  'connections',
  'npcs',
  'encounters',
  'map',
  'theme',
  'features',
  'provider',
]

export function normalizeLocation(raw: RawAIResponse): NormalizedLocation {
  const unexpected = collectUnexpectedFields(raw, LOCATION_EXPECTED_FIELDS)

  const result: NormalizedLocation = {
    name: getString(raw, 'name') || 'Unknown Location',
    type: getString(raw, 'type'),
    description: getString(raw, 'description'),
    atmosphere: getString(raw, 'atmosphere'),
    notable_features: getStringArray(raw, 'notable_features', 'features') || [],
    inhabitants: getStringArray(raw, 'inhabitants') || [],
    secrets: getStringArray(raw, 'secrets') || [],
    hooks: getStringArray(raw, 'hooks') || [],
    connections: getStringArray(raw, 'connections') || [],
    _provider: getString(raw, 'provider'),
  }

  if (Object.keys(unexpected).length > 0) {
    result._raw = unexpected
  }

  return result
}

// ============================================================================
// Generic response wrapper for consistent error handling
// ============================================================================

export interface APIResponse<T> {
  data?: T
  error?: string
  warnings?: string[]
}

/**
 * Safely parse and normalize an AI response
 */
export function safeParseAIResponse<T extends NormalizedResponse>(
  response: unknown,
  normalizer: (raw: RawAIResponse) => T,
  wrapperKey?: string
): APIResponse<T> {
  try {
    if (!response || typeof response !== 'object') {
      return { error: 'Invalid response format' }
    }

    const obj = response as Record<string, unknown>

    // Check if there's an error in the response
    if (obj.error) {
      return { error: String(obj.error) }
    }

    // Extract the wrapped data or use the response directly
    const raw =
      wrapperKey && obj[wrapperKey] ? (obj[wrapperKey] as RawAIResponse) : (obj as RawAIResponse)

    const normalized = normalizer(raw)

    const warnings: string[] = []
    if (normalized._parseError) {
      warnings.push(normalized._parseError)
    }
    if (normalized._raw && Object.keys(normalized._raw).length > 0) {
      warnings.push(`Response contained ${Object.keys(normalized._raw).length} unexpected fields`)
    }

    return {
      data: normalized,
      warnings: warnings.length > 0 ? warnings : undefined,
    }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to parse AI response',
    }
  }
}
