import { useState, useEffect, useRef } from 'react'
import { useCampaignStore } from '../../store/campaignStore'
import { useContainerStore } from '../../store/containerStore'
import Icon from './Icon'

export default function CampaignSwitcher() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { campaigns, activeCampaignId, setActiveCampaign, setShouldOpenCreateModal } =
    useCampaignStore()
  const { openContainer } = useContainerStore()
  const activeCampaign = campaigns.find((c) => c.id === activeCampaignId)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSwitchCampaign = (campaignId: string) => {
    setActiveCampaign(campaignId)
    setIsOpen(false)
  }

  const handleCreateCampaign = () => {
    setIsOpen(false)
    // Set flag to open create modal, then navigate to Campaign Ledger
    setShouldOpenCreateModal(true)
    openContainer({
      type: 'internal',
      tool: 'campaign',
      title: 'Campaign Ledger',
    })
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-background-panel hover:bg-background border border-border hover:border-primary/40 rounded-lg transition-colors group"
      >
        <Icon name="Folder" className="w-4 h-4 text-primary" />
        <span className="font-medium text-text truncate max-w-[200px]">
          {activeCampaign?.name || 'No Campaign'}
        </span>
        <Icon
          name="ChevronDown"
          className={`w-4 h-4 text-text-muted group-hover:text-primary transition-all ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-background-panel border border-border rounded-lg shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Current Campaign */}
          {activeCampaign && (
            <>
              <div className="p-3 border-b border-border bg-background/50">
                <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                  Current Campaign
                </div>
                <div className="flex items-center justify-between gap-2 p-2 bg-primary/10 border border-primary/20 rounded-lg">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Icon name="Check" className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="font-medium text-text truncate">{activeCampaign.name}</span>
                  </div>
                  <button
                    onClick={() => {
                      // TODO: Navigate to campaign settings
                      setIsOpen(false)
                    }}
                    className="p-1.5 hover:bg-background rounded transition-colors flex-shrink-0"
                    title="Campaign Settings"
                  >
                    <Icon name="Settings" className="w-4 h-4 text-text-muted hover:text-primary" />
                  </button>
                </div>
              </div>

              {/* Other Campaigns */}
              {campaigns.filter((c) => c.id !== activeCampaignId).length > 0 && (
                <div className="p-3 border-b border-border">
                  <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                    Other Campaigns
                  </div>
                  <div className="space-y-1 max-h-[200px] overflow-y-auto">
                    {campaigns
                      .filter((c) => c.id !== activeCampaignId)
                      .map((campaign) => (
                        <button
                          key={campaign.id}
                          onClick={() => handleSwitchCampaign(campaign.id)}
                          className="w-full text-left p-2 hover:bg-background rounded-lg transition-colors group flex items-center gap-2"
                        >
                          <Icon
                            name="Folder"
                            className="w-4 h-4 text-text-muted group-hover:text-primary flex-shrink-0"
                          />
                          <span className="text-text group-hover:text-primary truncate">
                            {campaign.name}
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* New Campaign */}
          <button
            onClick={handleCreateCampaign}
            className="w-full p-3 hover:bg-background transition-colors flex items-center gap-2 text-primary font-medium"
          >
            <Icon name="Plus" className="w-4 h-4" />
            New Campaign
          </button>
        </div>
      )}
    </div>
  )
}
