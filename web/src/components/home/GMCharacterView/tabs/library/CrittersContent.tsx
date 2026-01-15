import ContentListLayout from "../../../../common/ContentListLayout";
import { useGeneratorModalStore } from "../../../../../store/generatorModalStore";
import ContentCard from "../../../../common/ContentCard";
import ContentDetailModal from "../../../../common/ContentDetailModal";
import AssignCampaignModal from "../../../../common/AssignCampaignModal";
import { useLibraryContent } from "../../../../../hooks/useLibraryContent";
import { useCampaignStore } from "../../../../../store/campaignStore";
import { useState } from "react";
import { logger } from "@/utils/logger";

interface Critter {
  id: string;
  name: string;
  campaign_id?: string | null;
  species?: string;
  critter_type: string;
  size: string;
  temperament?: string;
  habitat?: string;
  description?: string;
  behavior?: string;
  stats?: any;
  special_abilities?: any;
  uses?: any;
  training_difficulty?: string;
  diet?: string;
  lifespan?: string;
  interesting_facts?: any;
  encounter_notes?: string;
  ai_generated?: boolean;
  created_at: string;
}

interface CrittersContentProps {
  campaignId?: string;
  showCampaignFilter?: boolean;
}

export default function CrittersContent({
  campaignId,
  showCampaignFilter,
}: CrittersContentProps) {
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
  } = useLibraryContent<Critter>({
    contentType: "critters",
    campaignId,
    showCampaignFilter,
    searchFields: ["name", "species", "critter_type", "description"],
  });

  const handleDelete = async (critter: Critter) => {
    if (window.confirm(`Delete "${critter.name}"? This cannot be undone.`)) {
      try {
        await deleteItem(critter.id);
      } catch (err) {
        logger.error("Failed to delete critter:", err);
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
        searchPlaceholder="Search critters..."
        addButtonLabel="Add Critter"
        onAddClick={() => openGenerator("critter")}
        addButtonColor="green"
        loading={loading}
        error={error}
        emptyIcon="PawPrint"
        emptyTitle="No critters yet"
        emptyDescription="Create companion animals and wildlife."
        emptyCTALabel="Create Your First Critter"
        onEmptyCTAClick={() => openGenerator("critter")}
        hasItems={filteredItems.length > 0}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((critter) => (
            <ContentCard
              key={critter.id}
              title={critter.name}
              preview={critter.species || critter.description || undefined}
              icon="PawPrint"
              iconColor="green"
              layout="grid"
              badges={[
                { label: critter.critter_type.replace(/_/g, " ") },
                {
                  label: critter.size,
                  color: "text-blue-400",
                  bgColor: "bg-blue-500/10",
                },
                ...(critter.temperament
                  ? [
                      {
                        label: critter.temperament,
                        color: "text-purple-400",
                        bgColor: "bg-purple-500/10",
                      },
                    ]
                  : []),
              ]}
              onClick={() => setViewingItem(critter)}
              onDelete={() => handleDelete(critter)}
              onAssign={() =>
                setAssignModalItem({
                  id: critter.id,
                  name: critter.name,
                  currentCampaignId: critter.campaign_id,
                })
              }
            />
          ))}
        </div>
      </ContentListLayout>

      {viewingItem && (
        <CritterDetailModal
          critter={viewingItem}
          onClose={() => setViewingItem(null)}
          onDelete={() => handleDelete(viewingItem)}
        />
      )}

      {assignModalItem && (
        <AssignCampaignModal
          isOpen={true}
          onClose={() => setAssignModalItem(null)}
          contentType="critters"
          contentId={assignModalItem.id}
          contentName={assignModalItem.name}
          currentCampaignId={assignModalItem.currentCampaignId}
          onSuccess={refresh}
        />
      )}
    </div>
  );
}

interface CritterDetailModalProps {
  critter: Critter;
  onClose: () => void;
  onDelete: () => void;
}

