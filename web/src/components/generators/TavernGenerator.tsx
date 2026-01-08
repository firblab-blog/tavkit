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
  generateTavern as generateTavernApi,
  saveTavern as saveTavernApi,
  getErrorMessage,
} from '@/api/generators'
import { normalizeStringArray } from '@/utils/aiResponseNormalizer'
import { logger } from '@/utils/logger'

// Expected tavern structure
interface TavernData {
  name: string
  type: string
  atmosphere: string
  description: string
  keeper_name: string
  keeper_personality: string
  keeper_description: string
  menu_food: MenuItem[]
  menu_drinks: MenuItem[]
  rooms: Room[]
  patrons: Patron[]
  events: string[]
  rumors: string[]
  special_notes: string
  // For any unexpected fields from AI
  _raw?: Record<string, unknown>
  _parseError?: string
}

interface MenuItem {
  name: string
  description: string
  price: string
}

interface Room {
  type: string
  description: string
  price: string
  available: number
}

interface Patron {
  name: string
  race: string
  description: string
  hook?: string
}

/**
 * Normalize a single menu item
 */
function normalizeMenuItem(value: unknown): MenuItem | null {
  if (!value) return null

  if (typeof value === 'string') {
    return { name: value, description: '', price: '1 cp' }
  }

  if (typeof value === 'object' && value !== null) {
    const item = value as Record<string, unknown>
    return {
      name: String(item.name || item.item || 'Unknown Item'),
      description: String(item.description || item.desc || ''),
      price: String(item.price || item.cost || '1 cp'),
    }
  }

  return null
}

/**
 * Normalize menu items array
 */
function normalizeMenuItems(value: unknown): MenuItem[] {
  if (!value || !Array.isArray(value)) return []

  return value
    .map((item) => normalizeMenuItem(item))
    .filter((item): item is MenuItem => item !== null)
}

/**
 * Normalize a single room
 */
function normalizeRoom(value: unknown): Room | null {
  if (!value || typeof value !== 'object') return null

  const room = value as Record<string, unknown>
  return {
    type: String(room.type || room.name || 'Room'),
    description: String(room.description || ''),
    price: String(room.price || room.cost || '5 sp'),
    available: Number(room.available || room.count || 1),
  }
}

/**
 * Normalize rooms array
 */
function normalizeRooms(value: unknown): Room[] {
  if (!value || !Array.isArray(value)) return []

  return value.map((room) => normalizeRoom(room)).filter((room): room is Room => room !== null)
}

/**
 * Normalize a single patron
 */
function normalizePatron(value: unknown): Patron | null {
  if (!value) return null

  if (typeof value === 'string') {
    return { name: value, race: 'Human', description: '' }
  }

  if (typeof value === 'object' && value !== null) {
    const patron = value as Record<string, unknown>
    return {
      name: String(patron.name || 'Unknown Patron'),
      race: String(patron.race || patron.species || 'Human'),
      description: String(patron.description || ''),
      hook: patron.hook ? String(patron.hook) : undefined,
    }
  }

  return null
}

/**
 * Normalize patrons array
 */
function normalizePatrons(value: unknown): Patron[] {
  if (!value || !Array.isArray(value)) return []

  return value
    .map((patron) => normalizePatron(patron))
    .filter((patron): patron is Patron => patron !== null)
}

/**
 * Extract keeper info from nested object or flat fields
 */
function extractKeeperInfo(raw: Record<string, unknown>): {
  name: string
  personality: string
  description: string
} {
  // Check for nested keeper/owner object
  const keeper = raw.keeper as Record<string, unknown> | undefined
  const owner = raw.owner as Record<string, unknown> | undefined
  const nested = keeper || owner

  if (nested && typeof nested === 'object') {
    return {
      name: String(nested.name || raw.keeper_name || 'Unknown'),
      personality: String(nested.personality || raw.keeper_personality || ''),
      description: String(nested.description || raw.keeper_description || ''),
    }
  }

  return {
    name: String(raw.keeper_name || raw.owner_name || 'Unknown'),
    personality: String(raw.keeper_personality || raw.owner_personality || ''),
    description: String(raw.keeper_description || raw.owner_description || ''),
  }
}

