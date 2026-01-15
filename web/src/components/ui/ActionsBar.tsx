import { useState } from "react";
import Icon from "../common/Icon";

interface ActionsBarProps {
  onCopy?: () => void;
  onSave?: () => void;
  onRegenerate?: () => void;
  onEdit?: () => void;
  showCopy?: boolean;
  showSave?: boolean;
  showRegenerate?: boolean;
  showEdit?: boolean;
  isSaved?: boolean;
  className?: string;
}

export const ActionsBar = ({
  onCopy,
  onSave,
  onRegenerate,
  onEdit,
  showCopy = true,
  showSave = true,
  showRegenerate = false,
  showEdit = false,
  isSaved = false,
  className = "",
}: ActionsBarProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (onCopy) {
      onCopy();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const actions = [
    {
      show: showCopy && !!onCopy,
      onClick: handleCopy,
      icon: copied ? "Check" : "Copy",
      label: copied ? "Copied!" : "Copy",
      isHighlighted: copied,
      disabled: false,
    },
    {
      show: showSave && (!!onSave || isSaved),
      onClick: isSaved ? undefined : onSave,
      icon: isSaved ? "Check" : "Save",
      label: isSaved ? "Saved!" : "Save",
      isHighlighted: isSaved,
      disabled: isSaved,
    },
    {
      show: showRegenerate && !!onRegenerate,
      onClick: onRegenerate,
      icon: "RefreshCw",
      label: "Regenerate",
      isHighlighted: false,
      disabled: false,
    },
    {
      show: showEdit && !!onEdit,
      onClick: onEdit,
      icon: "Edit",
      label: "Edit",
      isHighlighted: false,
      disabled: false,
    },
  ].filter((action) => action.show);

  if (actions.length === 0) return null;

  return (
    <div
      className={`sticky bottom-0 left-0 right-0 bg-background-panel/95 backdrop-blur border-t border-border p-4 ${className}`}
    >
      <div
        className={`grid gap-2 ${actions.length <= 2 ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-4"}`}
      >
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            disabled={action.disabled}
            className={`py-2 px-4 border rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              action.isHighlighted
                ? "bg-green-600 border-green-600 text-white cursor-default"
                : action.disabled
                  ? "bg-background/50 border-border text-text/50 cursor-not-allowed"
                  : "bg-background hover:bg-background/70 border-border text-text"
            }`}
          >
            <Icon name={action.icon as any} className="w-4 h-4" />
            <span className="hidden sm:inline">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