function CritterDetailModal({
  critter,
  onClose,
  onDelete,
}: CritterDetailModalProps) {
  let specialAbilities: any[] = [];
  let uses: any[] = [];
  let interestingFacts: any[] = [];

  try {
    specialAbilities = critter.special_abilities
      ? typeof critter.special_abilities === "string"
        ? JSON.parse(critter.special_abilities)
        : critter.special_abilities
      : [];
    uses = critter.uses
      ? typeof critter.uses === "string"
        ? JSON.parse(critter.uses)
        : critter.uses
      : [];
    interestingFacts = critter.interesting_facts
      ? typeof critter.interesting_facts === "string"
        ? JSON.parse(critter.interesting_facts)
        : critter.interesting_facts
      : [];
  } catch (err) {
    logger.error("Failed to parse critter data:", err);
  }

  return (
    <ContentDetailModal
      isOpen={true}
      onClose={onClose}
      icon="PawPrint"
      iconColor="green"
      title={critter.name}
      subtitle={critter.species || critter.critter_type.replace(/_/g, " ")}
      onDelete={onDelete}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-3">
          <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-xs text-text-muted">Size</p>
            <p className="text-lg font-semibold text-blue-400 capitalize">
              {critter.size}
            </p>
          </div>
          {critter.temperament && (
            <div className="px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <p className="text-xs text-text-muted">Temperament</p>
              <p className="text-lg font-semibold text-purple-400 capitalize">
                {critter.temperament}
              </p>
            </div>
          )}
          {critter.habitat && (
            <div className="px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-xs text-text-muted">Habitat</p>
              <p className="text-lg font-semibold text-green-400 capitalize">
                {critter.habitat}
              </p>
            </div>
          )}
        </div>

        {critter.description && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Description
            </h4>
            <p className="text-text leading-relaxed">{critter.description}</p>
          </div>
        )}

        {critter.behavior && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Behavior
            </h4>
            <p className="text-text leading-relaxed">{critter.behavior}</p>
          </div>
        )}

        {specialAbilities.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Special Abilities
            </h4>
            <ul className="list-disc list-inside text-text space-y-1">
              {specialAbilities.map((a: any, i: number) => (
                <li key={i}>
                  {typeof a === "string" ? a : a.name || a.description}
                </li>
              ))}
            </ul>
          </div>
        )}

        {uses.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Uses
            </h4>
            <ul className="list-disc list-inside text-text space-y-1">
              {uses.map((u: any, i: number) => (
                <li key={i}>{typeof u === "string" ? u : u.description}</li>
              ))}
            </ul>
          </div>
        )}

        {(critter.diet || critter.lifespan || critter.training_difficulty) && (
          <div className="grid grid-cols-3 gap-4">
            {critter.diet && (
              <div className="bg-background p-3 rounded-lg border border-border">
                <p className="text-xs text-text-muted">Diet</p>
                <p className="text-text capitalize">{critter.diet}</p>
              </div>
            )}
            {critter.lifespan && (
              <div className="bg-background p-3 rounded-lg border border-border">
                <p className="text-xs text-text-muted">Lifespan</p>
                <p className="text-text">{critter.lifespan}</p>
              </div>
            )}
            {critter.training_difficulty && (
              <div className="bg-background p-3 rounded-lg border border-border">
                <p className="text-xs text-text-muted">Training</p>
                <p className="text-text capitalize">
                  {critter.training_difficulty}
                </p>
              </div>
            )}
          </div>
        )}

        {interestingFacts.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Interesting Facts
            </h4>
            <ul className="list-disc list-inside text-text space-y-1">
              {interestingFacts.map((f: any, i: number) => (
                <li key={i}>{typeof f === "string" ? f : f}</li>
              ))}
            </ul>
          </div>
        )}

        {critter.encounter_notes && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Encounter Notes
            </h4>
            <p className="text-text leading-relaxed whitespace-pre-wrap">
              {critter.encounter_notes}
            </p>
          </div>
        )}
      </div>
    </ContentDetailModal>
  );
}
