import { useEffect, useState } from "react";
import Icon from "../../common/Icon";
import {
  usePartyLootStore,
  PartyLootItem,
} from "../../../store/partyLootStore";
import { useCampaignStore } from "../../../store/campaignStore";
import LootItemCard from "./LootItemCard";
import LootEditor from "./LootEditor";
import ClaimModal from "./ClaimModal";
import LootItemModal from "./LootItemModal";

export default function PartyLoot() {
  const { items, loading, error, fetchLoot, deleteLoot } = usePartyLootStore();
  const getActiveCampaign = useCampaignStore(
    (state) => state.getActiveCampaign,
  );
  const activeCampaign = getActiveCampaign();

  const [showEditor, setShowEditor] = useState(false);
  const [editingItem, setEditingItem] = useState<PartyLootItem | null>(null);
  const [claimingItem, setClaimingItem] = useState<PartyLootItem | null>(null);
  const [viewingItem, setViewingItem] = useState<PartyLootItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClaimed, setFilterClaimed] = useState<
    "all" | "unclaimed" | "claimed"
  >("all");

  useEffect(() => {
    if (activeCampaign?.id) {
      fetchLoot(activeCampaign.id);
    }
  }, [fetchLoot, activeCampaign?.id]);

  // Filter items
  const filteredItems = items.filter((item) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !item.name.toLowerCase().includes(query) &&
        !item.description?.toLowerCase().includes(query) &&
        !item.source?.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    // Claimed filter
    if (filterClaimed === "unclaimed" && item.claimed_by) return false;
    if (filterClaimed === "claimed" && !item.claimed_by) return false;

    return true;
  });

  // Sort: unclaimed first, then by session acquired (recent first)
  const sortedItems = [...filteredItems].sort((a, b) => {
    // Unclaimed items first
    if (!a.claimed_by && b.claimed_by) return -1;
    if (a.claimed_by && !b.claimed_by) return 1;

    // Then by session acquired (descending)
    if (a.session_acquired && b.session_acquired) {
      return b.session_acquired - a.session_acquired;
    }

    // Then by created date
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const handleView = (item: PartyLootItem) => {
    setViewingItem(item);
  };

  const handleEdit = (item: PartyLootItem) => {
    setViewingItem(null); // Close view modal if open
    setEditingItem(item);
    setShowEditor(true);
  };

  const handleDelete = async (id: string) => {
    if (!activeCampaign?.id) return;
    if (
      window.confirm(
        "Are you sure you want to delete this item from party loot?",
      )
    ) {
      await deleteLoot(activeCampaign.id, id);
      setViewingItem(null); // Close view modal if open
    }
  };

  const handleClaim = (item: PartyLootItem) => {
    setClaimingItem(item);
  };

  const handleEditorClose = () => {
    setShowEditor(false);
    setEditingItem(null);
  };

  // Stats
  const unclaimedCount = items.filter((i) => !i.claimed_by).length;
  const claimedCount = items.filter((i) => i.claimed_by).length;

  if (!activeCampaign) {
    return (
      <div className="text-center py-12 bg-background-panel border border-border rounded-xl">
        <Icon
          name="Package"
          className="w-12 h-12 text-text-muted mx-auto mb-4"
        />
        <h3 className="text-lg font-medium text-text mb-2">
          No Active Campaign
        </h3>
        <p className="text-text-muted">
          Select or join a campaign to track party loot.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text flex items-center gap-2">
            <Icon name="Package" className="w-5 h-5 text-yellow-400" />
            Party Loot
          </h2>
          <p className="text-sm text-text-muted mt-1">
            Track items found by the party.{" "}
            <span className="text-yellow-400">{unclaimedCount} unclaimed</span>,{" "}
            <span className="text-emerald-400">{claimedCount} claimed</span>
          </p>
        </div>
        <button
          onClick={() => setShowEditor(true)}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-lg transition-colors"
        >
          <Icon name="Plus" className="w-4 h-4" />
          Add Loot
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Icon
            name="Search"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
          />
          <input
            type="text"
            placeholder="Search loot..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary"
          />
        </div>
        <select
          value={filterClaimed}
          onChange={(e) =>
            setFilterClaimed(e.target.value as "all" | "unclaimed" | "claimed")
          }
          className="px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
        >
          <option value="all">All Items</option>
          <option value="unclaimed">Unclaimed</option>
          <option value="claimed">Claimed</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && items.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <Icon name="Loader2" className="w-6 h-6 text-primary animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!loading && sortedItems.length === 0 && (
        <div className="text-center py-12 bg-background-panel border border-border rounded-xl">
          <Icon
            name="Package"
            className="w-12 h-12 text-text-muted mx-auto mb-4"
          />
          <h3 className="text-lg font-medium text-text mb-2">
            {searchQuery || filterClaimed !== "all"
              ? "No matching items"
              : "No loot yet"}
          </h3>
          <p className="text-text-muted mb-4 max-w-md mx-auto">
            {searchQuery || filterClaimed !== "all"
              ? "Try adjusting your search or filter."
              : "Track items your party finds during adventures. Add your first loot item!"}
          </p>
          {!searchQuery && filterClaimed === "all" && (
            <button
              onClick={() => setShowEditor(true)}
              className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-lg transition-colors"
            >
              Add First Item
            </button>
          )}
        </div>
      )}

      {/* Loot Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedItems.map((item) => (
          <LootItemCard
            key={item.id}
            item={item}
            onClick={() => handleView(item)}
            onEdit={() => handleEdit(item)}
            onDelete={() => handleDelete(item.id)}
            onClaim={() => handleClaim(item)}
          />
        ))}
      </div>

      {/* View Modal */}
      {viewingItem && (
        <LootItemModal
          item={viewingItem}
          onClose={() => setViewingItem(null)}
          onEdit={() => handleEdit(viewingItem)}
          onDelete={() => handleDelete(viewingItem.id)}
          onClaim={() => {
            setViewingItem(null);
            handleClaim(viewingItem);
          }}
        />
      )}

      {/* Editor Modal */}
      {showEditor && activeCampaign && (
        <LootEditor
          item={editingItem}
          campaignId={activeCampaign.id}
          onClose={handleEditorClose}
        />
      )}

      {/* Claim Modal */}
      {claimingItem && activeCampaign && (
        <ClaimModal
          item={claimingItem}
          campaignId={activeCampaign.id}
          onClose={() => setClaimingItem(null)}
        />
      )}
    </div>
  );
}
