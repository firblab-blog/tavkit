import { useEffect } from 'react'
import { useCampaignStore } from '../../store/campaignStore'
import { useAuthStore } from '../../store/authStore'
import CampaignHero from './CampaignHero/CampaignHero'
import QuickStatsBar from './QuickStatsBar/QuickStatsBar'
import RecentActivity from './RecentActivity/RecentActivity'
import QuickActions from './QuickActions/QuickActions'
import NoCampaignState from './NoCampaignState'

export default function HomePage() {
  const { campaigns, activeCampaignId, loading, lastFetchTime, fetchCampaigns } = useCampaignStore()
  const { user } = useAuthStore()

  const activeCampaign = campaigns.find((c) => c.id === activeCampaignId)

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  // Note: fetchRecentActivity is called by RecentActivity component
  // No need to call it here - that would cause duplicate API requests

  // Don't render until campaigns have loaded
  // This prevents a flash of NoCampaignState while the fetch is in progress
  // But once we've fetched (lastFetchTime is set), we can show NoCampaignState if there are no campaigns
  if (loading || !lastFetchTime) {
    return null
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-8 overflow-x-hidden">
        {/* Welcome Header - Simplified on mobile */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 text-center">
          <div className="flex items-center gap-2 sm:gap-3">
            <img
              src="/tavkit-logo-master.svg"
              alt="TavKit Logo"
              className="w-10 h-10 sm:w-12 sm:h-12"
            />
            <h1 className="text-2xl sm:text-3xl font-bold text-text">TavKit</h1>
          </div>
          <span className="hidden sm:inline text-text-muted">•</span>
          <p className="text-sm sm:text-lg text-text-muted">Build, Track, Play</p>
          {user && (
            <>
              <span className="hidden sm:inline text-text-muted">•</span>
              <p className="text-sm sm:text-base text-text-muted">
                Welcome back, {user.display_name || user.username}!
              </p>
            </>
          )}
        </div>

        {/* Main Content */}
        {activeCampaign ? (
          <>
            <CampaignHero campaign={activeCampaign} />
            <QuickStatsBar campaignId={activeCampaign.id} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RecentActivity campaignId={activeCampaign.id} />
              <QuickActions />
            </div>
          </>
        ) : (
          <NoCampaignState />
        )}
      </div>
    </div>
  )
}
