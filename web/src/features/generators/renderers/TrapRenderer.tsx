// Renderer for generated Traps

import Icon from "@/components/common/Icon";
import { ActionsBar } from "@/components/ui/ActionsBar";
import { RawDataViewer, ParseWarning } from "../components";
import type { GeneratedTrapData } from "../normalizers/trap";

interface TrapRendererProps {
  trap: GeneratedTrapData;
  showRawResponse?: boolean;
  isSaved: boolean;
  onSave: () => void;
  onCopy: () => void;
}

export function TrapRenderer({
  trap,
  showRawResponse,
  isSaved,
  onSave,
  onCopy,
}: TrapRendererProps) {
  return (
    <div className="space-y-6">
      {/* Parse warning */}
      {trap._parseError && <ParseWarning message={trap._parseError} />}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-primary">{trap.name}</h2>
        <p className="text-sm text-text-muted capitalize">
          {trap.trap_type} • {trap.difficulty}
          {trap.environment && ` • ${trap.environment}`}
        </p>
      </div>

      {/* Description */}
      {trap.description && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="FileText" className="w-5 h-5 text-primary" />
            Description
          </h3>
          <p className="text-text">{trap.description}</p>
        </div>
      )}

      {/* Trigger, Effect, Damage */}
      <div className="grid md:grid-cols-2 gap-4">
        {trap.trigger && (
          <div>
            <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
              <Icon name="Sparkles" className="w-5 h-5 text-yellow-400" />
              Trigger
            </h3>
            <p className="text-text">{trap.trigger}</p>
          </div>
        )}
        {trap.effect && (
          <div>
            <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
              <Icon name="AlertCircle" className="w-5 h-5 text-primary" />
              Effect
            </h3>
            <p className="text-text">{trap.effect}</p>
          </div>
        )}
        {trap.damage && (
          <div>
            <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
              <Icon name="Skull" className="w-5 h-5 text-red-400" />
              Damage
            </h3>
            <p className="text-red-400 font-mono font-bold text-xl">
              {trap.damage}
            </p>
          </div>
        )}
      </div>

      {/* Detection */}
      {trap.detection &&
        (trap.detection.passive_perception_dc ||
          trap.detection.investigation_dc ||
          trap.detection.clues.length > 0) && (
          <div>
            <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
              <Icon name="Eye" className="w-5 h-5 text-primary" />
              Detection
            </h3>
            <div className="bg-background p-4 rounded border border-border space-y-2">
              {trap.detection.passive_perception_dc && (
                <p className="text-text">
                  <span className="font-medium">Passive Perception DC:</span>{" "}
                  {trap.detection.passive_perception_dc}
                </p>
              )}
              {trap.detection.investigation_dc && (
                <p className="text-text">
                  <span className="font-medium">Investigation DC:</span>{" "}
                  {trap.detection.investigation_dc}
                </p>
              )}
              {trap.detection.clues.length > 0 && (
                <div>
                  <p className="font-medium text-text mb-1">Clues:</p>
                  <ul className="space-y-1">
                    {trap.detection.clues.map((clue, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-text-muted"
                      >
                        <span className="text-primary">•</span>
                        <span>{clue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

      {/* Solution Paths */}
      {trap.solution_paths.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Map" className="w-5 h-5 text-primary" />
            Solution Paths
          </h3>
          <div className="space-y-3">
            {trap.solution_paths.map((path, idx) => (
              <div
                key={idx}
                className="bg-background p-4 rounded border-2 border-primary/30"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-text capitalize">
                    {path.approach}
                  </span>
                  {path.dc && (
                    <span className="px-2 py-1 bg-primary/20 text-primary rounded text-sm font-mono font-bold">
                      DC {path.dc}
                    </span>
                  )}
                </div>
                {path.skill && (
                  <p className="text-sm text-primary mb-2">
                    <span className="font-medium">Skill:</span> {path.skill}
                  </p>
                )}
                {path.description && (
                  <p className="text-text mb-2">{path.description}</p>
                )}
                {path.time && (
                  <div className="flex gap-4 text-xs text-text-muted">
                    <span>Time: {path.time}</span>
                  </div>
                )}
                {path.failure && (
                  <p className="text-sm text-red-400 mt-2">
                    <span className="font-medium">On Failure:</span>{" "}
                    {path.failure}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Complications */}
      {trap.complications.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="AlertCircle" className="w-5 h-5 text-orange-400" />
            Complications
          </h3>
          <ul className="space-y-2">
            {trap.complications.map((complication, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-text bg-orange-500/10 p-3 rounded border border-orange-500/20"
              >
                <span className="text-orange-400">⚠</span>
                <span>{complication}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Rewards */}
      {trap.rewards.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Package" className="w-5 h-5 text-primary" />
            Rewards
          </h3>
          <ul className="space-y-2">
            {trap.rewards.map((reward, idx) => (
              <li key={idx} className="flex items-start gap-2 text-text">
                <span className="text-primary">•</span>
                <span>{reward}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Scaling */}
      {(trap.scaling.easier || trap.scaling.harder) && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Settings" className="w-5 h-5 text-primary" />
            Difficulty Scaling
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {trap.scaling.easier && (
              <div className="bg-green-500/10 p-4 rounded border border-green-500/20">
                <p className="font-medium text-green-400 mb-2">
                  Make It Easier:
                </p>
                <p className="text-text">{trap.scaling.easier}</p>
              </div>
            )}
            {trap.scaling.harder && (
              <div className="bg-red-500/10 p-4 rounded border border-red-500/20">
                <p className="font-medium text-red-400 mb-2">Make It Harder:</p>
                <p className="text-text">{trap.scaling.harder}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DM Notes */}
      {trap.dm_notes && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="BookOpen" className="w-5 h-5 text-primary" />
            DM Notes
          </h3>
          <div className="bg-primary/10 p-4 rounded border border-primary/20">
            <p className="text-text">{trap.dm_notes}</p>
          </div>
        </div>
      )}

      {/* Raw/unexpected fields - collapsible */}
      {trap._raw && (
        <RawDataViewer data={trap._raw} defaultExpanded={showRawResponse} />
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

/**
 * Format trap data for clipboard
 */
export function formatTrapForClipboard(trap: GeneratedTrapData): string {
  let text = `${trap.name}\n${trap.trap_type} • ${trap.difficulty}${trap.environment ? ` • ${trap.environment}` : ""}\n\n${trap.description}`;

  if (trap.trigger) {
    text += `\n\nTrigger: ${trap.trigger}`;
  }

  if (trap.effect) {
    text += `\n\nEffect: ${trap.effect}`;
  }

  if (trap.damage) {
    text += `\nDamage: ${trap.damage}`;
  }

  if (trap.detection) {
    text += "\n\nDetection:\n";
    if (trap.detection.passive_perception_dc) {
      text += `Passive Perception DC: ${trap.detection.passive_perception_dc}\n`;
    }
    if (trap.detection.investigation_dc) {
      text += `Investigation DC: ${trap.detection.investigation_dc}\n`;
    }
    if (trap.detection.clues && trap.detection.clues.length > 0) {
      text += "Clues:\n";
      trap.detection.clues.forEach((clue) => {
        text += `- ${clue}\n`;
      });
    }
  }

  if (trap.solution_paths && trap.solution_paths.length > 0) {
    text += "\nSolution Paths:\n";
    trap.solution_paths.forEach((path) => {
      text += `\n${path.approach} (${path.skill}${path.dc ? `, DC ${path.dc}` : ""})\n${path.description}\nTime: ${path.time}\nOn Failure: ${path.failure}\n`;
    });
  }

  if (trap.complications && trap.complications.length > 0) {
    text += "\nComplications:\n";
    trap.complications.forEach((comp) => {
      text += `- ${comp}\n`;
    });
  }

  if (trap.rewards && trap.rewards.length > 0) {
    text += "\nRewards:\n";
    trap.rewards.forEach((reward) => {
      text += `- ${reward}\n`;
    });
  }

  if (trap.dm_notes) {
    text += `\nDM Notes: ${trap.dm_notes}`;
  }

  return text;
}
