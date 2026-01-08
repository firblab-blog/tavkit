import { useEffect } from 'react'
import { Campaign } from '../../../store/campaignStore'
import { useContainerStore } from '../../../store/containerStore'
import { useUISettingsStore } from '../../../store/uiSettingsStore'
import Icon, { IconName } from '../../common/Icon'

interface PrepMenuModalProps {
  campaign: Campaign
  onClose: () => void
}

const generators: Array<{ tool: string; name: string; icon: IconName; description: string }> = [
  { tool: 'npc', name: 'NPCs', icon: 'Users', description: 'Generate characters' },
  { tool: 'monster', name: 'Monsters', icon: 'Skull', description: 'Create creatures' },
  { tool: 'location', name: 'Locations', icon: 'Map', description: 'Build places' },
  { tool: 'quest', name: 'Quests', icon: 'Scroll', description: 'Design adventures' },
  { tool: 'item', name: 'Items', icon: 'Package', description: 'Forge treasures' },
  { tool: 'encounter', name: 'Encounters', icon: 'Swords', description: 'Plan battles' },
  {
    tool: 'dialogue',
    name: 'Dialogues',
    icon: 'MessageSquare',
    description: 'Write conversations',
  },
  { tool: 'rumor', name: 'Rumors', icon: 'MessageCircle', description: 'Spread whispers' },
  { tool: 'tavern', name: 'Taverns', icon: 'Beer', description: 'Generate establishments' },
  { tool: 'merchant', name: 'Merchants', icon: 'Store', description: 'Create shops' },
  { tool: 'trap', name: 'Traps', icon: 'AlertCircle', description: 'Design hazards' },
  { tool: 'critter', name: 'Critters', icon: 'Shield', description: 'Generate companions' },
  { tool: 'chase', name: 'Chases', icon: 'ArrowRight', description: 'Create pursuits' },
]

export default function PrepMenuModal({ campaign, onClose }: PrepMenuModalProps) {
  const { openContainer } = useContainerStore()
  const { enabledGenerators } = useUISettingsStore()

  // Map generator tool names to enabledGenerators keys
  const toolToGeneratorKey: Record<string, keyof typeof enabledGenerators> = {
    npc: 'npc',
    monster: 'monster',
    location: 'location',
    quest: 'quest',
    item: 'item',
    encounter: 'encounter',
    dialogue: 'dialogue',
    rumor: 'rumor',
    tavern: 'tavern',
    merchant: 'merchant',
    trap: 'trap',
    critter: 'critter',
    chase: 'chase',
  }

  // Filter generators based on enabled state
  const visibleGenerators = generators.filter((gen) => {
    const generatorKey = toolToGeneratorKey[gen.tool]
    return generatorKey ? enabledGenerators[generatorKey] : true
  })

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const handleOpenGenerator = (tool: string, name: string) => {
    openContainer({
      type: 'internal',
      tool,
      title: `${name} Generator`,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-background-panel border border-primary/40 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-border bg-gradient-to-r from-[#B87333]/10 to-transparent">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-text flex items-center gap-3">
                Prep Session - Artificer's Toolkit
              </h2>
              <p className="text-text-muted mt-1">
                Generate content for{' '}
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {visibleGenerators.map((gen) => (
              <button
                key={gen.tool}
                onClick={() => handleOpenGenerator(gen.tool, gen.name)}
                className="group p-4 bg-background hover:bg-background-panel border border-border hover:border-primary/40 rounded-xl transition-all hover:scale-105 text-left"
              >
                <Icon
                  name={gen.icon}
                  className="w-8 h-8 text-primary mb-2 group-hover:scale-110 transition-transform"
                />
                <div className="font-bold text-text mb-1">{gen.name}</div>
                <div className="text-xs text-text-muted">{gen.description}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
