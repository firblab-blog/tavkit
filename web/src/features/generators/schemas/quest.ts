// Field schema for Quest entries

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

export const questDifficultyOptions = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
  { value: 'deadly', label: 'Deadly' },
]

export const questLengthOptions = [
  { value: 'short', label: 'Short (1 session)' },
  { value: 'medium', label: 'Medium (2-3 sessions)' },
  { value: 'long', label: 'Long (4+ sessions)' },
  { value: 'epic', label: 'Epic (campaign arc)' },
]
