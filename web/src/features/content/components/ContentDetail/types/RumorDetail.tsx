// Rumor content detail view

import Icon from "@/components/common/Icon";

interface RumorData {
  text: string;
  veracity: string;
  source?: string;
  context?: string;
  leads_to?: string;
  foreshadowing?: boolean;
  tags?: string | string[];
}

interface RumorDetailProps {
  rumor: RumorData;
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

function getVeracityClasses(veracity: string): string {
  switch (veracity.toLowerCase()) {
    case "true":
      return "bg-green-900/30 text-green-400";
    case "partially_true":
      return "bg-yellow-900/30 text-yellow-400";
    default:
      return "bg-red-900/30 text-red-400";
  }
}

export function RumorDetail({ rumor }: RumorDetailProps) {
  const tags = parseJSON<string[]>(rumor.tags) || [];

  return (
    <div className="space-y-6">
      {/* Quote */}
      <div className="bg-surface p-6 rounded-lg border border-border">
        <p className="text-text text-xl italic leading-relaxed">
          &ldquo;{rumor.text}&rdquo;
        </p>
      </div>

      {/* Veracity */}
      <div className="bg-surface p-4 rounded-lg border border-border inline-block">
        <div className="text-xs text-text-muted uppercase tracking-wide mb-2">
          Veracity
        </div>
        <span
          className={`px-3 py-1 rounded text-sm inline-block ${getVeracityClasses(rumor.veracity)}`}
        >
          {rumor.veracity.replace("_", " ")}
        </span>
      </div>

      {/* Source */}
      {rumor.source && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-2">Source</h3>
          <p className="text-text">{rumor.source}</p>
        </div>
      )}

      {/* Context */}
      {rumor.context && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-2">Context</h3>
          <p className="text-text leading-relaxed whitespace-pre-wrap">
            {rumor.context}
          </p>
        </div>
      )}

      {/* Leads To */}
      {rumor.leads_to && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-2">Leads To</h3>
          <span className="px-3 py-1 bg-primary/30 text-text rounded-lg text-sm capitalize">
            {rumor.leads_to}
          </span>
        </div>
      )}

      {/* Foreshadowing */}
      {rumor.foreshadowing && (
        <div className="bg-primary/10 p-4 rounded-lg border border-primary/30">
          <div className="flex items-center gap-2">
            <Icon name="AlertCircle" className="w-5 h-5 text-primary" />
            <span className="text-primary font-semibold">
              Foreshadows Future Events
            </span>
          </div>
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-surface text-text rounded-full text-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
