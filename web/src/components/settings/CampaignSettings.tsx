import { useUISettingsStore } from '../../store/uiSettingsStore'
import Icon from '../common/Icon'

export default function CampaignSettings() {
  const { hiddenSections, toggleSectionVisibility } = useUISettingsStore()

  const sections = [
    { id: 'summary', name: 'Campaign Summary', icon: 'Sparkles' },
    { id: 'overview', name: 'Campaign Overview', icon: 'BookMarked' },
    { id: 'sessions', name: 'Sessions', icon: 'Calendar' },
    { id: 'locations', name: 'Locations', icon: 'Map' },
    { id: 'npcs', name: 'NPCs', icon: 'Users' },
    { id: 'pcs', name: 'Player Characters', icon: 'User' },
    { id: 'factions', name: 'Factions', icon: 'Shield' },
    { id: 'quests', name: 'Quests', icon: 'Scroll' },
    { id: 'items', name: 'Items', icon: 'Package' },
    { id: 'monsters', name: 'Monsters', icon: 'Skull' },
    { id: 'encounters', name: 'Encounters', icon: 'Swords' },
    { id: 'rumors', name: 'Rumors', icon: 'MessageSquare' },
    { id: 'dialogues', name: 'Dialogues', icon: 'MessageCircle' },
    { id: 'taverns', name: 'Taverns', icon: 'Beer' },
    { id: 'merchants', name: 'Merchants', icon: 'Store' },
    { id: 'traps', name: 'Traps', icon: 'AlertCircle' },
    { id: 'critters', name: 'Critters', icon: 'Shield' },
    { id: 'chases', name: 'Chases', icon: 'Sparkles' },
    { id: 'lore', name: 'Lore', icon: 'BookOpen' },
    { id: 'maps', name: 'Maps', icon: 'MapPin' },
    { id: 'handouts', name: 'Handouts', icon: 'FileText' },
    { id: 'props', name: 'Props', icon: 'Box' },
    { id: 'art', name: 'Art', icon: 'Image' },
    { id: 'statblocks', name: 'Stat Blocks', icon: 'Swords' },
    { id: 'soundscapes', name: 'Soundscapes', icon: 'Volume2' },
    { id: 'gm-notes', name: 'GM Notes', icon: 'FileEdit' },
    { id: 'tracking', name: 'Tracking', icon: 'ListChecks' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-text mb-2">Visible Campaign Sections</h3>
        <p className="text-sm text-text-muted">
          Hide unused sections to reduce clutter. Sections with existing content will still be
          accessible.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sections.map((section) => {
          const isVisible = !hiddenSections.includes(section.id)
          return (
            <button
              key={section.id}
              onClick={() => toggleSectionVisibility(section.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                isVisible
                  ? 'border-primary bg-primary/10 text-text hover:bg-primary/20'
                  : 'border-border bg-background text-text-muted hover:bg-background-muted'
              }`}
            >
              <Icon
                name={isVisible ? 'Eye' : 'EyeOff'}
                className={`w-4 h-4 flex-shrink-0 ${isVisible ? 'text-primary' : 'text-text-muted'}`}
              />
              <span className="text-sm font-medium truncate">{section.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
