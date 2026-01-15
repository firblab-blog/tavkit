import Icon, { IconName } from "./Icon";

interface ContentCardProps {
  /** Card title */
  title: string;
  /** Card preview text (truncated to 2 lines) */
  preview?: string;
  /** Card icon name */
  icon?: IconName;
  /** Icon color (tailwind color name) */
  iconColor?: string;
  /** Additional metadata badges */
  badges?: Array<{
    label: string;
    color?: string;
    bgColor?: string;
  }>;
  /** Date to display */
  date?: string | Date;
  /** Click handler for the card */
  onClick?: () => void;
  /** Delete button handler */
  onDelete?: () => void;
  /** Assign/folder button handler */
  onAssign?: () => void;
  /** Additional action buttons */
  actions?: React.ReactNode;
  /** Children rendered after the title/preview */
  children?: React.ReactNode;
  /** Layout mode */
  layout?: "list" | "grid";
  /** Additional className */
  className?: string;
}

const iconColorClasses: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  blue: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/30",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
  },
  purple: {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/30",
  },
  amber: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
  },
  cyan: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    border: "border-cyan-500/30",
  },
  orange: {
    bg: "bg-orange-500/10",
    text: "text-orange-400",
    border: "border-orange-500/30",
  },
  indigo: {
    bg: "bg-indigo-500/10",
    text: "text-indigo-400",
    border: "border-indigo-500/30",
  },
  rose: {
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    border: "border-rose-500/30",
  },
  red: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/30",
  },
  green: {
    bg: "bg-green-500/10",
    text: "text-green-400",
    border: "border-green-500/30",
  },
  teal: {
    bg: "bg-teal-500/10",
    text: "text-teal-400",
    border: "border-teal-500/30",
  },
  yellow: {
    bg: "bg-yellow-500/10",
    text: "text-yellow-400",
    border: "border-yellow-500/30",
  },
};

const hoverBorderClasses: Record<string, string> = {
  blue: "hover:border-blue-500/50",
  emerald: "hover:border-emerald-500/50",
  purple: "hover:border-purple-500/50",
  amber: "hover:border-amber-500/50",
  cyan: "hover:border-cyan-500/50",
  orange: "hover:border-orange-500/50",
  indigo: "hover:border-indigo-500/50",
  rose: "hover:border-rose-500/50",
  red: "hover:border-red-500/50",
  green: "hover:border-green-500/50",
  teal: "hover:border-teal-500/50",
  yellow: "hover:border-yellow-500/50",
};

/**
 * ContentCard - A reusable card component for displaying content items.
 *
 * Provides:
 * - Icon badge with colored background
 * - Title and 2-line preview (line-clamp-2)
 * - Metadata (date, tags, type badges)
 * - Action buttons with stopPropagation
 * - Hover border color transition
 */
export default function ContentCard({
  title,
  preview,
  icon,
  iconColor = "blue",
  badges = [],
  date,
  onClick,
  onDelete,
  onAssign,
  actions,
  children,
  layout = "list",
  className = "",
}: ContentCardProps) {
  const colors = iconColorClasses[iconColor] || iconColorClasses.blue;
  const hoverBorder = hoverBorderClasses[iconColor] || hoverBorderClasses.blue;

  const formattedDate =
    date instanceof Date
      ? date.toLocaleDateString()
      : date
        ? new Date(date).toLocaleDateString()
        : null;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.();
  };

  const handleAssign = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAssign?.();
  };

  const isGrid = layout === "grid";

  return (
    <div
      onClick={onClick}
      className={`bg-background-panel border ${colors.border} rounded-xl p-4 ${hoverBorder} transition-colors ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      <div
        className={`flex ${isGrid ? "flex-col" : "items-start justify-between gap-3"}`}
      >
        <div
          className={`flex items-start gap-3 ${isGrid ? "mb-3" : "min-w-0 flex-1"}`}
        >
          {icon && (
            <div
              className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0`}
            >
              <Icon name={icon} className={`w-5 h-5 ${colors.text}`} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h4 className="text-text font-medium truncate">{title}</h4>
            {preview && (
              <p className="text-text-muted text-sm mt-1 line-clamp-2">
                {preview}
              </p>
            )}
            {formattedDate && (
              <p className="text-text-muted text-xs mt-2">{formattedDate}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        {(onAssign || onDelete || actions) && (
          <div
            className={`flex gap-1 ${isGrid ? "justify-end" : "flex-shrink-0"}`}
          >
            {onAssign && (
              <button
                onClick={handleAssign}
                className="p-1.5 hover:bg-background rounded text-text-muted hover:text-text"
                title="Assign to Campaign"
              >
                <Icon name="FolderInput" className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={handleDelete}
                className="p-1.5 hover:bg-red-500/10 rounded text-text-muted hover:text-red-400"
                title="Delete"
              >
                <Icon name="Trash2" className="w-4 h-4" />
              </button>
            )}
            {actions}
          </div>
        )}
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {badges.map((badge, index) => (
            <span
              key={index}
              className={`px-2 py-1 rounded-lg text-xs ${badge.bgColor || "bg-background"} ${badge.color || "text-text-muted"}`}
            >
              {badge.label}
            </span>
          ))}
        </div>
      )}

      {/* Additional content */}
      {children}
    </div>
  );
}
