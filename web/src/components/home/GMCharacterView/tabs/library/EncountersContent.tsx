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
  updateEncounter,
  UpdateEncounterRequest,
} from "../../../../../api/encounters";

interface Encounter {
  id: string;
  name?: string;
  campaign_id?: string | null;
  encounter_type?: string;
  difficulty: string;
  party_level: number;
  party_size: number;
  description?: string;
  environment?: any;
  creatures?: any;
  treasure?: any;
  special_conditions?: string;
  xp_total?: number;
  xp_per_player?: number;
  notes?: string;
  ai_generated?: boolean;
  created_at: string;
}

interface EncountersContentProps {
  campaignId?: string;
  showCampaignFilter?: boolean;
}

const difficultyColors: Record<string, { bg: string; text: string }> = {
  easy: { bg: "bg-green-500/10", text: "text-green-400" },
  medium: { bg: "bg-yellow-500/10", text: "text-yellow-400" },
  hard: { bg: "bg-orange-500/10", text: "text-orange-400" },
  deadly: { bg: "bg-red-500/10", text: "text-red-400" },
};

export default function EncountersContent({
  campaignId,
  showCampaignFilter,
}: EncountersContentProps) {
  const { openGenerator } = useGeneratorModalStore();
  const { campaigns } = useCampaignStore();
  const [assignModalItem, setAssignModalItem] = useState<{
    id: string;
    name: string;
    currentCampaignId?: string | null;
  } | null>(null);
  const [editingItem, setEditingItem] = useState<Encounter | null>(null);

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
  } = useLibraryContent<Encounter>({
    contentType: "encounters",
    campaignId,
    showCampaignFilter,
    searchFields: ["name", "description", "difficulty"],
  });

  const handleDelete = async (encounter: Encounter) => {
    const name = encounter.name || `${encounter.difficulty} Encounter`;
    if (window.confirm(`Delete "${name}"? This cannot be undone.`)) {
      try {
        await deleteItem(encounter.id);
      } catch (err) {
        logger.error("Failed to delete encounter:", err);
      }
    }
  };

  const handleSave = async (id: string, updates: UpdateEncounterRequest) => {
    try {
      await updateEncounter(id, updates);
      await refresh();
      setEditingItem(null);
      setViewingItem(null);
    } catch (err) {
      logger.error("Failed to update encounter:", err);
      throw err;
    }
  };

  const getDisplayName = (encounter: Encounter) =>
    encounter.name || `${encounter.difficulty} Encounter`;

  return (
    <div className="space-y-4">
      {/* Campaign Filter */}
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
        searchPlaceholder="Search encounters..."
        addButtonLabel="Add Encounter"
        onAddClick={() => openGenerator("encounter")}
        addButtonColor="red"
        loading={loading}
        error={error}
        emptyIcon="Swords"
        emptyTitle="No encounters yet"
        emptyDescription="Create combat encounters for your campaign."
        emptyCTALabel="Create Your First Encounter"
        onEmptyCTAClick={() => openGenerator("encounter")}
        hasItems={filteredItems.length > 0}
      >
        <div className="space-y-3">
          {filteredItems.map((encounter) => {
            const diffColor =
              difficultyColors[encounter.difficulty] || difficultyColors.medium;
            return (
              <ContentCard
                key={encounter.id}
                title={getDisplayName(encounter)}
                preview={`Party: ${encounter.party_size} (Lvl ${encounter.party_level})`}
                icon="Swords"
                iconColor="red"
                date={encounter.created_at}
                badges={[
                  {
                    label: encounter.difficulty,
                    color: diffColor.text,
                    bgColor: diffColor.bg,
                  },
                  ...(encounter.xp_total
                    ? [
                        {
                          label: `${encounter.xp_total} XP`,
                          color: "text-amber-400",
                          bgColor: "bg-amber-500/10",
                        },
                      ]
                    : []),
                ]}
                onClick={() => setViewingItem(encounter)}
                onDelete={() => handleDelete(encounter)}
                onAssign={() =>
                  setAssignModalItem({
                    id: encounter.id,
                    name: getDisplayName(encounter),
                    currentCampaignId: encounter.campaign_id,
                  })
                }
              />
            );
          })}
        </div>
      </ContentListLayout>

      {/* Detail Modal */}
      {viewingItem && !editingItem && (
        <EncounterDetailModal
          encounter={viewingItem}
          onClose={() => setViewingItem(null)}
          onDelete={() => handleDelete(viewingItem)}
          onEdit={() => setEditingItem(viewingItem)}
        />
      )}

      {/* Edit Modal */}
      {editingItem && (
        <EditEncounterModal
          encounter={editingItem}
          onClose={() => {
            setEditingItem(null);
            setViewingItem(null);
          }}
          onSave={handleSave}
        />
      )}

      {/* Assign Campaign Modal */}
      {assignModalItem && (
        <AssignCampaignModal
          isOpen={true}
          onClose={() => setAssignModalItem(null)}
          contentType="encounters"
          contentId={assignModalItem.id}
          contentName={assignModalItem.name}
          currentCampaignId={assignModalItem.currentCampaignId}
          onSuccess={refresh}
        />
      )}
    </div>
  );
}

