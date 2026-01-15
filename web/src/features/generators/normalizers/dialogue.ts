// Normalizer for Dialogue AI responses

import { normalizeStringArray } from '@/utils/aiResponseNormalizer'

// Expected dialogue structure
export interface DialogueTree {
  friendly: { player_option: string; npc_response: string; outcome: string }
  neutral: { player_option: string; npc_response: string; outcome: string }
  hostile: { player_option: string; npc_response: string; outcome: string }
}

export interface SkillCheck {
  skill: string
  dc: number
  success: string
  failure: string
}

export interface GeneratedDialogueData {
  character_name: string
  scene_setting: string
  mood: string
  opening_line: string
  dialogue_tree: DialogueTree
  skill_checks?: SkillCheck[]
  body_language: string
  information_revealed?: string[]
  potential_quests?: string[]
  _raw?: Record<string, unknown>
  _parseError?: string
}

// Default empty dialogue tree for when AI doesn't return expected structure
const DEFAULT_DIALOGUE_TREE: DialogueTree = {
  friendly: { player_option: '', npc_response: '', outcome: '' },
  neutral: { player_option: '', npc_response: '', outcome: '' },
  hostile: { player_option: '', npc_response: '', outcome: '' },
}

function normalizeDialogueOption(option: unknown): {
  player_option: string
  npc_response: string
  outcome: string
} {
  if (typeof option === 'object' && option !== null) {
    const opt = option as Record<string, unknown>
    return {
      player_option: String(opt.player_option || opt.player || ''),
      npc_response: String(opt.npc_response || opt.response || opt.npc || ''),
      outcome: String(opt.outcome || opt.result || ''),
    }
  }
  return { player_option: '', npc_response: '', outcome: '' }
}

// Check if dialogue tree has valid content
export function hasValidDialogueContent(dialogue: GeneratedDialogueData | null): boolean {
  if (!dialogue) return false
  const tree = dialogue.dialogue_tree
  return !!(
    dialogue.character_name ||
    dialogue.opening_line ||
    tree.friendly.player_option ||
    tree.friendly.npc_response ||
    tree.neutral.player_option ||
    tree.neutral.npc_response ||
    tree.hostile.player_option ||
    tree.hostile.npc_response
  )
}

// Check if dialogue tree has valid content
export function hasValidDialogueTree(tree: DialogueTree): boolean {
  return !!(
    tree.friendly.player_option ||
    tree.friendly.npc_response ||
    tree.neutral.player_option ||
    tree.neutral.npc_response ||
    tree.hostile.player_option ||
    tree.hostile.npc_response
  )
}

// Normalize AI response to expected structure
export function normalizeDialogueResponse(raw: Record<string, unknown>): GeneratedDialogueData {
  const expectedFields = [
    'character_name',
    'scene_setting',
    'mood',
    'opening_line',
    'dialogue_tree',
    'skill_checks',
    'body_language',
    'information_revealed',
    'potential_quests',
    'provider',
  ]

  // Collect unexpected fields
  const unexpectedFields: Record<string, unknown> = {}
  for (const key of Object.keys(raw)) {
    if (!expectedFields.includes(key)) {
      unexpectedFields[key] = raw[key]
    }
  }

  // Normalize dialogue_tree
  let dialogueTree = DEFAULT_DIALOGUE_TREE
  if (raw.dialogue_tree && typeof raw.dialogue_tree === 'object') {
    const dt = raw.dialogue_tree as Record<string, unknown>
    dialogueTree = {
      friendly: normalizeDialogueOption(dt.friendly),
      neutral: normalizeDialogueOption(dt.neutral),
      hostile: normalizeDialogueOption(dt.hostile),
    }
  }

  // Normalize skill_checks
  let skillChecks: SkillCheck[] | undefined
  if (Array.isArray(raw.skill_checks)) {
    skillChecks = raw.skill_checks.map((sc: unknown) => {
      if (typeof sc === 'object' && sc !== null) {
        const check = sc as Record<string, unknown>
        return {
          skill: String(check.skill || 'Unknown'),
          dc: Number(check.dc) || 10,
          success: String(check.success || ''),
          failure: String(check.failure || ''),
        }
      }
      return { skill: 'Unknown', dc: 10, success: '', failure: '' }
    })
  }

  return {
    character_name: String(raw.character_name || raw.name || 'Unknown Character'),
    scene_setting: String(raw.scene_setting || raw.setting || ''),
    mood: String(raw.mood || raw.tone || ''),
    opening_line: String(raw.opening_line || raw.greeting || ''),
    dialogue_tree: dialogueTree,
    skill_checks: skillChecks,
    body_language: String(raw.body_language || ''),
    information_revealed: raw.information_revealed
      ? normalizeStringArray(raw.information_revealed)
      : undefined,
    potential_quests: raw.potential_quests ? normalizeStringArray(raw.potential_quests) : undefined,
    _raw: Object.keys(unexpectedFields).length > 0 ? unexpectedFields : undefined,
  }
}
