import ContentListLayout from "../../../../common/ContentListLayout";
import { useGeneratorModalStore } from "../../../../../store/generatorModalStore";
import ContentCard from "../../../../common/ContentCard";
import ContentDetailModal from "../../../../common/ContentDetailModal";
import AssignCampaignModal from "../../../../common/AssignCampaignModal";
import { useLibraryContent } from "../../../../../hooks/useLibraryContent";
import { useCampaignStore } from "../../../../../store/campaignStore";
import { useState } from "react";
import { logger } from "@/utils/logger";
import { updateTrap, UpdateTrapRequest } from "../../../../../api/traps";

interface Trap {
  id: string;
  name: string;
  campaign_id?: string | null;
  trap_type: string;
  difficulty?: string;
  party_level?: number;
  environment?: string;
  description?: string;
  trigger?: string;
  effect?: string;
  damage?: string;
  detection?: any;
  solution_paths?: any;
  complications?: any;
  rewards?: any;
  scaling?: any;
  dm_notes?: string;
  ai_generated?: boolean;
  created_at: string;
}

interface TrapsContentProps {
  campaignId?: string;
  showCampaignFilter?: boolean;
}

const difficultyColors: Record<string, { bg: string; text: string }> = {
  easy: { bg: "bg-green-500/10", text: "text-green-400" },
  medium: { bg: "bg-yellow-500/10", text: "text-yellow-400" },
  hard: { bg: "bg-orange-500/10", text: "text-orange-400" },
  deadly: { bg: "bg-red-500/10", text: "text-red-400" },
};

export default function TrapsContent({
  campaignId,
  showCampaignFilter,
}: TrapsContentProps) {
  const { openGenerator } = useGeneratorModalStore();
  const { campaigns } = useCampaignStore();
  const [assignModalItem, setAssignModalItem] = useState<{
    id: string;
    name: string;
    currentCampaignId?: string | null;
  } | null>(null);
  const [editingTrap, setEditingTrap] = useState<Trap | null>(null);

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
  } = useLibraryContent<Trap>({
    contentType: "traps",
    campaignId,
    showCampaignFilter,
    searchFields: ["name", "trap_type", "description", "environment"],
  });

  const handleDelete = async (trap: Trap) => {
    if (window.confirm(`Delete "${trap.name}"? This cannot be undone.`)) {
      try {
        await deleteItem(trap.id);
      } catch (err) {
        logger.error("Failed to delete trap:", err);
      }
    }
  };

  const handleSave = async (id: string, updates: UpdateTrapRequest) => {
    try {
      await updateTrap(id, updates);
      await refresh();
      setEditingTrap(null);
      setViewingItem(null);
    } catch (err) {
      logger.error("Failed to update trap:", err);
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
        searchPlaceholder="Search traps..."
        addButtonLabel="Add Trap"
        onAddClick={() => openGenerator("trap")}
        addButtonColor="red"
        loading={loading}
        error={error}
        emptyIcon="AlertTriangle"
        emptyTitle="No traps yet"
        emptyDescription="Create dangerous hazards and puzzles."
        emptyCTALabel="Create Your First Trap"
        onEmptyCTAClick={() => openGenerator("trap")}
        hasItems={filteredItems.length > 0}
      >
        <div className="space-y-3">
          {filteredItems.map((trap) => {
            const diffColor =
              difficultyColors[trap.difficulty || "medium"] ||
              difficultyColors.medium;
            return (
              <ContentCard
                key={trap.id}
                title={trap.name}
                preview={trap.description || undefined}
                icon="AlertTriangle"
                iconColor="red"
                date={trap.created_at}
                badges={[
                  { label: trap.trap_type.replace(/_/g, " ") },
                  ...(trap.difficulty
                    ? [
                        {
                          label: trap.difficulty,
                          color: diffColor.text,
                          bgColor: diffColor.bg,
                        },
                      ]
                    : []),
                  ...(trap.environment ? [{ label: trap.environment }] : []),
                ]}
                onClick={() => setViewingItem(trap)}
                onDelete={() => handleDelete(trap)}
                onAssign={() =>
                  setAssignModalItem({
                    id: trap.id,
                    name: trap.name,
                    currentCampaignId: trap.campaign_id,
                  })
                }
              />
            );
          })}
        </div>
      </ContentListLayout>

      {viewingItem && !editingTrap && (
        <TrapDetailModal
          trap={viewingItem}
          onClose={() => setViewingItem(null)}
          onDelete={() => handleDelete(viewingItem)}
          onEdit={() => setEditingTrap(viewingItem)}
        />
      )}

      {editingTrap && (
        <EditTrapModal
          trap={editingTrap}
          onClose={() => {
            setEditingTrap(null);
            setViewingItem(null);
          }}
          onSave={handleSave}
        />
      )}

      {assignModalItem && (
        <AssignCampaignModal
          isOpen={true}
          onClose={() => setAssignModalItem(null)}
          contentType="traps"
          contentId={assignModalItem.id}
          contentName={assignModalItem.name}
          currentCampaignId={assignModalItem.currentCampaignId}
          onSuccess={refresh}
        />
      )}
    </div>
  );
}