// Encounter Detail Modal
interface EncounterDetailModalProps {
  encounter: Encounter;
  onClose: () => void;
  onDelete: () => void;
  onEdit: () => void;
}

function EncounterDetailModal({
  encounter,
  onClose,
  onDelete,
  onEdit,
}: EncounterDetailModalProps) {
  const name = encounter.name || `${encounter.difficulty} Encounter`;
  const diffColor =
    difficultyColors[encounter.difficulty] || difficultyColors.medium;

  let creatures: any[] = [];
  let environment: any = null;
  let treasure: any = null;

  try {
    creatures = encounter.creatures
      ? typeof encounter.creatures === "string"
        ? JSON.parse(encounter.creatures)
        : encounter.creatures
      : [];
    environment = encounter.environment
      ? typeof encounter.environment === "string"
        ? JSON.parse(encounter.environment)
        : encounter.environment
      : null;
    treasure = encounter.treasure
      ? typeof encounter.treasure === "string"
        ? JSON.parse(encounter.treasure)
        : encounter.treasure
      : null;
  } catch (err) {
    logger.error("Failed to parse encounter data:", err);
  }

  return (
    <ContentDetailModal
      isOpen={true}
      onClose={onClose}
      icon="Swords"
      iconColor="red"
      title={name}
      subtitle={`Party: ${encounter.party_size} at Level ${encounter.party_level}`}
      onDelete={onDelete}
      onEdit={onEdit}
    >
      <div className="space-y-6">
        {/* Stats Row */}
        <div className="flex flex-wrap gap-3">
          <div
            className={`px-4 py-2 ${diffColor.bg} border border-red-500/30 rounded-lg`}
          >
            <p className="text-xs text-text-muted">Difficulty</p>
            <p className={`text-lg font-semibold ${diffColor.text} capitalize`}>
              {encounter.difficulty}
            </p>
          </div>
          {encounter.xp_total && (
            <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-xs text-text-muted">Total XP</p>
              <p className="text-lg font-semibold text-amber-400">
                {encounter.xp_total}
              </p>
            </div>
          )}
          {encounter.xp_per_player && (
            <div className="px-4 py-2 bg-background border border-border rounded-lg">
              <p className="text-xs text-text-muted">XP Per Player</p>
              <p className="text-lg font-semibold text-text">
                {encounter.xp_per_player}
              </p>
            </div>
          )}
        </div>

        {/* Description */}
        {encounter.description && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Description
            </h4>
            <p className="text-text leading-relaxed whitespace-pre-wrap">
              {encounter.description}
            </p>
          </div>
        )}

        {/* Environment */}
        {environment && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Environment
            </h4>
            <div className="bg-background p-4 rounded-lg border border-border">
              {environment.terrain && (
                <p className="text-text">
                  <span className="text-text-muted">Terrain:</span>{" "}
                  {environment.terrain}
                </p>
              )}
              {environment.lighting && (
                <p className="text-text">
                  <span className="text-text-muted">Lighting:</span>{" "}
                  {environment.lighting}
                </p>
              )}
              {environment.hazards && environment.hazards.length > 0 && (
                <div className="mt-2">
                  <span className="text-text-muted">Hazards:</span>
                  <ul className="list-disc list-inside text-text mt-1">
                    {environment.hazards.map((h: string, i: number) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Creatures */}
        {creatures.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Creatures
            </h4>
            <div className="space-y-2">
              {creatures.map((creature: any, i: number) => (
                <div
                  key={i}
                  className="bg-background p-3 rounded-lg border border-border flex justify-between items-center"
                >
                  <span className="text-text font-medium">{creature.name}</span>
                  <div className="flex gap-2">
                    {creature.count && (
                      <span className="px-2 py-1 bg-red-500/10 text-red-400 rounded text-xs">
                        x{creature.count}
                      </span>
                    )}
                    {creature.cr && (
                      <span className="px-2 py-1 bg-orange-500/10 text-orange-400 rounded text-xs">
                        CR {creature.cr}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Treasure */}
        {treasure && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Treasure
            </h4>
            <div className="bg-background p-4 rounded-lg border border-border">
              {treasure.gold && (
                <p className="text-amber-400 font-semibold">
                  {treasure.gold} gold pieces
                </p>
              )}
              {treasure.items && treasure.items.length > 0 && (
                <ul className="list-disc list-inside text-text mt-2">
                  {treasure.items.map((item: string, i: number) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {encounter.notes && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Notes
            </h4>
            <p className="text-text leading-relaxed whitespace-pre-wrap">
              {encounter.notes}
            </p>
          </div>
        )}
      </div>
    </ContentDetailModal>
  );
}

interface EditEncounterModalProps {
  encounter: Encounter;
  onClose: () => void;
  onSave: (id: string, updates: UpdateEncounterRequest) => Promise<void>;
}

function EditEncounterModal({
  encounter,
  onClose,
  onSave,
}: EditEncounterModalProps) {
  const [formData, setFormData] = useState({
    name: encounter.name || "",
    encounter_type: encounter.encounter_type || "",
    difficulty: encounter.difficulty,
    environment: encounter.environment || "",
    description: encounter.description || "",
    special_conditions: encounter.special_conditions || "",
    notes: encounter.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const updates: UpdateEncounterRequest = {
        name: formData.name || undefined,
        encounter_type: formData.encounter_type || undefined,
        difficulty: formData.difficulty,
        environment: formData.environment || undefined,
        description: formData.description || undefined,
        special_conditions: formData.special_conditions || undefined,
        dm_notes: formData.notes || undefined,
      };

      await onSave(encounter.id, updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save encounter");
      setSaving(false);
    }
  };

  return (
    <ContentDetailModal
      isOpen={true}
      onClose={onClose}
      icon="Swords"
      iconColor="red"
      title="Edit Encounter"
      subtitle={encounter.name || `${encounter.difficulty} Encounter`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-text-muted mb-2">
            Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
            placeholder="Encounter name..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">
              Encounter Type
            </label>
            <input
              type="text"
              value={formData.encounter_type}
              onChange={(e) =>
                setFormData({ ...formData, encounter_type: e.target.value })
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
              placeholder="Combat, Social, Exploration..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">
              Difficulty *
            </label>
            <select
              value={formData.difficulty}
              onChange={(e) =>
                setFormData({ ...formData, difficulty: e.target.value })
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
              required
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="deadly">Deadly</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-muted mb-2">
            Environment
          </label>
          <input
            type="text"
            value={formData.environment}
            onChange={(e) =>
              setFormData({ ...formData, environment: e.target.value })
            }
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
            placeholder="Forest, Dungeon, City..."
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
            rows={4}
            placeholder="Describe the encounter..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-muted mb-2">
            Special Conditions
          </label>
          <input
            type="text"
            value={formData.special_conditions}
            onChange={(e) =>
              setFormData({ ...formData, special_conditions: e.target.value })
            }
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
            placeholder="Environmental effects, time limits..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-muted mb-2">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
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
