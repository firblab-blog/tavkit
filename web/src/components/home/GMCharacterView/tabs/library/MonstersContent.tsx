import ReactMarkdown from "react-markdown";
import { useGeneratorModalStore } from "../../../../../store/generatorModalStore";
import ContentListLayout from "../../../../common/ContentListLayout";
import ContentCard from "../../../../common/ContentCard";
import ContentDetailModal from "../../../../common/ContentDetailModal";
import AssignCampaignModal from "../../../../common/AssignCampaignModal";
import { useLibraryContent } from "../../../../../hooks/useLibraryContent";
import { useCampaignStore } from "../../../../../store/campaignStore";
import { useState } from "react";
import { logger } from "@/utils/logger";
import {
  updateMonster,
  UpdateMonsterRequest,
} from "../../../../../api/monsters";

interface Monster {
  id: string;
  name: string;
  campaign_id?: string | null;
  cr: number | string;
  lore?: string;
  tactics?: string;
  stats?: any;
  ai_generated?: boolean;
  created_at: string;
}

interface MonstersContentProps {
  campaignId?: string;
  showCampaignFilter?: boolean;
}

export default function MonstersContent({
  campaignId,
  showCampaignFilter,
}: MonstersContentProps) {
  const { openGenerator } = useGeneratorModalStore();
  const { campaigns } = useCampaignStore();
  const [assignModalItem, setAssignModalItem] = useState<{
    id: string;
    name: string;
    currentCampaignId?: string | null;
  } | null>(null);
  const [editingMonster, setEditingMonster] = useState<Monster | null>(null);

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
  } = useLibraryContent<Monster>({
    contentType: "monsters",
    campaignId,
    showCampaignFilter,
    searchFields: ["name", "lore"],
  });

  const handleDelete = async (monster: Monster) => {
    if (window.confirm(`Delete "${monster.name}"? This cannot be undone.`)) {
      try {
        await deleteItem(monster.id);
      } catch (err) {
        logger.error("Failed to delete monster:", err);
      }
    }
  };

  const handleSave = async (id: string, updates: UpdateMonsterRequest) => {
    try {
      await updateMonster(id, updates);
      await refresh();
      setEditingMonster(null);
      setViewingItem(null);
    } catch (err) {
      logger.error("Failed to update monster:", err);
      throw err;
    }
  };

  const getCRDisplay = (cr: number | string) => `CR ${cr}`;

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
        searchPlaceholder="Search monsters..."
        addButtonLabel="Add Monster"
        onAddClick={() => openGenerator("monster")}
        addButtonColor="orange"
        loading={loading}
        error={error}
        emptyIcon="Skull"
        emptyTitle="No monsters yet"
        emptyDescription="Add custom monsters, bosses, and creatures."
        emptyCTALabel="Create Your First Monster"
        onEmptyCTAClick={() => openGenerator("monster")}
        hasItems={filteredItems.length > 0}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((monster) => {
            // Parse stats for card display
            let stats: any = {};
            try {
              stats = monster.stats
                ? typeof monster.stats === "string"
                  ? JSON.parse(monster.stats)
                  : monster.stats
                : {};
            } catch (err) {
              logger.error("Failed to parse monster stats:", err);
            }

            return (
              <ContentCard
                key={monster.id}
                title={monster.name}
                preview={getCRDisplay(monster.cr)}
                icon="Skull"
                iconColor="orange"
                layout="grid"
                badges={[
                  ...(stats.type ? [{ label: stats.type }] : []),
                  ...(stats.size ? [{ label: stats.size }] : []),
                  ...(stats.hp
                    ? [
                        {
                          label: `HP ${stats.hp}`,
                          color: "text-orange-400",
                          bgColor: "bg-orange-500/10",
                        },
                      ]
                    : []),
                  ...(stats.ac
                    ? [
                        {
                          label: `AC ${stats.ac}`,
                          color: "text-blue-400",
                          bgColor: "bg-blue-500/10",
                        },
                      ]
                    : []),
                ]}
                onClick={() => setViewingItem(monster)}
                onDelete={() => handleDelete(monster)}
                onAssign={() =>
                  setAssignModalItem({
                    id: monster.id,
                    name: monster.name,
                    currentCampaignId: monster.campaign_id,
                  })
                }
              />
            );
          })}
        </div>
      </ContentListLayout>

      {/* Detail Modal */}
      {viewingItem && !editingMonster && (
        <MonsterDetailModal
          monster={viewingItem}
          onClose={() => setViewingItem(null)}
          onDelete={() => handleDelete(viewingItem)}
          onEdit={() => setEditingMonster(viewingItem)}
        />
      )}

      {/* Edit Modal */}
      {editingMonster && (
        <EditMonsterModal
          monster={editingMonster}
          onClose={() => {
            setEditingMonster(null);
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
          contentType="monsters"
          contentId={assignModalItem.id}
          contentName={assignModalItem.name}
          currentCampaignId={assignModalItem.currentCampaignId}
          onSuccess={refresh}
        />
      )}
    </div>
  );
}

