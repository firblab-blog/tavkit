// Renderer for generated Critters

import Icon from "@/components/common/Icon";
import { ActionsBar } from "@/components/ui/ActionsBar";
import { RawDataViewer, ParseWarning } from "../components";
import type { GeneratedCritterData } from "../normalizers/critter";

interface CritterRendererProps {
  critter: GeneratedCritterData;
  showRawResponse?: boolean;
  isSaved: boolean;
  onSave: () => void;
  onCopy: () => void;
}

export function CritterRenderer({
  critter,
  showRawResponse,
  isSaved,
  onSave,
  onCopy,
}: CritterRendererProps) {
  return (
    <div className="space-y-6">
      {critter._parseError && <ParseWarning message={critter._parseError} />}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-primary">
          {critter.name}
          {critter.species && (
            <span className="text-text-muted font-normal">
              {" "}
              ({critter.species})
            </span>
          )}
        </h2>
        <p className="text-sm text-text-muted capitalize">
          {critter.critter_type} • {critter.size}
          {critter.temperament && ` • ${critter.temperament}`}
          {critter.habitat && ` • ${critter.habitat}`}
        </p>
      </div>

      {critter.description && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="FileText" className="w-5 h-5 text-primary" />
            Description
          </h3>
          <p className="text-text">{critter.description}</p>
        </div>
      )}

      {critter.behavior && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="BarChart3" className="w-5 h-5 text-primary" />
            Behavior
          </h3>
          <p className="text-text">{critter.behavior}</p>
        </div>
      )}

      {/* Stats */}
      {critter.stats &&
        (critter.stats.ac !== null ||
          critter.stats.hp !== null ||
          critter.stats.speed) && (
          <div>
            <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
              <Icon name="Shield" className="w-5 h-5 text-primary" />
              Stats
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {critter.stats.ac !== null && (
                <div className="bg-background p-3 rounded border border-border">
                  <p className="text-xs text-text-muted mb-1">Armor Class</p>
                  <p className="text-xl font-bold text-primary">
                    {critter.stats.ac}
                  </p>
                </div>
              )}
              {critter.stats.hp !== null && (
                <div className="bg-background p-3 rounded border border-border">
                  <p className="text-xs text-text-muted mb-1">Hit Points</p>
                  <p className="text-xl font-bold text-red-400">
                    {critter.stats.hp}
                  </p>
                </div>
              )}
              {critter.stats.speed && (
                <div className="bg-background p-3 rounded border border-border">
                  <p className="text-xs text-text-muted mb-1">Speed</p>
                  <p className="text-xl font-bold text-blue-400">
                    {critter.stats.speed}
                  </p>
                </div>
              )}
            </div>
            {(critter.stats.str !== null ||
              critter.stats.dex !== null ||
              critter.stats.con !== null ||
              critter.stats.int !== null ||
              critter.stats.wis !== null ||
              critter.stats.cha !== null) && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3">
                {critter.stats.str !== null && (
                  <div className="bg-background p-2 rounded border border-border text-center">
                    <p className="text-xs text-text-muted mb-1">STR</p>
                    <p className="text-lg font-bold text-text">
                      {critter.stats.str}
                    </p>
                  </div>
                )}
                {critter.stats.dex !== null && (
                  <div className="bg-background p-2 rounded border border-border text-center">
                    <p className="text-xs text-text-muted mb-1">DEX</p>
                    <p className="text-lg font-bold text-text">
                      {critter.stats.dex}
                    </p>
                  </div>
                )}
                {critter.stats.con !== null && (
                  <div className="bg-background p-2 rounded border border-border text-center">
                    <p className="text-xs text-text-muted mb-1">CON</p>
                    <p className="text-lg font-bold text-text">
                      {critter.stats.con}
                    </p>
                  </div>
                )}
                {critter.stats.int !== null && (
                  <div className="bg-background p-2 rounded border border-border text-center">
                    <p className="text-xs text-text-muted mb-1">INT</p>
                    <p className="text-lg font-bold text-text">
                      {critter.stats.int}
                    </p>
                  </div>
                )}
                {critter.stats.wis !== null && (
                  <div className="bg-background p-2 rounded border border-border text-center">
                    <p className="text-xs text-text-muted mb-1">WIS</p>
                    <p className="text-lg font-bold text-text">
                      {critter.stats.wis}
                    </p>
                  </div>
                )}
                {critter.stats.cha !== null && (
                  <div className="bg-background p-2 rounded border border-border text-center">
                    <p className="text-xs text-text-muted mb-1">CHA</p>
                    <p className="text-lg font-bold text-text">
                      {critter.stats.cha}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      {/* Special Abilities */}
      {critter.special_abilities.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Sparkles" className="w-5 h-5 text-primary" />
            Special Abilities
          </h3>
          <div className="space-y-3">
            {critter.special_abilities.map((ability, idx) => (
              <div
                key={idx}
                className="bg-background p-4 rounded border border-primary/30"
              >
                <h4 className="font-medium text-primary mb-2">
                  {ability.name}
                </h4>
                {ability.description && (
                  <p className="text-text text-sm">{ability.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uses */}
      {critter.uses.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Wrench" className="w-5 h-5 text-primary" />
            Potential Uses
          </h3>
          <ul className="space-y-2">
            {critter.uses.map((use, idx) => (
              <li key={idx} className="flex items-start gap-2 text-text">
                <Icon
                  name="ChevronRight"
                  className="w-4 h-4 text-primary mt-0.5 flex-shrink-0"
                />
                <span>{use}</span>
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
              <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
                <Icon name="Shield" className="w-5 h-5 text-primary" />
                Training
              </h3>
              <p className="text-text">{critter.training_difficulty}</p>
            </div>
          )}
          {critter.diet && (
            <div>
              <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
                <Icon name="Package" className="w-5 h-5 text-primary" />
                Diet
              </h3>
              <p className="text-text">{critter.diet}</p>
            </div>
          )}
          {critter.lifespan && (
            <div>
              <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
                <Icon name="Clock" className="w-5 h-5 text-primary" />
                Lifespan
              </h3>
              <p className="text-text">{critter.lifespan}</p>
            </div>
          )}
        </div>
      )}

      {/* Interesting Facts */}
      {critter.interesting_facts.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="BookOpen" className="w-5 h-5 text-primary" />
            Interesting Facts
          </h3>
          <ul className="space-y-2">
            {critter.interesting_facts.map((fact, idx) => (
              <li key={idx} className="flex items-start gap-2 text-text">
                <span className="text-primary mt-0.5">•</span>
                <span>{fact}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Encounter Notes */}
      {critter.encounter_notes && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="MessageSquare" className="w-5 h-5 text-primary" />
            Encounter Notes
          </h3>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <p className="text-text">{critter.encounter_notes}</p>
          </div>
        </div>
      )}

      {critter._raw && (
        <RawDataViewer data={critter._raw} defaultExpanded={showRawResponse} />
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

export function formatCritterForClipboard(
  critter: GeneratedCritterData,
): string {
  let text = `${critter.name}${critter.species ? ` (${critter.species})` : ""}
${critter.critter_type} • ${critter.size}${critter.temperament ? ` • ${critter.temperament}` : ""}${critter.habitat ? ` • ${critter.habitat}` : ""}

${critter.description || ""}

Behavior: ${critter.behavior || "N/A"}

Stats:
${
  critter.stats
    ? `AC: ${critter.stats.ac ?? "N/A"}, HP: ${critter.stats.hp ?? "N/A"}, Speed: ${critter.stats.speed || "N/A"}
Abilities: STR ${critter.stats.str ?? "-"}, DEX ${critter.stats.dex ?? "-"}, CON ${critter.stats.con ?? "-"}, INT ${critter.stats.int ?? "-"}, WIS ${critter.stats.wis ?? "-"}, CHA ${critter.stats.cha ?? "-"}`
    : "N/A"
}

${critter.special_abilities?.length ? `Special Abilities:\n${critter.special_abilities.map((a) => `- ${a.name}: ${a.description}`).join("\n")}` : ""}

${critter.uses?.length ? `Potential Uses:\n${critter.uses.map((u) => `- ${u}`).join("\n")}` : ""}

${critter.training_difficulty ? `Training: ${critter.training_difficulty}` : ""}
${critter.diet ? `Diet: ${critter.diet}` : ""}
${critter.lifespan ? `Lifespan: ${critter.lifespan}` : ""}

${critter.interesting_facts?.length ? `Interesting Facts:\n${critter.interesting_facts.map((f) => `- ${f}`).join("\n")}` : ""}

${critter.encounter_notes ? `Encounter Notes: ${critter.encounter_notes}` : ""}`;

  return text;
}
