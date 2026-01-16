import ContentListLayout from "../../../../common/ContentListLayout";
import { useGeneratorModalStore } from "../../../../../store/generatorModalStore";
import ContentCard from "../../../../common/ContentCard";
import ContentDetailModal from "../../../../common/ContentDetailModal";
import AssignCampaignModal from "../../../../common/AssignCampaignModal";
import { useLibraryContent } from "../../../../../hooks/useLibraryContent";
import { useCampaignStore } from "../../../../../store/campaignStore";
import { useState } from "react";
import { logger } from "@/utils/logger";
import {
  updateMerchant,
  UpdateMerchantRequest,
} from "../../../../../api/merchants";

interface Merchant {
  id: string;
  name: string;
  campaign_id?: string | null;
  shop_type: string;
  atmosphere?: string;
  description?: string;
  location?: string;
  owner_name?: string;
  owner_personality?: string;
  owner_description?: string;
  inventory?: any;
  services?: any;
  special_items?: any;
  rumors?: any;
  recently_sold?: any;
  special_notes?: string;
  haggle_willingness?: string;
  ai_generated?: boolean;
  created_at: string;
}

interface MerchantsContentProps {
  campaignId?: string;
  showCampaignFilter?: boolean;
}

export default function MerchantsContent({
  campaignId,
  showCampaignFilter,
}: MerchantsContentProps) {
  const { openGenerator } = useGeneratorModalStore();
  const { campaigns } = useCampaignStore();
  const [assignModalItem, setAssignModalItem] = useState<{
    id: string;
    name: string;
    currentCampaignId?: string | null;
  } | null>(null);
  const [editingMerchant, setEditingMerchant] = useState<Merchant | null>(null);

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
  } = useLibraryContent<Merchant>({
    contentType: "merchants",
    campaignId,
    showCampaignFilter,
    searchFields: ["name", "shop_type", "location", "atmosphere"],
  });

  const handleDelete = async (merchant: Merchant) => {
    if (window.confirm(`Delete "${merchant.name}"? This cannot be undone.`)) {
      try {
        await deleteItem(merchant.id);
      } catch (err) {
        logger.error("Failed to delete merchant:", err);
      }
    }
  };

  const handleSave = async (id: string, updates: UpdateMerchantRequest) => {
    try {
      await updateMerchant(id, updates);
      await refresh();
      setEditingMerchant(null);
      setViewingItem(null);
    } catch (err) {
      logger.error("Failed to update merchant:", err);
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
        searchPlaceholder="Search merchants..."
        addButtonLabel="Add Merchant"
        onAddClick={() => openGenerator("merchant")}
        addButtonColor="teal"
        loading={loading}
        error={error}
        emptyIcon="Store"
        emptyTitle="No merchants yet"
        emptyDescription="Create shops, vendors, and traders."
        emptyCTALabel="Create Your First Merchant"
        onEmptyCTAClick={() => openGenerator("merchant")}
        hasItems={filteredItems.length > 0}
      >
        <div className="space-y-3">
          {filteredItems.map((merchant) => (
            <ContentCard
              key={merchant.id}
              title={merchant.name}
              preview={merchant.atmosphere || merchant.location || undefined}
              icon="Store"
              iconColor="teal"
              date={merchant.created_at}
              badges={[
                { label: merchant.shop_type.replace(/_/g, " ") },
                ...(merchant.haggle_willingness
                  ? [{ label: `Haggling: ${merchant.haggle_willingness}` }]
                  : []),
              ]}
              onClick={() => setViewingItem(merchant)}
              onDelete={() => handleDelete(merchant)}
              onAssign={() =>
                setAssignModalItem({
                  id: merchant.id,
                  name: merchant.name,
                  currentCampaignId: merchant.campaign_id,
                })
              }
            />
          ))}
        </div>
      </ContentListLayout>

      {viewingItem && !editingMerchant && (
        <MerchantDetailModal
          merchant={viewingItem}
          onClose={() => setViewingItem(null)}
          onDelete={() => handleDelete(viewingItem)}
          onEdit={() => setEditingMerchant(viewingItem)}
        />
      )}

      {editingMerchant && (
        <EditMerchantModal
          merchant={editingMerchant}
          onClose={() => {
            setEditingMerchant(null);
            setViewingItem(null);
          }}
          onSave={handleSave}
        />
      )}

      {assignModalItem && (
        <AssignCampaignModal
          isOpen={true}
          onClose={() => setAssignModalItem(null)}
          contentType="merchants"
          contentId={assignModalItem.id}
          contentName={assignModalItem.name}
          currentCampaignId={assignModalItem.currentCampaignId}
          onSuccess={refresh}
        />
      )}
    </div>
  );
}

