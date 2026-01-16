import ContentListLayout from "../../../../common/ContentListLayout";
import { useGeneratorModalStore } from "../../../../../store/generatorModalStore";
import ContentCard from "../../../../common/ContentCard";
import ContentDetailModal from "../../../../common/ContentDetailModal";
import AssignCampaignModal from "../../../../common/AssignCampaignModal";
import { useLibraryContent } from "../../../../../hooks/useLibraryContent";
import { useCampaignStore } from "../../../../../store/campaignStore";
import { useState } from "react";
import { logger } from "@/utils/logger";
import { updateTavern, UpdateTavernRequest } from "../../../../../api/taverns";

interface Tavern {
  id: string;
  name: string;
  campaign_id?: string | null;
  type: string;
  atmosphere?: string;
  quality?: string;
  size?: string;
  description?: string;
  keeper_name?: string;
  keeper_personality?: string;
  keeper_description?: string;
  menu_food?: any;
  menu_drinks?: any;
  rooms?: any;
  patrons?: any;
  events?: any;
  rumors?: any;
  special_notes?: string;
  ai_generated?: boolean;
  created_at: string;
}

interface TavernsContentProps {
  campaignId?: string;
  showCampaignFilter?: boolean;
}

export default function TavernsContent({
  campaignId,
  showCampaignFilter,
}: TavernsContentProps) {
  const { openGenerator } = useGeneratorModalStore();
  const { campaigns } = useCampaignStore();
  const [assignModalItem, setAssignModalItem] = useState<{
    id: string;
    name: string;
    currentCampaignId?: string | null;
  } | null>(null);
  const [editingTavern, setEditingTavern] = useState<Tavern | null>(null);

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
  } = useLibraryContent<Tavern>({
    contentType: "taverns",
    campaignId,
    showCampaignFilter,
    searchFields: ["name", "type", "atmosphere"],
  });

  const handleDelete = async (tavern: Tavern) => {
    if (window.confirm(`Delete "${tavern.name}"? This cannot be undone.`)) {
      try {
        await deleteItem(tavern.id);
      } catch (err) {
        logger.error("Failed to delete tavern:", err);
      }
    }
  };

  const handleSave = async (id: string, updates: UpdateTavernRequest) => {
    try {
      await updateTavern(id, updates);
      await refresh();
      setEditingTavern(null);
      setViewingItem(null);
    } catch (err) {
      logger.error("Failed to update tavern:", err);
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
        searchPlaceholder="Search taverns..."
        addButtonLabel="Add Tavern"
        onAddClick={() => openGenerator("tavern")}
        addButtonColor="yellow"
        loading={loading}
        error={error}
        emptyIcon="Beer"
        emptyTitle="No taverns yet"
        emptyDescription="Create inns, pubs, and gathering places."
        emptyCTALabel="Create Your First Tavern"
        onEmptyCTAClick={() => openGenerator("tavern")}
        hasItems={filteredItems.length > 0}
      >
        <div className="space-y-3">
          {filteredItems.map((tavern) => (
            <ContentCard
              key={tavern.id}
              title={tavern.name}
              preview={tavern.atmosphere || undefined}
              icon="Beer"
              iconColor="yellow"
              date={tavern.created_at}
              badges={[
                { label: tavern.type },
                ...(tavern.quality ? [{ label: tavern.quality }] : []),
                ...(tavern.size ? [{ label: tavern.size }] : []),
              ]}
              onClick={() => setViewingItem(tavern)}
              onDelete={() => handleDelete(tavern)}
              onAssign={() =>
                setAssignModalItem({
                  id: tavern.id,
                  name: tavern.name,
                  currentCampaignId: tavern.campaign_id,
                })
              }
            />
          ))}
        </div>
      </ContentListLayout>

      {viewingItem && !editingTavern && (
        <TavernDetailModal
          tavern={viewingItem}
          onClose={() => setViewingItem(null)}
          onDelete={() => handleDelete(viewingItem)}
          onEdit={() => setEditingTavern(viewingItem)}
        />
      )}

      {editingTavern && (
        <EditTavernModal
          tavern={editingTavern}
          onClose={() => {
            setEditingTavern(null);
            setViewingItem(null);
          }}
          onSave={handleSave}
        />
      )}

      {assignModalItem && (
        <AssignCampaignModal
          isOpen={true}
          onClose={() => setAssignModalItem(null)}
          contentType="taverns"
          contentId={assignModalItem.id}
          contentName={assignModalItem.name}
          currentCampaignId={assignModalItem.currentCampaignId}
          onSuccess={refresh}
        />
      )}
    </div>
  );
}

interface TavernDetailModalProps {
  tavern: Tavern;
  onClose: () => void;
  onDelete: () => void;
  onEdit: () => void;
}

