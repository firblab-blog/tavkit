// Merchant content loader

import type { CampaignContent } from '../types'
import { fetchContentData, parseJSONField } from './utils'

interface InventoryItem {
  name: string
  price: string
  quantity?: number
  description?: string
}

interface Service {
  name: string
  price: string
  description?: string
}

function formatInventory(inventory: any): string {
  const parsed = parseJSONField<InventoryItem[]>(inventory)
  if (!Array.isArray(parsed)) return ''
  return parsed
    .map((item) => {
      if (typeof item === 'string') return `- ${item}`
      return `- **${item.name}** (${item.price})${item.quantity ? ` - Stock: ${item.quantity}` : ''}${item.description ? `: ${item.description}` : ''}`
    })
    .join('\n')
}

function formatServices(services: any): string {
  const parsed = parseJSONField<Service[]>(services)
  if (!Array.isArray(parsed)) return ''
  return parsed
    .map((service) => {
      if (typeof service === 'string') return `- ${service}`
      return `- **${service.name}** (${service.price})${service.description ? `: ${service.description}` : ''}`
    })
    .join('\n')
}

function formatRumors(rumors: any): string {
  const parsed = parseJSONField<any[]>(rumors)
  if (!Array.isArray(parsed)) return ''
  return parsed.map((r) => `- ${typeof r === 'string' ? r : r.text || r.rumor || r}`).join('\n')
}

function formatRecentlySold(recentlySold: any): string {
  const parsed = parseJSONField<any[]>(recentlySold)
  if (!Array.isArray(parsed)) return ''
  return parsed
    .map((item) => `- ${typeof item === 'string' ? item : item.description || item}`)
    .join('\n')
}

export async function loadMerchants(campaignId: string): Promise<CampaignContent[]> {
  const merchants = await fetchContentData<any>('merchants', campaignId, 'merchants')

  return merchants.map((merchant: any) => {
    const inventoryDisplay = formatInventory(merchant.inventory)
    const servicesDisplay = formatServices(merchant.services)
    const specialItemsDisplay = formatInventory(merchant.special_items)
    const rumorsDisplay = formatRumors(merchant.rumors)
    const recentlySoldDisplay = formatRecentlySold(merchant.recently_sold)

    // Owner display
    const ownerDisplay = merchant.owner_name
      ? `\n\n**Owner:** ${merchant.owner_name}${merchant.owner_personality ? ` (${merchant.owner_personality})` : ''}${merchant.owner_description ? `\n${merchant.owner_description}` : ''}${merchant.haggle_willingness ? `\nHaggling: ${merchant.haggle_willingness}` : ''}`
      : ''

    return {
      id: merchant.id,
      campaign_id: campaignId,
      user_id: merchant.user_id || '',
      section: 'merchants',
      subsection: null,
      title: merchant.name,
      content: [
        `**Type:** ${merchant.shop_type || 'N/A'}`,
        merchant.location ? `**Location:** ${merchant.location}` : '',
        '',
        `**Atmosphere:** ${merchant.atmosphere || 'N/A'}`,
        merchant.description ? merchant.description : '',
        ownerDisplay,
        inventoryDisplay ? `\n**Inventory:**\n${inventoryDisplay}` : '',
        servicesDisplay ? `\n**Services:**\n${servicesDisplay}` : '',
        specialItemsDisplay ? `\n**Special Items:**\n${specialItemsDisplay}` : '',
        recentlySoldDisplay ? `\n**Recently Sold:**\n${recentlySoldDisplay}` : '',
        rumorsDisplay ? `\n**Rumors:**\n${rumorsDisplay}` : '',
        merchant.special_notes ? `\n**Special Notes:**\n${merchant.special_notes}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
      type: (merchant.ai_generated ? 'imported' : 'manual') as 'manual' | 'imported',
      created_at: merchant.created_at,
      updated_at: merchant.created_at,
    }
  })
}
