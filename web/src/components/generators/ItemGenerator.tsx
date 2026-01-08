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
  generateItem as generateItemApi,
  saveItem as saveItemApi,
  getErrorMessage,
} from '@/api/generators'
import { normalizeBoolean, normalizeFlexibleField } from '@/utils/aiResponseNormalizer'
import { logger } from '@/utils/logger'

// Expected item structure
interface ItemData {
  name: string
  type: string
  rarity: string
  description: string
  properties: Record<string, unknown>
  origin: string | OriginObject
  previous_owner: string | PreviousOwnerObject
  complication: string | ComplicationObject
  value: number | ValueObject
  weight: number | WeightObject
  attunement: boolean
  // For any unexpected fields from AI
  _raw?: Record<string, unknown>
  _parseError?: string
}

interface OriginObject {
  creator?: string
  creation_date?: string
  location_created?: string
  backstory?: string
}

interface PreviousOwnerObject {
  name?: string
  description?: string
}

interface ComplicationObject {
  name?: string
  description?: string
  effect?: string
}

interface ValueObject {
  amount: number
  currency?: string
}

interface WeightObject {
  amount: number
  unit?: string
}

// ============================================================================
// NORMALIZATION FUNCTIONS (matching DialogueBuilder pattern)
// These ensure AI response is properly typed regardless of what format AI returns
// ============================================================================

/**
 * Main normalization function - converts raw AI response to typed ItemData
 * This is the frontend safety net (backend should also validate)
 */
function normalizeItemResponse(raw: Record<string, unknown>): ItemData {
  logger.debug('[ItemGenerator] normalizeItemResponse input:', raw)

  // Handle case where description contains the entire JSON response
  let processedRaw = raw
  if (raw.description && typeof raw.description === 'string') {
    const descStr = (raw.description as string).trim()
    if (descStr.startsWith('{') && descStr.endsWith('}')) {
      try {
        const parsedItem = JSON.parse(descStr)
        logger.debug('[ItemGenerator] Parsed item from JSON description:', parsedItem)
        processedRaw = parsedItem
      } catch (e) {
        logger.warn('[ItemGenerator] Failed to parse description as JSON:', e)
      }
    }
  }

  // Expected fields for tracking unexpected ones
  const expectedFields = [
    'name',
    'type',
    'rarity',
    'description',
    'properties',
    'origin',
    'previous_owner',
    'complication',
    'value',
    'weight',
    'attunement',
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

  // Build description - handle case where it's not JSON
  let description = ''
  if (processedRaw.description && typeof processedRaw.description === 'string') {
    const descText = processedRaw.description as string
    // Only use if it's not JSON
    if (!descText.trim().startsWith('{')) {
      description = descText
    }
  }
  if (!description && processedRaw.summary) {
    description = String(processedRaw.summary)
  }

  const result: ItemData = {
    name: String(processedRaw.name || 'Unknown Item'),
    type: String(processedRaw.type || ''),
    rarity: String(processedRaw.rarity || ''),
    description: description,
    properties: normalizeProperties(processedRaw.properties),
    origin: normalizeFlexibleField(processedRaw.origin),
    previous_owner: normalizeFlexibleField(processedRaw.previous_owner),
    complication: normalizeFlexibleField(processedRaw.complication),
    value: normalizeNumericField(processedRaw.value),
    weight: normalizeNumericField(processedRaw.weight),
    attunement: normalizeBoolean(processedRaw.attunement),
    _raw: Object.keys(unexpectedFields).length > 0 ? unexpectedFields : undefined,
  }

  logger.debug('[ItemGenerator] Normalized result:', result)
  return result
}

/**
 * Normalize properties to a Record
 */
function normalizeProperties(value: unknown): Record<string, unknown> {
  if (!value) return {}

  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  // If it's an array, convert to object
  if (Array.isArray(value)) {
    const result: Record<string, unknown> = {}
    value.forEach((item, index) => {
      if (typeof item === 'string') {
        result[item] = true
      } else if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>
        if (obj.name) {
          result[String(obj.name)] = obj.description || obj.effect || true
        } else {
          result[`property_${index}`] = item
        }
      }
    })
    return result
  }

  return {}
}

/**
 * Normalize numeric fields that can be number or object with amount
 */
