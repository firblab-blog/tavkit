// Tavern content loader

import type { CampaignContent } from '../types'
import { fetchContentData, parseJSONField } from './utils'

interface MenuItem {
  name: string
  price: string
  description?: string
}

interface Room {
  type?: string
  name?: string
  price: string
  available?: number
  description?: string
  details?: string
}

interface Patron {
  name: string
  race?: string
  description?: string
  hook?: string
}

function formatMenuItems(items: any): string {
  const parsed = parseJSONField<MenuItem[]>(items)
  if (!Array.isArray(parsed)) return ''
  return parsed
    .map((item) => {
      if (typeof item === 'string') return `- ${item}`
      return `- **${item.name}** (${item.price})${item.description ? `: ${item.description}` : ''}`
    })
    .join('\n')
}

function formatRooms(rooms: any): string {
  const parsed = parseJSONField<Room[]>(rooms)
  if (!Array.isArray(parsed)) return ''
  return parsed
    .map((room) => {
      if (typeof room === 'string') return `- ${room}`
      return `- **${room.type || room.name}** (${room.price}${room.available ? `, ${room.available} available` : ''})${room.description || room.details ? `: ${room.description || room.details}` : ''}`
    })
    .join('\n')
}

function formatPatrons(patrons: any): string {
  const parsed = parseJSONField<Patron[]>(patrons)
  if (!Array.isArray(parsed)) return ''
  return parsed
    .map((patron) => {
      if (typeof patron === 'string') return `- ${patron}`
      let line = `- **${patron.name}**`
      if (patron.race) line += ` (${patron.race})`
      if (patron.description) line += `: ${patron.description}`
      if (patron.hook) line += `\n  💡 ${patron.hook}`
      return line
    })
    .join('\n')
}

function formatSimpleArray(items: any): string {
  const parsed = parseJSONField<any[]>(items)
  if (!Array.isArray(parsed)) return ''
  return parsed
    .map((item) => {
      if (typeof item === 'string') return `- ${item}`
      return `- ${item.description || item.name || item.text || item}`
    })
    .join('\n')
}

export async function loadTaverns(campaignId: string): Promise<CampaignContent[]> {
  const taverns = await fetchContentData<any>('taverns', campaignId, 'taverns')

  return taverns.map((tavern: any) => {
    const menuFoodDisplay = formatMenuItems(tavern.menu_food)
    const menuDrinksDisplay = formatMenuItems(tavern.menu_drinks)
    const accommodationsDisplay = formatRooms(tavern.rooms)
    const patronsDisplay = formatPatrons(tavern.patrons)
    const eventsDisplay = formatSimpleArray(tavern.events)
    const rumorsDisplay = formatSimpleArray(tavern.rumors)

    // Build keeper section
    let keeperDisplay = ''
    if (tavern.keeper_name || tavern.keeper_personality || tavern.keeper_description) {
      keeperDisplay = '\n\n**The Keeper:**\n'
      if (tavern.keeper_name) keeperDisplay += `**${tavern.keeper_name}**\n`
      if (tavern.keeper_personality) keeperDisplay += `_${tavern.keeper_personality}_\n`
      if (tavern.keeper_description) keeperDisplay += `${tavern.keeper_description}\n`
    }

    return {
      id: tavern.id,
      campaign_id: campaignId,
      user_id: tavern.user_id || '',
      section: 'taverns',
      subsection: null,
      title: tavern.name,
      content: [
        `**Atmosphere:** ${tavern.atmosphere || 'N/A'}`,
        tavern.description ? tavern.description : '',
        keeperDisplay,
        menuFoodDisplay || menuDrinksDisplay
          ? `\n**Menu:**${menuFoodDisplay ? `\nFood:\n${menuFoodDisplay}` : ''}${menuDrinksDisplay ? `\n\nDrinks:\n${menuDrinksDisplay}` : ''}`
          : '',
        accommodationsDisplay ? `\n**Accommodations:**\n${accommodationsDisplay}` : '',
        patronsDisplay ? `\n**Notable Patrons:**\n${patronsDisplay}` : '',
        eventsDisplay ? `\n**Current Events:**\n${eventsDisplay}` : '',
        rumorsDisplay ? `\n**Rumors & Gossip:**\n${rumorsDisplay}` : '',
        tavern.special_notes ? `\n**Special Notes:**\n${tavern.special_notes}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
      type: (tavern.ai_generated ? 'imported' : 'manual') as 'manual' | 'imported',
      created_at: tavern.created_at,
      updated_at: tavern.created_at,
    }
  })
}
