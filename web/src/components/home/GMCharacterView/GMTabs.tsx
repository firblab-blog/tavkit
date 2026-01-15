import Icon, { IconName } from '../../common/Icon'
import { useScrollHide } from '../../../hooks/useScrollHide'

export type GMTabId = 'overview' | 'campaign' | 'session' | 'combat' | 'library' | 'chat'

export interface GMTabConfig {
  id: GMTabId
  label: string
  icon: IconName
  shortLabel?: string
}

export const GM_TABS: GMTabConfig[] = [
  { id: 'overview', label: 'Overview', icon: 'Zap', shortLabel: 'Home' },
  { id: 'campaign', label: 'Campaign', icon: 'BookOpen', shortLabel: 'Campaign' },
  { id: 'session', label: 'Session', icon: 'Play', shortLabel: 'Session' },
  { id: 'combat', label: 'Combat', icon: 'Swords', shortLabel: 'Combat' },
  { id: 'library', label: 'Library', icon: 'BookMarked', shortLabel: 'Library' },
  { id: 'chat', label: 'Chat', icon: 'MessageCircle', shortLabel: 'Chat' },
]

interface GMTabsProps {
  activeTab: GMTabId
  onTabChange: (tab: GMTabId) => void
  className?: string
}

export default function GMTabs({ activeTab, onTabChange, className = '' }: GMTabsProps) {
  return (
    <div className={`hidden sm:flex overflow-x-auto scrollbar-hide ${className}`}>
      <div className="flex gap-1 p-1 bg-background-panel rounded-xl border border-border min-w-full sm:min-w-0">
        {GM_TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                ${
                  isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-muted hover:text-text hover:bg-background'
                }`}
            >
              <Icon name={tab.icon} className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.shortLabel || tab.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Mobile bottom tab bar variant with Apple-style hide-on-scroll
interface MobileGMTabBarProps {
  activeTab: GMTabId
  onTabChange: (tab: GMTabId) => void
}

export function MobileGMTabBar({ activeTab, onTabChange }: MobileGMTabBarProps) {
  const { isVisible } = useScrollHide({ threshold: 10 })

  return (
    <div
      className="fixed left-0 right-0 bg-background-panel border-t border-border z-40 sm:hidden"
      style={{
        bottom: 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      }}
    >
      <div className="flex justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {GM_TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center gap-1 p-2 min-w-[64px] transition-colors
                ${isActive ? 'text-primary' : 'text-text-muted'}`}
            >
              <Icon name={tab.icon} className="w-5 h-5" />
              <span className="text-xs">{tab.shortLabel || tab.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
