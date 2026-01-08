import { useState } from 'react'
import { useCampaignStore } from '../../../store/campaignStore'
import { useContainerStore } from '../../../store/containerStore'
import Icon from '../../common/Icon'

export default function AllCampaigns() {
  const { campaigns, activeCampaignId, setActiveCampaign } = useCampaignStore()
  const { openContainer } = useContainerStore()
  const [isExpanded, setIsExpanded] = useState(false)
  const [showAll, setShowAll] = useState(false)

  const handleSwitchCampaign = async (campaignId: string) => {
    await setActiveCampaign(campaignId)
  }

  const handleCreateNew = () => {
    openContainer({
      type: 'internal',
      tool: 'campaign',
      title: 'Campaign Ledger',
    })
  }

  if (campaigns.length <= 1) {
    return null // Don't show if only one or no campaigns
  }

  const displayedCampaigns = showAll ? campaigns : campaigns.slice(0, 5)
  const hasMore = campaigns.length > 5

  return (
    <div className="bg-background-panel border border-border rounded-lg overflow-hidden">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-background transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon name="FolderOpen" className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-text">All Campaigns</h2>
          <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs font-bold rounded">
            {campaigns.length}
          </span>
        </div>
        <Icon
          name="ChevronDown"
          className={`w-5 h-5 text-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="p-4 pt-0 border-t border-border">
          <div className="space-y-2 mb-4">
            {displayedCampaigns.map((campaign) => (
              <button
                key={campaign.id}
                onClick={() => handleSwitchCampaign(campaign.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left ${
                  campaign.id === activeCampaignId
                    ? 'bg-primary/10 border-l-4 border-l-primary'
                    : 'hover:bg-background border-l-4 border-l-transparent'
                }`}
              >
                <span className="text-xl text-primary flex-shrink-0">•</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text truncate">{campaign.name}</p>
                  {campaign.description && (
                    <p className="text-sm text-text-muted line-clamp-2">{campaign.description}</p>
                  )}
                </div>
                {campaign.id === activeCampaignId && (
                  <span className="px-2 py-1 bg-primary text-background text-xs font-bold rounded uppercase">
                    Current
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Show More/Less Button */}
          {hasMore && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full px-4 py-2 mb-3 bg-background hover:bg-background-panel border border-border hover:border-primary/40 rounded-lg text-text-muted hover:text-primary transition-all flex items-center justify-center gap-2"
            >
              {showAll ? (
                <>
                  <Icon name="ChevronUp" className="w-4 h-4" />
                  Show Less
                </>
              ) : (
                <>
                  <Icon name="ChevronDown" className="w-4 h-4" />
                  Show {campaigns.length - 5} More
                </>
              )}
            </button>
          )}

          <button
            onClick={handleCreateNew}
            className="w-full px-4 py-3 bg-background hover:bg-background-panel border-2 border-dashed border-primary/40 hover:border-primary/60 rounded-lg text-primary font-medium transition-all flex items-center justify-center gap-2 group"
          >
            <Icon name="Plus" className="w-5 h-5 group-hover:scale-110 transition-transform" />
            New Campaign
          </button>
        </div>
      )}
    </div>
  )
}
