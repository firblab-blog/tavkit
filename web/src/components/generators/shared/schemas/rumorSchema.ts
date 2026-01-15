// Field schema for manual Rumor entry

export interface ManualRumorData {
  text: string
  source: string
  veracity: string
  leads_to: string
  context: string
  foreshadowing: boolean
  tags: string[]
}

export const defaultRumorData: ManualRumorData = {
  text: '',
  source: '',
  veracity: 'unknown',
  leads_to: '',
  context: '',
  foreshadowing: false,
  tags: [],
}

export const veracityOptions = [
  { value: 'true', label: 'True (accurate information)' },
  { value: 'false', label: 'False (misleading/lie)' },
  { value: 'partial', label: 'Partial (half-truth)' },
  { value: 'unknown', label: 'Unknown (unverified)' },
]
