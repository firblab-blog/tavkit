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
  updateLocation,
  UpdateLocationRequest,
} from "../../../../../api/locations";

interface Location {
  id: string;
  name: string;
  campaign_id?: string | null;
  type: string;
  theme?: string;
  description?: string;
  features?: any;
  secrets?: any;
  factions?: any;
  npcs?: any;
  encounters?: any;
  treasure?: any;
  map?: string;
  ai_generated?: boolean;
  created_at: string;
}

interface LocationsContentProps {
  campaignId?: string;
  showCampaignFilter?: boolean;
}

export default function LocationsContent({
  campaignId,
  showCampaignFilter,
}: LocationsContentProps) {
  const { openGenerator } = useGeneratorModalStore();
  const { campaigns } = useCampaignStore();
  const [assignModalItem, setAssignModalItem] = useState<{
    id: string;
    name: string;
    currentCampaignId?: string | null;
  } | null>(null);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

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
  } = useLibraryContent<Location>({
    contentType: "locations",
    campaignId,
    showCampaignFilter,
    searchFields: ["name", "type", "description", "theme"],
  });

  const handleDelete = async (location: Location) => {
    if (window.confirm(`Delete "${location.name}"? This cannot be undone.`)) {
      try {
        await deleteItem(location.id);
      } catch (err) {
        logger.error("Failed to delete location:", err);
      }
    }
  };

  const handleSave = async (id: string, updates: UpdateLocationRequest) => {
    try {
      await updateLocation(id, updates);
      await refresh();
      setEditingLocation(null);
      setViewingItem(null);
    } catch (err) {
      logger.error("Failed to update location:", err);
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
        searchPlaceholder="Search locations..."
        addButtonLabel="Add Location"
        onAddClick={() => openGenerator("location")}
        addButtonColor="cyan"
        loading={loading}
        error={error}
        emptyIcon="MapPin"
        emptyTitle="No locations yet"
        emptyDescription="Create towns, dungeons, and points of interest."
        emptyCTALabel="Create Your First Location"
        onEmptyCTAClick={() => openGenerator("location")}
        hasItems={filteredItems.length > 0}
      >
        <div className="space-y-3">
          {filteredItems.map((location) => (
            <ContentCard
              key={location.id}
              title={location.name}
              preview={location.description || undefined}
              icon="MapPin"
              iconColor="cyan"
              date={location.created_at}
              badges={[
                { label: location.type },
                ...(location.theme ? [{ label: location.theme }] : []),
              ]}
              onClick={() => setViewingItem(location)}
              onDelete={() => handleDelete(location)}
              onAssign={() =>
                setAssignModalItem({
                  id: location.id,
                  name: location.name,
                  currentCampaignId: location.campaign_id,
                })
              }
            />
          ))}
        </div>
      </ContentListLayout>

      {viewingItem && !editingLocation && (
        <LocationDetailModal
          location={viewingItem}
          onClose={() => setViewingItem(null)}
          onDelete={() => handleDelete(viewingItem)}
          onEdit={() => setEditingLocation(viewingItem)}
        />
      )}

      {editingLocation && (
        <EditLocationModal
          location={editingLocation}
          onClose={() => {
            setEditingLocation(null);
            setViewingItem(null);
          }}
          onSave={handleSave}
        />
      )}

      {assignModalItem && (
        <AssignCampaignModal
          isOpen={true}
          onClose={() => setAssignModalItem(null)}
          contentType="locations"
          contentId={assignModalItem.id}
          contentName={assignModalItem.name}
          currentCampaignId={assignModalItem.currentCampaignId}
          onSuccess={refresh}
        />
      )}
    </div>
  );
}

interface LocationDetailModalProps {
  location: Location;
  onClose: () => void;
  onDelete: () => void;
  onEdit: () => void;
}

