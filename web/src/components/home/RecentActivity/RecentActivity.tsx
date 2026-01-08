import { useEffect } from 'react'
import { useCampaignStore } from '../../../store/campaignStore'
import { useContainerStore } from '../../../store/containerStore'
import ActivityItem from './ActivityItem'
import Icon from '../../common/Icon'
import { logger } from '@/utils/logger'

interface RecentActivityProps {
  campaignId: string
}

export default function RecentActivity({ campaignId }: RecentActivityProps) {
  const { recentActivity, activityLoading, fetchRecentActivity } = useCampaignStore()
  const { openContainer } = useContainerStore()

  useEffect(() => {
    logger.debug('RecentActivity mounting, fetching for campaign:', campaignId)
    fetchRecentActivity(campaignId)
  }, [campaignId, fetchRecentActivity])

  const handleRefresh = () => {
    logger.debug('Manual refresh triggered')
    fetchRecentActivity(campaignId)
  }

  const handleViewAll = () => {
    openContainer({
      type: 'internal',
      tool: 'saved',
      title: 'Saved Content',
    })
  }

  if (activityLoading) {
    return (
      <div className="bg-background-panel border border-border rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-background rounded w-1/3 mb-4" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-background rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (recentActivity.length === 0) {
    logger.debug('RecentActivity: No activity found, showing empty state')
    return (
      <div className="bg-background-panel border border-border rounded-lg p-6 text-center">
        <Icon name="Clock" className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-50" />
        <h3 className="text-lg font-semibold text-text mb-2">No Activity Yet</h3>
        <p className="text-text-muted text-sm">
          Generate content using the Artificer's Toolkit to see your recent activity here
        </p>
      </div>
    )
  }

  logger.debug('RecentActivity rendering with activity:', {
    count: recentActivity.length,
    items: recentActivity.slice(0, 5),
  })

  return (
    <div className="bg-background-panel border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-text">Recent Activity</h2>
        <button
          onClick={handleRefresh}
          disabled={activityLoading}
          className="p-2 hover:bg-background rounded-lg transition-colors disabled:opacity-50"
          title="Refresh activity"
        >
          <Icon
            name="RefreshCw"
            className={`w-5 h-5 text-text-muted hover:text-primary ${activityLoading ? 'animate-spin' : ''}`}
          />
        </button>
      </div>

      <div className="space-y-2">
        {recentActivity.slice(0, 5).map((activity) => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}
      </div>

      <button
        onClick={handleViewAll}
        className="mt-4 w-full px-4 py-2 bg-background hover:bg-background-panel border border-border hover:border-primary/40 rounded-lg text-text transition-colors flex items-center justify-center gap-2 group"
      >
        View All Content
        {/* <Icon
          name="ArrowRight"
          className="w-4 h-4 group-hover:translate-x-1 transition-transform"
        /> */}
      </button>
    </div>
  )
}
