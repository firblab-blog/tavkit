import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useCampaignStore, Campaign } from "../../store/campaignStore";
import { useCampaignNavigation } from "../../hooks/useCampaignNavigation";
import { useActiveCampaign } from "../../hooks/useActiveCampaign";
import Icon from "./Icon";

/**
 * CampaignSwitcher - Clean dropdown for switching between campaigns and contexts.
 *
 * Design: Unified campaign list with role badges (GM/Player/Joined),
 * plus quick access to Library and New Campaign.
 */
export default function CampaignSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { campaigns, openCreateCampaignModal, deleteCampaign } =
    useCampaignStore();
  const { activateCampaignWithNavigation, switchToLibrary } =
    useCampaignNavigation();

  // Use single source of truth for active campaign (derived from contextStore)
  const {
    activeCampaignId,
    activeCampaign,
    isGMContext,
    isPlayerContext,
    isLibraryContext,
  } = useActiveCampaign();

  // Categorize campaigns - memoized to prevent recalculation on every render
  // Priority: membership_type > role (for backwards compatibility)
  const allCampaigns = useMemo(() => {
    const gmCampaigns = campaigns.filter(
      (c) => c.membership_type === "owner" || c.role === "owner",
    );
    const joinedCampaigns = campaigns.filter(
      (c) => c.membership_type === "player_joined",
    );
    const trackingCampaigns = campaigns.filter(
      (c) =>
        c.membership_type === "player_local" ||
        (c.role === "player" && c.membership_type !== "player_joined"),
    );

    return [
      ...gmCampaigns.map((c) => ({ ...c, roleType: "gm" as const })),
      ...joinedCampaigns.map((c) => ({ ...c, roleType: "joined" as const })),
      ...trackingCampaigns.map((c) => ({
        ...c,
        roleType: "tracking" as const,
      })),
    ];
  }, [campaigns]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setConfirmingDelete(null); // Reset delete confirmation when closing
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Reset delete confirmation when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setConfirmingDelete(null);
    }
  }, [isOpen]);

  const handleCampaignClick = useCallback(
    (campaign: Campaign & { roleType: "gm" | "joined" | "tracking" }) => {
      setIsOpen(false);
      // Use centralized navigation hook - handles all state sync, cache invalidation, and navigation
      activateCampaignWithNavigation(campaign.id);
    },
    [activateCampaignWithNavigation],
  );

  const handleSwitchToLibrary = useCallback(() => {
    setIsOpen(false);
    // Use centralized navigation hook - handles all state sync, cache invalidation, and navigation
    switchToLibrary();
  }, [switchToLibrary]);

  const handleCreateCampaign = useCallback(() => {
    setIsOpen(false);
    openCreateCampaignModal();
  }, [openCreateCampaignModal]);

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent, campaignId: string) => {
      e.stopPropagation(); // Prevent campaign selection
      setConfirmingDelete(campaignId);
    },
    [],
  );

  const handleConfirmDelete = useCallback(
    async (e: React.MouseEvent, campaignId: string) => {
      e.stopPropagation();
      try {
        await deleteCampaign(campaignId);
        setConfirmingDelete(null);
        // If we deleted the active campaign, switch to library
        if (campaignId === activeCampaignId) {
          switchToLibrary();
        }
      } catch (error) {
        console.error("Failed to delete campaign:", error);
        alert("Failed to delete campaign. Please try again.");
      }
    },
    [deleteCampaign, activeCampaignId, switchToLibrary],
  );

  const handleCancelDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmingDelete(null);
  }, []);

  // Get display info based on current context
  const getContextLabel = () => {
    if (isLibraryContext) return "Library";
    return activeCampaign?.name || "No Campaign";
  };

  const getContextIcon = () => {
    if (isLibraryContext) return "Library";
    if (isPlayerContext) return "Sword";
    return "Crown";
  };

  const getContextColor = () => {
    if (isLibraryContext) return "text-purple-400";
    if (isPlayerContext) return "text-blue-400";
    return "text-amber-400";
  };

  // Check if a campaign is currently active
  const isCampaignActive = (
    campaign: Campaign & { roleType: "gm" | "joined" | "tracking" },
  ) => {
    if (campaign.id !== activeCampaignId) return false;
    if (campaign.roleType === "gm") return isGMContext;
    return isPlayerContext;
  };

  // Role badge component
  const RoleBadge = ({ type }: { type: "gm" | "joined" | "tracking" }) => {
    if (type === "gm") {
      return (
        <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-amber-500/20 text-amber-400">
          GM
        </span>
      );
    }
    if (type === "joined") {
      return (
        <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-green-500/20 text-green-400">
          Joined
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-blue-500/20 text-blue-400">
        Player
      </span>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-background-panel hover:bg-background border border-border hover:border-primary/40 rounded-lg transition-colors group"
      >
        <Icon
          name={getContextIcon()}
          className={`w-4 h-4 ${getContextColor()}`}
        />
        <span className="font-medium text-text truncate max-w-[160px]">
          {getContextLabel()}
        </span>
        <Icon
          name="ChevronDown"
          className={`w-4 h-4 text-text-muted group-hover:text-primary transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-background-panel border border-border rounded-lg shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Campaigns List */}
          {allCampaigns.length > 0 && (
            <div className="max-h-[280px] overflow-y-auto">
              {allCampaigns.map((campaign, index) => {
                const isActive = isCampaignActive(campaign);
                const isConfirmingThisDelete = confirmingDelete === campaign.id;
                return (
                  <div
                    key={campaign.id}
                    className={`w-full px-3 py-2.5 text-left flex items-center gap-2 transition-colors ${
                      index !== 0 ? "border-t border-border" : ""
                    } ${isActive ? "bg-primary/10" : "hover:bg-background"} ${isConfirmingThisDelete ? "bg-red-500/10" : ""}`}
                  >
                    {isConfirmingThisDelete ? (
                      // Delete confirmation UI
                      <div className="flex items-center gap-2 w-full">
                        <Icon
                          name="AlertTriangle"
                          className="w-4 h-4 text-red-400 flex-shrink-0"
                        />
                        <span className="text-sm text-red-400 flex-1 truncate">
                          Delete "{campaign.name}"?
                        </span>
                        <button
                          onClick={(e) => handleConfirmDelete(e, campaign.id)}
                          className="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={handleCancelDelete}
                          className="px-2 py-1 text-xs bg-background hover:bg-background-panel text-text-muted rounded transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      // Normal campaign item
                      <>
                        <button
                          onClick={() => handleCampaignClick(campaign)}
                          className="flex items-center gap-2 flex-1 min-w-0"
                        >
                          {isActive ? (
                            <Icon
                              name="Check"
                              className="w-4 h-4 text-primary flex-shrink-0"
                            />
                          ) : (
                            <div className="w-4 h-4 flex-shrink-0" />
                          )}
                          <span
                            className={`truncate flex-1 text-left ${isActive ? "font-medium text-text" : "text-text"}`}
                          >
                            {campaign.name}
                          </span>
                        </button>
                        <RoleBadge type={campaign.roleType} />
                        <button
                          onClick={(e) => handleDeleteClick(e, campaign.id)}
                          className="p-1 hover:bg-red-500/20 rounded transition-colors opacity-50 hover:opacity-100"
                          title="Delete campaign"
                        >
                          <Icon
                            name="Trash2"
                            className="w-3.5 h-3.5 text-red-400"
                          />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {allCampaigns.length === 0 && (
            <div className="px-3 py-4 text-center text-text-muted text-sm">
              No campaigns yet
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Quick Actions */}
          <div className="p-2 flex gap-1">
            {/* Library */}
            <button
              onClick={handleSwitchToLibrary}
              className={`flex-1 px-3 py-2 rounded-md text-sm flex items-center justify-center gap-2 transition-colors ${
                isLibraryContext
                  ? "bg-purple-500/10 text-purple-400"
                  : "hover:bg-background text-text-muted hover:text-text"
              }`}
            >
              <Icon name="Library" className="w-4 h-4" />
              <span>Library</span>
            </button>

            {/* New Campaign */}
            <button
              onClick={handleCreateCampaign}
              className="flex-1 px-3 py-2 rounded-md text-sm flex items-center justify-center gap-2 text-primary hover:bg-primary/10 transition-colors"
            >
              <Icon name="Plus" className="w-4 h-4" />
              <span>New</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
