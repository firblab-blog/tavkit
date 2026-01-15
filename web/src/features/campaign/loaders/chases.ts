// Chase content loader

import type { CampaignContent } from '../types'
import { fetchContentData, parseJSONField } from './utils'

interface Obstacle {
  name: string
  description: string
  check?: string
  skill_check?: string
  failure?: string
  failure_consequence?: string
}

interface Participants {
  quarry?: string
  pursuers?: string
}

interface Shortcut {
  name: string
  description: string
  benefit?: string
}

interface ChasePhase {
  round: string | number
  difficulty?: string
  description: string
}

interface EndingConditions {
  success?: string
  failure?: string
  alternative?: string
}

interface Rewards {
  success?: string
  partial?: string
  failure?: string
}

export async function loadChases(campaignId: string): Promise<CampaignContent[]> {
  const chases = await fetchContentData<any>('chases', campaignId, 'chases')

  return chases.map((chase: any) => {
    // Format obstacles
    let obstaclesDisplay = ''
    const obstacles = parseJSONField<Obstacle[]>(chase.obstacles)
    if (Array.isArray(obstacles) && obstacles.length > 0) {
      obstaclesDisplay =
        '\n\n**Obstacles:**\n' +
        obstacles
          .map(
            (o) =>
              `- **${o.name}:** ${o.description}\n  - **Check:** ${o.check || o.skill_check || 'N/A'}\n  - **Failure:** ${o.failure || o.failure_consequence || 'N/A'}`
          )
          .join('\n')
    }

    // Format participants
    let participantsDisplay = ''
    const participants = parseJSONField<Participants>(chase.participants)
    if (participants) {
      if (participants.quarry) {
        participantsDisplay += `\n\n**Quarry:** ${participants.quarry}`
      }
      if (participants.pursuers) {
        participantsDisplay += `\n**Pursuers:** ${participants.pursuers}`
      }
    }

    // Format shortcuts
    let shortcutsDisplay = ''
    const shortcuts = parseJSONField<Shortcut[]>(chase.shortcuts)
    if (Array.isArray(shortcuts) && shortcuts.length > 0) {
      shortcutsDisplay =
        '\n\n**Shortcuts & Alternate Routes:**\n' +
        shortcuts
          .map((s) => `- **${s.name}:** ${s.description}\n  - **Benefit:** ${s.benefit || 'N/A'}`)
          .join('\n')
    }

    // Format chase phases
    let phasesDisplay = ''
    const phases = parseJSONField<ChasePhase[]>(chase.chase_phases)
    if (Array.isArray(phases) && phases.length > 0) {
      phasesDisplay =
        '\n\n**Chase Phases:**\n' +
        phases.map((p) => `- **${p.round}** (${p.difficulty}): ${p.description}`).join('\n')
    }

    // Format environmental factors
    let environmentalDisplay = ''
    const factors = parseJSONField<string[]>(chase.environmental_factors)
    if (Array.isArray(factors) && factors.length > 0) {
      environmentalDisplay =
        '\n\n**Environmental Factors:**\n' + factors.map((f) => `- ${f}`).join('\n')
    }

    // Format complications
    let complicationsDisplay = ''
    const complications = parseJSONField<string[]>(chase.complications)
    if (Array.isArray(complications) && complications.length > 0) {
      complicationsDisplay =
        '\n\n**Complications:**\n' + complications.map((c) => `- ${c}`).join('\n')
    }

    // Format ending conditions
    let endingDisplay = ''
    const ending = parseJSONField<EndingConditions>(chase.ending_conditions)
    if (ending && (ending.success || ending.failure || ending.alternative)) {
      endingDisplay += '\n\n**Ending Conditions:**'
      if (ending.success) endingDisplay += `\n- **Success:** ${ending.success}`
      if (ending.failure) endingDisplay += `\n- **Failure:** ${ending.failure}`
      if (ending.alternative) endingDisplay += `\n- **Alternative:** ${ending.alternative}`
    }

    // Format rewards
    let rewardsDisplay = ''
    const rewards = parseJSONField<Rewards>(chase.rewards)
    if (rewards && (rewards.success || rewards.partial || rewards.failure)) {
      rewardsDisplay += '\n\n**Rewards:**'
      if (rewards.success) rewardsDisplay += `\n- **Success:** ${rewards.success}`
      if (rewards.partial) rewardsDisplay += `\n- **Partial:** ${rewards.partial}`
      if (rewards.failure) rewardsDisplay += `\n- **Failure:** ${rewards.failure}`
    }

    return {
      id: chase.id,
      campaign_id: campaignId,
      user_id: chase.user_id || '',
      section: 'chases',
      subsection: null,
      title: chase.name,
      content: [
        `**Type:** ${chase.chase_type?.replace(/_/g, ' ') || 'N/A'} | **Terrain:** ${chase.terrain} | **Difficulty:** ${chase.difficulty}`,
        '\n\n',
        chase.description ? `**Description:**\n${chase.description}\n\n` : '',
        chase.setting ? `**Setting:**\n${chase.setting}\n\n` : '',
        participantsDisplay,
        chase.starting_conditions ? `\n\n**Starting Conditions:**\n${chase.starting_conditions}` : '',
        obstaclesDisplay,
        shortcutsDisplay,
        phasesDisplay,
        complicationsDisplay,
        environmentalDisplay,
        endingDisplay,
        rewardsDisplay,
        chase.special_rules
          ? `\n\n**Special Rules:**\n${typeof chase.special_rules === 'string' ? chase.special_rules : JSON.stringify(chase.special_rules)}`
          : '',
      ].join(''),
      type: (chase.ai_generated ? 'imported' : 'manual') as 'manual' | 'imported',
      created_at: chase.created_at,
      updated_at: chase.created_at,
    }
  })
}
