// Chase content detail view

import Icon from "@/components/common/Icon";

interface Participants {
  quarry?: string;
  pursuers?: string;
}

interface Obstacle {
  name: string;
  description?: string;
  check?: string;
  failure?: string;
}

interface Shortcut {
  name: string;
  description?: string;
  benefit?: string;
}

interface ChasePhase {
  round: string | number;
  difficulty?: string;
  description: string;
}

interface EndingConditions {
  success?: string;
  failure?: string;
  alternative?: string;
}

interface Rewards {
  success?: string;
  partial?: string;
  failure?: string;
}

interface ChaseData {
  name: string;
  chase_type?: string;
  terrain?: string;
  difficulty?: string;
  description?: string;
  setting?: string;
  participants?: string | Participants;
  starting_conditions?: string;
  obstacles?: string | Obstacle[];
  complications?: string | string[];
  shortcuts?: string | Shortcut[];
  chase_phases?: string | ChasePhase[];
  ending_conditions?: string | EndingConditions;
  rewards?: string | Rewards;
  environmental_factors?: string | string[];
  special_rules?: string;
}

interface ChaseDetailProps {
  chase: ChaseData;
}

function parseJSON<T>(value: string | T | undefined): T | null {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}

export function ChaseDetail({ chase }: ChaseDetailProps) {
  const participants = parseJSON<Participants>(chase.participants);
  const obstacles = parseJSON<Obstacle[]>(chase.obstacles) || [];
  const complications = parseJSON<string[]>(chase.complications) || [];
  const shortcuts = parseJSON<Shortcut[]>(chase.shortcuts) || [];
  const chasePhases = parseJSON<ChasePhase[]>(chase.chase_phases) || [];
  const endingConditions = parseJSON<EndingConditions>(chase.ending_conditions);
  const rewards = parseJSON<Rewards>(chase.rewards);
  const environmentalFactors =
    parseJSON<string[]>(chase.environmental_factors) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-primary">{chase.name}</h2>
        <div className="flex gap-2 mt-2 flex-wrap">
          {chase.chase_type && (
            <span className="px-3 py-1 bg-primary/40 text-text rounded text-sm capitalize">
              {chase.chase_type.replace(/_/g, " ")}
            </span>
          )}
          {chase.terrain && (
            <span className="px-3 py-1 bg-blue-900/40 text-blue-300 rounded text-sm capitalize">
              {chase.terrain.replace(/_/g, " ")}
            </span>
          )}
          {chase.difficulty && (
            <span className="px-3 py-1 bg-purple-900/40 text-purple-300 rounded text-sm capitalize">
              {chase.difficulty}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {chase.description && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-2 flex items-center gap-2">
            <Icon name="FileText" className="w-5 h-5" />
            Description
          </h3>
          <p className="text-text leading-relaxed">{chase.description}</p>
        </div>
      )}

      {/* Setting */}
      {chase.setting && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-2 flex items-center gap-2">
            <Icon name="MapPin" className="w-5 h-5" />
            Setting
          </h3>
          <p className="text-text leading-relaxed">{chase.setting}</p>
        </div>
      )}

      {/* Participants */}
      {participants && (participants.quarry || participants.pursuers) && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3 flex items-center gap-2">
            <Icon name="Users" className="w-5 h-5" />
            Participants
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {participants.quarry && (
              <div className="bg-surface p-3 rounded border border-border">
                <span className="font-medium text-primary">Quarry:</span>
                <p className="text-text mt-1">{participants.quarry}</p>
              </div>
            )}
            {participants.pursuers && (
              <div className="bg-surface p-3 rounded border border-border">
                <span className="font-medium text-primary">Pursuers:</span>
                <p className="text-text mt-1">{participants.pursuers}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Starting Conditions */}
      {chase.starting_conditions && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-2 flex items-center gap-2">
            <Icon name="MapPin" className="w-5 h-5" />
            Starting Conditions
          </h3>
          <p className="text-text leading-relaxed">
            {chase.starting_conditions}
          </p>
        </div>
      )}

      {/* Obstacles */}
      {obstacles.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3 flex items-center gap-2">
            <Icon name="AlertCircle" className="w-5 h-5" />
            Obstacles
          </h3>
          <div className="space-y-3">
            {obstacles.map((obstacle, idx) => (
              <div
                key={idx}
                className="bg-surface p-4 rounded border border-border"
              >
                <h4 className="font-semibold text-primary mb-2">
                  {obstacle.name}
                </h4>
                {obstacle.description && (
                  <p className="text-text-muted text-sm mb-3">
                    {obstacle.description}
                  </p>
                )}
                <div className="grid md:grid-cols-2 gap-2 text-sm">
                  {obstacle.check && (
                    <div>
                      <span className="text-primary font-medium">Check:</span>
                      <p className="text-text">{obstacle.check}</p>
                    </div>
                  )}
                  {obstacle.failure && (
                    <div>
                      <span className="text-red-400 font-medium">Failure:</span>
                      <p className="text-text">{obstacle.failure}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Complications */}
      {complications.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3 flex items-center gap-2">
            <Icon name="AlertCircle" className="w-5 h-5" />
            Complications
          </h3>
          <ul className="space-y-2">
            {complications.map((complication, idx) => (
              <li key={idx} className="flex items-start gap-2 text-text">
                <span className="text-primary">•</span>
                <span>{complication}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Shortcuts */}
      {shortcuts.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3 flex items-center gap-2">
            <Icon name="Sparkles" className="w-5 h-5" />
            Shortcuts & Alternate Routes
          </h3>
          <div className="space-y-2">
            {shortcuts.map((shortcut, idx) => (
              <div
                key={idx}
                className="bg-surface p-3 rounded border-2 border-primary/30"
              >
                <h4 className="font-semibold text-text mb-1">
                  {shortcut.name}
                </h4>
                {shortcut.description && (
                  <p className="text-text-muted text-sm mb-1">
                    {shortcut.description}
                  </p>
                )}
                {shortcut.benefit && (
                  <p className="text-primary text-sm font-medium">
                    ✓ {shortcut.benefit}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chase Phases */}
      {chasePhases.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3 flex items-center gap-2">
            <Icon name="ArrowRight" className="w-5 h-5" />
            Chase Phases
          </h3>
          <div className="space-y-2">
            {chasePhases.map((phase, idx) => (
              <div
                key={idx}
                className="bg-surface p-3 rounded border border-border"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-primary">
                    Round {phase.round}
                  </span>
                  {phase.difficulty && (
                    <span className="text-sm px-2 py-0.5 bg-primary/20 text-primary rounded">
                      {phase.difficulty}
                    </span>
                  )}
                </div>
                <p className="text-text text-sm">{phase.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Environmental Factors */}
      {environmentalFactors.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3 flex items-center gap-2">
            <Icon name="Globe" className="w-5 h-5" />
            Environmental Factors
          </h3>
          <ul className="space-y-2">
            {environmentalFactors.map((factor, idx) => (
              <li key={idx} className="flex items-start gap-2 text-text">
                <span className="text-primary">•</span>
                <span>{factor}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Special Rules */}
      {chase.special_rules && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-2 flex items-center gap-2">
            <Icon name="Book" className="w-5 h-5" />
            Special Rules
          </h3>
          <p className="text-text leading-relaxed">{chase.special_rules}</p>
        </div>
      )}

      {/* Ending Conditions */}
      {endingConditions &&
        (endingConditions.success || endingConditions.failure) && (
          <div>
            <h3 className="text-lg font-semibold text-primary mb-3 flex items-center gap-2">
              <Icon name="Shield" className="w-5 h-5" />
              Ending Conditions
            </h3>
            <div className="space-y-2">
              {endingConditions.success && (
                <div className="bg-green-900/20 p-3 rounded border border-green-700">
                  <span className="font-medium text-green-400">Success:</span>
                  <p className="text-text mt-1">{endingConditions.success}</p>
                </div>
              )}
              {endingConditions.failure && (
                <div className="bg-red-900/20 p-3 rounded border border-red-700">
                  <span className="font-medium text-red-400">Failure:</span>
                  <p className="text-text mt-1">{endingConditions.failure}</p>
                </div>
              )}
              {endingConditions.alternative && (
                <div className="bg-primary/10 p-3 rounded border border-primary/30">
                  <span className="font-medium text-primary">Alternative:</span>
                  <p className="text-text mt-1">
                    {endingConditions.alternative}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

      {/* Rewards */}
      {rewards && rewards.success && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3 flex items-center gap-2">
            <Icon name="Package" className="w-5 h-5" />
            Rewards
          </h3>
          <div className="space-y-2">
            <div className="bg-surface p-3 rounded border border-border">
              <span className="font-medium text-primary">Success:</span>
              <p className="text-text mt-1">{rewards.success}</p>
            </div>
            {rewards.partial && (
              <div className="bg-surface p-3 rounded border border-border">
                <span className="font-medium text-primary">
                  Partial Success:
                </span>
                <p className="text-text mt-1">{rewards.partial}</p>
              </div>
            )}
            {rewards.failure && (
              <div className="bg-surface p-3 rounded border border-border">
                <span className="font-medium text-text-muted">Failure:</span>
                <p className="text-text mt-1">{rewards.failure}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