function normalizeNumericField(
  value: unknown
): number | { amount: number; currency?: string; unit?: string } {
  if (!value) return 0

  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string') {
    const num = parseFloat(value)
    return isNaN(num) ? 0 : num
  }

  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>
    if (obj.amount !== undefined) {
      return {
        amount: Number(obj.amount) || 0,
        currency: obj.currency ? String(obj.currency) : undefined,
        unit: obj.unit ? String(obj.unit) : undefined,
      }
    }
  }

  return 0
}

/**
 * Check if item has valid essential content
 */
function hasValidItemContent(item: ItemData): boolean {
  return !!(
    item.name &&
    item.name !== 'Unknown Item' &&
    (item.description || Object.keys(item.properties).length > 0)
  )
}

/**
 * Helper to get display value for value field
 */
function getValueDisplay(value: number | ValueObject): string {
  if (typeof value === 'number') {
    return `${value} gp`
  }
  if (typeof value === 'object' && value.amount !== undefined) {
    return `${value.amount} ${value.currency || 'gp'}`
  }
  return 'Unknown'
}

/**
 * Helper to get display value for weight field
 */
function getWeightDisplay(weight: number | WeightObject): string {
  if (typeof weight === 'number') {
    return `${weight} lb`
  }
  if (typeof weight === 'object' && weight.amount !== undefined) {
    return `${weight.amount} ${weight.unit || 'lb'}`
  }
  return 'Unknown'
}

/**
 * Helper to get numeric value for saving
 */
