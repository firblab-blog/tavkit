import { useState } from 'react'
import { Campaign } from '../../../store/campaignStore'
import { useContainerStore } from '../../../store/containerStore'

interface CampaignTitleProps {
  campaign: Campaign
}

export default function CampaignTitle({ campaign }: CampaignTitleProps) {
  const { openContainer } = useContainerStore()
  const [showFullDescription, setShowFullDescription] = useState(false)

  const openCampaignLedger = () => {
    openContainer({
      type: 'internal',
      tool: 'campaign',
      title: 'Campaign Ledger',
    })
  }

  const formatTimeAgo = (date: string) => {
    const now = new Date()
    const past = new Date(date)
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000)

    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`
    return `${Math.floor(diffInSeconds / 604800)} weeks ago`
  }

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength) + '...'
  }

  const descriptionMaxLength = 120

  return (
    <div className="text-center">
      <button
        onClick={openCampaignLedger}
        className="group inline-block transition-all hover:scale-105"
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <h1 className="text-4xl md:text-5xl font-bold text-text group-hover:text-primary transition-colors">
            {campaign.name}
          </h1>
        </div>
        {campaign.description && (
          <div>
            <p className="text-lg text-primary/70 mb-2">
              {showFullDescription
                ? campaign.description
                : truncateText(campaign.description, descriptionMaxLength)}
            </p>
            {campaign.description.length > descriptionMaxLength && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowFullDescription(!showFullDescription)
                }}
                className="text-sm text-primary hover:text-primary/80 transition-colors"
              >
                {showFullDescription ? 'Show less' : 'Read more...'}
              </button>
            )}
          </div>
        )}
        {campaign.theme && (
          <p className="text-base text-text-muted">
            {campaign.theme}
            {campaign.tone && ` • ${campaign.tone}`}
          </p>
        )}
        <p className="text-sm text-text-muted mt-2">Updated {formatTimeAgo(campaign.updated_at)}</p>
      </button>
    </div>
  )
}
