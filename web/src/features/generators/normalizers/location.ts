// Location Response Normalizer
// Converts raw AI responses to typed LocationData

import { normalizeToStringArray } from '@/utils/aiResponseNormalizer'
import { logger } from '@/utils/logger'

// ============================================================================
// Types
// ============================================================================

export interface GeneratedLocationData {
  name: string
  type: string
  size?: string
  danger_level?: string
  theme: string
  description: string
  features: string[]
  secrets: string[]
  factions: string[]
  npcs: string[]
  encounters: string[]
  map?: string
  _raw?: Record<string, unknown>
  _parseError?: string
}

// ============================================================================
// Main Normalizer
// ============================================================================

export function normalizeLocationResponse(raw: Record<string, unknown>): GeneratedLocationData {
  logger.debug('[normalizeLocation] Input:', raw)

  let processedRaw = raw

  // Check if the raw data has a nested location object
  if (raw.location && typeof raw.location === 'object') {
    processedRaw = raw.location as Record<string, unknown>
  }

  // Handle case where description contains the entire JSON response
  if (processedRaw.description && typeof processedRaw.description === 'string') {
    const descStr = (processedRaw.description as string).trim()
    if (descStr.startsWith('{') && descStr.endsWith('}')) {
      try {
        const parsedLocation = JSON.parse(descStr)
        processedRaw = parsedLocation
      } catch {
        // Try brace matching
        let braceCount = 0
        let jsonEndIndex = -1
        let inString = false
        let escaped = false

        for (let i = 0; i < descStr.length; i++) {
          const char = descStr[i]
          if (escaped) {
            escaped = false
            continue
          }
          if (char === '\\' && inString) {
            escaped = true
            continue
          }
          if (char === '"' && !escaped) {
            inString = !inString
            continue
          }
          if (!inString) {
            if (char === '{') braceCount++
            if (char === '}') {
              braceCount--
              if (braceCount === 0) {
                jsonEndIndex = i
                break
              }
            }
          }
        }

        if (jsonEndIndex > 0) {
          try {
            const parsedLocation = JSON.parse(descStr.substring(0, jsonEndIndex + 1))
            processedRaw = parsedLocation
          } catch {
            // Keep original
          }
        }
      }
    }
  }

  // Build description from available fields
  let description = ''
  if (processedRaw.summary && typeof processedRaw.summary === 'string') {
    description = processedRaw.summary
  }
  if (processedRaw.description && typeof processedRaw.description === 'string') {
    const descText = processedRaw.description
    if (!descText.trim().startsWith('{') && descText !== description) {
      description = description ? `${description}\n\n${descText}` : descText
    }
  }

  // Build extra info from fields AI might include
  const extraInfo: string[] = []
  if (processedRaw.region) extraInfo.push(`Region: ${processedRaw.region}`)
  if (processedRaw.population) extraInfo.push(`Population: ${processedRaw.population}`)
  if (processedRaw.government) extraInfo.push(`Government: ${processedRaw.government}`)
  if (processedRaw.established) extraInfo.push(`Established: ${processedRaw.established}`)
  if (processedRaw.atmosphere) extraInfo.push(`Atmosphere: ${processedRaw.atmosphere}`)

  if (extraInfo.length > 0) {
    description = extraInfo.join('\n') + '\n\n' + description
  }

  // Collect unexpected fields
  const expectedFields = [
    'name', 'type', 'theme', 'description', 'features', 'secrets', 'factions',
    'npcs', 'encounters', 'map', 'provider', '_parse_warning', 'summary',
    'region', 'population', 'government', 'established', 'atmosphere',
    'notable_features', 'notable_npcs', 'encounter_hooks', 'adventure_hooks',
  ]
  const unexpectedFields: Record<string, unknown> = {}
  for (const key of Object.keys(processedRaw)) {
    if (!expectedFields.includes(key)) {
      unexpectedFields[key] = processedRaw[key]
    }
  }

  const result: GeneratedLocationData = {
    name: String(processedRaw.name || 'Unknown Location'),
    type: String(processedRaw.type || ''),
    theme: String(processedRaw.theme || ''),
    description: description || 'No description available.',
    features: normalizeToStringArray(processedRaw.features || processedRaw.notable_features),
    secrets: normalizeToStringArray(processedRaw.secrets),
    factions: normalizeToStringArray(processedRaw.factions),
    npcs: normalizeToStringArray(processedRaw.npcs || processedRaw.notable_npcs),
    encounters: normalizeToStringArray(
      processedRaw.encounters || processedRaw.encounter_hooks || processedRaw.adventure_hooks
    ),
    map: processedRaw.map ? String(processedRaw.map) : undefined,
    _raw: Object.keys(unexpectedFields).length > 0 ? unexpectedFields : undefined,
  }

  if (raw._parse_warning) {
    result._parseError = String(raw._parse_warning)
  }

  logger.debug('[normalizeLocation] Result:', result)
  return result
}

export function hasValidLocationContent(location: GeneratedLocationData): boolean {
  return !!(
    location.name &&
    location.name !== 'Unknown Location' &&
    (location.description || location.features.length > 0 || location.secrets.length > 0)
  )
}