function LocationDetailModal({
  location,
  onClose,
  onDelete,
  onEdit,
}: LocationDetailModalProps) {
  let features: any[] = [];
  let secrets: any[] = [];
  let factions: any[] = [];
  let npcs: any[] = [];
  let encounters: any[] = [];
  let treasure: any[] = [];

  try {
    features = location.features
      ? typeof location.features === "string"
        ? JSON.parse(location.features)
        : location.features
      : [];
    secrets = location.secrets
      ? typeof location.secrets === "string"
        ? JSON.parse(location.secrets)
        : location.secrets
      : [];
    factions = location.factions
      ? typeof location.factions === "string"
        ? JSON.parse(location.factions)
        : location.factions
      : [];
    npcs = location.npcs
      ? typeof location.npcs === "string"
        ? JSON.parse(location.npcs)
        : location.npcs
      : [];
    encounters = location.encounters
      ? typeof location.encounters === "string"
        ? JSON.parse(location.encounters)
        : location.encounters
      : [];
    treasure = location.treasure
      ? typeof location.treasure === "string"
        ? JSON.parse(location.treasure)
        : location.treasure
      : [];
  } catch (err) {
    logger.error("Failed to parse location data:", err);
  }

  return (
    <ContentDetailModal
      isOpen={true}
      onClose={onClose}
      icon="MapPin"
      iconColor="cyan"
      title={location.name}
      subtitle={[location.type, location.theme].filter(Boolean).join(" • ")}
      onDelete={onDelete}
      onEdit={onEdit}
    >
      <div className="space-y-6">
        {location.description && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Description
            </h4>
            <p className="text-text leading-relaxed whitespace-pre-wrap">
              {location.description}
            </p>
          </div>
        )}

        {features.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Notable Features
            </h4>
            <ul className="list-disc list-inside text-text space-y-1">
              {features.map((f: any, i: number) => (
                <li key={i}>
                  {typeof f === "string" ? f : f.name || f.description}
                </li>
              ))}
            </ul>
          </div>
        )}

        {secrets.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Hidden Secrets
            </h4>
            <div className="space-y-2">
              {secrets.map((s: any, i: number) => (
                <div
                  key={i}
                  className="bg-purple-500/10 p-3 rounded-lg border border-purple-500/30"
                >
                  <p className="text-purple-400">
                    {typeof s === "string" ? s : s.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {npcs.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              NPCs Present
            </h4>
            <div className="space-y-2">
              {npcs.map((npc: any, i: number) => (
                <div
                  key={i}
                  className="bg-background p-3 rounded-lg border border-border flex justify-between items-center"
                >
                  <span className="text-text font-medium">
                    {typeof npc === "string" ? npc : npc.name}
                  </span>
                  {npc.role && (
                    <span className="text-text-muted text-sm">{npc.role}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {factions.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Factions Present
            </h4>
            <div className="flex flex-wrap gap-2">
              {factions.map((faction: any, i: number) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-full text-sm"
                >
                  {typeof faction === "string" ? faction : faction.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {encounters.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Potential Encounters
            </h4>
            <ul className="space-y-2">
              {encounters.map((enc: any, i: number) => (
                <li
                  key={i}
                  className="text-text bg-background p-3 rounded-lg border border-border"
                >
                  {typeof enc === "string" ? enc : enc.description || enc.name}
                </li>
              ))}
            </ul>
          </div>
        )}

        {treasure.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Treasure
            </h4>
            <div className="space-y-2">
              {treasure.map((t: any, i: number) => (
                <div
                  key={i}
                  className="bg-amber-500/10 p-3 rounded-lg border border-amber-500/30"
                >
                  <p className="text-amber-400">
                    {typeof t === "string"
                      ? t
                      : `${t.name || t.item}${t.quantity ? ` (${t.quantity})` : ""}${t.found ? " - Found" : ""}`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {location.map && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Map
            </h4>
            <img
              src={location.map}
              alt={`Map of ${location.name}`}
              className="w-full rounded-lg border border-border"
            />
          </div>
        )}
      </div>
    </ContentDetailModal>
  );
}

interface EditLocationModalProps {
  location: Location;
  onClose: () => void;
  onSave: (id: string, updates: UpdateLocationRequest) => Promise<void>;
}

function EditLocationModal({
  location,
  onClose,
  onSave,
}: EditLocationModalProps) {
  const [formData, setFormData] = useState({
    name: location.name,
    type: location.type,
    theme: location.theme || "",
    description: location.description || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const updates: UpdateLocationRequest = {
        name: formData.name,
        location_type: formData.type,
        description: formData.description || undefined,
      };

      await onSave(location.id, updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save location");
      setSaving(false);
    }
  };

  return (
    <ContentDetailModal
      isOpen={true}
      onClose={onClose}
      icon="MapPin"
      iconColor="cyan"
      title="Edit Location"
      subtitle={location.name}
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
          <input
            type="text"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
            placeholder="Town, Dungeon, Forest, etc."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-muted mb-2">
            Theme
          </label>
          <input
            type="text"
            value={formData.theme}
            onChange={(e) =>
              setFormData({ ...formData, theme: e.target.value })
            }
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
            placeholder="Gothic, Tropical, Ancient..."
          />
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
            rows={5}
            placeholder="Describe the location..."
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
