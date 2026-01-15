// Location content loader

import type { CampaignContent } from '../types'
import { fetchContentData, formatArrayField, formatObjectField } from './utils'

export async function loadLocations(campaignId: string): Promise<CampaignContent[]> {
  const locations = await fetchContentData<any>('locations', campaignId, 'locations')

  return locations.map((location: any) => ({
    id: location.id,
    campaign_id: campaignId,
    user_id: location.user_id || '',
    section: 'locations',
    subsection: null,
    title: location.name,
    content: [
      `**Type:** ${location.type || 'N/A'}`,
      location.theme ? `**Theme:** ${location.theme}` : '',
      '',
      `**Description:**\n${location.description || 'N/A'}`,
      location.features ? `\n**Features:**\n${formatArrayField(location.features)}` : '',
      location.secrets ? `\n**Secrets:**\n${formatArrayField(location.secrets)}` : '',
      location.factions ? `\n**Factions:**\n${formatObjectField(location.factions)}` : '',
      location.npcs ? `\n**NPCs:**\n${formatObjectField(location.npcs)}` : '',
      location.encounters ? `\n**Encounters:**\n${formatObjectField(location.encounters)}` : '',
      location.map ? `\n**Map:**\n${location.map}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    type: (location.ai_generated ? 'imported' : 'manual') as 'manual' | 'imported',
    created_at: location.created_at,
    updated_at: location.created_at,
    locationData: location,
  }))
}
