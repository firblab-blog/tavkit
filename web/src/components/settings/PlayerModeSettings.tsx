import { useUISettingsStore } from '../../store/uiSettingsStore'
import Icon from '../common/Icon'

export default function PlayerModeSettings() {
  const {
    playerSettings,
    updatePlayerSettings,
    setPlayerGeneratorEnabled,
    setCharacterSheetSection,
  } = useUISettingsStore()

  const homePageSections = [
    {
      id: 'showCharacterStats',
      label: 'Character Stats Card',
      description: 'Show your active character with quick stats',
    },
    {
      id: 'useGradientCharacterCard',
      label: 'Gradient Character Card',
      description: 'Use colorful gradient style instead of flat panel',
    },
    {
      id: 'showQuickActions',
      label: 'Quick Actions',
      description: 'Show shortcuts to common actions',
    },
    {
      id: 'showCreateContent',
      label: 'Create Content Section',
      description: 'Show content creation tools for players',
    },
  ]

  const playerGenerators = [
    { id: 'npc', label: 'NPCs', description: 'Create characters for your backstory' },
    { id: 'location', label: 'Locations', description: 'Design places from your past' },
    { id: 'item', label: 'Items', description: 'Create custom treasures or heirlooms' },
    { id: 'quest', label: 'Quests', description: 'Design personal goals or side quests' },
  ]

  const characterSheetSections = [
    { id: 'combatStats', label: 'Combat Stats', description: 'AC, HP, Speed, Hit Dice' },
    { id: 'abilityScores', label: 'Ability Scores', description: 'STR, DEX, CON, INT, WIS, CHA' },
    { id: 'savingThrows', label: 'Saving Throws', description: 'Proficiencies and bonuses' },
    { id: 'skills', label: 'Skills', description: 'Skill proficiencies and modifiers' },
    { id: 'features', label: 'Features & Traits', description: 'Class features and racial traits' },
    { id: 'equipment', label: 'Equipment', description: 'Weapons, armor, and inventory' },
    { id: 'spells', label: 'Spellcasting', description: 'Spells, slots, and cantrips' },
    { id: 'personality', label: 'Personality', description: 'Traits, ideals, bonds, flaws' },
    {
      id: 'notes',
      label: 'Notes & Backstory',
      description: 'Personal notes and character history',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Player Home Page */}
      <div>
        <h3 className="text-lg font-semibold text-text mb-2">Player Home Page</h3>
        <p className="text-sm text-text-muted mb-4">
          Customize what appears on your player mode home page
        </p>
        <div className="space-y-3">
          {homePageSections.map((section) => {
            const key = section.id as keyof typeof playerSettings
            const isEnabled = playerSettings[key] as boolean
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
                  className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                    isEnabled ? 'bg-primary' : 'bg-border'
                  }`}
                  onClick={() => updatePlayerSettings({ [section.id]: !isEnabled })}
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

      {/* Player Content Creation */}
      <div>
        <h3 className="text-lg font-semibold text-text mb-2">Content Creation</h3>
        <p className="text-sm text-text-muted mb-4">
          Choose which generators are available in player mode. Created content goes to your
          personal library.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {playerGenerators.map((gen) => {
            const key = gen.id as keyof typeof playerSettings.enabledPlayerGenerators
            const isEnabled = playerSettings.enabledPlayerGenerators[key]
            return (
              <button
                key={gen.id}
                onClick={() => setPlayerGeneratorEnabled(key, !isEnabled)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  isEnabled
                    ? 'border-primary bg-primary/10 text-text'
                    : 'border-border bg-background text-text-muted hover:bg-background-panel'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon
                    name={isEnabled ? 'Check' : 'Plus'}
                    className={`w-4 h-4 ${isEnabled ? 'text-primary' : 'text-text-muted'}`}
                  />
                  <span className="font-medium">{gen.label}</span>
                </div>
                <p className="text-xs opacity-70">{gen.description}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Character Sheet Sections */}
      <div>
        <h3 className="text-lg font-semibold text-text mb-2">Character Sheet Sections</h3>
        <p className="text-sm text-text-muted mb-4">
          Show or hide sections in your character sheet modal
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {characterSheetSections.map((section) => {
            const key = section.id as keyof typeof playerSettings.characterSheetSections
            const isEnabled = playerSettings.characterSheetSections[key]
            return (
              <button
                key={section.id}
                onClick={() => setCharacterSheetSection(key, !isEnabled)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                  isEnabled
                    ? 'border-primary bg-primary/10 text-text'
                    : 'border-border bg-background text-text-muted hover:bg-background-panel'
                }`}
              >
                <Icon
                  name={isEnabled ? 'Eye' : 'EyeOff'}
                  className={`w-4 h-4 flex-shrink-0 ${isEnabled ? 'text-primary' : 'text-text-muted'}`}
                />
                <span className="truncate">{section.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
