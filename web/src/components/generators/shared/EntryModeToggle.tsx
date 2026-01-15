import Icon from "@/components/common/Icon";

export type EntryMode = "ai" | "manual";

interface EntryModeToggleProps {
  mode: EntryMode;
  onChange: (mode: EntryMode) => void;
  disabled?: boolean;
}

export function EntryModeToggle({
  mode,
  onChange,
  disabled = false,
}: EntryModeToggleProps) {
  return (
    <div className="flex bg-background rounded-lg p-1 border border-border mb-4">
      <button
        type="button"
        onClick={() => onChange("ai")}
        disabled={disabled}
        className={`
          flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
          ${
            mode === "ai"
              ? "bg-primary text-white shadow-sm"
              : "text-text-muted hover:text-text hover:bg-background-panel"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <Icon name="Sparkles" className="w-4 h-4" />
        AI Generate
      </button>
      <button
        type="button"
        onClick={() => onChange("manual")}
        disabled={disabled}
        className={`
          flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
          ${
            mode === "manual"
              ? "bg-primary text-white shadow-sm"
              : "text-text-muted hover:text-text hover:bg-background-panel"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <Icon name="Pencil" className="w-4 h-4" />
        Manual Entry
      </button>
    </div>
  );
}