interface MerchantDetailModalProps {
  merchant: Merchant;
  onClose: () => void;
  onDelete: () => void;
  onEdit: () => void;
}

function MerchantDetailModal({
  merchant,
  onClose,
  onDelete,
  onEdit,
}: MerchantDetailModalProps) {
  let inventory: any[] = [];
  let specialItems: any[] = [];
  let services: any[] = [];
  let rumors: any[] = [];
  let recentlySold: any[] = [];

  try {
    inventory = merchant.inventory
      ? typeof merchant.inventory === "string"
        ? JSON.parse(merchant.inventory)
        : merchant.inventory
      : [];
    specialItems = merchant.special_items
      ? typeof merchant.special_items === "string"
        ? JSON.parse(merchant.special_items)
        : merchant.special_items
      : [];
    services = merchant.services
      ? typeof merchant.services === "string"
        ? JSON.parse(merchant.services)
        : merchant.services
      : [];
    rumors = merchant.rumors
      ? typeof merchant.rumors === "string"
        ? JSON.parse(merchant.rumors)
        : merchant.rumors
      : [];
    recentlySold = merchant.recently_sold
      ? typeof merchant.recently_sold === "string"
        ? JSON.parse(merchant.recently_sold)
        : merchant.recently_sold
      : [];
  } catch (err) {
    logger.error("Failed to parse merchant data:", err);
  }

  return (
    <ContentDetailModal
      isOpen={true}
      onClose={onClose}
      icon="Store"
      iconColor="teal"
      title={merchant.name}
      subtitle={[
        merchant.shop_type.replace(/_/g, " "),
        merchant.location,
        merchant.haggle_willingness
          ? `Haggling: ${merchant.haggle_willingness}`
          : null,
      ]
        .filter(Boolean)
        .join(" • ")}
      onDelete={onDelete}
      onEdit={onEdit}
    >
      <div className="space-y-6">
        {merchant.description && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Description
            </h4>
            <p className="text-text leading-relaxed whitespace-pre-wrap">
              {merchant.description}
            </p>
          </div>
        )}

        {merchant.atmosphere && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Atmosphere
            </h4>
            <p className="text-text leading-relaxed">{merchant.atmosphere}</p>
          </div>
        )}

        {(merchant.owner_name ||
          merchant.owner_personality ||
          merchant.owner_description) && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Shopkeeper
            </h4>
            <div className="bg-background p-4 rounded-lg border border-border space-y-2">
              {merchant.owner_name && (
                <p className="text-text font-medium text-lg">
                  {merchant.owner_name}
                </p>
              )}
              {merchant.owner_personality && (
                <p className="text-teal-400 italic">
                  {merchant.owner_personality}
                </p>
              )}
              {merchant.owner_description && (
                <p className="text-text-muted">{merchant.owner_description}</p>
              )}
            </div>
          </div>
        )}

        {inventory.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Inventory
            </h4>
            <div className="bg-background p-4 rounded-lg border border-border">
              <ul className="space-y-2">
                {inventory.map((item: any, i: number) => (
                  <li
                    key={i}
                    className="flex justify-between items-start gap-4"
                  >
                    <div className="flex-1">
                      <span className="text-text font-medium">
                        {item.name || item}
                      </span>
                      {item.description && (
                        <p className="text-text-muted text-sm mt-0.5">
                          {item.description}
                        </p>
                      )}
                    </div>
                    {item.price && (
                      <span className="text-amber-400 whitespace-nowrap">
                        {item.price}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {specialItems.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Special Items
            </h4>
            <div className="space-y-2">
              {specialItems.map((item: any, i: number) => (
                <div
                  key={i}
                  className="bg-purple-500/10 p-3 rounded-lg border border-purple-500/30"
                >
                  <p className="text-purple-400 font-medium">
                    {item.name || item}
                  </p>
                  {item.description && (
                    <p className="text-text-muted text-sm mt-1">
                      {item.description}
                    </p>
                  )}
                  {item.price && (
                    <p className="text-amber-400 text-sm mt-1">{item.price}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {services.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Services Offered
            </h4>
            <ul className="space-y-2">
              {services.map((service: any, i: number) => (
                <li
                  key={i}
                  className="text-text bg-background p-3 rounded-lg border border-border flex justify-between items-start gap-4"
                >
                  <div className="flex-1">
                    <span className="font-medium">
                      {typeof service === "string"
                        ? service
                        : service.name || service.service}
                    </span>
                    {service.description && (
                      <p className="text-text-muted text-sm mt-0.5">
                        {service.description}
                      </p>
                    )}
                  </div>
                  {service.price && (
                    <span className="text-amber-400 whitespace-nowrap">
                      {service.price}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {recentlySold.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Recently Sold
            </h4>
            <ul className="space-y-1">
              {recentlySold.map((item: any, i: number) => (
                <li key={i} className="text-text-muted text-sm">
                  • {typeof item === "string" ? item : item.name || item.item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {rumors.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Rumors & Gossip
            </h4>
            <ul className="space-y-2">
              {rumors.map((rumor: any, i: number) => (
                <li
                  key={i}
                  className="text-text-muted bg-background p-3 rounded-lg border border-border italic"
                >
                  {typeof rumor === "string"
                    ? rumor
                    : rumor.text || rumor.description}
                </li>
              ))}
            </ul>
          </div>
        )}

        {merchant.special_notes && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Special Notes
            </h4>
            <p className="text-text leading-relaxed whitespace-pre-wrap bg-teal-500/10 border border-teal-500/20 p-4 rounded-lg">
              {merchant.special_notes}
            </p>
          </div>
        )}
      </div>
    </ContentDetailModal>
  );
}

interface EditMerchantModalProps {
  merchant: Merchant;
  onClose: () => void;
  onSave: (id: string, updates: UpdateMerchantRequest) => Promise<void>;
}

function EditMerchantModal({
  merchant,
  onClose,
  onSave,
}: EditMerchantModalProps) {
  const [formData, setFormData] = useState({
    name: merchant.name,
    shop_type: merchant.shop_type,
    description: merchant.description || "",
    location: merchant.location || "",
    owner_name: merchant.owner_name || "",
    owner_personality: merchant.owner_personality || "",
    owner_description: merchant.owner_description || "",
    haggle_willingness: merchant.haggle_willingness || "",
    special_notes: merchant.special_notes || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const updates: UpdateMerchantRequest = {
        name: formData.name,
        shop_type: formData.shop_type || undefined,
        description: formData.description || undefined,
        owner_description: formData.owner_description || undefined,
        haggle_willingness: formData.haggle_willingness || undefined,
        dm_notes: formData.special_notes || undefined,
      };

      await onSave(merchant.id, updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save merchant");
      setSaving(false);
    }
  };

  return (
    <ContentDetailModal
      isOpen={true}
      onClose={onClose}
      icon="Store"
      iconColor="teal"
      title="Edit Merchant"
      subtitle={merchant.name}
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">
              Shop Type
            </label>
            <input
              type="text"
              value={formData.shop_type}
              onChange={(e) =>
                setFormData({ ...formData, shop_type: e.target.value })
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
              placeholder="general_store, blacksmith, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">
              Haggle Willingness
            </label>
            <input
              type="text"
              value={formData.haggle_willingness}
              onChange={(e) =>
                setFormData({ ...formData, haggle_willingness: e.target.value })
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
              placeholder="Open, Reluctant, Never"
            />
          </div>
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
            placeholder="Describe the shop..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-muted mb-2">
            Owner Description
          </label>
          <textarea
            value={formData.owner_description}
            onChange={(e) =>
              setFormData({ ...formData, owner_description: e.target.value })
            }
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
            rows={3}
            placeholder="Describe the shopkeeper..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-muted mb-2">
            Special Notes
          </label>
          <textarea
            value={formData.special_notes}
            onChange={(e) =>
              setFormData({ ...formData, special_notes: e.target.value })
            }
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
            rows={3}
            placeholder="DM notes..."
          />
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
