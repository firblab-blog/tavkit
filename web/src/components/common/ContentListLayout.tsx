import Icon, { IconName } from "./Icon";

interface ContentListLayoutProps {
  /** Search input value */
  searchQuery: string;
  /** Search input change handler */
  onSearchChange: (value: string) => void;
  /** Placeholder for search input */
  searchPlaceholder?: string;
  /** Add button label */
  addButtonLabel?: string;
  /** Add button click handler */
  onAddClick?: () => void;
  /** Color theme for add button (tailwind color name) */
  addButtonColor?: string;
  /** Whether content is loading */
  loading?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Empty state icon */
  emptyIcon?: IconName;
  /** Empty state title */
  emptyTitle?: string;
  /** Empty state description */
  emptyDescription?: string;
  /** Empty state CTA label (shown when no search query) */
  emptyCTALabel?: string;
  /** Empty state CTA handler */
  onEmptyCTAClick?: () => void;
  /** Whether there are items to display */
  hasItems: boolean;
  /** Children to render when there are items */
  children: React.ReactNode;
  /** Additional className for the container */
  className?: string;
}

const colorClasses: Record<string, { button: string; hover: string }> = {
  blue: { button: "bg-blue-500", hover: "hover:bg-blue-600" },
  emerald: { button: "bg-emerald-500", hover: "hover:bg-emerald-600" },
  purple: { button: "bg-purple-500", hover: "hover:bg-purple-600" },
  amber: { button: "bg-amber-500", hover: "hover:bg-amber-600" },
  cyan: { button: "bg-cyan-500", hover: "hover:bg-cyan-600" },
  orange: { button: "bg-orange-500", hover: "hover:bg-orange-600" },
  indigo: { button: "bg-indigo-500", hover: "hover:bg-indigo-600" },
  rose: { button: "bg-rose-500", hover: "hover:bg-rose-600" },
  red: { button: "bg-red-500", hover: "hover:bg-red-600" },
  green: { button: "bg-green-500", hover: "hover:bg-green-600" },
  teal: { button: "bg-teal-500", hover: "hover:bg-teal-600" },
  yellow: { button: "bg-yellow-500", hover: "hover:bg-yellow-600" },
};

/**
 * ContentListLayout - A reusable layout for content list pages.
 *
 * Provides:
 * - Search bar with icon
 * - Add/Create button (color-coded)
 * - Loading spinner state
 * - Empty state with conditional CTA
 * - Error message display
 * - Grid/list container wrapper
 */
export default function ContentListLayout({
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search...",
  addButtonLabel,
  onAddClick,
  addButtonColor = "blue",
  loading = false,
  error,
  emptyIcon = "Package",
  emptyTitle = "No items yet",
  emptyDescription = "Create your first item to get started.",
  emptyCTALabel,
  onEmptyCTAClick,
  hasItems,
  children,
  className = "",
}: ContentListLayoutProps) {
  const colors = colorClasses[addButtonColor] || colorClasses.blue;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Icon
            name="Search"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
          />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary text-sm"
          />
        </div>
        {addButtonLabel && onAddClick && (
          <button
            onClick={onAddClick}
            className={`flex items-center gap-2 px-4 py-2 ${colors.button} ${colors.hover} text-white font-medium rounded-lg transition-colors text-sm`}
          >
            <Icon name="Plus" className="w-4 h-4" />
            {addButtonLabel}
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Icon name="Loader2" className="w-6 h-6 text-primary animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!loading && !hasItems && (
        <div className="text-center py-8 bg-background-panel border border-border rounded-xl">
          <Icon
            name={emptyIcon}
            className="w-10 h-10 text-text-muted mx-auto mb-3"
          />
          <h3 className="text-text font-medium mb-1">
            {searchQuery ? "No matching results" : emptyTitle}
          </h3>
          <p className="text-text-muted text-sm mb-4">
            {searchQuery ? "Try adjusting your search." : emptyDescription}
          </p>
          {!searchQuery && emptyCTALabel && onEmptyCTAClick && (
            <button
              onClick={onEmptyCTAClick}
              className={`inline-flex items-center gap-2 px-4 py-2 ${colors.button} ${colors.hover} text-white font-medium rounded-lg transition-colors text-sm`}
            >
              <Icon name="Plus" className="w-4 h-4" />
              {emptyCTALabel}
            </button>
          )}
        </div>
      )}

      {/* Content */}
      {!loading && hasItems && children}
    </div>
  );
}
