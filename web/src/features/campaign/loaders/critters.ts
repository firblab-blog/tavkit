// Critter content loader

import type { CampaignContent } from '../types'
import { fetchContentData, parseJSONField } from './utils'

interface CritterStats {
  ac?: number
  hp?: number
  speed?: string
  str?: number
  dex?: number
  con?: number
  int?: number
  wis?: number
  cha?: number
}

interface SpecialAbility {
  name: string
  description: string
}

export async function loadCritters(campaignId: string): Promise<CampaignContent[]> {
  const critters = await fetchContentData<any>('critters', campaignId, 'critters')

  return critters.map((critter: any) => {
    let statsDisplay = ''
    const stats = parseJSONField<CritterStats>(critter.stats)
    if (stats) {
      const statParts = []
      if (stats.ac !== undefined) statParts.push(`**AC:** ${stats.ac}`)
      if (stats.hp !== undefined) statParts.push(`**HP:** ${stats.hp}`)
      if (stats.speed) statParts.push(`**Speed:** ${stats.speed}`)
      if (statParts.length > 0) {
        statsDisplay = `\n\n${statParts.join(' | ')}`
      }

      // Ability scores
      const abilities = []
      if (stats.str !== undefined) abilities.push(`STR ${stats.str}`)
      if (stats.dex !== undefined) abilities.push(`DEX ${stats.dex}`)
      if (stats.con !== undefined) abilities.push(`CON ${stats.con}`)
      if (stats.int !== undefined) abilities.push(`INT ${stats.int}`)
      if (stats.wis !== undefined) abilities.push(`WIS ${stats.wis}`)
      if (stats.cha !== undefined) abilities.push(`CHA ${stats.cha}`)
      if (abilities.length > 0) {
        statsDisplay += `\n${abilities.join(' | ')}`
      }
    }

    // Format special abilities
    let abilitiesDisplay = ''
    const abilities = parseJSONField<SpecialAbility[]>(critter.special_abilities)
    if (Array.isArray(abilities) && abilities.length > 0) {
      abilitiesDisplay =
        '\n\n**Special Abilities:**\n' +
        abilities.map((ability) => `- **${ability.name}:** ${ability.description}`).join('\n')
    }

    // Format uses
    let usesDisplay = ''
    const uses = parseJSONField<string[]>(critter.uses)
    if (Array.isArray(uses) && uses.length > 0) {
      usesDisplay = '\n\n**Potential Uses:**\n' + uses.map((use) => `- ${use}`).join('\n')
    }

    // Format interesting facts
    let factsDisplay = ''
    const facts = parseJSONField<string[]>(critter.interesting_facts)
    if (Array.isArray(facts) && facts.length > 0) {
      factsDisplay = '\n\n**Interesting Facts:**\n' + facts.map((fact) => `- ${fact}`).join('\n')
    }

    return {
      id: critter.id,
      campaign_id: campaignId,
      user_id: critter.user_id || '',
      section: 'critters',
      subsection: null,
      title: critter.name,
      content: [
        critter.species ? `_${critter.species}_\n\n` : '',
        `**Type:** ${critter.critter_type || 'N/A'} | **Size:** ${critter.size}`,
        critter.temperament ? ` | **Temperament:** ${critter.temperament}` : '',
        critter.habitat ? ` | **Habitat:** ${critter.habitat}` : '',
        '\n\n',
        critter.description ? `**Description:**\n${critter.description}\n\n` : '',
        critter.behavior ? `**Behavior:**\n${critter.behavior}\n\n` : '',
        statsDisplay,
        abilitiesDisplay,
        usesDisplay,
        critter.training_difficulty ? `\n\n**Training Difficulty:** ${critter.training_difficulty}` : '',
        critter.diet ? ` | **Diet:** ${critter.diet}` : '',
        critter.lifespan ? ` | **Lifespan:** ${critter.lifespan}` : '',
        factsDisplay,
        critter.encounter_notes ? `\n\n**Encounter Notes:**\n${critter.encounter_notes}` : '',
      ].join(''),
      type: (critter.ai_generated ? 'imported' : 'manual') as 'manual' | 'imported',
      created_at: critter.created_at,
      updated_at: critter.created_at,
    }
  })
}
