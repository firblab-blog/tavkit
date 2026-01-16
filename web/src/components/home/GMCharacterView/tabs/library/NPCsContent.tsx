import ContentListLayout from "../../../../common/ContentListLayout";
import ContentCard from "../../../../common/ContentCard";
import ContentDetailModal from "../../../../common/ContentDetailModal";
import AssignCampaignModal from "../../../../common/AssignCampaignModal";
import { useLibraryContent } from "../../../../../hooks/useLibraryContent";
import { useCampaignStore } from "../../../../../store/campaignStore";
import { useGeneratorModalStore } from "../../../../../store/generatorModalStore";
import { useState } from "react";
import { logger } from "@/utils/logger";
import { updateNPC, UpdateNPCRequest } from "../../../../../api/npcs";

interface NPC {
  id: string;
  name: string;
  campaign_id?: string | null;
  race?: string;
  class?: string;
  personality?: string;
  backstory?: string;
  stats?: any;
  inventory?: any;
  ai_generated?: boolean;
  ai_provider?: string;
  created_at: string;
}

interface NPCsContentProps {
  campaignId?: string;
  showCampaignFilter?: boolean;
}

export default function NPCsContent({
  campaignId,
  showCampaignFilter,
}: NPCsContentProps) {
  const { campaigns } = useCampaignStore();
  const { openGenerator } = useGeneratorModalStore();
  const [assignModalItem, setAssignModalItem] = useState<{
    id: string;
    name: string;
    currentCampaignId?: string | null;
  } | null>(null);
  const [editingNPC, setEditingNPC] = useState<NPC | null>(null);

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
  } = useLibraryContent<NPC>({
    contentType: "npcs",
    campaignId,
    showCampaignFilter,
    searchFields: ["name", "race", "class", "personality"],
  });

  const handleDelete = async (npc: NPC) => {
    if (window.confirm(`Delete "${npc.name}"? This cannot be undone.`)) {
      try {
        await deleteItem(npc.id);
      } catch (err) {
        logger.error("Failed to delete NPC:", err);
      }
    }
  };

  const handleSave = async (id: string, updates: UpdateNPCRequest) => {
    try {
      await updateNPC(id, updates);
      await refresh();
      setEditingNPC(null);
      setViewingItem(null);
    } catch (err) {
      logger.error("Failed to update NPC:", err);
      throw err;
    }
  };

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
        searchPlaceholder="Search NPCs..."
        addButtonLabel="Add NPC"
        onAddClick={() => openGenerator("npc")}
        addButtonColor="emerald"
        loading={loading}
        error={error}
        emptyIcon="Users"
        emptyTitle="No NPCs yet"
        emptyDescription="Create memorable NPCs for your campaign."
        emptyCTALabel="Create Your First NPC"
        onEmptyCTAClick={() => openGenerator("npc")}
        hasItems={filteredItems.length > 0}
      >
        <div className="space-y-3">
          {filteredItems.map((npc) => (
            <ContentCard
              key={npc.id}
              title={npc.name}
              preview={npc.personality || undefined}
              icon="Users"
              iconColor="emerald"
              date={npc.created_at}
              badges={[
                ...(npc.race ? [{ label: npc.race }] : []),
                ...(npc.class ? [{ label: npc.class }] : []),
              ]}
              onClick={() => setViewingItem(npc)}
              onDelete={() => handleDelete(npc)}
              onAssign={() =>
                setAssignModalItem({
                  id: npc.id,
                  name: npc.name,
                  currentCampaignId: npc.campaign_id,
                })
              }
            />
          ))}
        </div>
      </ContentListLayout>

      {/* Detail Modal */}
      {viewingItem && !editingNPC && (
        <NPCDetailModal
          npc={viewingItem}
          onClose={() => setViewingItem(null)}
          onDelete={() => handleDelete(viewingItem)}
          onEdit={() => setEditingNPC(viewingItem)}
        />
      )}

      {/* Edit Modal */}
      {editingNPC && (
        <EditNPCModal
          npc={editingNPC}
          onClose={() => {
            setEditingNPC(null);
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
          contentType="npcs"
          contentId={assignModalItem.id}
          contentName={assignModalItem.name}
          currentCampaignId={assignModalItem.currentCampaignId}
          onSuccess={refresh}
        />
      )}
    </div>
  );
}

// NPC Detail Modal
interface NPCDetailModalProps {
  npc: NPC;
  onClose: () => void;
  onDelete: () => void;
  onEdit: () => void;
}