interface TrapDetailModalProps {
  trap: Trap;
  onClose: () => void;
  onDelete: () => void;
  onEdit: () => void;
}

function TrapDetailModal({
  trap,
  onClose,
  onDelete,
  onEdit,
}: TrapDetailModalProps) {
  let detection: any = null;
  let solutionPaths: any[] = [];
  let complications: any[] = [];
  let rewards: any[] = [];
  let scaling: any = null;

  try {
    detection = trap.detection
      ? typeof trap.detection === "string"
        ? JSON.parse(trap.detection)
        : trap.detection
      : null;
    solutionPaths = trap.solution_paths
      ? typeof trap.solution_paths === "string"
        ? JSON.parse(trap.solution_paths)
        : trap.solution_paths
      : [];
    complications = trap.complications
      ? typeof trap.complications === "string"
        ? JSON.parse(trap.complications)
        : trap.complications
      : [];
    rewards = trap.rewards
      ? typeof trap.rewards === "string"
        ? JSON.parse(trap.rewards)
        : trap.rewards
      : [];
    scaling = trap.scaling
      ? typeof trap.scaling === "string"
        ? JSON.parse(trap.scaling)
        : trap.scaling
      : null;
  } catch (err) {
    logger.error("Failed to parse trap data:", err);
  }

  const diffColor =
    difficultyColors[trap.difficulty || "medium"] || difficultyColors.medium;

  return (
    <ContentDetailModal
      isOpen={true}
      onClose={onClose}
      icon="AlertTriangle"
      iconColor="red"
      title={trap.name}
      subtitle={trap.trap_type.replace(/_/g, " ")}
      onDelete={onDelete}
      onEdit={onEdit}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-3">
          {trap.difficulty && (
            <div
              className={`px-4 py-2 ${diffColor.bg} border border-red-500/30 rounded-lg`}
            >
              <p className="text-xs text-text-muted">Difficulty</p>
              <p
                className={`text-lg font-semibold ${diffColor.text} capitalize`}
              >
                {trap.difficulty}
              </p>
            </div>
          )}
          {trap.party_level && (
            <div className="px-4 py-2 bg-background border border-border rounded-lg">
              <p className="text-xs text-text-muted">Party Level</p>
              <p className="text-lg font-semibold text-text">
                {trap.party_level}
              </p>
            </div>
          )}
        </div>

        {trap.description && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Description
            </h4>
            <p className="text-text leading-relaxed">{trap.description}</p>
          </div>
        )}

        {trap.trigger && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Trigger
            </h4>
            <p className="text-text leading-relaxed">{trap.trigger}</p>
          </div>
        )}

        {trap.effect && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Effect
            </h4>
            <p className="text-text leading-relaxed">{trap.effect}</p>
          </div>
        )}

        {trap.damage && (
          <div className="bg-red-500/10 p-4 rounded-lg border border-red-500/30">
            <h4 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-2">
              Damage
            </h4>
            <p className="text-red-300 font-medium">{trap.damage}</p>
          </div>
        )}

        {detection && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Detection
            </h4>
            <div className="bg-background p-4 rounded-lg border border-border">
              {detection.dc && <p className="text-text">DC: {detection.dc}</p>}
              {detection.skill && (
                <p className="text-text-muted">Skill: {detection.skill}</p>
              )}
              {typeof detection === "string" && (
                <p className="text-text">{detection}</p>
              )}
            </div>
          </div>
        )}

        {solutionPaths.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Solutions
            </h4>
            <ul className="list-disc list-inside text-text space-y-1">
              {solutionPaths.map((s: any, i: number) => (
                <li key={i}>
                  {typeof s === "string" ? s : s.description || s.method}
                </li>
              ))}
            </ul>
          </div>
        )}

        {complications.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Complications
            </h4>
            <ul className="space-y-2">
              {complications.map((c: any, i: number) => (
                <li
                  key={i}
                  className="text-text bg-background p-3 rounded-lg border border-border"
                >
                  {typeof c === "string" ? c : c.description || c.effect}
                </li>
              ))}
            </ul>
          </div>
        )}

        {rewards.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Rewards
            </h4>
            <ul className="space-y-2">
              {rewards.map((r: any, i: number) => (
                <li
                  key={i}
                  className="text-amber-400 bg-amber-500/10 p-3 rounded-lg border border-amber-500/30"
                >
                  {typeof r === "string" ? r : r.name || r.description}
                </li>
              ))}
            </ul>
          </div>
        )}

        {scaling && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Scaling
            </h4>
            <div className="bg-background p-4 rounded-lg border border-border space-y-3">
              {typeof scaling === "string" ? (
                <p className="text-text whitespace-pre-wrap">{scaling}</p>
              ) : (
                <>
                  {scaling.easier && (
                    <div>
                      <p className="text-green-400 font-medium mb-1">Easier:</p>
                      <p className="text-text">{scaling.easier}</p>
                    </div>
                  )}
                  {scaling.harder && (
                    <div>
                      <p className="text-red-400 font-medium mb-1">Harder:</p>
                      <p className="text-text">{scaling.harder}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {trap.dm_notes && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              DM Notes
            </h4>
            <p className="text-text leading-relaxed whitespace-pre-wrap bg-red-500/10 border border-red-500/20 p-4 rounded-lg">
              {trap.dm_notes}
            </p>
          </div>
        )}
      </div>
    </ContentDetailModal>
  );
}

interface EditTrapModalProps {
  trap: Trap;
  onClose: () => void;
  onSave: (id: string, updates: UpdateTrapRequest) => Promise<void>;
}

function EditTrapModal({ trap, onClose, onSave }: EditTrapModalProps) {
  const [formData, setFormData] = useState({
    name: trap.name,
    trap_type: trap.trap_type,
    difficulty: trap.difficulty || "",
    party_level: trap.party_level?.toString() || "",
    environment: trap.environment || "",
    description: trap.description || "",
    trigger: trap.trigger || "",
    effect: trap.effect || "",
    damage: trap.damage || "",
    dm_notes: trap.dm_notes || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const updates: UpdateTrapRequest = {
        name: formData.name,
        trap_type: formData.trap_type,
        difficulty: formData.difficulty || undefined,
        party_level: formData.party_level
          ? parseInt(formData.party_level)
          : undefined,
        environment: formData.environment || undefined,
        description: formData.description || undefined,
        trigger: formData.trigger || undefined,
        effect: formData.effect || undefined,
        damage: formData.damage || undefined,
        dm_notes: formData.dm_notes || undefined,
      };

      await onSave(trap.id, updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save trap");
      setSaving(false);
    }
  };

  return (
    <ContentDetailModal
      isOpen={true}
      onClose={onClose}
      icon="AlertTriangle"
      iconColor="red"
      title="Edit Trap"
      subtitle={trap.name}
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
            value={formData.trap_type}
            onChange={(e) =>
              setFormData({ ...formData, trap_type: e.target.value })
            }
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
            required
          >
            <option value="mechanical">Mechanical</option>
            <option value="magical">Magical</option>
            <option value="environmental">Environmental</option>
            <option value="puzzle">Puzzle</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">
              Difficulty
            </label>
            <select
              value={formData.difficulty}
              onChange={(e) =>
                setFormData({ ...formData, difficulty: e.target.value })
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
            >
              <option value="">Select difficulty</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="deadly">Deadly</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">
              Party Level
            </label>
            <input
              type="number"
              value={formData.party_level}
              onChange={(e) =>
                setFormData({ ...formData, party_level: e.target.value })
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
              min="1"
              max="20"
            />
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
            placeholder="dungeon, forest, urban"
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
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-muted mb-2">
            Trigger
          </label>
          <textarea
            value={formData.trigger}
            onChange={(e) =>
              setFormData({ ...formData, trigger: e.target.value })
            }
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
            rows={2}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-muted mb-2">
            Effect
          </label>
          <textarea
            value={formData.effect}
            onChange={(e) =>
              setFormData({ ...formData, effect: e.target.value })
            }
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
            rows={2}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-muted mb-2">
            Damage
          </label>
          <input
            type="text"
            value={formData.damage}
            onChange={(e) =>
              setFormData({ ...formData, damage: e.target.value })
            }
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
            placeholder="3d6 piercing"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-muted mb-2">
            DM Notes
          </label>
          <textarea
            value={formData.dm_notes}
            onChange={(e) =>
              setFormData({ ...formData, dm_notes: e.target.value })
            }
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
            rows={3}
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
