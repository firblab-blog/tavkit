// Monster Result Renderer
// Displays generated Monster data in a structured format

import Icon from "@/components/common/Icon";
import { ActionsBar } from "@/components/ui/ActionsBar";
import { RawDataViewer, ParseWarning } from "../components";
import type { GeneratedMonsterData } from "../normalizers/monster";

interface MonsterRendererProps {
  monster: GeneratedMonsterData;
  showRawResponse: boolean;
  isSaved: boolean;
  onSave: () => void;
  onCopy: () => void;
}

function getModifier(score: number): string {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function MonsterRenderer({
  monster,
  showRawResponse,
  isSaved,
  onSave,
  onCopy,
}: MonsterRendererProps) {
  return (
    <div className="space-y-6">
      {/* Parse warning */}
      {monster._parseError && <ParseWarning message={monster._parseError} />}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-primary">{monster.name}</h2>
        <p className="text-sm text-text-muted capitalize">
          {monster.size} {monster.type}
          {monster.alignment && ` • ${monster.alignment}`}
        </p>
      </div>

      {/* Core Stats - Colored Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-background p-3 rounded border border-border">
          <p className="text-xs text-text-muted mb-1">Armor Class</p>
          <p className="text-xl font-bold text-primary">
            {monster.armor_class}
          </p>
        </div>
        <div className="bg-background p-3 rounded border border-border">
          <p className="text-xs text-text-muted mb-1">Hit Points</p>
          <p className="text-xl font-bold text-red-400">
            {monster.hit_points.average}
            {monster.hit_points.dice && (
              <span className="text-sm font-normal text-text-muted ml-1">
                ({monster.hit_points.dice})
              </span>
            )}
          </p>
        </div>
        <div className="bg-background p-3 rounded border border-border">
          <p className="text-xs text-text-muted mb-1">Challenge</p>
          <p className="text-xl font-bold text-amber-400">
            CR {monster.challenge_rating}
            {monster.xp && (
              <span className="text-sm font-normal text-text-muted ml-1">
                ({monster.xp.toLocaleString()} XP)
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Speed */}
      {monster.speed && Object.keys(monster.speed).length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="Sparkles" className="w-5 h-5 text-primary" />
            Speed
          </h3>
          <p className="text-text">
            {Object.entries(monster.speed)
              .map(([moveType, speed]) => `${moveType} ${speed} ft.`)
              .join(", ")}
          </p>
        </div>
      )}

      {/* Ability Scores */}
      {monster.abilities && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="BarChart3" className="w-5 h-5 text-primary" />
            Ability Scores
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {Object.entries(monster.abilities).map(([stat, value]) => (
              <div
                key={stat}
                className="bg-background p-2 rounded border border-border text-center"
              >
                <p className="text-xs text-text-muted mb-1">{stat}</p>
                <p className="text-lg font-bold text-text">{value}</p>
                <p className="text-xs text-primary">{getModifier(value)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Saving Throws & Skills */}
      {((monster.saving_throws &&
        Object.keys(monster.saving_throws).length > 0) ||
        (monster.skills && Object.keys(monster.skills).length > 0)) && (
        <div className="space-y-2">
          {monster.saving_throws &&
            Object.keys(monster.saving_throws).length > 0 && (
              <p className="text-text">
                <strong className="text-primary">Saving Throws:</strong>{" "}
                {Object.entries(monster.saving_throws)
                  .map(([stat, mod]) => `${stat} ${mod}`)
                  .join(", ")}
              </p>
            )}
          {monster.skills && Object.keys(monster.skills).length > 0 && (
            <p className="text-text">
              <strong className="text-primary">Skills:</strong>{" "}
              {Object.entries(monster.skills)
                .map(([skill, mod]) => `${skill} ${mod}`)
                .join(", ")}
            </p>
          )}
        </div>
      )}

      {/* Resistances & Immunities */}
      {(monster.damage_resistances?.length ||
        monster.damage_immunities?.length ||
        monster.condition_immunities?.length) && (
        <div className="space-y-2">
          {monster.damage_resistances &&
            monster.damage_resistances.length > 0 && (
              <p className="text-text">
                <strong className="text-blue-400">Damage Resistances:</strong>{" "}
                {monster.damage_resistances.join(", ")}
              </p>
            )}
          {monster.damage_immunities &&
            monster.damage_immunities.length > 0 && (
              <p className="text-text">
                <strong className="text-purple-400">Damage Immunities:</strong>{" "}
                {monster.damage_immunities.join(", ")}
              </p>
            )}
          {monster.condition_immunities &&
            monster.condition_immunities.length > 0 && (
              <p className="text-text">
                <strong className="text-green-400">
                  Condition Immunities:
                </strong>{" "}
                {monster.condition_immunities.join(", ")}
              </p>
            )}
        </div>
      )}

      {/* Senses & Languages */}
      <div className="space-y-2">
        {monster.senses && Object.keys(monster.senses).length > 0 && (
          <p className="text-text">
            <strong className="text-primary">Senses:</strong>{" "}
            {Object.entries(monster.senses)
              .map(([sense, range]) => {
                if (sense === "description") return String(range);
                if (typeof range === "number") return `${sense} ${range} ft.`;
                return `${sense} ${range}`;
              })
              .join(", ")}
          </p>
        )}
        {monster.languages && monster.languages.length > 0 && (
          <p className="text-text">
            <strong className="text-primary">Languages:</strong>{" "}
            {monster.languages.join(", ")}
          </p>
        )}
      </div>

      {/* Traits */}
      {monster.traits && monster.traits.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Sparkles" className="w-5 h-5 text-primary" />
            Traits
          </h3>
          <div className="space-y-3">
            {monster.traits.map((trait, i) => (
              <div
                key={i}
                className="bg-background p-4 rounded border border-primary/30"
              >
                <h4 className="font-medium text-primary mb-2">{trait.name}</h4>
                <p className="text-text text-sm">{trait.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {monster.actions && monster.actions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Swords" className="w-5 h-5 text-red-400" />
            Actions
          </h3>
          <div className="space-y-3">
            {monster.actions.map((action, i) => (
              <div
                key={i}
                className="bg-background p-4 rounded border border-red-500/30"
              >
                <h4 className="font-medium text-red-400 mb-2">{action.name}</h4>
                <p className="text-text text-sm">{action.description}</p>
                {(action.attack_bonus || action.damage) && (
                  <p className="text-text-muted text-xs mt-2">
                    {action.attack_bonus && (
                      <span>Attack: {action.attack_bonus} to hit. </span>
                    )}
                    {action.damage && <span>Damage: {action.damage}</span>}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legendary Actions */}
      {monster.legendary_actions && monster.legendary_actions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-amber-400 mb-3 flex items-center gap-2">
            <Icon name="Sparkles" className="w-5 h-5" />
            Legendary Actions
          </h3>
          <div className="space-y-3">
            {monster.legendary_actions.map((action, i) => (
              <div
                key={i}
                className="bg-amber-500/10 p-4 rounded border border-amber-500/30"
              >
                <h4 className="font-medium text-amber-400 mb-2">
                  {action.name}
                </h4>
                <p className="text-text text-sm">{action.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lair Actions */}
      {monster.lair_actions && monster.lair_actions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-purple-400 mb-3 flex items-center gap-2">
            <Icon name="MapPin" className="w-5 h-5" />
            Lair Actions
          </h3>
          <div className="space-y-3">
            {monster.lair_actions.map((action, i) => (
              <div
                key={i}
                className="bg-purple-500/10 p-4 rounded border border-purple-500/30"
              >
                <h4 className="font-medium text-purple-400 mb-2">
                  {action.name}
                </h4>
                <p className="text-text text-sm">{action.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lore */}
      {monster.lore && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="BookOpen" className="w-5 h-5 text-primary" />
            Lore
          </h3>
          <div className="bg-background p-4 rounded border border-border">
            <p className="text-text">{monster.lore}</p>
          </div>
        </div>
      )}

      {/* Raw/unexpected fields */}
      {monster._raw && (
        <RawDataViewer data={monster._raw} defaultExpanded={showRawResponse} />
      )}

      <ActionsBar
        onCopy={onCopy}
        onSave={isSaved ? undefined : onSave}
        showRegenerate={false}
        isSaved={isSaved}
      />
    </div>
  );
}

// Helper to format Monster for clipboard
export function formatMonsterForClipboard(
  monster: GeneratedMonsterData,
): string {
  let text = `${monster.name}\n${monster.size} ${monster.type}${monster.alignment ? `, ${monster.alignment}` : ""}`;

  text += `\n\nArmor Class: ${monster.armor_class}`;
  text += `\nHit Points: ${monster.hit_points.average}${monster.hit_points.dice ? ` (${monster.hit_points.dice})` : ""}`;

  if (monster.speed && Object.keys(monster.speed).length > 0) {
    text += `\nSpeed: ${Object.entries(monster.speed)
      .map(([type, speed]) => `${type} ${speed} ft.`)
      .join(", ")}`;
  }

  text += `\n\nAbilities:\n${Object.entries(monster.abilities)
    .map(([stat, value]) => `${stat} ${value} (${getModifier(value)})`)
    .join(", ")}`;

  if (monster.saving_throws && Object.keys(monster.saving_throws).length > 0) {
    text += `\n\nSaving Throws: ${Object.entries(monster.saving_throws)
      .map(([stat, mod]) => `${stat} ${mod}`)
      .join(", ")}`;
  }
  if (monster.skills && Object.keys(monster.skills).length > 0) {
    text += `\n\nSkills: ${Object.entries(monster.skills)
      .map(([skill, mod]) => `${skill} ${mod}`)
      .join(", ")}`;
  }
  if (monster.damage_resistances && monster.damage_resistances.length > 0) {
    text += `\n\nDamage Resistances: ${monster.damage_resistances.join(", ")}`;
  }
  if (monster.damage_immunities && monster.damage_immunities.length > 0) {
    text += `\n\nDamage Immunities: ${monster.damage_immunities.join(", ")}`;
  }
  if (monster.condition_immunities && monster.condition_immunities.length > 0) {
    text += `\n\nCondition Immunities: ${monster.condition_immunities.join(", ")}`;
  }
  if (monster.senses && Object.keys(monster.senses).length > 0) {
    text += `\n\nSenses: ${Object.entries(monster.senses)
      .map(([sense, range]) => {
        if (sense === "description") return String(range);
        if (typeof range === "number") return `${sense} ${range} ft.`;
        return `${sense} ${range}`;
      })
      .join(", ")}`;
  }
  if (monster.languages && monster.languages.length > 0) {
    text += `\n\nLanguages: ${monster.languages.join(", ")}`;
  }
  text += `\n\nChallenge: ${monster.challenge_rating}${monster.xp ? ` (${monster.xp.toLocaleString()} XP)` : ""}`;

  if (monster.traits && monster.traits.length > 0) {
    text += "\n\nTraits:";
    monster.traits.forEach((trait) => {
      text += `\n\n${trait.name}. ${trait.description}`;
    });
  }

  if (monster.actions && monster.actions.length > 0) {
    text += "\n\nActions:";
    monster.actions.forEach((action) => {
      text += `\n\n${action.name}. ${action.description}`;
      if (action.attack_bonus)
        text += ` Attack: ${action.attack_bonus} to hit.`;
      if (action.damage) text += ` Damage: ${action.damage}.`;
    });
  }

  if (monster.legendary_actions && monster.legendary_actions.length > 0) {
    text += "\n\nLegendary Actions:";
    monster.legendary_actions.forEach((action) => {
      text += `\n\n${action.name}. ${action.description}`;
    });
  }

  if (monster.lair_actions && monster.lair_actions.length > 0) {
    text += "\n\nLair Actions:";
    monster.lair_actions.forEach((action) => {
      text += `\n\n${action.name}. ${action.description}`;
    });
  }

  text += `\n\nLore:\n${monster.lore}`;

  return text;
}
