import { CampaignContentTab } from './campaign'

interface CampaignTabProps {
  campaignId: string
}

/**
 * CampaignTab - Browse and manage campaign content inline.
 *
 * Uses sub-tabs for NPCs, Locations, Quests, and Monsters following
 * the same pattern as Player Mode's Encounters tab.
 *
 * Full Campaign Ledger remains available via button for advanced features.
 */
export default function CampaignTab({ campaignId }: CampaignTabProps) {
  return <CampaignContentTab campaignId={campaignId} />
}
