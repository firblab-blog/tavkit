import { useMemo } from 'react'
import { useContextStore } from '../store/contextStore'
import { useCampaignStore } from '../store/campaignStore'

/**
 * useActiveCampaign - Single source of truth for the active campaign.
 *
 * This hook derives the active campaign from contextStore (backend-persisted)
 * rather than maintaining a separate activeCampaignId in campaignStore.
 *
 * This eliminates the dual-source-of-truth problem where localStorage
 * and contextStore could diverge.
 *
 * @returns {object} Active campaign state:
 *   - activeCampaignId: The ID of the currently active campaign (from context)
 *   - activeCampaign: The full campaign object (from campaigns list)
 *   - contextType: The current context type ('gm_campaign', 'player_campaign', 'library')
 *   - isGMContext: Whether the current context is GM mode
 *   - isPlayerContext: Whether the current context is Player mode
 *   - isLibraryContext: Whether the current context is Library/Sandbox mode
 */
export function useActiveCampaign() {
  const { userContext } = useContextStore()
  const { campaigns } = useCampaignStore()

  // Derive active campaign from context (single source of truth)
  const activeCampaignId = userContext?.last_campaign_id ?? null
  const contextType = userContext?.last_context_type ?? null

  // Look up the full campaign object
  const activeCampaign = useMemo(() => {
    if (!activeCampaignId) return null
    return campaigns.find((c) => c.id === activeCampaignId) ?? null
  }, [activeCampaignId, campaigns])

  // Derived context flags
  const isGMContext = contextType === 'gm_campaign'
  const isPlayerContext = contextType === 'player_campaign'
  const isLibraryContext = contextType === 'library'

  return {
    activeCampaignId,
    activeCampaign,
    contextType,
    isGMContext,
    isPlayerContext,
    isLibraryContext,
  }
}

/**
 * getActiveCampaignId - Non-hook version for use outside React components.
 *
 * Use this in store subscriptions or other non-React contexts.
 * For React components, always use useActiveCampaign() hook.
 */
export function getActiveCampaignId(): string | null {
  return useContextStore.getState().userContext?.last_campaign_id ?? null
}

/**
 * getContextType - Non-hook version for use outside React components.
 */
export function getContextType(): 'gm_campaign' | 'player_campaign' | 'library' | null {
  return useContextStore.getState().userContext?.last_context_type ?? null
}

export default useActiveCampaign
