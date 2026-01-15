import { useState, useEffect, useRef } from 'react'
import { GeneratorLayout } from './GeneratorLayout'
import { FormField } from '@/components/ui/FormField'
import { ActionsBar } from '@/components/ui/ActionsBar'
import { useCampaignStore } from '../../store/campaignStore'
import Icon from '../common/Icon'
import CampaignSelector from '../common/CampaignSelector'
import AISettings, { AIGenerationSettings, getMaxTokensFromSettings } from './AISettings'
import { emitContentSaved } from '@/lib/contentEvents'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'
import { EntryModeToggle, EntryMode } from './shared/EntryModeToggle'
import { ArrayFieldEditor } from './shared/fields'
import { SaveModal, ParseWarning, RawDataViewer, ManualEntryPreview } from './shared'
import {
  ManualMerchantData,
  defaultMerchantData,
  merchantTypeOptions,
} from './shared/schemas/merchantSchema'
import {
  generateMerchant as generateMerchantApi,
  saveMerchant as saveMerchantApi,
  getErrorMessage,
} from '@/api/generators'
import { normalizeStringArray } from '@/utils/aiResponseNormalizer'
import { logger } from '@/utils/logger'

// Expected merchant structure
interface MerchantData {
  name: string
  shop_type: string
  atmosphere: string
  description: string
  location: string
  owner_name: string
  owner_personality: string
  owner_description: string
  inventory: InventoryItem[]
  services: ServiceItem[]
  special_items: InventoryItem[]
  rumors: string[]
  recently_sold: string[]
  special_notes: string
  haggle_willingness: string
  // For any unexpected fields from AI
  _raw?: Record<string, unknown>
  _parseError?: string
}

interface InventoryItem {
  name: string
  description: string
  price: string
  quantity?: string
}

interface ServiceItem {
  name: string
  description: string
  price: string
}

/**
 * Normalize a single inventory item
 */
function normalizeInventoryItem(value: unknown): InventoryItem | null {
  if (!value) return null

  if (typeof value === 'string') {
    return { name: value, description: '', price: 'varies' }
  }

  if (typeof value === 'object' && value !== null) {
    const item = value as Record<string, unknown>
    return {
      name: String(item.name || item.item || 'Unknown Item'),
      description: String(item.description || item.desc || ''),
      price: String(item.price || item.cost || 'varies'),
      quantity: item.quantity ? String(item.quantity) : undefined,
    }
  }

  return null
}

/**
 * Normalize inventory items array
 * Handles both array format and categorized object format (e.g., {Accessories: [...], Armor: [...], Weapons: [...]})
 */
function normalizeInventoryItems(value: unknown): InventoryItem[] {
  if (!value) return []

  // Handle array format
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeInventoryItem(item))
      .filter((item): item is InventoryItem => item !== null)
  }

  // Handle categorized object format (e.g., {Accessories: [...], Armor: [...], Weapons: [...]})
  if (typeof value === 'object' && value !== null) {
    const categorizedObj = value as Record<string, unknown>
    const allItems: InventoryItem[] = []

    for (const category of Object.keys(categorizedObj)) {
      const categoryItems = categorizedObj[category]
      if (Array.isArray(categoryItems)) {
        for (const item of categoryItems) {
          const normalized = normalizeInventoryItem(item)
          if (normalized) {
            // Optionally prefix name with category
            allItems.push(normalized)
          }
        }
      }
    }

    return allItems
  }

  return []
}

/**
 * Normalize a single service
 */
function normalizeService(value: unknown): ServiceItem | null {
  if (!value) return null

  if (typeof value === 'string') {
    return { name: value, description: '', price: 'varies' }
  }

  if (typeof value === 'object' && value !== null) {
    const service = value as Record<string, unknown>
    return {
      name: String(service.name || service.service || 'Unknown Service'),
      description: String(service.description || ''),
      price: String(service.price || service.cost || 'varies'),
    }
  }

  return null
}

/**
 * Normalize services array
 */
function normalizeServices(value: unknown): ServiceItem[] {
  if (!value || !Array.isArray(value)) return []

  return value
    .map((service) => normalizeService(service))
    .filter((service): service is ServiceItem => service !== null)
}

