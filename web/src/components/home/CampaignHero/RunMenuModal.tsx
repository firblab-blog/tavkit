import { useEffect } from 'react'
import { Campaign } from '../../../store/campaignStore'
import { useContainerStore } from '../../../store/containerStore'
import Icon, { IconName } from '../../common/Icon'

interface RunMenuModalProps {
  campaign: Campaign
  onClose: () => void
}

const sessionRunners: Array<{ tool: string; name: string; icon: IconName; description: string }> = [
  {
    tool: 'campaign',
    name: 'Campaign Ledger',
    icon: 'BookOpen',
    description: 'View all campaign content',
  },
  {
    tool: 'characters',
    name: 'Guild Roster',
    icon: 'Users',
    description: 'Manage party members',
  },
  {
    tool: 'session-chat',
    name: 'Session Chat',
    icon: 'MessageSquare',
    description: 'AI-powered campaign assistant',
  },
  {
    tool: 'chase-manager',
    name: 'Chase Manager',
    icon: 'ArrowRight',
    description: 'Dynamic chase scenes',
  },
  // Future session runners can be added here:
  // { tool: 'combat-tracker', name: 'Combat Tracker', icon: 'Swords', description: 'Track initiative & HP' },
  // { tool: 'social-encounter', name: 'Social Encounter', icon: 'Users', description: 'Manage negotiations' },
  // { tool: 'tavern-session', name: 'Tavern Session', icon: 'Beer', description: 'Run tavern scenes' },
  // { tool: 'shopping-session', name: 'Shopping', icon: 'Store', description: 'Merchant interactions' },
]

export default function RunMenuModal({ campaign, onClose }: RunMenuModalProps) {
  const { openContainer } = useContainerStore()

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const handleOpenRunner = (tool: string, name: string) => {
    openContainer({
      type: 'internal',
      tool,
      title: name,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-background-panel border border-primary/40 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-text flex items-center gap-3">
                Run Session - Tavern Toolkit
              </h2>
              <p className="text-text-muted mt-1">
                Track live sessions for{' '}
                <span className="text-primary font-medium">{campaign.name}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-background rounded-lg transition-colors"
            >
              <Icon name="X" className="w-6 h-6 text-text-muted hover:text-text" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {sessionRunners.map((runner) => (
              <button
                key={runner.tool}
                onClick={() => handleOpenRunner(runner.tool, runner.name)}
                className="group p-6 bg-background hover:bg-background-panel border border-border hover:border-primary/40 rounded-xl transition-all hover:scale-105 text-left"
              >
                <Icon
                  name={runner.icon}
                  className="w-10 h-10 text-primary mb-3 group-hover:scale-110 transition-transform"
                />
                <div className="font-bold text-text text-lg mb-1">{runner.name}</div>
                <div className="text-sm text-text-muted">{runner.description}</div>
              </button>
            ))}
          </div>

          {/* Coming Soon Section */}
          <div className="mt-8 p-6 bg-background/50 border border-border/50 rounded-xl">
            <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
              <Icon name="Clock" className="w-5 h-5 text-primary" />
              Coming Soon
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-background/50 rounded-lg opacity-60">
                <Icon name="Swords" className="w-6 h-6 text-text-muted mb-2" />
                <div className="text-sm font-medium text-text-muted">Combat Tracker</div>
              </div>
              <div className="p-3 bg-background/50 rounded-lg opacity-60">
                <Icon name="Users" className="w-6 h-6 text-text-muted mb-2" />
                <div className="text-sm font-medium text-text-muted">Social Encounters</div>
              </div>
              <div className="p-3 bg-background/50 rounded-lg opacity-60">
                <Icon name="Beer" className="w-6 h-6 text-text-muted mb-2" />
                <div className="text-sm font-medium text-text-muted">Tavern Sessions</div>
              </div>
              <div className="p-3 bg-background/50 rounded-lg opacity-60">
                <Icon name="Store" className="w-6 h-6 text-text-muted mb-2" />
                <div className="text-sm font-medium text-text-muted">Shopping</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