function getNumericValue(value: number | ValueObject | WeightObject): number {
  if (typeof value === 'number') return value
  if (typeof value === 'object' && value.amount !== undefined) return value.amount
  return 0
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function ItemGenerator() {
  const [specialRequests, setSpecialRequests] = useState('')
  const [type, setType] = useState('weapon')
  const [rarity, setRarity] = useState('uncommon')
  const [category, setCategory] = useState('magical')
  const [cursed, setCursed] = useState('no')
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [item, setItem] = useState<ItemData | null>(null)
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
    setItem(null)
    setShowRawResponse(false)
    setIsSaved(false)

    try {
      const data = await generateItemApi(
        {
          campaign_id: campaignId || undefined,
          type: type,
          rarity: rarity,
          category: category,
          cursed: cursed,
          special_requests: specialRequests || undefined,
          max_tokens: getMaxTokensFromSettings(aiSettings),
          timeout: aiSettings.timeout,
        },
        aiSettings.timeout
      )
      logger.debug('[ItemGenerator] Raw API response:', data)

      // Normalize the response to handle missing/unexpected fields
      if (data.item) {
        const normalized = normalizeItemResponse(data.item)

        // Check if we got valid item content
        if (!hasValidItemContent(normalized)) {
          normalized._parseError =
            'AI response missing essential item content. Showing raw response.'
          setShowRawResponse(true)
        }

        setItem(normalized)
      } else {
        // No item wrapper - try to normalize the raw response
        const normalized = normalizeItemResponse(data as unknown as Record<string, unknown>)
        normalized._parseError = 'Unexpected response format. Attempting to display.'
        setShowRawResponse(true)
        setItem(normalized)
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!item) return

    setError('')

    try {
      const activeCampaignId = useCampaignStore.getState().activeCampaignId

      // Convert origin to string for saving
      const originStr =
        typeof item.origin === 'string'
          ? item.origin
          : item.origin
            ? JSON.stringify(item.origin)
            : ''

      await saveItemApi({
        name: item.name || 'Unnamed Item',
        type: item.type || type || 'weapon',
        rarity: item.rarity || rarity,
        description: item.description,
        origin: originStr,
        properties: item.properties || {},
        value: getNumericValue(item.value),
        weight: getNumericValue(item.weight),
        attunement: item.attunement,
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
    if (!item) return
    let text = `${item.name}\n${item.rarity} • ${item.type}\n\nDescription:\n${item.description}`

    if (item.origin) {
      if (typeof item.origin === 'string') {
        text += `\n\nOrigin:\n${item.origin}`
      } else {
        const origin = item.origin as OriginObject
        text += '\n\nOrigin:'
        if (origin.creator) text += `\nCreator: ${origin.creator}`
        if (origin.creation_date) text += `\nCreated: ${origin.creation_date}`
        if (origin.location_created) text += `\nLocation: ${origin.location_created}`
        if (origin.backstory) text += `\nBackstory: ${origin.backstory}`
      }
    }

    if (item.properties && Object.keys(item.properties).length > 0) {
      text += '\n\nProperties:'
      Object.entries(item.properties).forEach(([key, value]) => {
        if (key === 'damage_dice' && typeof value === 'object' && value !== null) {
          const dice = value as Record<string, unknown>
          const diceStr =
            dice.count && dice.die
              ? `${dice.count}d${dice.die}${dice.bonus ? ` + ${dice.bonus}` : ''}`
              : JSON.stringify(value)
          text += `\n- ${key.replace(/_/g, ' ')}: ${diceStr}`
        } else if (typeof value === 'object' && value !== null) {
          text += `\n- ${key.replace(/_/g, ' ')}: ${JSON.stringify(value)}`
        } else {
          text += `\n- ${key.replace(/_/g, ' ')}: ${String(value)}`
        }
      })
    }

    if (item.value) {
      text += `\n\nValue: ${getValueDisplay(item.value)}`
    }
    if (item.weight) {
      text += `\nWeight: ${getWeightDisplay(item.weight)}`
    }
    if (item.attunement) {
      text += '\nRequires Attunement'
    }

    navigator.clipboard.writeText(text)
  }

  const formContent = (
    <>
      <AISettings generatorType="item" onSettingsChange={setAiSettings} />
      <CampaignSelector
        selectedCampaignId={campaignId}
        onSelect={(id) => {
          hasUserSelectedCampaign.current = true
          setCampaignId(id)
        }}
      />

      <FormField label="Item Type">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="weapon">Weapon (sword, axe, bow)</option>
          <option value="armor">Armor (plate, chain, leather)</option>
          <option value="shield">Shield</option>
          <option value="ring">Ring</option>
          <option value="amulet">Amulet/Necklace</option>
          <option value="wand">Wand/Rod/Staff</option>
          <option value="potion">Potion</option>
          <option value="scroll">Scroll</option>
          <option value="wondrous">Wondrous Item</option>
          <option value="tool">Tool/Instrument</option>
          <option value="treasure">Treasure/Gem</option>
        </select>
      </FormField>

      <FormField label="Rarity">
        <select
          value={rarity}
          onChange={(e) => setRarity(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="common">Common (simple magic)</option>
          <option value="uncommon">Uncommon (useful magic)</option>
          <option value="rare">Rare (powerful magic)</option>
          <option value="very_rare">Very Rare (exceptional)</option>
          <option value="legendary">Legendary (world-altering)</option>
          <option value="artifact">Artifact (unique, ancient)</option>
        </select>
      </FormField>

      <FormField label="Category">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="magical">Magical (enchanted)</option>
          <option value="mundane">Mundane (non-magical)</option>
          <option value="consumable">Consumable (single-use)</option>
          <option value="artifact">Artifact/Relic (legendary)</option>
        </select>
      </FormField>

      <FormField label="Cursed?">
        <select
          value={cursed}
          onChange={(e) => setCursed(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="no">No (blessed/neutral)</option>
          <option value="yes">Yes (cursed)</option>
          <option value="maybe">Maybe (randomly cursed)</option>
        </select>
      </FormField>

      <FormField label="Special Requests" description="(optional)">
        <textarea
          value={specialRequests}
          onChange={(e) => setSpecialRequests(e.target.value)}
          placeholder="e.g., 'Forged from meteor iron' or 'Whispers ancient secrets to its wielder' or 'Once belonged to a legendary dragon slayer'"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={3}
        />
      </FormField>
    </>
  )

  const generatedContent = item ? (
    <div className="space-y-6">
      {/* Parse warning */}
      {item._parseError && (
        <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-400 font-semibold mb-2">
            <Icon name="AlertCircle" className="w-5 h-5" />
            Response Format Warning
          </div>
          <p className="text-text-muted text-sm">{item._parseError}</p>
        </div>
      )}

      {/* Header - styled like Monster/NPC */}
      <div>
        <h2 className="text-2xl font-bold text-primary mb-2">{item.name}</h2>
        <p className="text-text-muted capitalize">
          {item.rarity} • {item.type}
        </p>
      </div>

      {/* Core Stats - Colored Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-background p-3 rounded border border-border">
          <p className="text-xs text-text-muted mb-1">Value</p>
          <p className="text-xl font-bold text-amber-400">{getValueDisplay(item.value)}</p>
        </div>
        <div className="bg-background p-3 rounded border border-border">
          <p className="text-xs text-text-muted mb-1">Weight</p>
          <p className="text-xl font-bold text-blue-400">{getWeightDisplay(item.weight)}</p>
        </div>
        <div className="bg-background p-3 rounded border border-border">
          <p className="text-xs text-text-muted mb-1">Attunement</p>
          <p
            className={`text-xl font-bold ${item.attunement ? 'text-purple-400' : 'text-text-muted'}`}
          >
            {item.attunement ? 'Required' : 'No'}
          </p>
        </div>
      </div>

      {/* Description - styled with primary accent */}
      {item.description && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="FileText" className="w-5 h-5 text-primary" />
            Description
          </h3>
          <div className="bg-background p-4 rounded border border-primary/30">
            <p className="text-text whitespace-pre-line">{item.description}</p>
          </div>
        </div>
      )}

      {/* Origin - styled with purple accent */}
      {item.origin &&
        (typeof item.origin === 'string' ? item.origin : Object.keys(item.origin).length > 0) && (
          <div>
            <h3 className="text-lg font-semibold text-purple-400 mb-2 flex items-center gap-2">
              <Icon name="Book" className="w-5 h-5" />
              Origin
            </h3>
            <div className="bg-purple-500/10 p-4 rounded border border-purple-500/30">
              {typeof item.origin === 'string' ? (
                <p className="text-text">{item.origin}</p>
              ) : (
                <div className="space-y-2 text-text">
                  {(item.origin as OriginObject).creator && (
                    <p>
                      <strong className="text-purple-400">Creator:</strong>{' '}
                      {(item.origin as OriginObject).creator}
                    </p>
                  )}
                  {(item.origin as OriginObject).creation_date && (
                    <p>
                      <strong className="text-purple-400">Created:</strong>{' '}
                      {(item.origin as OriginObject).creation_date}
                    </p>
                  )}
                  {(item.origin as OriginObject).location_created && (
                    <p>
                      <strong className="text-purple-400">Location:</strong>{' '}
                      {(item.origin as OriginObject).location_created}
                    </p>
                  )}
                  {(item.origin as OriginObject).backstory && (
                    <p>
                      <strong className="text-purple-400">Backstory:</strong>{' '}
                      {(item.origin as OriginObject).backstory}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      {/* Properties - styled with primary accent like Traits */}
      {item.properties && Object.keys(item.properties).length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Sparkles" className="w-5 h-5 text-primary" />
            Properties
          </h3>
          <div className="space-y-3">
            {Object.entries(item.properties).map(([key, value]) => {
              // Format damage_dice objects like {count: 1, die: 6, bonus: 2}
              let displayValue: string
              if (key === 'damage_dice' && typeof value === 'object' && value !== null) {
                const dice = value as Record<string, unknown>
                displayValue =
                  dice.count && dice.die
                    ? `${dice.count}d${dice.die}${dice.bonus ? ` + ${dice.bonus}` : ''}`
                    : JSON.stringify(value)
              } else if (typeof value === 'object' && value !== null) {
                displayValue = JSON.stringify(value)
              } else {
                displayValue = String(value)
              }

              return (
                <div key={key} className="bg-background p-4 rounded border border-primary/30">
                  <h4 className="font-medium text-primary mb-1 capitalize">
                    {key.replace(/_/g, ' ')}
                  </h4>
                  <p className="text-text text-sm">{displayValue}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Raw/unexpected fields - collapsible */}
      {item._raw && Object.keys(item._raw).length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setShowRawResponse(!showRawResponse)}
            className="w-full px-4 py-3 bg-background-panel flex items-center justify-between text-left hover:bg-tavern-dark transition-colors"
          >
            <span className="flex items-center gap-2 text-text-muted">
              <Icon name="FileText" className="w-5 h-5" />
              Additional AI Response Data ({Object.keys(item._raw).length} fields)
            </span>
            <Icon
              name={showRawResponse ? 'ChevronUp' : 'ChevronDown'}
              className="w-5 h-5 text-text-muted"
            />
          </button>
          {showRawResponse && (
            <div className="p-4 bg-background border-t border-border">
              <pre className="text-xs text-text-muted overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(item._raw, null, 2)}
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
        title="Item Generator"
        description="Create magical items, weapons, armor, and treasures for your campaign"
        icon="Package"
        formTitle="Item Details"
        formIcon="Settings"
        resultsTitle="Generated Item"
        formContent={formContent}
        generatedContent={generatedContent}
        isGenerating={loading}
        onGenerate={handleGenerate}
        generateButtonText="Generate Item"
        error={error}
      />

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background-panel rounded-lg border border-border max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-text mb-4">Save Item</h3>
            <p className="text-text-muted mb-6">
              Save "{item?.name}" to your campaign for future reference?
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
