import ContentListLayout from "../../../../common/ContentListLayout";
import { useGeneratorModalStore } from "../../../../../store/generatorModalStore";
import ContentCard from "../../../../common/ContentCard";
import ContentDetailModal from "../../../../common/ContentDetailModal";
import AssignCampaignModal from "../../../../common/AssignCampaignModal";
import { useLibraryContent } from "../../../../../hooks/useLibraryContent";
import { useCampaignStore } from "../../../../../store/campaignStore";
import { useState } from "react";
import { logger } from "@/utils/logger";
import { updateItem, UpdateItemRequest } from "../../../../../api/items";

interface Item {
  id: string;
  name: string;
  campaign_id?: string | null;
  type: string;
  rarity?: string;
  description?: string;
  properties?: any;
  origin?: string;
  previous_owner?: string;
  complication?: string;
  requires_attunement?: boolean;
  curse?: string;
  value?: any;
  weight?: number;
  location_found?: string;
  ai_generated?: boolean;
  created_at: string;
}

interface ItemsContentProps {
  campaignId?: string;
  showCampaignFilter?: boolean;
}

const rarityColors: Record<string, { bg: string; text: string }> = {
  common: { bg: "bg-gray-500/10", text: "text-gray-400" },
  uncommon: { bg: "bg-green-500/10", text: "text-green-400" },
  rare: { bg: "bg-blue-500/10", text: "text-blue-400" },
  very_rare: { bg: "bg-purple-500/10", text: "text-purple-400" },
  legendary: { bg: "bg-orange-500/10", text: "text-orange-400" },
  artifact: { bg: "bg-red-500/10", text: "text-red-400" },
};

export default function ItemsContent({
  campaignId,
  showCampaignFilter,
}: ItemsContentProps) {
  const { openGenerator } = useGeneratorModalStore();
  const { campaigns } = useCampaignStore();
  const [assignModalItem, setAssignModalItem] = useState<{
    id: string;
    name: string;
    currentCampaignId?: string | null;
  } | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  const {
    filteredItems,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    selectedCampaignId,
    setSelectedCampaignId,
    viewingItem,
    setViewingItem,
    deleteItem,
    refresh,
  } = useLibraryContent<Item>({
    contentType: "items",
    campaignId,
    showCampaignFilter,
    searchFields: ["name", "type", "description", "rarity"],
  });

  const handleDelete = async (item: Item) => {
    if (window.confirm(`Delete "${item.name}"? This cannot be undone.`)) {
      try {
        await deleteItem(item.id);
      } catch (err) {
        logger.error("Failed to delete item:", err);
      }
    }
  };

  const handleSave = async (id: string, updates: UpdateItemRequest) => {
    try {
      await updateItem(id, updates);
      await refresh();
      setEditingItem(null);
      setViewingItem(null);
    } catch (err) {
      logger.error("Failed to update item:", err);
      throw err;
    }
  };

  return (
    <div className="space-y-4">
      {showCampaignFilter && (
        <div className="mb-4">
          <select
            value={selectedCampaignId}
            onChange={(e) => setSelectedCampaignId(e.target.value)}
            className="w-full md:w-64 px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary transition-colors text-sm"
          >
            <option value="">All Content</option>
            <option value="library">Personal Library (No Campaign)</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <ContentListLayout
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search items..."
        addButtonLabel="Add Item"
        onAddClick={() => openGenerator("item")}
        addButtonColor="purple"
        loading={loading}
        error={error}
        emptyIcon="Package"
        emptyTitle="No items yet"
        emptyDescription="Create magical items, weapons, and treasures."
        emptyCTALabel="Create Your First Item"
        onEmptyCTAClick={() => openGenerator("item")}
        hasItems={filteredItems.length > 0}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const rarityColor =
              rarityColors[
                item.rarity?.toLowerCase().replace(" ", "_") || "common"
              ] || rarityColors.common;
            return (
              <ContentCard
                key={item.id}
                title={item.name}
                preview={item.description || undefined}
                icon="Package"
                iconColor="purple"
                layout="grid"
                badges={[
                  { label: item.type },
                  ...(item.rarity
                    ? [
                        {
                          label: item.rarity,
                          color: rarityColor.text,
                          bgColor: rarityColor.bg,
                        },
                      ]
                    : []),
                  ...(item.requires_attunement
                    ? [
                        {
                          label: "Attunement",
                          color: "text-amber-400",
                          bgColor: "bg-amber-500/10",
                        },
                      ]
                    : []),
                ]}
                onClick={() => setViewingItem(item)}
                onDelete={() => handleDelete(item)}
                onAssign={() =>
                  setAssignModalItem({
                    id: item.id,
                    name: item.name,
                    currentCampaignId: item.campaign_id,
                  })
                }
              />
            );
          })}
        </div>
      </ContentListLayout>

      {viewingItem && !editingItem && (
        <ItemDetailModal
          item={viewingItem}
          onClose={() => setViewingItem(null)}
          onDelete={() => handleDelete(viewingItem)}
          onEdit={() => setEditingItem(viewingItem)}
        />
      )}

      {editingItem && (
        <EditItemModal
          item={editingItem}
          onClose={() => {
            setEditingItem(null);
            setViewingItem(null);
          }}
          onSave={handleSave}
        />
      )}

      {assignModalItem && (
        <AssignCampaignModal
          isOpen={true}
          onClose={() => setAssignModalItem(null)}
          contentType="items"
          contentId={assignModalItem.id}
          contentName={assignModalItem.name}
          currentCampaignId={assignModalItem.currentCampaignId}
          onSuccess={refresh}
        />
      )}
    </div>
  );
}

