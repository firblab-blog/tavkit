// Field schema for manual Dialogue entry

export interface ManualDialogueOption {
  player_option: string
  npc_response: string
  outcome: string
}

export interface ManualDialogueTree {
  friendly: ManualDialogueOption
  neutral: ManualDialogueOption
  hostile: ManualDialogueOption
}

export interface ManualSkillCheck {
  skill: string
  dc: number | null
  success: string
  failure: string
}

export interface ManualDialogueData {
  character_name: string
  scene_setting: string
  mood: string
  opening_line: string
  dialogue_tree: ManualDialogueTree
  skill_checks: ManualSkillCheck[]
  body_language: string
  information_revealed: string[]
  potential_quests: string[]
}

export const defaultDialogueOption: ManualDialogueOption = {
  player_option: '',
  npc_response: '',
  outcome: '',
}

export const defaultDialogueTree: ManualDialogueTree = {
  friendly: { ...defaultDialogueOption },
  neutral: { ...defaultDialogueOption },
  hostile: { ...defaultDialogueOption },
}

export const defaultDialogueData: ManualDialogueData = {
  character_name: '',
  scene_setting: '',
  mood: '',
  opening_line: '',
  dialogue_tree: { ...defaultDialogueTree },
  skill_checks: [],
  body_language: '',
  information_revealed: [],
  potential_quests: [],
}

export const moodOptions = [
  { value: 'tense', label: 'Tense' },
  { value: 'lighthearted', label: 'Lighthearted' },
  { value: 'mysterious', label: 'Mysterious' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'casual', label: 'Casual' },
  { value: 'formal', label: 'Formal' },
  { value: 'threatening', label: 'Threatening' },
]

export const commonSkills = [
  'Persuasion',
  'Deception',
  'Intimidation',
  'Insight',
  'Perception',
  'Investigation',
  'History',
  'Arcana',
  'Religion',
  'Nature',
  'Athletics',
  'Acrobatics',
  'Sleight of Hand',
  'Stealth',
  'Performance',
]
