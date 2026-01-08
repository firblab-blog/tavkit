import { useState, useRef, useMemo } from 'react'
import { useCampaignStore } from '../../../store/campaignStore'
import { onContentSaved } from '../../../lib/contentEvents'
import StatPill from './StatPill'
import Icon from '../../common/Icon'
import { useEffect } from 'react'

interface QuickStatsBarProps {
  campaignId: string
}

export default function QuickStatsBar({ campaignId }: QuickStatsBarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Use data from campaign store instead of making duplicate API calls
  const { recentActivity, activityLoading, fetchRecentActivity } = useCampaignStore()

  // Listen for content saved events to refresh stats
  useEffect(() => {
    const unsubscribe = onContentSaved(() => {
      fetchRecentActivity(campaignId)
    })
    return unsubscribe
  }, [campaignId, fetchRecentActivity])

  // Compute stats from recentActivity data
  const stats = useMemo(() => {
    const counts = {
      npcs: 0,
      monsters: 0,
      locations: 0,
      items: 0,
      quests: 0,
      encounters: 0,
      taverns: 0,
      merchants: 0,
      traps: 0,
      critters: 0,
      chases: 0,
      dialogues: 0,
      rumors: 0,
    }

    // Count items by type from recentActivity
    for (const item of recentActivity) {
      switch (item.type) {
        case 'npc':
          counts.npcs++
          break
        case 'monster':
          counts.monsters++
          break
        case 'location':
          counts.locations++
          break
        case 'item':
          counts.items++
          break
        case 'quest':
          counts.quests++
          break
        case 'encounter':
          counts.encounters++
          break
        case 'tavern':
          counts.taverns++
          break
        case 'merchant':
          counts.merchants++
          break
        case 'trap':
          counts.traps++
          break
        case 'critter':
          counts.critters++
          break
        case 'chase':
          counts.chases++
          break
        case 'dialogue':
          counts.dialogues++
          break
        case 'rumor':
          counts.rumors++
          break
      }
    }

    return counts
  }, [recentActivity])

  const totalItems = Object.values(stats).reduce((sum, count) => sum + count, 0)
  const isEmpty = totalItems === 0

  // Organize stats into logical groups
  const statGroups = [
    {
      title: 'Characters',
      stats: [
        { count: stats.npcs, label: 'NPCs' },
        { count: stats.monsters, label: 'Monsters' },
      ],
    },
    {
      title: 'World',
      stats: [
        { count: stats.locations, label: 'Locations' },
        { count: stats.items, label: 'Items' },
        { count: stats.taverns, label: 'Taverns' },
      ],
    },
    {
      title: 'Adventure',
      stats: [
        { count: stats.encounters, label: 'Encounters' },
        { count: stats.quests, label: 'Quests' },
        { count: stats.chases, label: 'Chases' },
      ],
    },
    {
      title: 'Encounters',
      stats: [
        { count: stats.merchants, label: 'Merchants' },
        { count: stats.traps, label: 'Traps' },
        { count: stats.critters, label: 'Critters' },
      ],
    },
    {
      title: 'Narrative',
      stats: [
        { count: stats.dialogues, label: 'Dialogues' },
        { count: stats.rumors, label: 'Rumors' },
      ],
    },
  ]

  if (activityLoading && recentActivity.length === 0) {
    return (
      <div className="bg-background-panel border border-border rounded-lg p-4 animate-pulse">
        <div className="h-6 bg-background rounded w-1/4 mb-3" />
        <div className="flex gap-4 flex-wrap">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 bg-background rounded w-24" />
          ))}
        </div>
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div className="bg-background-panel border border-border rounded-lg p-6">
        <div className="text-center">
          <Icon name="BarChart3" className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-50" />
          <h3 className="text-lg font-semibold text-text mb-2">No Content Yet</h3>
          <p className="text-text-muted mb-4">
            Get started by creating NPCs, monsters, locations, and more using the Prep Session
            toolkit above.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background-panel border border-border rounded-lg p-3 sm:p-4">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between gap-2 mb-3 sm:mb-4 hover:opacity-80 transition-opacity"
      >
        <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
          <Icon name="BarChart3" className="w-4 h-4" />
          Quick Stats
        </h3>
        <Icon
          name={isCollapsed ? 'ChevronDown' : 'ChevronUp'}
          className="w-4 h-4 text-text-muted md:hidden"
        />
      </button>

      {/* Mobile: Horizontal Scrollable Carousel */}
      <div className={`md:hidden ${isCollapsed ? 'hidden' : 'block'}`}>
        <div
          ref={scrollContainerRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {statGroups.map((group) => (
            <div
              key={group.title}
              className="flex-shrink-0 w-48 border border-border/40 rounded-lg p-3 space-y-2"
            >
              <h4 className="text-xs font-bold text-text uppercase tracking-wider pb-1 border-b border-border/20">
                {group.title}
              </h4>
              <div className="flex flex-col gap-0.5">
                {group.stats.map((stat) => (
                  <StatPill key={stat.label} count={stat.count} label={stat.label} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: Grid Layout */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {statGroups.map((group) => (
          <div key={group.title} className="border border-border/40 rounded-lg p-4 space-y-3">
            <h4 className="text-xs font-bold text-text uppercase tracking-wider pb-1 border-b border-border/20">
              {group.title}
            </h4>
            <div className="flex flex-col gap-0.5">
              {group.stats.map((stat) => (
                <StatPill key={stat.label} count={stat.count} label={stat.label} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
