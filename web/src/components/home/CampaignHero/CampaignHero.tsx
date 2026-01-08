import { Campaign } from '../../../store/campaignStore'
import CampaignTitle from './CampaignTitle'
import NextSession from './NextSession'
import WorkflowButtons from './WorkflowButtons'

interface CampaignHeroProps {
  campaign: Campaign
}

export default function CampaignHero({ campaign }: CampaignHeroProps) {
  return (
    <div className="relative bg-gradient-to-br from-background-panel to-background rounded-xl sm:rounded-2xl border border-primary/30 p-4 sm:p-8 md:p-12 shadow-2xl overflow-visible">
      {/* Decorative background glow */}
      <div className="absolute inset-0 bg-gradient-radial from-primary/10 via-transparent to-transparent opacity-50 rounded-xl sm:rounded-2xl" />

      {/* Content */}
      <div className="relative z-10 space-y-3 sm:space-y-6">
        <CampaignTitle campaign={campaign} />
        <NextSession campaignId={campaign.id} />
        <WorkflowButtons campaign={campaign} />
      </div>
    </div>
  )
}
