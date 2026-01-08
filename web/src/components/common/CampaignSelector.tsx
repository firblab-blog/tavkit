import { useCampaignStore } from '../../store/campaignStore'
import Icon from './Icon'

interface CampaignSelectorProps {
  selectedCampaignId: string | null
  onSelect: (campaignId: string | null) => void
  label?: string
  helperText?: string
}

export default function CampaignSelector({
  selectedCampaignId,
  onSelect,
  label = 'Campaign Context',
  helperText = 'Use campaign details to make generation more specific to your world',
}: CampaignSelectorProps) {
  const { campaigns } = useCampaignStore()

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-tavern-cream">{label}</label>
        {selectedCampaignId && (
          <button
            onClick={() => onSelect(null)}
            className="text-xs text-tavern-mauve hover:text-tavern-cream transition-colors flex items-center gap-1"
          >
            <Icon name="X" className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      <select
        value={selectedCampaignId || ''}
        onChange={(e) => onSelect(e.target.value || null)}
        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-tavern-cream focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="">Random / No Campaign Context</option>
        {campaigns.length === 0 && (
          <option value="" disabled>
            No campaigns created yet
          </option>
        )}
        {campaigns.map((campaign) => (
          <option key={campaign.id} value={campaign.id}>
            {campaign.name}
            {campaign.is_active ? ' (Active)' : ''}
          </option>
        ))}
      </select>

      {helperText && <p className="text-xs text-tavern-mauve">{helperText}</p>}

      {campaigns.length === 0 && (
        <div className="mt-2 p-3 bg-tavern-dark/30 border border-tavern-purple/30 rounded-lg">
          <div className="flex items-start gap-2">
            <Icon name="BookMarked" className="w-4 h-4 text-tavern-gold mt-0.5" />
            <div className="text-xs text-tavern-mauve">
              <span className="font-medium text-tavern-cream">Tip:</span> Create campaigns in the{' '}
              <span className="text-primary">Tavern Toolkit</span> to generate content tailored to
              your world!
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
