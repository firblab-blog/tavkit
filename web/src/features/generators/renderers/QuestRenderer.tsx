// Quest Result Renderer
// Displays generated Quest data in a structured format

import Icon from "@/components/common/Icon";
import { ActionsBar } from "@/components/ui/ActionsBar";
import { RawDataViewer, ParseWarning } from "../components";
import type { GeneratedQuestData } from "../normalizers/quest";

interface QuestRendererProps {
  quest: GeneratedQuestData;
  showRawResponse: boolean;
  isSaved: boolean;
  onSave: () => void;
  onCopy: () => void;
  formDifficulty?: string;
  formPartyLevel?: number;
}

export function QuestRenderer({
  quest,
  showRawResponse,
  isSaved,
  onSave,
  onCopy,
  formDifficulty = "medium",
  formPartyLevel = 5,
}: QuestRendererProps) {
  return (
    <div className="space-y-6">
      {/* Parse warning */}
      {quest._parseError && <ParseWarning message={quest._parseError} />}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-primary mb-2">{quest.title}</h2>
        <p className="text-text-muted">
          {quest.type}
          {quest.category && ` • ${quest.category}`}
          {quest.party_level > 0 && ` • Level ${quest.party_level}`}
        </p>
      </div>

      {/* Core Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-background p-3 rounded border border-border">
          <p className="text-xs text-text-muted mb-1">Type</p>
          <p className="text-lg font-bold text-primary capitalize">
            {quest.type || "Main"}
          </p>
        </div>
        <div className="bg-background p-3 rounded border border-border">
          <p className="text-xs text-text-muted mb-1">Difficulty</p>
          <p className="text-lg font-bold text-red-400 capitalize">
            {quest.combat_intensity || formDifficulty}
          </p>
        </div>
        <div className="bg-background p-3 rounded border border-border">
          <p className="text-xs text-text-muted mb-1">Party Level</p>
          <p className="text-lg font-bold text-amber-400">
            {quest.party_level || formPartyLevel}
          </p>
        </div>
      </div>

      {/* Description */}
      {quest.description && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="FileText" className="w-5 h-5 text-primary" />
            Description
          </h3>
          <div className="bg-background p-4 rounded border border-primary/30">
            <p className="text-text whitespace-pre-line">{quest.description}</p>
          </div>
        </div>
      )}

      {/* Objectives */}
      {quest.objectives.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-green-400 mb-3 flex items-center gap-2">
            <Icon name="ListChecks" className="w-5 h-5" />
            Objectives
          </h3>
          <div className="bg-green-500/10 p-4 rounded border border-green-500/30">
            <ol className="list-decimal list-inside space-y-2 text-text">
              {quest.objectives.map((objective, i) => (
                <li key={i}>{objective}</li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* Rewards */}
      {quest.rewards.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-amber-400 mb-3 flex items-center gap-2">
            <Icon name="Sparkles" className="w-5 h-5" />
            Rewards
          </h3>
          <div className="bg-amber-500/10 p-4 rounded border border-amber-500/30">
            <ul className="space-y-2">
              {quest.rewards.map((reward, i) => (
                <li key={i} className="flex items-start gap-2 text-text">
                  <span className="text-amber-400">•</span>
                  <span>{reward}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Complications */}
      {quest.complications.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-red-400 mb-3 flex items-center gap-2">
            <Icon name="AlertCircle" className="w-5 h-5" />
            Complications
          </h3>
          <div className="bg-red-500/10 p-4 rounded border border-red-500/30">
            <ul className="space-y-2">
              {quest.complications.map((complication, i) => (
                <li key={i} className="flex items-start gap-2 text-text">
                  <span className="text-red-400">•</span>
                  <span>{complication}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* NPCs Involved */}
      {quest.npcs_involved.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-blue-400 mb-3 flex items-center gap-2">
            <Icon name="Users" className="w-5 h-5" />
            NPCs Involved
          </h3>
          <div className="bg-blue-500/10 p-4 rounded border border-blue-500/30">
            <ul className="space-y-2">
              {quest.npcs_involved.map((npc, i) => (
                <li key={i} className="flex items-start gap-2 text-text">
                  <span className="text-blue-400">•</span>
                  <span>{npc}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Locations */}
      {quest.locations_involved.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-purple-400 mb-3 flex items-center gap-2">
            <Icon name="MapPin" className="w-5 h-5" />
            Locations
          </h3>
          <div className="bg-purple-500/10 p-4 rounded border border-purple-500/30">
            <ul className="space-y-2">
              {quest.locations_involved.map((location, i) => (
                <li key={i} className="flex items-start gap-2 text-text">
                  <span className="text-purple-400">•</span>
                  <span>{location}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Time Limit */}
      {quest.time_limit && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="Clock" className="w-5 h-5 text-primary" />
            Time Limit
          </h3>
          <div className="bg-background p-4 rounded border border-primary/30">
            <p className="text-text">{quest.time_limit}</p>
          </div>
        </div>
      )}

      {/* Raw/unexpected fields */}
      {quest._raw && (
        <RawDataViewer data={quest._raw} defaultExpanded={showRawResponse} />
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

// Helper to format Quest for clipboard
export function formatQuestForClipboard(quest: GeneratedQuestData): string {
  let text = `${quest.title}\n${quest.type}`;
  if (quest.category) text += ` • ${quest.category}`;
  if (quest.party_level > 0) text += ` • Level ${quest.party_level}`;

  if (quest.description) {
    text += `\n\nDescription:\n${quest.description}`;
  }

  if (quest.objectives.length > 0) {
    text += `\n\nObjectives:\n${quest.objectives.map((o, i) => `${i + 1}. ${o}`).join("\n")}`;
  }

  if (quest.rewards.length > 0) {
    text += `\n\nRewards:\n${quest.rewards.map((r) => `- ${r}`).join("\n")}`;
  }

  if (quest.complications.length > 0) {
    text += `\n\nComplications:\n${quest.complications.map((c) => `- ${c}`).join("\n")}`;
  }

  if (quest.npcs_involved.length > 0) {
    text += `\n\nNPCs Involved:\n${quest.npcs_involved.map((n) => `- ${n}`).join("\n")}`;
  }

  if (quest.locations_involved.length > 0) {
    text += `\n\nLocations:\n${quest.locations_involved.map((l) => `- ${l}`).join("\n")}`;
  }

  if (quest.time_limit) {
    text += `\n\nTime Limit: ${quest.time_limit}`;
  }

  return text;
}
