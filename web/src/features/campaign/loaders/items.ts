// Item content loader

import type { CampaignContent } from '../types'
import { fetchContentData, parseJSONField } from './utils'

export async function loadItems(campaignId: string): Promise<CampaignContent[]> {
  const items = await fetchContentData<any>('items', campaignId, 'items')

  return items.map((item: any) => {
    let propsDisplay = ''
    if (item.properties) {
      const props = parseJSONField<any>(item.properties)
      if (props) {
        if (typeof props === 'object' && !Array.isArray(props)) {
          propsDisplay = Object.entries(props)
            .map(([key, value]) => `- **${key}:** ${value}`)
            .join('\n')
        } else if (Array.isArray(props)) {
          propsDisplay = props.map((prop: string) => `- ${prop}`).join('\n')
        } else {
          propsDisplay = String(props)
        }
      }
    }

    return {
      id: item.id,
      campaign_id: campaignId,
      user_id: item.user_id || '',
      section: 'items',
      subsection: null,
      title: item.name,
      content: [
        `**Rarity:** ${item.rarity || 'N/A'}`,
        `**Type:** ${item.type || 'N/A'}`,
        item.value ? `**Value:** ${item.value} gp` : '',
        item.weight ? `**Weight:** ${item.weight} lbs` : '',
        item.attunement ? '**Requires Attunement**' : '',
        '',
        `**Description:**\n${item.description || 'N/A'}`,
        propsDisplay ? `\n**Properties:**\n${propsDisplay}` : '',
        item.origin ? `\n**Origin:**\n${item.origin}` : '',
        item.previous_owner ? `\n**Previous Owner:**\n${item.previous_owner}` : '',
        item.complication ? `\n**Complication:**\n${item.complication}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
      type: (item.ai_generated ? 'imported' : 'manual') as 'manual' | 'imported',
      created_at: item.created_at,
      updated_at: item.created_at,
    }
  })
}
