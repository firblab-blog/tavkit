import { useState } from "react";
import Icon from "@/components/common/Icon";

interface RawDataViewerProps {
  data: Record<string, unknown>;
  defaultExpanded?: boolean;
}

/**
 * Collapsible viewer for raw/unexpected AI response data
 */
export function RawDataViewer({
  data,
  defaultExpanded = false,
}: RawDataViewerProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const fieldCount = Object.keys(data).length;

  if (fieldCount === 0) return null;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 bg-background-panel flex items-center justify-between text-left hover:bg-tavern-dark transition-colors"
      >
        <span className="flex items-center gap-2 text-text-muted">
          <Icon name="FileText" className="w-5 h-5" />
          Additional AI Response Data ({fieldCount} fields)
        </span>
        <Icon
          name={expanded ? "ChevronUp" : "ChevronDown"}
          className="w-5 h-5 text-text-muted"
        />
      </button>
      {expanded && (
        <div className="p-4 bg-background border-t border-border">
          <pre className="text-xs text-text-muted overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
