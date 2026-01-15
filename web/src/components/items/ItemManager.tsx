import { useState, useEffect } from "react";
import Icon from "../common/Icon";
import ItemDetail from "./ItemDetail";
import ItemModal from "./ItemModal";
import { useItemStore } from "../../store/itemStore";
import { useCampaignStore } from "../../store/campaignStore";
import { Item, ITEM_TYPES, ITEM_RARITIES } from "../../api/items";

export default function ItemManager() {
  const { items, loading, error, fetchItems } = useItemStore();
  const { campaigns, fetchCampaigns } = useCampaignStore();

  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Filter state
  const [filterCampaignId, setFilterCampaignId] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterRarity, setFilterRarity] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Mobile drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    fetchItems();
    fetchCampaigns();
  }, [fetchItems, fetchCampaigns]);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Close drawer when switching to desktop
  useEffect(() => {
    if (!isMobile) {
      setIsDrawerOpen(false);
    }
  }, [isMobile]);

  // Prevent body scroll when drawer open on mobile
  useEffect(() => {
    if (isMobile && isDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobile, isDrawerOpen]);

  // Handle Escape key to close drawer
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isDrawerOpen) {
        setIsDrawerOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isDrawerOpen]);

  // Filter items
  const filteredItems = items.filter((item) => {
    if (filterCampaignId && item.campaign_id !== filterCampaignId) return false;
    if (filterType && item.type !== filterType) return false;
    if (filterRarity && item.rarity !== filterRarity) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !item.name.toLowerCase().includes(query) &&
        !item.description?.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    return true;
  });

  const formatRarity = (rarity?: string): string => {
    if (!rarity) return "Common";
    return rarity.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getTypeIcon = (
    type: string,
  ):
    | "Sword"
    | "Shield"
    | "FlaskConical"
    | "Gem"
    | "Wrench"
    | "Scroll"
    | "Crown"
    | "Sparkles"
    | "Package" => {
    switch (type) {
      case "weapon":
        return "Sword";
      case "armor":
        return "Shield";
      case "consumable":
        return "FlaskConical";
      case "treasure":
        return "Gem";
      case "tool":
        return "Wrench";
      case "quest_item":
        return "Scroll";
      case "relic":
        return "Crown";
      case "wondrous":
        return "Sparkles";
      default:
        return "Package";
    }
  };

  return (
    <div className="h-full flex flex-col bg-background overflow-x-hidden">
      {/* Header - matches CampaignToolkit */}
      <div className="flex-shrink-0 border-b border-border bg-background-panel px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            {isMobile && (
              <button
                onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                className="p-2 hover:bg-tavern-dark rounded transition-colors lg:hidden"
                aria-label="Open navigation menu"
                aria-expanded={isDrawerOpen}
              >
                <svg
                  className="w-6 h-6 text-text"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-text flex items-center gap-2">
                <Icon name="Gem" className="w-8 h-8 text-primary" />
                Item Vault
              </h1>
              <p className="text-sm text-text-muted mt-1">
                Manage your collection of items, treasure, and magical artifacts
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <Icon name="Plus" className="w-5 h-5" />
            <span className="hidden sm:inline">New Item</span>
          </button>
        </div>
      </div>

      {/* Content - matches CampaignToolkit layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Backdrop - Mobile only */}
        {isMobile && isDrawerOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 transition-opacity lg:hidden"
            onClick={() => setIsDrawerOpen(false)}
            aria-label="Close navigation"
          />
        )}

        {/* Sidebar - matches CampaignToolkit */}
        <aside
          className={`
            ${isMobile ? "fixed top-0 left-0 h-full w-80 z-50 transform transition-transform duration-300 ease-in-out" : "w-64 flex-shrink-0"}
            ${isMobile && !isDrawerOpen ? "-translate-x-full" : "translate-x-0"}
            bg-background-panel border-r border-border overflow-y-auto
          `}
          role="navigation"
          aria-label="Item list"
        >
          <div className="p-4">
            <nav className="space-y-6">
              {/* Search Section */}
              <div>
                <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Icon name="Search" className="w-3 h-3" />
                  Search
                </h3>
                <div className="relative">
                  <Icon
                    name="Search"
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
                  />
                  <input
                    type="text"
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Filters Section */}
              <div>
                <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Icon name="Filter" className="w-3 h-3" />
                  Filters
                </h3>
                <div className="space-y-2">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="">All Types</option>
                    {ITEM_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filterRarity}
                    onChange={(e) => setFilterRarity(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="">All Rarities</option>
                    {ITEM_RARITIES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>

                  {campaigns.length > 0 && (
                    <select
                      value={filterCampaignId}
                      onChange={(e) => setFilterCampaignId(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text text-sm focus:outline-none focus:border-primary"
                    >
                      <option value="">All Campaigns</option>
                      {campaigns.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Items List Section */}
              <div>
                <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Icon name="Package" className="w-3 h-3" />
                  Items
                  {!loading && filteredItems.length > 0 && (
                    <span className="ml-auto px-2 py-0.5 bg-primary/20 text-primary text-xs font-semibold rounded-full">
                      {filteredItems.length}
                    </span>
                  )}
                </h3>

                {loading && (
                  <div className="flex items-center justify-center py-8">
                    <Icon
                      name="Loader2"
                      className="w-6 h-6 animate-spin text-primary"
                    />
                  </div>
                )}

                {error && (
                  <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3 mb-3">
                    <p className="text-red-400 text-xs">{error}</p>
                  </div>
                )}

                {!loading && filteredItems.length === 0 && (
                  <div className="text-center py-6 px-2">
                    <Icon
                      name="Gem"
                      className="w-12 h-12 text-primary/30 mx-auto mb-2"
                    />
                    <p className="text-text-muted text-xs">
                      {items.length === 0
                        ? "No items yet"
                        : "No matching items"}
                    </p>
                  </div>
                )}

                <div className="space-y-1">
                  {filteredItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setSelectedItem(item);
                        if (isMobile) setIsDrawerOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                        selectedItem?.id === item.id
                          ? "bg-primary text-tavern-darkest"
                          : "text-tavern-mauve hover:bg-tavern-dark hover:text-tavern-light"
                      }`}
                    >
                      <Icon
                        name={getTypeIcon(item.type)}
                        className="w-4 h-4 flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium truncate block">
                          {item.name}
                        </span>
                        <span
                          className={`text-xs ${selectedItem?.id === item.id ? "text-tavern-darkest/70" : "text-text-muted"}`}
                        >
                          {formatRarity(item.rarity)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </nav>
          </div>
        </aside>

        {/* Content Area - matches CampaignToolkit */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {selectedItem ? (
              <ItemDetail
                item={selectedItem}
                onUpdate={() => fetchItems({}, true)}
                onClose={() => setSelectedItem(null)}
              />
            ) : (
              <div className="h-full flex items-center justify-center py-16">
                <div className="text-center max-w-md">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-primary/5 rounded-full blur-3xl"></div>
                    <Icon
                      name="Gem"
                      className="w-24 h-24 text-primary/30 mx-auto relative"
                    />
                  </div>
                  <h2 className="text-2xl font-bold text-text mb-2">
                    {items.length > 0
                      ? "Select an Item"
                      : "Create Your First Item"}
                  </h2>
                  <p className="text-text-muted mb-6">
                    {items.length > 0
                      ? "Choose an item from the sidebar to view its details"
                      : "Get started by adding your first item to the vault"}
                  </p>
                  {items.length === 0 && (
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors inline-flex items-center gap-2"
                    >
                      <Icon name="Plus" className="w-5 h-5" />
                      Create New Item
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Item Modal */}
      {showCreateModal && (
        <ItemModal
          onClose={() => setShowCreateModal(false)}
          onSave={(item) => {
            setShowCreateModal(false);
            setSelectedItem(item);
          }}
        />
      )}
    </div>
  );
}
