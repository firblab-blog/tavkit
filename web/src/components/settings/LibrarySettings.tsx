import {
  useUISettingsStore,
  type ContentType,
  type LibraryViewMode,
  type LibrarySortBy,
  type LibrarySortOrder,
} from "../../store/uiSettingsStore";
import Icon from "../common/Icon";

export default function LibrarySettings() {
  const {
    librarySettings,
    updateLibrarySettings,
    setLibraryContentTypeEnabled,
  } = useUISettingsStore();

  const viewModes: {
    id: LibraryViewMode;
    label: string;
    icon: string;
    description: string;
  }[] = [
    {
      id: "list",
      label: "List",
      icon: "List",
      description: "Detailed list view",
    },
    {
      id: "grid",
      label: "Grid",
      icon: "Grid3X3",
      description: "Card-based grid",
    },
    {
      id: "compact",
      label: "Compact",
      icon: "AlignJustify",
      description: "Dense list view",
    },
  ];

  const sortOptions: { id: LibrarySortBy; label: string }[] = [
    { id: "created_at", label: "Date Created" },
    { id: "updated_at", label: "Last Modified" },
    { id: "name", label: "Name" },
    { id: "type", label: "Type" },
  ];

  const sortOrders: { id: LibrarySortOrder; label: string; icon: string }[] = [
    { id: "desc", label: "Descending", icon: "ArrowDown" },
    { id: "asc", label: "Ascending", icon: "ArrowUp" },
  ];

  const contentTypes: { id: ContentType; label: string; icon: string }[] = [
    { id: "npcs", label: "NPCs", icon: "Users" },
    { id: "monsters", label: "Monsters", icon: "Skull" },
    { id: "encounters", label: "Encounters", icon: "Swords" },
    { id: "dialogues", label: "Dialogues", icon: "MessageCircle" },
    { id: "locations", label: "Locations", icon: "Map" },
    { id: "quests", label: "Quests", icon: "Scroll" },
    { id: "items", label: "Items", icon: "Package" },
    { id: "rumors", label: "Rumors", icon: "MessageSquare" },
    { id: "taverns", label: "Taverns", icon: "Beer" },
    { id: "merchants", label: "Merchants", icon: "Store" },
    { id: "traps", label: "Traps", icon: "AlertCircle" },
    { id: "critters", label: "Critters", icon: "Bug" },
    { id: "chases", label: "Chases", icon: "Zap" },
  ];

  const itemsPerPageOptions = [10, 20, 50, 100];

  return (
    <div className="space-y-8">
      {/* View Mode */}
      <div>
        <h3 className="text-lg font-semibold text-text mb-2">Default View</h3>
        <p className="text-sm text-text-muted mb-4">
          Choose how your saved content is displayed by default
        </p>
        <div className="grid grid-cols-3 gap-3">
          {viewModes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => updateLibrarySettings({ viewMode: mode.id })}
              className={`p-4 rounded-lg border text-center transition-colors ${
                librarySettings.viewMode === mode.id
                  ? "border-primary bg-primary/10 text-text"
                  : "border-border bg-background text-text-muted hover:bg-background-panel"
              }`}
            >
              <Icon
                name={mode.icon as any}
                className={`w-6 h-6 mx-auto mb-2 ${
                  librarySettings.viewMode === mode.id
                    ? "text-primary"
                    : "text-text-muted"
                }`}
              />
              <span className="font-medium">{mode.label}</span>
              <p className="text-xs mt-1 opacity-70">{mode.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Sort Options */}
      <div>
        <h3 className="text-lg font-semibold text-text mb-2">
          Default Sorting
        </h3>
        <p className="text-sm text-text-muted mb-4">
          How content should be sorted when you open the library
        </p>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-sm text-text-muted mb-2 block">
              Sort by
            </label>
            <select
              value={librarySettings.sortBy}
              onChange={(e) =>
                updateLibrarySettings({
                  sortBy: e.target.value as LibrarySortBy,
                })
              }
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-text focus:border-primary focus:outline-none"
            >
              {sortOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-sm text-text-muted mb-2 block">Order</label>
            <div className="flex gap-2">
              {sortOrders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => updateLibrarySettings({ sortOrder: order.id })}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                    librarySettings.sortOrder === order.id
                      ? "border-primary bg-primary/10 text-text"
                      : "border-border bg-background text-text-muted hover:bg-background-panel"
                  }`}
                >
                  <Icon name={order.icon as any} className="w-4 h-4" />
                  <span className="text-sm">{order.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Items Per Page */}
      <div>
        <h3 className="text-lg font-semibold text-text mb-2">Items Per Page</h3>
        <p className="text-sm text-text-muted mb-4">
          How many items to show before pagination
        </p>
        <div className="flex gap-2">
          {itemsPerPageOptions.map((count) => (
            <button
              key={count}
              onClick={() => updateLibrarySettings({ itemsPerPage: count })}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                librarySettings.itemsPerPage === count
                  ? "border-primary bg-primary/10 text-text"
                  : "border-border bg-background text-text-muted hover:bg-background-panel"
              }`}
            >
              {count}
            </button>
          ))}
        </div>
      </div>

      {/* Display Options */}
      <div>
        <h3 className="text-lg font-semibold text-text mb-2">
          Display Options
        </h3>
        <p className="text-sm text-text-muted mb-4">
          Toggle additional information in the library view
        </p>
        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 rounded-lg border border-border bg-background hover:bg-background-panel transition-colors cursor-pointer">
            <div>
              <span className="text-text font-medium">Show AI Badge</span>
              <p className="text-sm text-text-muted">
                Display badge on AI-generated content
              </p>
            </div>
            <div
              className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                librarySettings.showAIBadge ? "bg-primary" : "bg-border"
              }`}
              onClick={() =>
                updateLibrarySettings({
                  showAIBadge: !librarySettings.showAIBadge,
                })
              }
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  librarySettings.showAIBadge
                    ? "translate-x-6"
                    : "translate-x-0"
                }`}
              />
            </div>
          </label>

          <label className="flex items-center justify-between p-3 rounded-lg border border-border bg-background hover:bg-background-panel transition-colors cursor-pointer">
            <div>
              <span className="text-text font-medium">
                Show Campaign Filter
              </span>
              <p className="text-sm text-text-muted">
                Display campaign filter dropdown
              </p>
            </div>
            <div
              className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                librarySettings.showCampaignFilter ? "bg-primary" : "bg-border"
              }`}
              onClick={() =>
                updateLibrarySettings({
                  showCampaignFilter: !librarySettings.showCampaignFilter,
                })
              }
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  librarySettings.showCampaignFilter
                    ? "translate-x-6"
                    : "translate-x-0"
                }`}
              />
            </div>
          </label>
        </div>
      </div>

      {/* Content Type Visibility */}
      <div>
        <h3 className="text-lg font-semibold text-text mb-2">
          Visible Content Types
        </h3>
        <p className="text-sm text-text-muted mb-4">
          Choose which content types appear in the library sidebar
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {contentTypes.map((type) => {
            const isEnabled = librarySettings.enabledContentTypes[type.id];
            return (
              <button
                key={type.id}
                onClick={() =>
                  setLibraryContentTypeEnabled(type.id, !isEnabled)
                }
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                  isEnabled
                    ? "border-primary bg-primary/10 text-text"
                    : "border-border bg-background text-text-muted hover:bg-background-panel"
                }`}
              >
                <Icon
                  name={type.icon as any}
                  className={`w-4 h-4 flex-shrink-0 ${isEnabled ? "text-primary" : "text-text-muted"}`}
                />
                <span className="truncate">{type.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Default Content Type */}
      <div>
        <h3 className="text-lg font-semibold text-text mb-2">
          Default Content Type
        </h3>
        <p className="text-sm text-text-muted mb-4">
          Which content type to show when opening the library
        </p>
        <select
          value={librarySettings.defaultContentType}
          onChange={(e) =>
            updateLibrarySettings({
              defaultContentType: e.target.value as ContentType,
            })
          }
          className="w-full max-w-xs px-3 py-2 rounded-lg border border-border bg-background text-text focus:border-primary focus:outline-none"
        >
          {contentTypes
            .filter((type) => librarySettings.enabledContentTypes[type.id])
            .map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
        </select>
      </div>
    </div>
  );
}
