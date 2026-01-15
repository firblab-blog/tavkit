import { useUISettingsStore } from "../../store/uiSettingsStore";

export default function ToolSettings() {
  const { enabledTools, setToolEnabled } = useUISettingsStore();

  const tools = [
    {
      key: "dnd5etools",
      name: "D&D 5E Tools",
      description: "Official D&D 5th Edition reference",
      beta: false,
    },
    {
      key: "dndbeyond",
      name: "D&D Beyond",
      description: "Wizards of the Coast digital toolset",
      beta: true,
    },
    {
      key: "roll20",
      name: "Roll20",
      description: "Virtual tabletop with dice rolling",
      beta: true,
    },
    {
      key: "foundryvtt",
      name: "Foundry VTT",
      description: "Self-hosted virtual tabletop",
      beta: true,
    },
    {
      key: "koboldplus",
      name: "Kobold Plus Club",
      description: "Encounter builder and CR calculator",
      beta: false,
    },
    {
      key: "tabletopaudio",
      name: "Tabletop Audio",
      description: "Ambient sounds and music for sessions",
      beta: true,
    },
    {
      key: "fantasynamegen",
      name: "Fantasy Name Generators",
      description: "Random name generators for characters and places",
      beta: false,
    },
    {
      key: "dungeonscrawl",
      name: "Dungeon Scrawl",
      description: "Free dungeon map maker",
      beta: false,
    },
    {
      key: "thievesguild",
      name: "Thieves Guild",
      description: "Random generators for NPCs, treasures, and more",
      beta: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-text mb-2">External Tools</h3>
        <p className="text-sm text-text-muted">
          Enable or disable third-party tool integrations
        </p>
      </div>

      <div className="space-y-3">
        {tools.map((tool) => (
          <div
            key={tool.key}
            className="flex items-center justify-between py-3 px-4 rounded-lg border border-border bg-background hover:border-primary/40 transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text">
                  {tool.name}
                </span>
                {tool.beta && (
                  <span className="px-1.5 py-0.5 text-xs rounded bg-blue-500/20 text-blue-400">
                    Beta
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted mt-1">{tool.description}</p>
            </div>
            <button
              onClick={() =>
                setToolEnabled(
                  tool.key as any,
                  !enabledTools[tool.key as keyof typeof enabledTools],
                )
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                enabledTools[tool.key as keyof typeof enabledTools]
                  ? "bg-primary"
                  : "bg-background-muted"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  enabledTools[tool.key as keyof typeof enabledTools]
                    ? "translate-x-6"
                    : "translate-x-1"
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
