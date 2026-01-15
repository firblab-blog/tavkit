// Critter content detail view

import Icon from "@/components/common/Icon";

interface CritterStats {
  ac?: number;
  hp?: number;
  speed?: string;
  str?: number;
  dex?: number;
  con?: number;
  int?: number;
  wis?: number;
  cha?: number;
}

interface SpecialAbility {
  name: string;
  description: string;
}

interface CritterData {
  name: string;
  species?: string;
  critter_type: string;
  size: string;
  temperament?: string;
  habitat?: string;
  description?: string;
  behavior?: string;
  stats?: string | CritterStats;
  special_abilities?: string | SpecialAbility[];
  uses?: string | string[];
  training_difficulty?: string;
  diet?: string;
  lifespan?: string;
  interesting_facts?: string | string[];
  encounter_notes?: string;
}

interface CritterDetailProps {
  critter: CritterData;
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

export function CritterDetail({ critter }: CritterDetailProps) {
  const stats = parseJSON<CritterStats>(critter.stats);
  const specialAbilities =
    parseJSON<SpecialAbility[]>(critter.special_abilities) || [];
  const uses = parseJSON<string[]>(critter.uses) || [];
  const interestingFacts = parseJSON<string[]>(critter.interesting_facts) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-primary">{critter.name}</h2>
        {critter.species && (
          <p className="text-sm text-text-muted italic mt-1">
            {critter.species}
          </p>
        )}
        <div className="flex gap-2 mt-2 flex-wrap">
          <span className="px-3 py-1 bg-primary/40 text-text rounded text-sm capitalize">
            {critter.critter_type}
          </span>
          <span className="px-3 py-1 bg-blue-900/40 text-blue-300 rounded text-sm capitalize">
            {critter.size}
          </span>
          {critter.temperament && (
            <span className="px-3 py-1 bg-purple-900/40 text-purple-300 rounded text-sm capitalize">
              {critter.temperament}
            </span>
          )}
          {critter.habitat && (
            <span className="px-3 py-1 bg-green-900/40 text-green-300 rounded text-sm capitalize">
              {critter.habitat}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {critter.description && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-2 flex items-center gap-2">
            <Icon name="FileText" className="w-5 h-5" />
            Description
          </h3>
          <p className="text-text leading-relaxed">{critter.description}</p>
        </div>
      )}

      {/* Behavior */}
      {critter.behavior && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-2 flex items-center gap-2">
            <Icon name="AlertCircle" className="w-5 h-5" />
            Behavior
          </h3>
          <p className="text-text leading-relaxed">{critter.behavior}</p>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3 flex items-center gap-2">
            <Icon name="Package" className="w-5 h-5" />
            Stats
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {stats.ac !== undefined && (
              <div className="bg-surface p-3 rounded border border-border">
                <p className="text-xs text-text-muted mb-1">Armor Class</p>
                <p className="text-xl font-bold text-primary">{stats.ac}</p>
              </div>
            )}
            {stats.hp !== undefined && (
              <div className="bg-surface p-3 rounded border border-border">
                <p className="text-xs text-text-muted mb-1">Hit Points</p>
                <p className="text-xl font-bold text-red-400">{stats.hp}</p>
              </div>
            )}
            {stats.speed && (
              <div className="bg-surface p-3 rounded border border-border">
                <p className="text-xs text-text-muted mb-1">Speed</p>
                <p className="text-xl font-bold text-blue-400">{stats.speed}</p>
              </div>
            )}
          </div>

          {/* Ability Scores */}
          {(stats.str !== undefined ||
            stats.dex !== undefined ||
            stats.con !== undefined ||
            stats.int !== undefined ||
            stats.wis !== undefined ||
            stats.cha !== undefined) && (
            <div className="grid grid-cols-6 gap-2 mt-3">
              {stats.str !== undefined && (
                <div className="bg-surface p-2 rounded border border-border text-center">
                  <p className="text-xs text-text-muted mb-1">STR</p>
                  <p className="text-lg font-bold text-text">{stats.str}</p>
                </div>
              )}
              {stats.dex !== undefined && (
                <div className="bg-surface p-2 rounded border border-border text-center">
                  <p className="text-xs text-text-muted mb-1">DEX</p>
                  <p className="text-lg font-bold text-text">{stats.dex}</p>
                </div>
              )}
              {stats.con !== undefined && (
                <div className="bg-surface p-2 rounded border border-border text-center">
                  <p className="text-xs text-text-muted mb-1">CON</p>
                  <p className="text-lg font-bold text-text">{stats.con}</p>
                </div>
              )}
              {stats.int !== undefined && (
                <div className="bg-surface p-2 rounded border border-border text-center">
                  <p className="text-xs text-text-muted mb-1">INT</p>
                  <p className="text-lg font-bold text-text">{stats.int}</p>
                </div>
              )}
              {stats.wis !== undefined && (
                <div className="bg-surface p-2 rounded border border-border text-center">
                  <p className="text-xs text-text-muted mb-1">WIS</p>
                  <p className="text-lg font-bold text-text">{stats.wis}</p>
                </div>
              )}
              {stats.cha !== undefined && (
                <div className="bg-surface p-2 rounded border border-border text-center">
                  <p className="text-xs text-text-muted mb-1">CHA</p>
                  <p className="text-lg font-bold text-text">{stats.cha}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Special Abilities */}
      {specialAbilities.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3 flex items-center gap-2">
            <Icon name="Sparkles" className="w-5 h-5" />
            Special Abilities
          </h3>
          <div className="space-y-3">
            {specialAbilities.map((ability, idx) => (
              <div
                key={idx}
                className="bg-surface p-4 rounded border border-border"
              >
                <h4 className="font-semibold text-primary mb-2">
                  {ability.name}
                </h4>
                <p className="text-text text-sm">{ability.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uses */}
      {uses.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3 flex items-center gap-2">
            <Icon name="Sparkles" className="w-5 h-5" />
            Potential Uses
          </h3>
          <ul className="list-disc list-inside space-y-1">
            {uses.map((use, idx) => (
              <li key={idx} className="text-text">
                {use}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Training, Diet, Lifespan */}
      {(critter.training_difficulty || critter.diet || critter.lifespan) && (
        <div className="grid md:grid-cols-3 gap-4">
          {critter.training_difficulty && (
            <div>
              <h3 className="text-lg font-semibold text-primary mb-2 flex items-center gap-2">
                <Icon name="AlertCircle" className="w-5 h-5" />
                Training
              </h3>
              <p className="text-text">{critter.training_difficulty}</p>
            </div>
          )}
          {critter.diet && (
            <div>
              <h3 className="text-lg font-semibold text-primary mb-2 flex items-center gap-2">
                <Icon name="Package" className="w-5 h-5" />
                Diet
              </h3>
              <p className="text-text">{critter.diet}</p>
            </div>
          )}
          {critter.lifespan && (
            <div>
              <h3 className="text-lg font-semibold text-primary mb-2 flex items-center gap-2">
                <Icon name="Calendar" className="w-5 h-5" />
                Lifespan
              </h3>
              <p className="text-text">{critter.lifespan}</p>
            </div>
          )}
        </div>
      )}

      {/* Interesting Facts */}
      {interestingFacts.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3 flex items-center gap-2">
            <Icon name="BookOpen" className="w-5 h-5" />
            Interesting Facts
          </h3>
          <ul className="list-disc list-inside space-y-1">
            {interestingFacts.map((fact, idx) => (
              <li key={idx} className="text-text">
                {fact}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Encounter Notes */}
      {critter.encounter_notes && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-2 flex items-center gap-2">
            <Icon name="MessageSquare" className="w-5 h-5" />
            Encounter Notes
          </h3>
          <div className="bg-amber-900/20 p-4 rounded border border-amber-700">
            <p className="text-text leading-relaxed">
              {critter.encounter_notes}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
