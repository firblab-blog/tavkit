import { useUISettingsStore } from '../../store/uiSettingsStore'

export default function GeneratorSettings() {
  const { enabledGenerators, setGeneratorEnabled } = useUISettingsStore()

  const generators = [
    {
      key: 'npc',
      name: 'NPC Generator',
      description: 'Create detailed non-player characters',
      beta: false,
    },
    {
      key: 'monster',
      name: 'Monster Generator',
      description: 'Generate custom monsters and creatures',
      beta: false,
    },
    {
      key: 'location',
      name: 'Location Generator',
      description: 'Create places, dungeons, and environments',
      beta: false,
    },
    {
      key: 'item',
      name: 'Item Generator',
      description: 'Generate magical items and treasure',
      beta: false,
    },
    {
      key: 'encounter',
      name: 'Encounter Builder',
      description: 'Build balanced combat encounters',
      beta: false,
    },
    {
      key: 'rumor',
      name: 'Rumor Generator',
      description: 'Generate tavern rumors and plot hooks',
      beta: false,
    },
    {
      key: 'tavern',
      name: 'Tavern Generator',
      description: 'Create inns, taverns, and gathering places',
      beta: false,
    },
    {
      key: 'merchant',
      name: 'Merchant Generator',
      description: 'Generate shops and merchants',
      beta: false,
    },
    {
      key: 'trap',
      name: 'Trap Generator',
      description: 'Create traps, puzzles, and hazards',
      beta: false,
    },
    {
      key: 'critter',
      name: 'Critter Generator',
      description: 'Generate creatures and companions',
      beta: false,
    },
    {
      key: 'quest',
      name: 'Quest Generator',
      description: 'Generate quest hooks and objectives',
      beta: false,
    },
    {
      key: 'dialogue',
      name: 'Dialogue Builder',
      description: 'Create NPC conversations and dialogue trees',
      beta: false,
    },
    {
      key: 'chase',
      name: 'Chase Generator',
      description: 'Generate chase and pursuit scenes',
      beta: false,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-text mb-2">AI Generators</h3>
        <p className="text-sm text-text-muted">
          Enable or disable individual AI content generators
        </p>
      </div>

      <div className="space-y-3">
        {generators.map((generator) => (
          <div
            key={generator.key}
            className="flex items-center justify-between py-3 px-4 rounded-lg border border-border bg-background hover:border-primary/40 transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text">{generator.name}</span>
                {generator.beta && (
                  <span className="px-1.5 py-0.5 text-xs rounded bg-amber-500/20 text-amber-400">
                    Beta
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted mt-1">{generator.description}</p>
            </div>
            <button
              onClick={() =>
                setGeneratorEnabled(
                  generator.key as any,
                  !enabledGenerators[generator.key as keyof typeof enabledGenerators]
                )
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                enabledGenerators[generator.key as keyof typeof enabledGenerators]
                  ? 'bg-primary'
                  : 'bg-background-muted'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  enabledGenerators[generator.key as keyof typeof enabledGenerators]
                    ? 'translate-x-6'
                    : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
