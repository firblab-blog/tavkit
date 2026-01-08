import { useState, useRef, useEffect } from 'react'
import { useCampaignStore } from '../../../store/campaignStore'
import { useContainerStore } from '../../../store/containerStore'
import Icon from '../../common/Icon'

export default function CampaignSwitcher() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { campaigns, activeCampaignId, setActiveCampaign } = useCampaignStore()
  const { openContainer } = useContainerStore()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleSelectCampaign = async (campaignId: string) => {
    await setActiveCampaign(campaignId)
    setIsOpen(false)
  }

  const handleCreateNew = () => {
    setIsOpen(false)
    openContainer({
      type: 'internal',
      tool: 'campaign',
      title: 'Campaign Ledger',
    })
  }

  return (
    <div className="flex justify-center" ref={dropdownRef}>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-2 px-6 py-2 bg-background/50 hover:bg-background border border-primary/40 hover:border-primary/60 rounded-lg text-text transition-all"
        >
          <span className="text-sm font-medium">Switch Campaign</span>
          <Icon
            name="ChevronDown"
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 bg-background-panel border border-primary/40 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-3 bg-background/50 border-b border-border">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Your Campaigns
              </p>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {campaigns.map((campaign) => (
                <button
                  key={campaign.id}
                  onClick={() => handleSelectCampaign(campaign.id)}
                  className={`w-full px-4 py-3 text-left hover:bg-background/50 transition-colors flex items-center justify-between group ${
                    campaign.id === activeCampaignId ? 'bg-primary/10' : ''
                  }`}
                >
                  <div className="flex-1">
                    <p className="font-medium text-text group-hover:text-primary transition-colors">
                      {campaign.name}
                    </p>
                    {campaign.description && (
                      <p className="text-xs text-text-muted truncate mt-0.5">
                        {campaign.description}
                      </p>
                    )}
                  </div>
                  {campaign.id === activeCampaignId && (
                    <Icon name="Check" className="w-5 h-5 text-primary flex-shrink-0 ml-2" />
                  )}
                </button>
              ))}
            </div>
            <div className="p-2 border-t border-border bg-background/30">
              <button
                onClick={handleCreateNew}
                className="w-full px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
              >
                <Icon name="Plus" className="w-4 h-4" />
                New Campaign
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
