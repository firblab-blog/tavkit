// Field schema for manual Trap entry

export interface ManualTrapData {
  name: string
  trap_type: string
  trigger: string
  effect: string
  damage: string
  save_dc: number | null
  detection_dc: number | null
  disarm_dc: number | null
  reset: string
  bypass: string
  countermeasures: string[]
  lore: string
}

export const defaultTrapData: ManualTrapData = {
  name: '',
  trap_type: 'mechanical',
  trigger: '',
  effect: '',
  damage: '',
  save_dc: null,
  detection_dc: null,
  disarm_dc: null,
  reset: '',
  bypass: '',
  countermeasures: [],
  lore: '',
}

export const trapTypeOptions = [
  { value: 'mechanical', label: 'Mechanical' },
  { value: 'magical', label: 'Magical' },
  { value: 'natural', label: 'Natural' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'puzzle', label: 'Puzzle' },
]