/**
 * Extract menu from nested object or separate fields
 */
function extractMenu(raw: Record<string, unknown>): { food: MenuItem[]; drinks: MenuItem[] } {
  // Check for nested menu object
  const menu = raw.menu as Record<string, unknown> | undefined

  if (menu && typeof menu === 'object') {
    return {
      food: normalizeMenuItems(menu.food || menu.meals),
      drinks: normalizeMenuItems(menu.drinks || menu.beverages),
    }
  }

  return {
    food: normalizeMenuItems(raw.menu_food || raw.food),
    drinks: normalizeMenuItems(raw.menu_drinks || raw.drinks),
  }
}

/**
 * Main normalization function - converts raw AI response to typed TavernData
 */
function normalizeTavernResponse(raw: Record<string, unknown>): TavernData {
  logger.debug('[TavernGenerator] normalizeTavernResponse input:', raw)

  // Handle case where description contains the entire JSON response
  let processedRaw = raw
  if (raw.description && typeof raw.description === 'string') {
    const descStr = (raw.description as string).trim()
    if (descStr.startsWith('{') && descStr.endsWith('}')) {
      try {
        const parsedTavern = JSON.parse(descStr)
        logger.debug('[TavernGenerator] Parsed tavern from JSON description:', parsedTavern)
        processedRaw = parsedTavern
      } catch (e) {
        logger.warn('[TavernGenerator] Failed to parse description as JSON:', e)
      }
    }
  }

  // Expected fields for tracking unexpected ones
  const expectedFields = [
    'name',
    'title',
    'establishment_name',
    'type',
    'atmosphere',
    'description',
    'keeper',
    'keeper_name',
    'keeper_personality',
    'keeper_description',
    'owner',
    'owner_name',
    'owner_personality',
    'owner_description',
    'menu',
    'menu_food',
    'menu_drinks',
    'food',
    'drinks',
    'rooms',
    'accommodations',
    'patrons',
    'current_patrons',
    'events',
    'rumors',
    'gossip',
    'special_notes',
    'notes',
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

  const keeper = extractKeeperInfo(processedRaw)
  const menu = extractMenu(processedRaw)

  const result: TavernData = {
    name: String(
      processedRaw.name ||
        processedRaw.title ||
        processedRaw.establishment_name ||
        'The Unknown Tavern'
    ),
    type: String(processedRaw.type || ''),
    atmosphere: String(processedRaw.atmosphere || ''),
    description: description,
    keeper_name: keeper.name,
    keeper_personality: keeper.personality,
    keeper_description: keeper.description,
    menu_food: menu.food,
    menu_drinks: menu.drinks,
    rooms: normalizeRooms(processedRaw.rooms || processedRaw.accommodations),
    patrons: normalizePatrons(processedRaw.patrons || processedRaw.current_patrons),
    events: normalizeStringArray(processedRaw.events),
    rumors: normalizeStringArray(processedRaw.rumors || processedRaw.gossip),
    special_notes: String(processedRaw.special_notes || processedRaw.notes || ''),
    _raw: Object.keys(unexpectedFields).length > 0 ? unexpectedFields : undefined,
  }

  logger.debug('[TavernGenerator] Normalized result:', result)
  return result
}

/**
 * Check if tavern has valid essential content
 */
function hasValidTavernContent(tavern: TavernData): boolean {
  return !!(
    tavern.name &&
    tavern.name !== 'The Unknown Tavern' &&
    (tavern.description || tavern.atmosphere || tavern.keeper_name !== 'Unknown')
  )
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function TavernGenerator() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tavern, setTavern] = useState<TavernData | null>(null)
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
  const [tavernType, setTavernType] = useState('tavern')
  const [quality, setQuality] = useState('average')
  const [size, setSize] = useState('medium')
  const [specialRequests, setSpecialRequests] = useState('')

  // AI settings
  const [aiSettings, setAiSettings] = useState<AIGenerationSettings>({
    detailLevel: 'high',
    timeout: 120,
  })

  const generateTavern = async () => {
    setLoading(true)
    setError(null)
    setTavern(null)
    setShowRawResponse(false)
    setIsSaved(false)

    try {
      const data = await generateTavernApi(
        {
          campaign_id: campaignId || undefined,
          type: tavernType,
          quality,
          size,
          special_requests: specialRequests || undefined,
          max_tokens: getMaxTokensFromSettings(aiSettings),
          timeout: aiSettings.timeout,
        },
        aiSettings.timeout
      )
      logger.debug('[TavernGenerator] Raw API response:', data)

      // Normalize the response
      if (data.tavern) {
        const normalized = normalizeTavernResponse(data.tavern)

        if (!hasValidTavernContent(normalized)) {
          normalized._parseError =
            'AI response missing essential tavern content. Showing raw response.'
          setShowRawResponse(true)
        }

        setTavern(normalized)
      } else {
        // No tavern wrapper - try to normalize the raw response
        const normalized = normalizeTavernResponse(data as unknown as Record<string, unknown>)
        normalized._parseError = 'Unexpected response format. Attempting to display.'
        setShowRawResponse(true)
        setTavern(normalized)
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const saveTavern = async () => {
    if (!tavern) return

    try {
      await saveTavernApi({
        name: tavern.name || 'Unnamed Tavern',
        type: tavern.type || tavernType,
        atmosphere: tavern.atmosphere,
        description: tavern.description,
        keeper_name: tavern.keeper_name,
        keeper_personality: tavern.keeper_personality,
        keeper_description: tavern.keeper_description,
        menu_food: tavern.menu_food,
        menu_drinks: tavern.menu_drinks,
        rooms: tavern.rooms,
        patrons: tavern.patrons,
        events: tavern.events,
        rumors: tavern.rumors,
        special_notes: tavern.special_notes,
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
    if (!tavern) return
    let text = `${tavern.name}\n${tavern.type}\n\n${tavern.atmosphere}\n${tavern.description}\n\nKeeper: ${tavern.keeper_name}\n${tavern.keeper_personality}\n${tavern.keeper_description || ''}`

    if (tavern.menu_food && tavern.menu_food.length > 0) {
      text += '\n\nFood Menu:\n'
      tavern.menu_food.forEach((item) => {
        text += `${item.name} - ${item.price}\n${item.description}\n\n`
      })
    }

    if (tavern.menu_drinks && tavern.menu_drinks.length > 0) {
      text += '\nDrink Menu:\n'
      tavern.menu_drinks.forEach((item) => {
        text += `${item.name} - ${item.price}\n${item.description}\n\n`
      })
    }

    if (tavern.rooms && tavern.rooms.length > 0) {
      text += '\nAccommodations:\n'
      tavern.rooms.forEach((room) => {
        text += `${room.type} - ${room.price} (${room.available} available)\n${room.description}\n\n`
      })
    }

    if (tavern.patrons && tavern.patrons.length > 0) {
      text += '\nCurrent Patrons:\n'
      tavern.patrons.forEach((patron) => {
        text += `${patron.name} (${patron.race})\n${patron.description}\n${patron.hook ? `Hook: ${patron.hook}\n` : ''}\n`
      })
    }

    if (tavern.events && tavern.events.length > 0) {
      text += '\nCurrent Events:\n'
      tavern.events.forEach((event) => {
        text += `- ${event}\n`
      })
    }

    if (tavern.rumors && tavern.rumors.length > 0) {
      text += '\nRumors:\n'
      tavern.rumors.forEach((rumor) => {
        text += `- ${rumor}\n`
      })
    }

    if (tavern.special_notes) {
      text += `\nSpecial Notes: ${tavern.special_notes}`
    }

    navigator.clipboard.writeText(text)
  }

  const formContent = (
    <>
      <AISettings generatorType="tavern" onSettingsChange={setAiSettings} />
      <CampaignSelector
        selectedCampaignId={campaignId}
        onSelect={(id) => {
          hasUserSelectedCampaign.current = true
          setCampaignId(id)
        }}
      />

      <FormField label="Type of Establishment">
        <select
          value={tavernType}
          onChange={(e) => setTavernType(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="tavern">Tavern</option>
          <option value="inn">Inn</option>
          <option value="pub">Pub</option>
          <option value="alehouse">Alehouse</option>
          <option value="roadhouse">Roadhouse</option>
          <option value="brewery">Brewery</option>
        </select>
      </FormField>

      <FormField label="Quality">
        <select
          value={quality}
          onChange={(e) => setQuality(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="poor">Poor (dive, rough)</option>
          <option value="modest">Modest (working class)</option>
          <option value="average">Average (comfortable)</option>
          <option value="wealthy">Wealthy (upscale)</option>
          <option value="aristocratic">Aristocratic (luxurious)</option>
        </select>
      </FormField>

      <FormField label="Size">
        <select
          value={size}
          onChange={(e) => setSize(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="tiny">Tiny (5-10 patrons)</option>
          <option value="small">Small (10-20 patrons)</option>
          <option value="medium">Medium (20-40 patrons)</option>
          <option value="large">Large (40-80 patrons)</option>
          <option value="massive">Massive (80+ patrons)</option>
        </select>
      </FormField>

      <FormField label="Special Requests" description="(optional)">
        <textarea
          value={specialRequests}
          onChange={(e) => setSpecialRequests(e.target.value)}
          placeholder="e.g., 'Has a secret entrance to the thieves' guild' or 'Known for their legendary meat pies'"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={3}
        />
      </FormField>
    </>
  )

  const generatedContent = tavern ? (
    <div className="space-y-6">
      {/* Parse warning */}
      {tavern._parseError && (
        <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-400 font-semibold mb-2">
            <Icon name="AlertCircle" className="w-5 h-5" />
            Response Format Warning
          </div>
          <p className="text-text-muted text-sm">{tavern._parseError}</p>
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-primary">{tavern.name}</h2>
        <p className="text-sm text-text-muted capitalize">{tavern.type}</p>
      </div>

      {/* Atmosphere & Description */}
      {(tavern.atmosphere || tavern.description) && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="Package" className="w-5 h-5 text-primary" />
            Atmosphere
          </h3>
          {tavern.atmosphere && <p className="text-text-muted italic mb-2">{tavern.atmosphere}</p>}
          {tavern.description && <p className="text-text">{tavern.description}</p>}
        </div>
      )}

      {/* Keeper */}
      {tavern.keeper_name && tavern.keeper_name !== 'Unknown' && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="User" className="w-5 h-5 text-primary" />
            The Keeper
          </h3>
          <p className="text-text font-medium">{tavern.keeper_name}</p>
          {tavern.keeper_personality && (
            <p className="text-text-muted italic mb-2">{tavern.keeper_personality}</p>
          )}
          {tavern.keeper_description && <p className="text-text">{tavern.keeper_description}</p>}
        </div>
      )}

      {/* Menu */}
      {(tavern.menu_food.length > 0 || tavern.menu_drinks.length > 0) && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="FileText" className="w-5 h-5 text-primary" />
            Menu
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {tavern.menu_food.length > 0 && (
              <div>
                <h4 className="font-medium text-text mb-2">Food</h4>
                <div className="space-y-2">
                  {tavern.menu_food.map((item, idx) => (
                    <div key={idx} className="bg-background p-3 rounded border border-border">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-text">{item.name}</span>
                        <span className="text-primary font-medium">{item.price}</span>
                      </div>
                      {item.description && (
                        <p className="text-sm text-text-muted">{item.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tavern.menu_drinks.length > 0 && (
              <div>
                <h4 className="font-medium text-text mb-2">Drinks</h4>
                <div className="space-y-2">
                  {tavern.menu_drinks.map((item, idx) => (
                    <div key={idx} className="bg-background p-3 rounded border border-border">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-text">{item.name}</span>
                        <span className="text-primary font-medium">{item.price}</span>
                      </div>
                      {item.description && (
                        <p className="text-sm text-text-muted">{item.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rooms */}
      {tavern.rooms.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Store" className="w-5 h-5 text-primary" />
            Accommodations
          </h3>
          <div className="space-y-2">
            {tavern.rooms.map((room, idx) => (
              <div key={idx} className="bg-background p-3 rounded border border-border">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <span className="font-medium text-text">{room.type}</span>
                    <span className="text-sm text-text-muted ml-2">
                      ({room.available} available)
                    </span>
                  </div>
                  <span className="text-primary font-medium">{room.price}</span>
                </div>
                {room.description && <p className="text-sm text-text-muted">{room.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Patrons */}
      {tavern.patrons.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Users" className="w-5 h-5 text-primary" />
            Current Patrons
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {tavern.patrons.map((patron, idx) => (
              <div key={idx} className="bg-background p-3 rounded border border-border">
                <p className="font-medium text-text">{patron.name}</p>
                <p className="text-sm text-text-muted italic mb-1">{patron.race}</p>
                {patron.description && <p className="text-sm text-text">{patron.description}</p>}
                {patron.hook && <p className="text-sm text-primary mt-2">{patron.hook}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Events */}
      {tavern.events.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Calendar" className="w-5 h-5 text-primary" />
            Current Events
          </h3>
          <ul className="space-y-2">
            {tavern.events.map((event, idx) => (
              <li key={idx} className="flex items-start gap-2 text-text">
                <span className="text-primary">•</span>
                <span>{event}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Rumors */}
      {tavern.rumors.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="MessageCircle" className="w-5 h-5 text-primary" />
            Rumors & Gossip
          </h3>
          <ul className="space-y-2">
            {tavern.rumors.map((rumor, idx) => (
              <li key={idx} className="flex items-start gap-2 text-text">
                <span className="text-primary">•</span>
                <span className="italic">{rumor}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Special Notes */}
      {tavern.special_notes && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="AlertCircle" className="w-5 h-5 text-primary" />
            Special Notes
          </h3>
          <p className="text-text">{tavern.special_notes}</p>
        </div>
      )}

      {/* Raw/unexpected fields - collapsible */}
      {tavern._raw && Object.keys(tavern._raw).length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setShowRawResponse(!showRawResponse)}
            className="w-full px-4 py-3 bg-background-panel flex items-center justify-between text-left hover:bg-tavern-dark transition-colors"
          >
            <span className="flex items-center gap-2 text-text-muted">
              <Icon name="FileText" className="w-5 h-5" />
              Additional AI Response Data ({Object.keys(tavern._raw).length} fields)
            </span>
            <Icon
              name={showRawResponse ? 'ChevronUp' : 'ChevronDown'}
              className="w-5 h-5 text-text-muted"
            />
          </button>
          {showRawResponse && (
            <div className="p-4 bg-background border-t border-border">
              <pre className="text-xs text-text-muted overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(tavern._raw, null, 2)}
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
        title="Tavern Generator"
        description="Generate taverns, inns, and drinking establishments for your campaign"
        icon="Beer"
        formTitle="Establishment Details"
        formIcon="Settings"
        resultsTitle="Generated Tavern"
        formContent={formContent}
        generatedContent={generatedContent}
        isGenerating={loading}
        onGenerate={generateTavern}
        generateButtonText="Generate Tavern"
        error={error || undefined}
      />

      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background-panel rounded-lg border border-border max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-text mb-4">Save Tavern</h3>
            <p className="text-text-muted mb-6">
              Save "{tavern?.name}" to your campaign for future reference?
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
                onClick={saveTavern}
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