function TavernDetailModal({
  tavern,
  onClose,
  onDelete,
  onEdit,
}: TavernDetailModalProps) {
  let menuFood: any[] = [];
  let menuDrinks: any[] = [];
  let rooms: any[] = [];
  let patrons: any[] = [];
  let events: any[] = [];
  let rumors: any[] = [];

  try {
    menuFood = tavern.menu_food
      ? typeof tavern.menu_food === "string"
        ? JSON.parse(tavern.menu_food)
        : tavern.menu_food
      : [];
    menuDrinks = tavern.menu_drinks
      ? typeof tavern.menu_drinks === "string"
        ? JSON.parse(tavern.menu_drinks)
        : tavern.menu_drinks
      : [];
    rooms = tavern.rooms
      ? typeof tavern.rooms === "string"
        ? JSON.parse(tavern.rooms)
        : tavern.rooms
      : [];
    patrons = tavern.patrons
      ? typeof tavern.patrons === "string"
        ? JSON.parse(tavern.patrons)
        : tavern.patrons
      : [];
    events = tavern.events
      ? typeof tavern.events === "string"
        ? JSON.parse(tavern.events)
        : tavern.events
      : [];
    rumors = tavern.rumors
      ? typeof tavern.rumors === "string"
        ? JSON.parse(tavern.rumors)
        : tavern.rumors
      : [];
  } catch (err) {
    logger.error("Failed to parse tavern data:", err);
  }

  return (
    <ContentDetailModal
      isOpen={true}
      onClose={onClose}
      icon="Beer"
      iconColor="yellow"
      title={tavern.name}
      subtitle={tavern.type}
      onDelete={onDelete}
      onEdit={onEdit}
    >
      <div className="space-y-6">
        {tavern.description && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Description
            </h4>
            <p className="text-text leading-relaxed whitespace-pre-wrap">
              {tavern.description}
            </p>
          </div>
        )}

        {tavern.atmosphere && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Atmosphere
            </h4>
            <p className="text-text leading-relaxed">{tavern.atmosphere}</p>
          </div>
        )}

        {(tavern.keeper_name ||
          tavern.keeper_personality ||
          tavern.keeper_description) && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Tavern Keeper
            </h4>
            <div className="bg-background p-4 rounded-lg border border-border space-y-2">
              {tavern.keeper_name && (
                <p className="text-text font-medium text-lg">
                  {tavern.keeper_name}
                </p>
              )}
              {tavern.keeper_personality && (
                <p className="text-amber-400 italic">
                  {tavern.keeper_personality}
                </p>
              )}
              {tavern.keeper_description && (
                <p className="text-text-muted">{tavern.keeper_description}</p>
              )}
            </div>
          </div>
        )}

        {menuFood.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Food Menu
            </h4>
            <div className="bg-background p-4 rounded-lg border border-border">
              <ul className="space-y-2">
                {menuFood.map((item: any, i: number) => (
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

        {menuDrinks.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Drink Menu
            </h4>
            <div className="bg-background p-4 rounded-lg border border-border">
              <ul className="space-y-2">
                {menuDrinks.map((item: any, i: number) => (
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

        {rooms.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Accommodations
            </h4>
            <div className="space-y-2">
              {rooms.map((room: any, i: number) => (
                <div
                  key={i}
                  className="bg-background p-3 rounded-lg border border-border"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <p className="text-text font-medium">
                        {room.type || room.name || "Room"}
                      </p>
                      {room.description && (
                        <p className="text-text-muted text-sm mt-1">
                          {room.description}
                        </p>
                      )}
                      {room.available && (
                        <p className="text-text-muted text-xs mt-1">
                          Available: {room.available}
                        </p>
                      )}
                    </div>
                    {room.price && (
                      <span className="text-amber-400 whitespace-nowrap">
                        {room.price}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {patrons.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Current Patrons
            </h4>
            <div className="space-y-2">
              {patrons.map((patron: any, i: number) => (
                <div
                  key={i}
                  className="bg-background p-3 rounded-lg border border-border"
                >
                  <p className="text-text font-medium">
                    {patron.name || patron}
                    {patron.race && (
                      <span className="text-text-muted text-sm ml-2">
                        ({patron.race})
                      </span>
                    )}
                  </p>
                  {patron.description && (
                    <p className="text-text-muted text-sm mt-1">
                      {patron.description}
                    </p>
                  )}
                  {patron.hook && (
                    <p className="text-amber-400 text-sm mt-1 italic">
                      Hook: {patron.hook}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {events.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Current Events
            </h4>
            <ul className="space-y-2">
              {events.map((event: any, i: number) => (
                <li
                  key={i}
                  className="text-text bg-background p-3 rounded-lg border border-border"
                >
                  {typeof event === "string"
                    ? event
                    : event.description || event.name}
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

        {tavern.special_notes && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Special Notes
            </h4>
            <p className="text-text leading-relaxed whitespace-pre-wrap bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg">
              {tavern.special_notes}
            </p>
          </div>
        )}
      </div>
    </ContentDetailModal>
  );
}

interface EditTavernModalProps {
  tavern: Tavern;
  onClose: () => void;
  onSave: (id: string, updates: UpdateTavernRequest) => Promise<void>;
}

function EditTavernModal({ tavern, onClose, onSave }: EditTavernModalProps) {
  const [formData, setFormData] = useState({
    name: tavern.name,
    type: tavern.type,
    atmosphere: tavern.atmosphere || "",
    quality: tavern.quality || "",
    size: tavern.size || "",
    description: tavern.description || "",
    keeper_name: tavern.keeper_name || "",
    keeper_personality: tavern.keeper_personality || "",
    keeper_description: tavern.keeper_description || "",
    special_notes: tavern.special_notes || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const updates: UpdateTavernRequest = {
        name: formData.name,
        description: formData.description || undefined,
        quality: formData.quality || undefined,
        size: formData.size || undefined,
        dm_notes: formData.special_notes || undefined,
      };

      await onSave(tavern.id, updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save tavern");
      setSaving(false);
    }
  };

  return (
    <ContentDetailModal
      isOpen={true}
      onClose={onClose}
      icon="Beer"
      iconColor="yellow"
      title="Edit Tavern"
      subtitle={tavern.name}
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
              Quality
            </label>
            <input
              type="text"
              value={formData.quality}
              onChange={(e) =>
                setFormData({ ...formData, quality: e.target.value })
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
              placeholder="Modest, Comfortable, Wealthy"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">
              Size
            </label>
            <input
              type="text"
              value={formData.size}
              onChange={(e) =>
                setFormData({ ...formData, size: e.target.value })
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
              placeholder="Small, Medium, Large"
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
            placeholder="Describe the tavern..."
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
