import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../common/Icon'
import { useAuthStore } from '../../store/authStore'
import { useContextStore } from '../../store/contextStore'
import { useCampaignStore, Campaign } from '../../store/campaignStore'
import { useCampaignNavigation } from '../../hooks/useCampaignNavigation'
import PlayerOnboarding from './PlayerOnboarding'

/**
 * ContextResume - Clean landing page for returning users.
 *
 * Design:
 * 1. Prominent "Continue" button for last context
 * 2. Unified campaign list with role badges (no separate sections)
 * 3. Quick actions: Library, New Campaign
 */
export default function ContextResume() {
  const navigate = useNavigate()
  const { user, honorific } = useAuthStore()
  const { userContext } = useContextStore()
  const { campaigns, loading, lastFetchTime, fetchCampaigns } = useCampaignStore()
  const { activateCampaignWithNavigation, switchToLibrary } = useCampaignNavigation()
  const [hasFetched, setHasFetched] = useState(false)
  const [showPlayerOnboarding, setShowPlayerOnboarding] = useState(false)
  const [showAllCampaigns, setShowAllCampaigns] = useState(false)

  const displayName = user?.display_name || user?.username || 'Adventurer'

  // Fetch campaigns on mount
  useEffect(() => {
    const loadCampaigns = async () => {
      await fetchCampaigns()
      setHasFetched(true)
    }
    loadCampaigns()
  }, [fetchCampaigns])

  // Show loading while campaigns are being fetched for the first time
  if (loading || (!hasFetched && !lastFetchTime)) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-background">
        <Icon name="Loader2" className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-text-muted">Loading...</p>
      </div>
    )
  }

  // Categorize campaigns
  // Priority: membership_type > role (for backwards compatibility)
  const gmCampaigns = campaigns.filter((c) => c.membership_type === 'owner' || c.role === 'owner')
  const joinedCampaigns = campaigns.filter((c) => c.membership_type === 'player_joined')
  const trackingCampaigns = campaigns.filter(
    (c) =>
      c.membership_type === 'player_local' ||
      (c.role === 'player' && c.membership_type !== 'player_joined')
  )

  // Build unified list with role info, excluding the "continue" campaign
  const allCampaigns = [
    ...gmCampaigns.map((c) => ({ ...c, roleType: 'gm' as const })),
    ...joinedCampaigns.map((c) => ({ ...c, roleType: 'joined' as const })),
    ...trackingCampaigns.map((c) => ({ ...c, roleType: 'tracking' as const })),
  ].filter((c) => c.id !== userContext?.last_campaign_id)

  // Find last active campaign
  const lastCampaign = campaigns.find((c) => c.id === userContext?.last_campaign_id)

  // Get context display info
  const getLastContextInfo = () => {
    const contextType = userContext?.last_context_type

    if (contextType === 'gm_campaign' && lastCampaign) {
      return {
        title: lastCampaign.name,
        subtitle: 'GM Campaign',
        icon: 'Crown' as const,
        path: '/dashboard/gm',
        color: 'amber' as const,
      }
    }

    if (contextType === 'player_campaign' && lastCampaign) {
      return {
        title: lastCampaign.name,
        subtitle: 'Player Campaign',
        icon: 'Sword' as const,
        path: '/dashboard/player',
        color: 'blue' as const,
      }
    }

    if (contextType === 'library') {
      return {
        title: 'Personal Library',
        subtitle: 'Your saved content',
        icon: 'Library' as const,
        path: '/dashboard/sandbox',
        color: 'purple' as const,
      }
    }

    return null
  }

  const lastContext = getLastContextInfo()

  const handleContinue = () => {
    if (lastContext) {
      // "Continue" means resume where we left off - just navigate directly
      // The context is already set correctly, so we don't need to switch
      // This avoids the early-return in useCampaignNavigation when context hasn't changed
      navigate(lastContext.path)
    }
  }

  const handleCampaignClick = (campaign: Campaign & { roleType: 'gm' | 'joined' | 'tracking' }) => {
    // Use centralized navigation hook - handles all state sync, cache invalidation, and navigation
    activateCampaignWithNavigation(campaign.id)
  }

  const handleSwitchToLibrary = () => {
    // Use centralized navigation hook - handles all state sync, cache invalidation, and navigation
    switchToLibrary()
  }

  const handleCreateGMCampaign = () => {
    // Open the global campaign creation modal
    useCampaignStore.getState().openCreateCampaignModal()
  }

  const handlePlayerPath = () => {
    setShowPlayerOnboarding(true)
  }

  // Show player onboarding if selected
  if (showPlayerOnboarding) {
    return <PlayerOnboarding onBack={() => setShowPlayerOnboarding(false)} />
  }

  // Role badge component
  const RoleBadge = ({ type }: { type: 'gm' | 'joined' | 'tracking' }) => {
    if (type === 'gm') {
      return (
        <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-amber-500/20 text-amber-400">
          GM
        </span>
      )
    }
    if (type === 'joined') {
      return (
        <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-green-500/20 text-green-400">
          Joined
        </span>
      )
    }
    return (
      <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-blue-500/20 text-blue-400">
        Player
      </span>
    )
  }

  const MAX_VISIBLE = 4
  const visibleCampaigns = showAllCampaigns ? allCampaigns : allCampaigns.slice(0, MAX_VISIBLE)
  const hasMoreCampaigns = allCampaigns.length > MAX_VISIBLE

  return (
    <div className="h-full flex flex-col items-center justify-center px-4 py-8 bg-background relative overflow-auto">
      {/* Decorative background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-3">
          <img src="/tavkit-logo-master.svg" alt="TavKit" className="h-14 w-auto" />
        </div>

        {/* Welcome message */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-text mb-0.5">Welcome back, {displayName}</h1>
          {honorific && <p className="text-sm text-primary italic">{honorific}</p>}
        </div>

        {/* Continue where you left off - Main CTA */}
        {lastContext && (
          <button
            onClick={handleContinue}
            className={`w-full p-4 mb-4 rounded-xl border-2 transition-all duration-200 text-left flex items-center gap-4 group ${
              lastContext.color === 'amber'
                ? 'border-amber-500/40 bg-amber-500/10 hover:border-amber-500/60 hover:bg-amber-500/15'
                : lastContext.color === 'blue'
                  ? 'border-blue-500/40 bg-blue-500/10 hover:border-blue-500/60 hover:bg-blue-500/15'
                  : 'border-purple-500/40 bg-purple-500/10 hover:border-purple-500/60 hover:bg-purple-500/15'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                lastContext.color === 'amber'
                  ? 'bg-amber-500/20'
                  : lastContext.color === 'blue'
                    ? 'bg-blue-500/20'
                    : 'bg-purple-500/20'
              }`}
            >
              <Icon
                name={lastContext.icon}
                className={`w-6 h-6 ${
                  lastContext.color === 'amber'
                    ? 'text-amber-400'
                    : lastContext.color === 'blue'
                      ? 'text-blue-400'
                      : 'text-purple-400'
                }`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-text-muted uppercase tracking-wider mb-0.5">Continue</p>
              <h3 className="text-text font-semibold truncate">{lastContext.title}</h3>
            </div>
            <Icon
              name="ArrowRight"
              className="w-5 h-5 text-text-muted group-hover:translate-x-1 transition-transform flex-shrink-0"
            />
          </button>
        )}

        {/* Other Campaigns - Compact unified list */}
        {allCampaigns.length > 0 && (
          <div className="mb-4">
            <p className="text-text-muted text-xs uppercase tracking-wider font-semibold mb-2 px-1">
              {lastContext ? 'Switch to' : 'Your Campaigns'}
            </p>
            <div className="bg-background-panel border border-border rounded-lg overflow-hidden">
              {visibleCampaigns.map((campaign, index) => (
                <button
                  key={campaign.id}
                  onClick={() => handleCampaignClick(campaign)}
                  className={`w-full px-3 py-2.5 text-left flex items-center gap-3 hover:bg-background transition-colors ${
                    index !== 0 ? 'border-t border-border' : ''
                  }`}
                >
                  <span className="text-text truncate flex-1">{campaign.name}</span>
                  <RoleBadge type={campaign.roleType} />
                  <Icon name="ChevronRight" className="w-4 h-4 text-text-muted flex-shrink-0" />
                </button>
              ))}
              {hasMoreCampaigns && !showAllCampaigns && (
                <button
                  onClick={() => setShowAllCampaigns(true)}
                  className="w-full px-3 py-2 text-center text-sm text-text-muted hover:text-text border-t border-border transition-colors"
                >
                  Show {allCampaigns.length - MAX_VISIBLE} more
                </button>
              )}
              {showAllCampaigns && hasMoreCampaigns && (
                <button
                  onClick={() => setShowAllCampaigns(false)}
                  className="w-full px-3 py-2 text-center text-sm text-text-muted hover:text-text border-t border-border transition-colors"
                >
                  Show less
                </button>
              )}
            </div>
          </div>
        )}

        {/* Quick Actions Row */}
        <div className="flex gap-2">
          {/* Library - only if not currently in library context */}
          {userContext?.last_context_type !== 'library' && (
            <button
              onClick={handleSwitchToLibrary}
              className="flex-1 px-3 py-2.5 rounded-lg border border-border bg-background-panel hover:border-purple-500/30 hover:bg-purple-500/5 transition-all text-left flex items-center gap-2"
            >
              <Icon name="Library" className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-text">Library</span>
            </button>
          )}

          {/* New Campaign dropdown trigger */}
          <button
            onClick={handleCreateGMCampaign}
            className="flex-1 px-3 py-2.5 rounded-lg border border-dashed border-border hover:border-amber-500/40 hover:bg-amber-500/5 transition-all text-left flex items-center gap-2"
          >
            <Icon name="Plus" className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-amber-400">New Campaign</span>
          </button>

          {/* Join/Track */}
          <button
            onClick={handlePlayerPath}
            className="flex-1 px-3 py-2.5 rounded-lg border border-dashed border-border hover:border-blue-500/40 hover:bg-blue-500/5 transition-all text-left flex items-center gap-2"
          >
            <Icon name="UserPlus" className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-blue-400">Join</span>
          </button>

          {/* Settings */}
          <button
            onClick={() => navigate('/dashboard/settings')}
            className="px-3 py-2.5 rounded-lg border border-border bg-background-panel hover:border-text-muted/30 hover:bg-background transition-all flex items-center justify-center"
            title="Settings"
          >
            <Icon name="Settings" className="w-4 h-4 text-text-muted" />
          </button>
        </div>
      </div>
    </div>
  )
}
