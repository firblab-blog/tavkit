import ContentListLayout from "../../../../common/ContentListLayout";
import { useGeneratorModalStore } from "../../../../../store/generatorModalStore";
import ContentCard from "../../../../common/ContentCard";
import ContentDetailModal from "../../../../common/ContentDetailModal";
import AssignCampaignModal from "../../../../common/AssignCampaignModal";
import { useLibraryContent } from "../../../../../hooks/useLibraryContent";
import { useCampaignStore } from "../../../../../store/campaignStore";
import { useState } from "react";
import { logger } from "@/utils/logger";

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

      {viewingItem && (
        <LocationDetailModal
          location={viewingItem}
          onClose={() => setViewingItem(null)}
          onDelete={() => handleDelete(viewingItem)}
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
}

function LocationDetailModal({
  location,
  onClose,
  onDelete,
}: LocationDetailModalProps) {
  let features: any[] = [];
  let secrets: any[] = [];
  let npcs: any[] = [];

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
    npcs = location.npcs
      ? typeof location.npcs === "string"
        ? JSON.parse(location.npcs)
        : location.npcs
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