interface ItemDetailModalProps {
  item: Item;
  onClose: () => void;
  onDelete: () => void;
  onEdit: () => void;
}

function ItemDetailModal({
  item,
  onClose,
  onDelete,
  onEdit,
}: ItemDetailModalProps) {
  let properties: any[] = [];
  let value: any = null;

  try {
    properties = item.properties
      ? typeof item.properties === "string"
        ? JSON.parse(item.properties)
        : item.properties
      : [];
    value = item.value
      ? typeof item.value === "string"
        ? JSON.parse(item.value)
        : item.value
      : null;
  } catch (err) {
    logger.error("Failed to parse item data:", err);
  }

  const rarityColor =
    rarityColors[item.rarity?.toLowerCase().replace(" ", "_") || "common"] ||
    rarityColors.common;

  return (
    <ContentDetailModal
      isOpen={true}
      onClose={onClose}
      icon="Package"
      iconColor="purple"
      title={item.name}
      subtitle={item.type}
      onDelete={onDelete}
      onEdit={onEdit}
    >
      <div className="space-y-6">
        {/* Info Row */}
        <div className="flex flex-wrap gap-3">
          {item.rarity && (
            <div
              className={`px-4 py-2 ${rarityColor.bg} border border-purple-500/30 rounded-lg`}
            >
              <p className="text-xs text-text-muted">Rarity</p>
              <p
                className={`text-lg font-semibold ${rarityColor.text} capitalize`}
              >
                {item.rarity}
              </p>
            </div>
          )}
          {item.requires_attunement && (
            <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-xs text-text-muted">Attunement</p>
              <p className="text-lg font-semibold text-amber-400">Required</p>
            </div>
          )}
          {value && (
            <div className="px-4 py-2 bg-background border border-border rounded-lg">
              <p className="text-xs text-text-muted">Value</p>
              <p className="text-lg font-semibold text-text">
                {typeof value === "object"
                  ? `${value.amount} ${value.currency}`
                  : value}
              </p>
            </div>
          )}
        </div>

        {item.description && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Description
            </h4>
            <p className="text-text leading-relaxed whitespace-pre-wrap">
              {item.description}
            </p>
          </div>
        )}

        {Array.isArray(properties) && properties.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Properties
            </h4>
            <ul className="list-disc list-inside text-text space-y-1">
              {properties.map((p: any, i: number) => (
                <li key={i}>
                  {typeof p === "string" ? p : p.name || p.description}
                </li>
              ))}
            </ul>
          </div>
        )}

        {item.origin && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Origin
            </h4>
            <p className="text-text leading-relaxed">{item.origin}</p>
          </div>
        )}

        {item.previous_owner && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Previous Owner
            </h4>
            <p className="text-text leading-relaxed">{item.previous_owner}</p>
          </div>
        )}

        {item.complication && (
          <div className="bg-amber-500/10 p-4 rounded-lg border border-amber-500/30">
            <h4 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-2">
              Complication
            </h4>
            <p className="text-amber-300">{item.complication}</p>
          </div>
        )}

        {item.curse && (
          <div className="bg-red-500/10 p-4 rounded-lg border border-red-500/30">
            <h4 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-2">
              Curse
            </h4>
            <p className="text-red-300">{item.curse}</p>
          </div>
        )}

        {(item.weight || item.location_found) && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Additional Details
            </h4>
            <div className="bg-background p-4 rounded-lg border border-border space-y-2">
              {item.weight && (
                <p className="text-text">
                  <span className="text-text-muted">Weight: </span>
                  {item.weight} lbs
                </p>
              )}
              {item.location_found && (
                <p className="text-text">
                  <span className="text-text-muted">Found at: </span>
                  {item.location_found}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </ContentDetailModal>
  );
}

interface EditItemModalProps {
  item: Item;
  onClose: () => void;
  onSave: (id: string, updates: UpdateItemRequest) => Promise<void>;
}

function EditItemModal({ item, onClose, onSave }: EditItemModalProps) {
  const [formData, setFormData] = useState({
    name: item.name,
    type: item.type,
    rarity: item.rarity || "",
    description: item.description || "",
    weight: item.weight?.toString() || "",
    value:
      typeof item.value === "object" && item.value !== null
        ? item.value.amount?.toString() || ""
        : item.value?.toString() || "",
    dm_notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const updates: UpdateItemRequest = {
        name: formData.name,
        type: formData.type,
        rarity: formData.rarity || undefined,
        description: formData.description || undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        value: formData.value ? parseFloat(formData.value) : undefined,
      };

      await onSave(item.id, updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save item");
      setSaving(false);
    }
  };

  return (
    <ContentDetailModal
      isOpen={true}
      onClose={onClose}
      icon="Package"
      iconColor="purple"
      title="Edit Item"
      subtitle={item.name}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-text-muted mb-2">
            Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-muted mb-2">
            Type *
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
            required
          >
            <option value="weapon">Weapon</option>
            <option value="armor">Armor</option>
            <option value="consumable">Consumable</option>
            <option value="treasure">Treasure</option>
            <option value="tool">Tool</option>
            <option value="quest_item">Quest Item</option>
            <option value="relic">Relic</option>
            <option value="wondrous">Wondrous Item</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-muted mb-2">
            Rarity
          </label>
          <select
            value={formData.rarity}
            onChange={(e) =>
              setFormData({ ...formData, rarity: e.target.value })
            }
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
          >
            <option value="">Select rarity</option>
            <option value="common">Common</option>
            <option value="uncommon">Uncommon</option>
            <option value="rare">Rare</option>
            <option value="very_rare">Very Rare</option>
            <option value="legendary">Legendary</option>
            <option value="artifact">Artifact</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-muted mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
            rows={4}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">
              Weight (lbs)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.weight}
              onChange={(e) =>
                setFormData({ ...formData, weight: e.target.value })
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">
              Value (gp)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.value}
              onChange={(e) =>
                setFormData({ ...formData, value: e.target.value })
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
              min="0"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-text-muted hover:text-text transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </ContentDetailModal>
  );
}