function NPCDetailModal({
  npc,
  onClose,
  onDelete,
  onEdit,
}: NPCDetailModalProps) {
  let stats = null;
  let inventory: any[] = [];

  try {
    if (npc.stats) {
      stats = typeof npc.stats === "string" ? JSON.parse(npc.stats) : npc.stats;
    }
    if (npc.inventory) {
      inventory =
        typeof npc.inventory === "string"
          ? JSON.parse(npc.inventory)
          : npc.inventory;
    }
  } catch (error) {
    logger.error("Failed to parse NPC data:", error);
  }

  const subtitle = [npc.race, npc.class].filter(Boolean).join(" ");

  return (
    <ContentDetailModal
      isOpen={true}
      onClose={onClose}
      icon="Users"
      iconColor="emerald"
      title={npc.name}
      subtitle={subtitle || undefined}
      onDelete={onDelete}
      onEdit={onEdit}
    >
      <div className="space-y-6">
        {npc.personality && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Personality
            </h4>
            <p className="text-text leading-relaxed">{npc.personality}</p>
          </div>
        )}

        {npc.backstory && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Backstory
            </h4>
            <p className="text-text leading-relaxed whitespace-pre-wrap">
              {npc.backstory}
            </p>
          </div>
        )}

        {stats && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
              Statistics
            </h4>

            {/* Level and Alignment */}
            <div className="grid grid-cols-2 gap-4">
              {stats.level && (
                <div className="bg-background p-4 rounded-lg border border-border">
                  <div className="text-xs text-text-muted uppercase tracking-wide mb-1">
                    Level
                  </div>
                  <div className="text-2xl font-bold text-text">
                    {stats.level}
                  </div>
                </div>
              )}
              {stats.alignment && (
                <div className="bg-background p-4 rounded-lg border border-border">
                  <div className="text-xs text-text-muted uppercase tracking-wide mb-1">
                    Alignment
                  </div>
                  <div className="text-lg font-semibold text-text">
                    {stats.alignment}
                  </div>
                </div>
              )}
            </div>

            {/* Ability Scores */}
            {stats.abilities && (
              <div>
                <h5 className="text-sm font-medium text-text-muted mb-2">
                  Ability Scores
                </h5>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {Object.entries(stats.abilities).map(
                    ([ability, score]: [string, any]) => (
                      <div
                        key={ability}
                        className="bg-background p-3 rounded-lg border border-border text-center"
                      >
                        <div className="text-xs text-text-muted uppercase">
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
              </div>
            )}

            {/* Skills */}
            {stats.skills && stats.skills.length > 0 && (
              <div className="bg-background p-4 rounded-lg border border-border">
                <div className="text-xs text-text-muted uppercase tracking-wide mb-2">
                  Skills
                </div>
                <div className="flex flex-wrap gap-2">
                  {stats.skills.map((skill: string, i: number) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Equipment */}
            {stats.equipment && stats.equipment.length > 0 && (
              <div className="bg-background p-4 rounded-lg border border-border">
                <div className="text-xs text-text-muted uppercase tracking-wide mb-2">
                  Equipment
                </div>
                <ul className="list-disc list-inside text-text space-y-1">
                  {stats.equipment.map((item: string, i: number) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Plot Hooks */}
            {stats.plot_hooks && stats.plot_hooks.length > 0 && (
              <div className="bg-background p-4 rounded-lg border border-border">
                <div className="text-xs text-text-muted uppercase tracking-wide mb-2">
                  Plot Hooks
                </div>
                <ul className="list-disc list-inside text-text space-y-1">
                  {stats.plot_hooks.map((hook: string, i: number) => (
                    <li key={i}>{hook}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Inventory */}
        {inventory.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Inventory
            </h4>
            <div className="bg-background p-4 rounded-lg border border-border">
              <ul className="space-y-2">
                {inventory.map((item: any, i: number) => (
                  <li key={i} className="text-text">
                    {typeof item === "string"
                      ? item
                      : `${item.name || item.item}${item.quantity ? ` (${item.quantity})` : ""}${item.notes ? ` - ${item.notes}` : ""}`}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {!npc.personality &&
          !npc.backstory &&
          !stats &&
          inventory.length === 0 && (
            <p className="text-text-muted italic">No additional details</p>
          )}
      </div>
    </ContentDetailModal>
  );
}

interface EditNPCModalProps {
  npc: NPC;
  onClose: () => void;
  onSave: (id: string, updates: UpdateNPCRequest) => Promise<void>;
}

function EditNPCModal({ npc, onClose, onSave }: EditNPCModalProps) {
  const [formData, setFormData] = useState({
    name: npc.name,
    race: npc.race || "",
    class: npc.class || "",
    personality: npc.personality || "",
    backstory: npc.backstory || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const updates: UpdateNPCRequest = {
        name: formData.name,
        race: formData.race || undefined,
        class: formData.class || undefined,
        personality_traits: formData.personality || undefined,
        background: formData.backstory || undefined,
      };

      await onSave(npc.id, updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save NPC");
      setSaving(false);
    }
  };

  return (
    <ContentDetailModal
      isOpen={true}
      onClose={onClose}
      icon="Users"
      iconColor="emerald"
      title="Edit NPC"
      subtitle={npc.name}
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
              Race
            </label>
            <input
              type="text"
              value={formData.race}
              onChange={(e) =>
                setFormData({ ...formData, race: e.target.value })
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
              placeholder="Human, Elf, Dwarf..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">
              Class
            </label>
            <input
              type="text"
              value={formData.class}
              onChange={(e) =>
                setFormData({ ...formData, class: e.target.value })
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
              placeholder="Fighter, Wizard, Rogue..."
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-muted mb-2">
            Personality
          </label>
          <textarea
            value={formData.personality}
            onChange={(e) =>
              setFormData({ ...formData, personality: e.target.value })
            }
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
            rows={3}
            placeholder="Describe their personality traits..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-muted mb-2">
            Backstory
          </label>
          <textarea
            value={formData.backstory}
            onChange={(e) =>
              setFormData({ ...formData, backstory: e.target.value })
            }
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
            rows={5}
            placeholder="Tell their story..."
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
