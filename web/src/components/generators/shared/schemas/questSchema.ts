// Field schema for manual Quest entry

export interface ManualQuestData {
  title: string
  type: string
  description: string
  objectives: string[]
  rewards: string[]
  complications: string[]
  npcs_involved: string[]
  locations_involved: string[]
  party_level: number | null
  combat_intensity: string
  time_limit: string
}

export const defaultQuestData: ManualQuestData = {
  title: '',
  type: 'main',
  description: '',
  objectives: [],
  rewards: [],
  complications: [],
  npcs_involved: [],
  locations_involved: [],
  party_level: null,
  combat_intensity: 'medium',
  time_limit: '',
}

export const questTypeOptions = [
  { value: 'main', label: 'Main Quest' },
  { value: 'side', label: 'Side Quest' },
  { value: 'faction', label: 'Faction Quest' },
  { value: 'personal', label: 'Personal Quest' },
  { value: 'fetch', label: 'Fetch Quest' },
  { value: 'escort', label: 'Escort Quest' },
  { value: 'investigation', label: 'Investigation' },
  { value: 'rescue', label: 'Rescue Mission' },
  { value: 'assassination', label: 'Assassination' },
  { value: 'exploration', label: 'Exploration' },
]

export const difficultyOptions = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
  { value: 'deadly', label: 'Deadly' },
]
