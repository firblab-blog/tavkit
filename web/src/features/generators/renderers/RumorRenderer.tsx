// Renderer for generated Rumors

import Icon from "@/components/common/Icon";
import { ActionsBar } from "@/components/ui/ActionsBar";
import { RawDataViewer } from "../components";
import type {
  GeneratedRumorsData,
  GeneratedRumorData,
} from "../normalizers/rumor";

interface RumorRendererProps {
  rumors: GeneratedRumorsData;
  isSaved: boolean;
  onSave: () => void;
  onCopy: () => void;
}

/**
 * Get veracity color styling
 */
function getVeracityColor(veracity: string) {
  const lower = veracity.toLowerCase();
  if (lower === "true" || lower === "accurate" || lower === "verified") {
    return {
      text: "text-green-400",
      bg: "bg-green-500/20",
      border: "border-green-500/30",
    };
  }
  if (lower === "false" || lower === "misleading" || lower === "lie") {
    return {
      text: "text-red-400",
      bg: "bg-red-500/20",
      border: "border-red-500/30",
    };
  }
  if (lower === "partial" || lower === "half-truth") {
    return {
      text: "text-amber-400",
      bg: "bg-amber-500/20",
      border: "border-amber-500/30",
    };
  }
  return {
    text: "text-blue-400",
    bg: "bg-blue-500/20",
    border: "border-blue-500/30",
  };
}

/**
 * Render a single rumor card
 */
function RumorCard({ rumor }: { rumor: GeneratedRumorData }) {
  const veracityColor = getVeracityColor(rumor.veracity);

  return (
    <div className="bg-background p-4 rounded border border-primary/30">
      <div className="flex items-start gap-3">
        <Icon
          name="Quote"
          className="w-5 h-5 text-primary flex-shrink-0 mt-1"
        />
        <div className="flex-1">
          <p className="text-text italic mb-4 text-lg">"{rumor.text}"</p>

          {/* Source and Veracity */}
          <div className="grid md:grid-cols-2 gap-3 mb-3">
            <div className="bg-blue-500/10 p-3 rounded border border-blue-500/30">
              <p className="text-xs text-text-muted mb-1">Source</p>
              <p className="text-blue-400 font-medium">
                {rumor.source || "Unknown"}
              </p>
            </div>
            <div
              className={`${veracityColor.bg} p-3 rounded border ${veracityColor.border}`}
            >
              <p className="text-xs text-text-muted mb-1">Veracity</p>
              <p className={`${veracityColor.text} font-medium capitalize`}>
                {rumor.veracity}
              </p>
            </div>
          </div>

          {/* Leads To */}
          {rumor.leads_to && (
            <div className="bg-amber-500/10 p-3 rounded border border-amber-500/30 mb-3">
              <p className="text-xs text-text-muted mb-1">Adventure Hook</p>
              <p className="text-amber-400">{rumor.leads_to}</p>
            </div>
          )}

          {/* Context */}
          {rumor.context && (
            <div className="bg-purple-500/10 p-3 rounded border border-purple-500/30 mb-3">
              <p className="text-xs text-text-muted mb-1">Context</p>
              <p className="text-text">{rumor.context}</p>
            </div>
          )}

          {/* Badges row */}
          <div className="flex flex-wrap gap-2">
            {rumor.foreshadowing && (
              <span className="px-2 py-1 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded text-xs font-medium">
                Foreshadowing
              </span>
            )}
            {rumor.tags &&
              rumor.tags.length > 0 &&
              rumor.tags.map((tag, tagIdx) => (
                <span
                  key={tagIdx}
                  className="px-2 py-1 bg-background border border-border rounded text-xs text-text-muted"
                >
                  {tag}
                </span>
              ))}
          </div>

          {/* Raw/unexpected fields for this rumor */}
          {rumor._raw && <RawDataViewer data={rumor._raw} />}
        </div>
      </div>
    </div>
  );
}

export function RumorRenderer({
  rumors,
  isSaved,
  onSave,
  onCopy,
}: RumorRendererProps) {
  if (!rumors || rumors.rumors.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* Parse warning */}
      {rumors._parseError && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-sm">
          {rumors._parseError}
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-primary mb-2">
          Generated Rumors
        </h2>
        <p className="text-text-muted">{rumors.rumors.length} rumors created</p>
      </div>

      {/* Rumors list */}
      <div className="space-y-4">
        {rumors.rumors.map((rumor, index) => (
          <RumorCard key={index} rumor={rumor} />
        ))}
      </div>

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
 * Format rumors for clipboard
 */
export function formatRumorsForClipboard(rumors: GeneratedRumorsData): string {
  let text = "Generated Rumors:\n\n";
  rumors.rumors.forEach((rumor, index) => {
    text += `${index + 1}. "${rumor.text}"\n`;
    text += `   Source: ${rumor.source}\n`;
    text += `   Veracity: ${rumor.veracity}\n`;
    if (rumor.leads_to) {
      text += `   Leads To: ${rumor.leads_to}\n`;
    }
    if (rumor.context) {
      text += `   Context: ${rumor.context}\n`;
    }
    if (rumor.foreshadowing) {
      text += `   Foreshadowing: Yes\n`;
    }
    if (rumor.tags && rumor.tags.length > 0) {
      text += `   Tags: ${rumor.tags.join(", ")}\n`;
    }
    text += "\n";
  });
  return text;
}
