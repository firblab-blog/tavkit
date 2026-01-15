// Dialogue content loader

import type { CampaignContent } from '../types'
import { fetchContentData, parseJSONField } from './utils'

interface DialogueOption {
  player_option: string
  npc_response: string
  outcome: string
}

interface DialogueTree {
  friendly?: DialogueOption
  neutral?: DialogueOption
  hostile?: DialogueOption
}

interface SkillCheck {
  skill: string
  dc: number
  success: string
  failure: string
}

export async function loadDialogues(campaignId: string): Promise<CampaignContent[]> {
  const dialogues = await fetchContentData<any>('dialogues', campaignId, 'dialogues')

  return dialogues.map((dialogue: any) => {
    let treeDisplay = ''
    let checksDisplay = ''
    let infoDisplay = ''

    // Format dialogue tree
    const tree = parseJSONField<DialogueTree>(dialogue.dialogue_tree)
    if (tree) {
      const options = ['friendly', 'neutral', 'hostile'] as const
      const optionLines = options
        .filter((opt) => tree[opt])
        .map((opt) => {
          const option = tree[opt]!
          return `**${opt.charAt(0).toUpperCase() + opt.slice(1)}:**\n- *Player:* ${option.player_option || 'N/A'}\n- *NPC Response:* ${option.npc_response || 'N/A'}\n- *Outcome:* ${option.outcome || 'N/A'}`
        })
      treeDisplay = optionLines.join('\n\n')
    }

    // Format skill checks
    const checks = parseJSONField<SkillCheck[]>(dialogue.skill_checks)
    if (Array.isArray(checks)) {
      checksDisplay = checks
        .map(
          (check) =>
            `- **${check.skill}** (DC ${check.dc})\n  - *Success:* ${check.success}\n  - *Failure:* ${check.failure}`
        )
        .join('\n')
    }

    // Format information revealed
    const info = parseJSONField<string[]>(dialogue.information)
    if (Array.isArray(info)) {
      infoDisplay = info.map((item: string) => `- ${item}`).join('\n')
    } else if (info) {
      infoDisplay = String(info)
    }

    return {
      id: dialogue.id,
      campaign_id: campaignId,
      user_id: dialogue.user_id || '',
      section: 'dialogues',
      subsection: null,
      title: dialogue.scene_setting || dialogue.character_name || 'Dialogue',
      content: [
        `**Character:** ${dialogue.character_name || 'N/A'}`,
        dialogue.scene_setting ? `**Scene:** ${dialogue.scene_setting}` : '',
        dialogue.mood ? `**Mood:** ${dialogue.mood}` : '',
        treeDisplay ? `\n**Dialogue Options:**\n${treeDisplay}` : '',
        checksDisplay ? `\n**Skill Checks:**\n${checksDisplay}` : '',
        infoDisplay ? `\n**Information Revealed:**\n${infoDisplay}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
      type: (dialogue.ai_generated ? 'imported' : 'manual') as 'manual' | 'imported',
      created_at: dialogue.created_at,
      updated_at: dialogue.created_at,
    }
  })
}
