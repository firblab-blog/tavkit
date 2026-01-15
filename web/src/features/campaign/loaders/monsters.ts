// Monster content loader

import type { CampaignContent } from '../types'
import { fetchContentData, parseJSONField, formatAbilityScores } from './utils'

interface MonsterStats {
  size?: string
  type?: string
  armor_class?: number
  hit_points?: string
  speed?: Record<string, number>
  abilities?: Record<string, number>
  traits?: Array<{ name: string; description: string }>
  actions?: Array<{ name: string; description: string }>
  legendary_actions?: Array<{ name: string; description: string }>
}

export async function loadMonsters(campaignId: string): Promise<CampaignContent[]> {
  const monsters = await fetchContentData<any>('monsters', campaignId, 'monsters')

  return monsters.map((monster: any) => {
    let statsDisplay = ''
    const stats = parseJSONField<MonsterStats>(monster.stats)

    if (stats) {
      if (stats.size && stats.type) {
        statsDisplay += `\n\n*${stats.size} ${stats.type}*\n`
      }
      if (stats.armor_class) statsDisplay += `\n**Armor Class:** ${stats.armor_class}`
      if (stats.hit_points) statsDisplay += `\n**Hit Points:** ${stats.hit_points}`
      if (stats.speed) {
        const speeds = Object.entries(stats.speed)
          .map(([type, val]) => `${type} ${val} ft.`)
          .join(', ')
        statsDisplay += `\n**Speed:** ${speeds}`
      }
      if (stats.abilities) {
        statsDisplay += `\n\n**Ability Scores:**\n${formatAbilityScores(stats.abilities)}`
      }
      if (stats.traits?.length) {
        statsDisplay += `\n\n**Traits:**\n`
        stats.traits.forEach((trait, idx) => {
          if (idx > 0) statsDisplay += `\n`
          statsDisplay += `\n&nbsp;&nbsp;*${trait.name}.* ${trait.description}`
        })
      }
      if (stats.actions?.length) {
        statsDisplay += `\n\n**Actions:**\n`
        stats.actions.forEach((action, idx) => {
          if (idx > 0) statsDisplay += `\n`
          statsDisplay += `\n&nbsp;&nbsp;*${action.name}.* ${action.description}`
        })
      }
      if (stats.legendary_actions?.length) {
        statsDisplay += `\n\n**Legendary Actions:**\n`
        stats.legendary_actions.forEach((action, idx) => {
          if (idx > 0) statsDisplay += `\n`
          statsDisplay += `\n&nbsp;&nbsp;*${action.name}.* ${action.description}`
        })
      }
    }

    return {
      id: monster.id,
      campaign_id: campaignId,
      user_id: monster.user_id || '',
      section: 'monsters',
      subsection: null,
      title: monster.name,
      content: [
        `**Challenge Rating:** ${monster.cr || 'N/A'}`,
        statsDisplay,
        `\n**Lore:**\n${monster.lore || 'N/A'}`,
        monster.tactics ? `\n\n**Tactics:**\n${monster.tactics}` : '',
      ]
        .filter(Boolean)
        .join(''),
      type: (monster.ai_generated ? 'imported' : 'manual') as 'manual' | 'imported',
      created_at: monster.created_at,
      updated_at: monster.created_at,
    }
  })
}
