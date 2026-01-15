// Encounter content loader

import type { CampaignContent } from '../types'
import { fetchContentData, parseJSONField } from './utils'

interface Creature {
  count: number
  name: string
  cr: string | number
  role?: string
  tactics?: string
}

interface Environment {
  setting?: string
  features?: string[]
  lighting?: string
}

interface Treasure {
  coins?: Record<string, number>
  items?: string[]
}

export async function loadEncounters(campaignId: string): Promise<CampaignContent[]> {
  const encounters = await fetchContentData<any>('encounters', campaignId, 'encounters')

  return encounters.map((encounter: any) => {
    // Format Creatures
    let creaturesDisplay = ''
    const creatures = parseJSONField<Creature[]>(encounter.creatures)
    if (Array.isArray(creatures)) {
      creaturesDisplay = creatures
        .map(
          (c) =>
            `- **${c.count}x ${c.name}** (CR ${c.cr}${c.role ? `, ${c.role}` : ''})${c.tactics ? `\n  _Tactics:_ ${c.tactics}` : ''}`
        )
        .join('\n')
    }

    // Format Environment
    let environmentDisplay = ''
    const env = parseJSONField<Environment>(encounter.environment)
    if (env) {
      const envLines = []
      if (env.setting) envLines.push(`- **Setting:** ${env.setting}`)
      if (env.features?.length) envLines.push(`- **Features:** ${env.features.join(', ')}`)
      if (env.lighting) envLines.push(`- **Lighting:** ${env.lighting}`)
      environmentDisplay = envLines.join('\n')
    }

    // Format Treasure
    let treasureDisplay = ''
    const treasure = parseJSONField<Treasure>(encounter.treasure)
    if (treasure) {
      const parts = []
      if (treasure.coins && typeof treasure.coins === 'object') {
        const coins = Object.entries(treasure.coins)
          .map(([k, v]) => `${v} ${k}`)
          .join(', ')
        if (coins) parts.push(`_Coins:_ ${coins}`)
      }
      if (treasure.items?.length) {
        parts.push(`_Items:_ ${treasure.items.join(', ')}`)
      }
      treasureDisplay = parts.join(' | ')
    }

    return {
      id: encounter.id,
      campaign_id: campaignId,
      user_id: encounter.user_id || '',
      section: 'encounters',
      subsection: null,
      title: encounter.name,
      content: [
        `**Difficulty:** ${encounter.difficulty || 'N/A'}  `,
        `**Party Level:** ${encounter.party_level || 'N/A'}  `,
        `**Party Size:** ${encounter.party_size || 'N/A'}  `,
        encounter.xp_total !== undefined ? `**XP Total:** ${encounter.xp_total}  ` : '',
        encounter.xp_per_player !== undefined ? `**XP per Player:** ${encounter.xp_per_player}  ` : '',
        '',
        `**Description:**\n${encounter.description || 'N/A'}`,
        creaturesDisplay ? `\n\n**Creatures:**\n${creaturesDisplay}` : '',
        environmentDisplay ? `\n\n**Environment:**\n${environmentDisplay}` : '',
        treasureDisplay ? `\n\n**Treasure:**\n${treasureDisplay}` : '',
        encounter.notes ? `\n\n**Notes:**\n${encounter.notes}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
      type: (encounter.ai_generated ? 'imported' : 'manual') as 'manual' | 'imported',
      created_at: encounter.created_at,
      updated_at: encounter.created_at,
    }
  })
}
