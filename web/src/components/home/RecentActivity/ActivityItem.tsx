import { Activity } from '../../../store/campaignStore'
import Icon, { IconName } from '../../common/Icon'
import { logger } from '@/utils/logger'

interface ActivityItemProps {
  activity: Activity
}

const getActivityIcon = (type: string): IconName => {
  const iconMap: Record<string, IconName> = {
    npc: 'Users',
    monster: 'Skull',
    location: 'Map',
    tavern: 'Beer',
    chase: 'ArrowRight',
    quest: 'Scroll',
    item: 'Package',
    session: 'Dices',
    dialogue: 'MessageSquare',
    rumor: 'MessageCircle',
    encounter: 'Swords',
    merchant: 'Store',
    trap: 'AlertCircle',
    critter: 'Shield',
  }
  return iconMap[type] || 'Sparkles'
}

const formatTimeAgo = (date: string) => {
  const now = new Date()
  const past = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000)

  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  return `${Math.floor(diffInSeconds / 604800)}w ago`
}

export default function ActivityItem({ activity }: ActivityItemProps) {
  const handleClick = () => {
    // Navigate to the specific content
    // This could be implemented to open the content in the campaign ledger
    logger.debug('Navigate to:', activity.content_id)
  }

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-background transition-colors text-left group"
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
        <Icon name={getActivityIcon(activity.type)} className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text group-hover:text-primary transition-colors">
          {activity.action} <span className="font-medium text-primary">"{activity.name}"</span>
        </p>
        <p className="text-xs text-text-muted mt-0.5">{formatTimeAgo(activity.created_at)}</p>
      </div>
    </button>
  )
}
