// Field schema for Rumor entries

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

export const rumorTypeOptions = [
  { value: 'random', label: 'Random' },
  { value: 'plot_hook', label: 'Plot Hook' },
  { value: 'background', label: 'Background/Lore' },
  { value: 'danger', label: 'Danger/Warning' },
  { value: 'opportunity', label: 'Opportunity' },
  { value: 'gossip', label: 'Gossip/Social' },
  { value: 'prophecy', label: 'Prophecy/Omen' },
]

export const rumorUrgencyOptions = [
  { value: 'low', label: 'Low (distant/vague)' },
  { value: 'moderate', label: 'Moderate (interesting)' },
  { value: 'high', label: 'High (immediate concern)' },
  { value: 'critical', label: 'Critical (urgent action needed)' },
]

export const rumorScopeOptions = [
  { value: 'local', label: 'Local (immediate area)' },
  { value: 'regional', label: 'Regional (nearby lands)' },
  { value: 'national', label: 'National (entire kingdom)' },
  { value: 'global', label: 'Global (world-spanning)' },
  { value: 'planar', label: 'Planar (cosmic/otherworldly)' },
]

export const rumorVeracityOptions = [
  { value: 'mixed', label: 'Mixed (true & false)' },
  { value: 'true', label: 'True (all accurate)' },
  { value: 'false', label: 'False (all misleading)' },
  { value: 'partial', label: 'Partial (half-truths)' },
]