// Monster Detail Modal
interface MonsterDetailModalProps {
  monster: Monster;
  onClose: () => void;
  onDelete: () => void;
  onEdit: () => void;
}

function MonsterDetailModal({
  monster,
  onClose,
  onDelete,
  onEdit,
}: MonsterDetailModalProps) {
  const getCRDisplay = (cr: number | string) => `CR ${cr}`;

  // Parse stats JSON
  let stats: any = {};
  try {
    stats = monster.stats
      ? typeof monster.stats === "string"
        ? JSON.parse(monster.stats)
        : monster.stats
      : {};
  } catch (err) {
    logger.error("Failed to parse monster stats:", err);
  }

  const subtitle = [getCRDisplay(monster.cr), stats.type]
    .filter(Boolean)
    .join(" • ");

  return (
    <ContentDetailModal
      isOpen={true}
      onClose={onClose}
      icon="Skull"
      iconColor="orange"
      title={monster.name}
      subtitle={subtitle || undefined}
      onDelete={onDelete}
      onEdit={onEdit}
    >
      <div className="space-y-6">
        {/* Stats Row */}
        <div className="flex flex-wrap gap-3">
          {stats.hp && (
            <div className="px-4 py-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <p className="text-xs text-text-muted">Hit Points</p>
              <p className="text-lg font-semibold text-orange-400">
                {stats.hp}
              </p>
            </div>
          )}
          {stats.ac && (
            <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-xs text-text-muted">Armor Class</p>
              <p className="text-lg font-semibold text-blue-400">{stats.ac}</p>
            </div>
          )}
          {stats.size && (
            <div className="px-4 py-2 bg-background border border-border rounded-lg">
              <p className="text-xs text-text-muted">Size</p>
              <p className="text-lg font-semibold text-text capitalize">
                {stats.size}
              </p>
            </div>
          )}
          {stats.type && (
            <div className="px-4 py-2 bg-background border border-border rounded-lg">
              <p className="text-xs text-text-muted">Type</p>
              <p className="text-lg font-semibold text-text capitalize">
                {stats.type}
              </p>
            </div>
          )}
          {stats.alignment && (
            <div className="px-4 py-2 bg-background border border-border rounded-lg">
              <p className="text-xs text-text-muted">Alignment</p>
              <p className="text-lg font-semibold text-text capitalize">
                {stats.alignment}
              </p>
            </div>
          )}
        </div>

        {/* Full Stats Block */}
        {stats.stats_block && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Statistics
            </h4>
            <div className="prose prose-invert prose-tavern max-w-none bg-background p-4 rounded-lg border border-border">
              <ReactMarkdown>
                {typeof stats.stats_block === "string"
                  ? stats.stats_block.replace(/\\n/g, "\n")
                  : JSON.stringify(stats.stats_block, null, 2)}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* Lore */}
        {monster.lore && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Lore
            </h4>
            <div className="prose prose-invert prose-tavern max-w-none">
              <ReactMarkdown>
                {monster.lore.replace(/\\n/g, "\n")}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* Speed and Senses */}
        {(stats.speed || stats.senses) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.speed && (
              <div>
                <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
                  Speed
                </h4>
                <p className="text-text">
                  {typeof stats.speed === "string"
                    ? stats.speed
                    : typeof stats.speed === "object"
                      ? Object.entries(stats.speed)
                          .map(([key, value]) => `${key} ${value} ft.`)
                          .join(", ")
                      : JSON.stringify(stats.speed)}
                </p>
              </div>
            )}
            {stats.senses && (
              <div>
                <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
                  Senses
                </h4>
                <p className="text-text">
                  {typeof stats.senses === "string"
                    ? stats.senses
                    : typeof stats.senses === "object"
                      ? Object.entries(stats.senses)
                          .map(([key, value]) => `${key} ${value} ft.`)
                          .join(", ")
                      : JSON.stringify(stats.senses)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Abilities */}
        {stats.abilities && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Abilities
            </h4>
            {typeof stats.abilities === "object" &&
            !Array.isArray(stats.abilities) ? (
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {Object.entries(stats.abilities).map(
                  ([ability, score]: [string, any]) => (
                    <div
                      key={ability}
                      className="bg-background p-3 rounded-lg border border-border text-center"
                    >
                      <div className="text-xs text-text-muted uppercase font-semibold">
                        {ability}
                      </div>
                      <div className="text-2xl font-bold text-text">
                        {score}
                      </div>
                      <div className="text-xs text-text-muted">
                        {Math.floor((score - 10) / 2) >= 0 ? "+" : ""}
                        {Math.floor((score - 10) / 2)}
                      </div>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <div className="prose prose-invert prose-tavern max-w-none">
                <ReactMarkdown>
                  {typeof stats.abilities === "string"
                    ? stats.abilities.replace(/\\n/g, "\n")
                    : JSON.stringify(stats.abilities, null, 2)}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* Tactics */}
        {monster.tactics && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Tactics
            </h4>
            <div className="prose prose-invert prose-tavern max-w-none">
              <ReactMarkdown>
                {monster.tactics.replace(/\\n/g, "\n")}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {!monster.lore &&
          !stats.abilities &&
          !monster.tactics &&
          !stats.stats_block && (
            <p className="text-text-muted italic">No additional details</p>
          )}
      </div>
    </ContentDetailModal>
  );
}

interface EditMonsterModalProps {
  monster: Monster;
  onClose: () => void;
  onSave: (id: string, updates: UpdateMonsterRequest) => Promise<void>;
}

function EditMonsterModal({ monster, onClose, onSave }: EditMonsterModalProps) {
  const [formData, setFormData] = useState({
    name: monster.name,
    lore: monster.lore || "",
    tactics: monster.tactics || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const updates: UpdateMonsterRequest = {
        name: formData.name,
        lore: formData.lore || undefined,
        tactics: formData.tactics || undefined,
      };

      await onSave(monster.id, updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save monster");
      setSaving(false);
    }
  };

  return (
    <ContentDetailModal
      isOpen={true}
      onClose={onClose}
      icon="Skull"
      iconColor="orange"
      title="Edit Monster"
      subtitle={monster.name}
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
            Lore
          </label>
          <textarea
            value={formData.lore}
            onChange={(e) => setFormData({ ...formData, lore: e.target.value })}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
            rows={5}
            placeholder="Describe the monster's background and lore..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-muted mb-2">
            Tactics
          </label>
          <textarea
            value={formData.tactics}
            onChange={(e) =>
              setFormData({ ...formData, tactics: e.target.value })
            }
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
            rows={5}
            placeholder="Describe combat tactics and strategy..."
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
