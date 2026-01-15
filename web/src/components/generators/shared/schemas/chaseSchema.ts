// Field schema for manual Chase entry

export interface ManualObstacle {
  name: string
  description: string
  check: string
  failure: string
}

export interface ManualShortcut {
  name: string
  description: string
  benefit: string
}

export interface ManualChaseData {
  name: string
  chase_type: string
  terrain: string
  difficulty: string
  description: string
  setting: string
  quarry: string
  pursuers: string
  starting_conditions: string
  obstacles: ManualObstacle[]
  complications: string[]
  shortcuts: ManualShortcut[]
  environmental_factors: string[]
  success_condition: string
  failure_condition: string
  success_reward: string
  failure_consequence: string
}

export const defaultChaseData: ManualChaseData = {
  name: '',
  chase_type: 'pursuit',
  terrain: 'urban',
  difficulty: 'medium',
  description: '',
  setting: '',
  quarry: '',
  pursuers: '',
  starting_conditions: '',
  obstacles: [],
  complications: [],
  shortcuts: [],
  environmental_factors: [],
  success_condition: '',
  failure_condition: '',
  success_reward: '',
  failure_consequence: '',
}

export const chaseTypeOptions = [
  { value: 'pursuit', label: 'Pursuit' },
  { value: 'escape', label: 'Escape' },
  { value: 'race', label: 'Race' },
  { value: 'hunt', label: 'Hunt' },
]

export const terrainOptions = [
  { value: 'urban', label: 'Urban' },
  { value: 'forest', label: 'Forest' },
  { value: 'mountain', label: 'Mountain' },
  { value: 'underground', label: 'Underground' },
  { value: 'water', label: 'Water/Aquatic' },
  { value: 'aerial', label: 'Aerial' },
  { value: 'desert', label: 'Desert' },
  { value: 'arctic', label: 'Arctic' },
]
