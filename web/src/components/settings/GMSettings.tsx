import { useUISettingsStore } from '../../store/uiSettingsStore'
import Icon from '../common/Icon'

export default function GMSettings() {
  const { gmSettings, updateGMSettings, hiddenSections, toggleSectionVisibility } =
    useUISettingsStore()

  const homePageSections = [
    {
      id: 'showQuickStats',
      label: 'Quick Stats Bar',
      description: 'Show content counts at a glance',
    },
    {
      id: 'showRecentActivity',
      label: 'Recent Activity',
      description: 'Show recently created/modified content',
    },
    {
      id: 'showExternalTools',
      label: 'External Tools',
      description: 'Show links to external D&D tools',
    },
  ]

  const defaultHomeSections = [
    { id: 'campaign', label: 'Campaign', description: 'Campaign management and overview' },
    { id: 'create', label: 'Create', description: 'Content creation tools and generators' },
    { id: 'play', label: 'Play', description: 'Session tools like combat tracker' },
  ]

  const campaignSections = [
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
    { id: 'gm-notes', name: 'GM Notes', icon: 'FileEdit' },
  ]

  return (
    <div className="space-y-8">
      {/* Home Page Layout */}
      <div>
        <h3 className="text-lg font-semibold text-text mb-2">GM Home Page</h3>
        <p className="text-sm text-text-muted mb-4">
          Customize what sections appear on your GM home page
        </p>
        <div className="space-y-3">
          {homePageSections.map((section) => {
            const key = section.id as keyof typeof gmSettings
            const isEnabled = gmSettings[key] as boolean
            return (
              <label
                key={section.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-background hover:bg-background-panel transition-colors cursor-pointer"
              >
                <div>
                  <span className="text-text font-medium">{section.label}</span>
                  <p className="text-sm text-text-muted">{section.description}</p>
                </div>
                <div
                  className={`w-12 h-6 rounded-full p-1 transition-colors ${
                    isEnabled ? 'bg-primary' : 'bg-border'
                  }`}
                  onClick={() => updateGMSettings({ [section.id]: !isEnabled })}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      isEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </div>
              </label>
            )
          })}
        </div>
      </div>

      {/* Default Home Section */}
      <div>
        <h3 className="text-lg font-semibold text-text mb-2">Default Home Section</h3>
        <p className="text-sm text-text-muted mb-4">
          Which section to expand by default when opening GM mode
        </p>
        <div className="grid grid-cols-3 gap-3">
          {defaultHomeSections.map((section) => (
            <button
              key={section.id}
              onClick={() =>
                updateGMSettings({
                  defaultHomeSection: section.id as 'campaign' | 'create' | 'play',
                })
              }
              className={`p-4 rounded-lg border text-center transition-colors ${
                gmSettings.defaultHomeSection === section.id
                  ? 'border-primary bg-primary/10 text-text'
                  : 'border-border bg-background text-text-muted hover:bg-background-panel'
              }`}
            >
              <span className="font-medium">{section.label}</span>
              <p className="text-xs mt-1 opacity-70">{section.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Campaign Sections Visibility */}
      <div>
        <h3 className="text-lg font-semibold text-text mb-2">Campaign Sections</h3>
        <p className="text-sm text-text-muted mb-4">
          Show or hide sections in the campaign toolkit. Hidden sections with content will still be
          accessible.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {campaignSections.map((section) => {
            const isVisible = !hiddenSections.includes(section.id)
            return (
              <button
                key={section.id}
                onClick={() => toggleSectionVisibility(section.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                  isVisible
                    ? 'border-primary bg-primary/10 text-text'
                    : 'border-border bg-background text-text-muted hover:bg-background-panel'
                }`}
              >
                <Icon
                  name={isVisible ? 'Eye' : 'EyeOff'}
                  className={`w-4 h-4 flex-shrink-0 ${isVisible ? 'text-primary' : 'text-text-muted'}`}
                />
                <span className="truncate">{section.name}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