/**
 * Extract owner info from nested object or flat fields
 */
function extractOwnerInfo(raw: Record<string, unknown>): {
  name: string
  personality: string
  description: string
} {
  // Check for nested owner object
  const owner = raw.owner as Record<string, unknown> | undefined
  const keeper = raw.keeper as Record<string, unknown> | undefined
  const nested = owner || keeper

  if (nested && typeof nested === 'object') {
    return {
      name: String(nested.name || raw.owner_name || 'Unknown'),
      personality: String(nested.personality || raw.owner_personality || ''),
      description: String(nested.description || raw.owner_description || ''),
    }
  }

  return {
    name: String(raw.owner_name || raw.keeper_name || 'Unknown'),
    personality: String(raw.owner_personality || raw.keeper_personality || ''),
    description: String(raw.owner_description || raw.keeper_description || ''),
  }
}

/**
 * Main normalization function - converts raw AI response to typed MerchantData
 */
function normalizeMerchantResponse(raw: Record<string, unknown>): MerchantData {
  logger.debug('[MerchantGenerator] normalizeMerchantResponse input:', raw)

  // Handle case where description contains the entire JSON response
  let processedRaw = raw
  if (raw.description && typeof raw.description === 'string') {
    const descStr = (raw.description as string).trim()
    if (descStr.startsWith('{') && descStr.endsWith('}')) {
      try {
        const parsedMerchant = JSON.parse(descStr)
        logger.debug('[MerchantGenerator] Parsed merchant from JSON description:', parsedMerchant)
        processedRaw = parsedMerchant
      } catch (e) {
        logger.warn('[MerchantGenerator] Failed to parse description as JSON:', e)
      }
    }
  }

  // Expected fields for tracking unexpected ones
  const expectedFields = [
    'name',
    'shop_name',
    'title',
    'shop_type',
    'type',
    'atmosphere',
    'description',
    'location',
    'owner',
    'owner_name',
    'owner_personality',
    'owner_description',
    'keeper',
    'keeper_name',
    'keeper_personality',
    'keeper_description',
    'inventory',
    'items',
    'wares',
    'stock',
    'services',
    'special_items',
    'magical_items',
    'rare_items',
    'rumors',
    'gossip',
    'recently_sold',
    'special_notes',
    'notes',
    'secrets',
    'haggle_willingness',
    'haggling',
    'bargaining',
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

  const owner = extractOwnerInfo(processedRaw)

  // Get inventory from various possible field names
  let inventory = normalizeInventoryItems(processedRaw.inventory)
  if (inventory.length === 0) {
    inventory = normalizeInventoryItems(
      processedRaw.items || processedRaw.wares || processedRaw.stock
    )
  }

  // Get special items from various possible field names
  let specialItems = normalizeInventoryItems(processedRaw.special_items)
  if (specialItems.length === 0) {
    specialItems = normalizeInventoryItems(processedRaw.magical_items || processedRaw.rare_items)
  }

  // Get haggle willingness from various possible field names
  let haggleWillingness = ''
  if (processedRaw.haggle_willingness) {
    haggleWillingness = String(processedRaw.haggle_willingness)
  } else if (processedRaw.haggling) {
    haggleWillingness = String(processedRaw.haggling)
  } else if (processedRaw.bargaining) {
    haggleWillingness = String(processedRaw.bargaining)
  }

  const result: MerchantData = {
    name: String(
      processedRaw.name || processedRaw.shop_name || processedRaw.title || 'Unknown Shop'
    ),
    shop_type: String(processedRaw.shop_type || processedRaw.type || ''),
    atmosphere: String(processedRaw.atmosphere || ''),
    description: description,
    location: String(processedRaw.location || ''),
    owner_name: owner.name,
    owner_personality: owner.personality,
    owner_description: owner.description,
    inventory: inventory,
    services: normalizeServices(processedRaw.services),
    special_items: specialItems,
    rumors: normalizeStringArray(processedRaw.rumors || processedRaw.gossip),
    recently_sold: normalizeStringArray(processedRaw.recently_sold),
    special_notes: String(
      processedRaw.special_notes || processedRaw.notes || processedRaw.secrets || ''
    ),
    haggle_willingness: haggleWillingness,
    _raw: Object.keys(unexpectedFields).length > 0 ? unexpectedFields : undefined,
  }

  logger.debug('[MerchantGenerator] Normalized result:', result)
  return result
}

/**
 * Check if merchant has valid essential content
 */
function hasValidMerchantContent(merchant: MerchantData): boolean {
  return !!(
    merchant.name &&
    merchant.name !== 'Unknown Shop' &&
    (merchant.description ||
      merchant.atmosphere ||
      merchant.owner_name !== 'Unknown' ||
      merchant.inventory.length > 0)
  )
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function MerchantGenerator() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [merchant, setMerchant] = useState<MerchantData | null>(null)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showRawResponse, setShowRawResponse] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const { activeCampaignId } = useCampaignStore()

  // Manual entry mode state
  const [entryMode, setEntryMode] = useState<EntryMode>('ai')
  const [manualData, setManualData] = useState<ManualMerchantData>(defaultMerchantData)
  const [manualSaving, setManualSaving] = useState(false)
  const [manualSaved, setManualSaved] = useState(false)

  // Track if user has made an explicit campaign selection
  const hasUserSelectedCampaign = useRef(false)

  // Auto-select active campaign ONLY on initial mount
  useEffect(() => {
    if (activeCampaignId && !hasUserSelectedCampaign.current) {
      setCampaignId(activeCampaignId)
    }
  }, [activeCampaignId])

  // Form inputs
  const [shopType, setShopType] = useState('general_store')
  const [quality, setQuality] = useState('average')
  const [size, setSize] = useState('medium')
  const [partyLevel, setPartyLevel] = useState(5)
  const [specialRequests, setSpecialRequests] = useState('')

  // AI settings
  const [aiSettings, setAiSettings] = useState<AIGenerationSettings>({
    detailLevel: 'high',
    timeout: 120,
  })

  const generateMerchant = async () => {
    setLoading(true)
    setError(null)
    setMerchant(null)
    setShowRawResponse(false)
    setIsSaved(false)

    try {
      const data = await generateMerchantApi(
        {
          campaign_id: campaignId || undefined,
          shop_type: shopType,
          quality,
          size,
          party_level: String(partyLevel),
          special_requests: specialRequests || undefined,
          max_tokens: getMaxTokensFromSettings(aiSettings),
          timeout: aiSettings.timeout,
        },
        aiSettings.timeout
      )
      logger.debug('[MerchantGenerator] Raw API response:', data)

      // Normalize the response
      if (data.merchant) {
        const normalized = normalizeMerchantResponse(data.merchant)

        if (!hasValidMerchantContent(normalized)) {
          normalized._parseError =
            'AI response missing essential merchant content. Showing raw response.'
          setShowRawResponse(true)
        }

        setMerchant(normalized)
      } else {
        // No merchant wrapper - try to normalize the raw response
        const normalized = normalizeMerchantResponse(data as unknown as Record<string, unknown>)
        normalized._parseError = 'Unexpected response format. Attempting to display.'
        setShowRawResponse(true)
        setMerchant(normalized)
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const saveMerchant = async () => {
    if (!merchant) return

    try {
      await saveMerchantApi({
        name: merchant.name || 'Unnamed Shop',
        shop_type: merchant.shop_type || shopType,
        atmosphere: merchant.atmosphere,
        description: merchant.description,
        location: merchant.location,
        owner_name: merchant.owner_name,
        owner_personality: merchant.owner_personality,
        owner_description: merchant.owner_description,
        inventory: merchant.inventory,
        services: merchant.services,
        special_items: merchant.special_items,
        rumors: merchant.rumors,
        recently_sold: merchant.recently_sold,
        special_notes: merchant.special_notes,
        haggle_willingness: merchant.haggle_willingness,
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
    if (!merchant) return
    let text = `${merchant.name || 'Unnamed Shop'}\n${merchant.shop_type ? merchant.shop_type.replace(/_/g, ' ') : 'Shop'}\n${merchant.location ? `Location: ${merchant.location}\n` : ''}\n${merchant.atmosphere || ''}\n${merchant.description || ''}\n\nOwner: ${merchant.owner_name || 'Unknown'}\n${merchant.owner_personality || ''}\n${merchant.owner_description || ''}`

    if (merchant.haggle_willingness) {
      text += `\nHaggling: ${merchant.haggle_willingness}`
    }

    if (merchant.inventory && merchant.inventory.length > 0) {
      text += '\n\nInventory:\n'
      merchant.inventory.forEach((item) => {
        text += `${item.name} - ${item.price}${item.quantity ? ` (${item.quantity})` : ''}\n${item.description}\n\n`
      })
    }

    if (merchant.special_items && merchant.special_items.length > 0) {
      text += '\nSpecial Items:\n'
      merchant.special_items.forEach((item) => {
        text += `${item.name} - ${item.price}${item.quantity ? ` (${item.quantity})` : ''}\n${item.description}\n\n`
      })
    }

    if (merchant.services && merchant.services.length > 0) {
      text += '\nServices:\n'
      merchant.services.forEach((service) => {
        text += `${service.name} - ${service.price}\n${service.description}\n\n`
      })
    }

    if (merchant.recently_sold && merchant.recently_sold.length > 0) {
      text += '\nRecently Sold:\n'
      merchant.recently_sold.forEach((item) => {
        text += `- ${item}\n`
      })
    }

    if (merchant.rumors && merchant.rumors.length > 0) {
      text += '\nRumors:\n'
      merchant.rumors.forEach((rumor) => {
        text += `- ${rumor}\n`
      })
    }

    if (merchant.special_notes) {
      text += `\nSpecial Notes: ${merchant.special_notes}`
    }

    navigator.clipboard.writeText(text)
  }

  // Handle manual entry save
  const handleManualSave = async () => {
    if (!manualData.name.trim()) {
      setError('Merchant name is required')
      return
    }

    setManualSaving(true)
    setError(null)

    try {
      await saveMerchantApi({
        campaign_id: campaignId || undefined,
        name: manualData.name.trim(),
        shop_type: manualData.merchant_type,
        atmosphere: '',
        description: manualData.description.trim() || '',
        location: '',
        owner_name: manualData.name.trim(),
        owner_personality: manualData.personality.trim() || '',
        owner_description: manualData.appearance.trim() || '',
        inventory: manualData.inventory
          .filter((i) => i.name.trim())
          .map((i) => ({ name: i.name, description: i.description, price: i.price })),
        services: manualData.services
          .filter((s) => s.trim())
          .map((s) => ({ name: s, description: '', price: 'varies' })),
        special_items: manualData.specialties
          .filter((s) => s.trim())
          .map((s) => ({ name: s, description: '', price: 'varies' })),
        rumors: manualData.rumors.filter((r) => r.trim()),
        recently_sold: [],
        special_notes: manualData.quirks.filter((q) => q.trim()).join('; '),
        haggle_willingness: '',
        ai_generated: false,
      })

      setManualSaved(true)
      emitContentSaved()
      // Reset form after successful save
      setManualData(defaultMerchantData)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setManualSaving(false)
    }
  }

  // AI generation form content
  const aiFormContent = (
    <>
      <AISettings generatorType="merchant" onSettingsChange={setAiSettings} />
      <CampaignSelector
        selectedCampaignId={campaignId}
        onSelect={(id) => {
          hasUserSelectedCampaign.current = true
          setCampaignId(id)
        }}
      />

      <FormField label="Type of Shop">
        <select
          value={shopType}
          onChange={(e) => setShopType(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="general_store">General Store</option>
          <option value="weapon_shop">Weapon Shop</option>
          <option value="armor_shop">Armor Shop</option>
          <option value="magic_shop">Magic Shop</option>
          <option value="potion_shop">Potion Shop</option>
          <option value="bookstore">Bookstore</option>
          <option value="jeweler">Jeweler</option>
          <option value="tailor">Tailor / Clothier</option>
          <option value="blacksmith">Blacksmith</option>
          <option value="apothecary">Apothecary</option>
          <option value="curiosity_shop">Curiosity Shop</option>
          <option value="pawn_shop">Pawn Shop</option>
          <option value="exotic_goods">Exotic Goods</option>
          <option value="temple_shop">Temple Shop</option>
        </select>
      </FormField>

      <FormField label="Quality">
        <select
          value={quality}
          onChange={(e) => setQuality(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="poor">Poor (run-down, cheap)</option>
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
          <option value="tiny">Tiny (stall/cart)</option>
          <option value="small">Small (single room)</option>
          <option value="medium">Medium (storefront)</option>
          <option value="large">Large (warehouse)</option>
          <option value="massive">Massive (emporium)</option>
        </select>
      </FormField>

      <FormField label="Party Level" description="Determines item rarity and prices">
        <input
          type="number"
          min="1"
          max="20"
          value={partyLevel}
          onChange={(e) => setPartyLevel(parseInt(e.target.value) || 1)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      <FormField label="Special Requests" description="(optional)">
        <textarea
          value={specialRequests}
          onChange={(e) => setSpecialRequests(e.target.value)}
          placeholder="e.g., 'Has a secret back room with illegal goods' or 'Specializes in dragonbone weapons'"
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
      <FormField label="Merchant Name" required>
        <input
          type="text"
          value={manualData.name}
          onChange={(e) => setManualData({ ...manualData, name: e.target.value })}
          placeholder="e.g., Grimshaw's Emporium, The Wandering Peddler"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      <FormField label="Merchant Type">
        <select
          value={manualData.merchant_type}
          onChange={(e) => setManualData({ ...manualData, merchant_type: e.target.value })}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {merchantTypeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Description">
        <textarea
          value={manualData.description}
          onChange={(e) => setManualData({ ...manualData, description: e.target.value })}
          placeholder="Describe the shop and its atmosphere..."
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={3}
        />
      </FormField>

      {/* Merchant Details */}
      <CollapsibleSection title="Merchant Details" defaultExpanded>
        <div className="space-y-3">
          <FormField label="Personality">
            <input
              type="text"
              value={manualData.personality}
              onChange={(e) => setManualData({ ...manualData, personality: e.target.value })}
              placeholder="e.g., Gruff but fair, Overly friendly"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </FormField>

          <FormField label="Appearance">
            <textarea
              value={manualData.appearance}
              onChange={(e) => setManualData({ ...manualData, appearance: e.target.value })}
              placeholder="Physical description..."
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={2}
            />
          </FormField>

          <FormField label="Backstory">
            <textarea
              value={manualData.backstory}
              onChange={(e) => setManualData({ ...manualData, backstory: e.target.value })}
              placeholder="How did they become a merchant?"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={2}
            />
          </FormField>
        </div>
      </CollapsibleSection>

      {/* Inventory - Custom editor for 3-field objects */}
      <CollapsibleSection title="Inventory" defaultExpanded={false}>
        <div className="space-y-3">
          {manualData.inventory.map((item, idx) => (
            <div key={idx} className="bg-background p-3 rounded border border-border space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-text">Item {idx + 1}</span>
                <button
                  type="button"
                  onClick={() => {
                    const newItems = [...manualData.inventory]
                    newItems.splice(idx, 1)
                    setManualData({ ...manualData, inventory: newItems })
                  }}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => {
                    const newItems = [...manualData.inventory]
                    newItems[idx] = { ...item, name: e.target.value }
                    setManualData({ ...manualData, inventory: newItems })
                  }}
                  placeholder="Item name"
                  className="w-full px-3 py-1.5 bg-background border border-border rounded text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <input
                  type="text"
                  value={item.price}
                  onChange={(e) => {
                    const newItems = [...manualData.inventory]
                    newItems[idx] = { ...item, price: e.target.value }
                    setManualData({ ...manualData, inventory: newItems })
                  }}
                  placeholder="Price (e.g., 5 gp)"
                  className="w-full px-3 py-1.5 bg-background border border-border rounded text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <input
                type="text"
                value={item.description}
                onChange={(e) => {
                  const newItems = [...manualData.inventory]
                  newItems[idx] = { ...item, description: e.target.value }
                  setManualData({ ...manualData, inventory: newItems })
                }}
                placeholder="Description (optional)"
                className="w-full px-3 py-1.5 bg-background border border-border rounded text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setManualData({
                ...manualData,
                inventory: [...manualData.inventory, { name: '', description: '', price: '' }],
              })
            }
            className="w-full px-3 py-2 border border-dashed border-border text-text-muted hover:border-primary hover:text-primary rounded transition-colors text-sm"
          >
            + Add Inventory Item
          </button>
        </div>
      </CollapsibleSection>

      {/* Services */}
      <CollapsibleSection title="Services Offered" defaultExpanded={false}>
        <ArrayFieldEditor
          label="Services"
          values={manualData.services}
          onChange={(services) => setManualData({ ...manualData, services })}
          placeholder="Add a service..."
        />
      </CollapsibleSection>

      {/* Specialties */}
      <CollapsibleSection title="Specialties" defaultExpanded={false}>
        <ArrayFieldEditor
          label="Specialties"
          values={manualData.specialties}
          onChange={(specialties) => setManualData({ ...manualData, specialties })}
          placeholder="Add a specialty..."
        />
      </CollapsibleSection>

      {/* Quirks */}
      <CollapsibleSection title="Quirks & Traits" defaultExpanded={false}>
        <ArrayFieldEditor
          label="Quirks"
          values={manualData.quirks}
          onChange={(quirks) => setManualData({ ...manualData, quirks })}
          placeholder="Add a quirk..."
        />
      </CollapsibleSection>

      {/* Rumors */}
      <CollapsibleSection title="Rumors" defaultExpanded={false}>
        <ArrayFieldEditor
          label="Rumors"
          values={manualData.rumors}
          onChange={(rumors) => setManualData({ ...manualData, rumors })}
          placeholder="Add a rumor..."
        />
      </CollapsibleSection>

      {/* Connections */}
      <CollapsibleSection title="Connections" defaultExpanded={false}>
        <ArrayFieldEditor
          label="Connections"
          values={manualData.connections}
          onChange={(connections) => setManualData({ ...manualData, connections })}
          placeholder="Add a connection..."
        />
      </CollapsibleSection>

      {/* Save Button */}
      <button
        type="button"
        onClick={handleManualSave}
        disabled={manualSaving || !manualData.name.trim()}
        className="w-full px-4 py-3 bg-primary hover:bg-primary-dark disabled:bg-primary/50 text-tavern-darkest font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {manualSaving ? (
          <>
            <Icon name="Loader2" className="w-5 h-5 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Icon name="Save" className="w-5 h-5" />
            Save Merchant
          </>
        )}
      </button>

      {manualSaved && (
        <div className="text-center text-green-400 text-sm">
          Merchant saved! You can find it in the Saved Content section.
        </div>
      )}
    </>
  )

  // Combined form content with mode toggle
  const formContent = (
    <>
      <EntryModeToggle
        mode={entryMode}
        onChange={(mode) => {
          setEntryMode(mode)
          setManualSaved(false)
          setError(null)
        }}
        disabled={loading}
      />
      {entryMode === 'ai' ? aiFormContent : manualFormContent}
    </>
  )

  // Manual mode preview content (simple message)
  const manualPreviewContent = <ManualEntryPreview entityType="merchant" />

  const generatedContent = merchant ? (
    <div className="space-y-6">
      {/* Parse warning */}
      {merchant._parseError && <ParseWarning message={merchant._parseError} />}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-primary">{merchant.name || 'Unnamed Shop'}</h2>
        <p className="text-sm text-text-muted capitalize">
          {merchant.shop_type ? merchant.shop_type.replace(/_/g, ' ') : 'Shop'}
        </p>
        {merchant.location && <p className="text-sm text-text-muted mt-1">{merchant.location}</p>}
      </div>

      {/* Atmosphere & Description */}
      {(merchant.atmosphere || merchant.description) && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="Package" className="w-5 h-5 text-primary" />
            Atmosphere
          </h3>
          {merchant.atmosphere && (
            <p className="text-text-muted italic mb-2">{merchant.atmosphere}</p>
          )}
          {merchant.description && <p className="text-text">{merchant.description}</p>}
        </div>
      )}

      {/* Owner */}
      {merchant.owner_name && merchant.owner_name !== 'Unknown' && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="User" className="w-5 h-5 text-primary" />
            The Owner
          </h3>
          <p className="text-text font-medium">{merchant.owner_name}</p>
          {merchant.owner_personality && (
            <p className="text-text-muted italic mb-2">{merchant.owner_personality}</p>
          )}
          {merchant.owner_description && <p className="text-text">{merchant.owner_description}</p>}
          {merchant.haggle_willingness && (
            <p className="text-sm text-primary mt-2">Haggling: {merchant.haggle_willingness}</p>
          )}
        </div>
      )}

      {/* Inventory */}
      {merchant.inventory.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Package" className="w-5 h-5 text-primary" />
            Inventory
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {merchant.inventory.map((item, idx) => (
              <div key={idx} className="bg-background p-3 rounded border border-border">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-text">{item.name}</span>
                  <span className="text-primary font-medium">{item.price}</span>
                </div>
                {item.quantity && (
                  <p className="text-xs text-text-muted mb-1">Stock: {item.quantity}</p>
                )}
                {item.description && <p className="text-sm text-text-muted">{item.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Special Items */}
      {merchant.special_items.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Sparkles" className="w-5 h-5 text-primary" />
            Special Items
          </h3>
          <div className="space-y-3">
            {merchant.special_items.map((item, idx) => (
              <div key={idx} className="bg-background p-4 rounded border-2 border-primary/30">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-text">{item.name}</span>
                  <span className="text-primary font-bold">{item.price}</span>
                </div>
                {item.quantity && (
                  <p className="text-xs text-text-muted mb-1">Stock: {item.quantity}</p>
                )}
                {item.description && <p className="text-sm text-text">{item.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Services */}
      {merchant.services.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Wrench" className="w-5 h-5 text-primary" />
            Services Offered
          </h3>
          <div className="space-y-2">
            {merchant.services.map((service, idx) => (
              <div key={idx} className="bg-background p-3 rounded border border-border">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-text">{service.name}</span>
                  <span className="text-primary font-medium">{service.price}</span>
                </div>
                {service.description && (
                  <p className="text-sm text-text-muted">{service.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recently Sold */}
      {merchant.recently_sold.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Package" className="w-5 h-5 text-primary" />
            Recently Sold
          </h3>
          <ul className="space-y-2">
            {merchant.recently_sold.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-text">
                <span className="text-primary">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Rumors */}
      {merchant.rumors.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="MessageCircle" className="w-5 h-5 text-primary" />
            Rumors & Gossip
          </h3>
          <ul className="space-y-2">
            {merchant.rumors.map((rumor, idx) => (
              <li key={idx} className="flex items-start gap-2 text-text">
                <span className="text-primary">•</span>
                <span className="italic">{rumor}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Special Notes */}
      {merchant.special_notes && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="AlertCircle" className="w-5 h-5 text-primary" />
            Special Notes
          </h3>
          <p className="text-text">{merchant.special_notes}</p>
        </div>
      )}

      {/* Raw/unexpected fields - collapsible */}
      {merchant._raw && <RawDataViewer data={merchant._raw} defaultExpanded={showRawResponse} />}

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
        title="Merchant & Shop Generator"
        description="Generate merchants, shops, and trading posts for your campaign"
        icon="Package"
        formTitle="Shop Details"
        formIcon="Settings"
        resultsTitle={entryMode === 'manual' ? 'Manual Entry' : 'Generated Merchant'}
        formContent={formContent}
        generatedContent={entryMode === 'manual' ? manualPreviewContent : generatedContent}
        isGenerating={loading}
        onGenerate={generateMerchant}
        generateButtonText="Generate Merchant"
        error={error || undefined}
        hideGenerateButton={entryMode === 'manual'}
      />

      <SaveModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={saveMerchant}
        entityName={merchant?.name || 'Merchant'}
        campaignId={campaignId}
      />
    </>
  )
}
