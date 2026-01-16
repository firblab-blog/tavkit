import ContentListLayout from "../../../../common/ContentListLayout";
import { useGeneratorModalStore } from "../../../../../store/generatorModalStore";
import ContentCard from "../../../../common/ContentCard";
import ContentDetailModal from "../../../../common/ContentDetailModal";
import AssignCampaignModal from "../../../../common/AssignCampaignModal";
import { useLibraryContent } from "../../../../../hooks/useLibraryContent";
import { useCampaignStore } from "../../../../../store/campaignStore";
import { useState } from "react";
import { logger } from "@/utils/logger";
import { updateChase, UpdateChaseRequest } from "../../../../../api/chases";

interface Chase {
  id: string;
  name: string;
  campaign_id?: string | null;
  chase_type: string;
  terrain: string;
  difficulty: string;
  description?: string;
  starting_distance?: number;
  setting?: string;
  participants?: any;
  starting_conditions?: string;
  obstacles?: any;
  complications?: any;
  shortcuts?: any;
  chase_phases?: any;
  ending_conditions?: any;
  rewards?: any;
  special_rules?: string;
  environmental_factors?: any;
  ai_generated?: boolean;
  created_at: string;
}

interface ChasesContentProps {
  campaignId?: string;
  showCampaignFilter?: boolean;
}

const difficultyColors: Record<string, { bg: string; text: string }> = {
  easy: { bg: "bg-green-500/10", text: "text-green-400" },
  medium: { bg: "bg-yellow-500/10", text: "text-yellow-400" },
  hard: { bg: "bg-orange-500/10", text: "text-orange-400" },
  deadly: { bg: "bg-red-500/10", text: "text-red-400" },
};

export default function ChasesContent({
  campaignId,
  showCampaignFilter,
}: ChasesContentProps) {
  const { openGenerator } = useGeneratorModalStore();
  const { campaigns } = useCampaignStore();
  const [assignModalItem, setAssignModalItem] = useState<{
    id: string;
    name: string;
    currentCampaignId?: string | null;
  } | null>(null);
  const [editingChase, setEditingChase] = useState<Chase | null>(null);

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
  } = useLibraryContent<Chase>({
    contentType: "chases",
    campaignId,
    showCampaignFilter,
    searchFields: ["name", "chase_type", "terrain", "description"],
  });

  const handleDelete = async (chase: Chase) => {
    if (window.confirm(`Delete "${chase.name}"? This cannot be undone.`)) {
      try {
        await deleteItem(chase.id);
      } catch (err) {
        logger.error("Failed to delete chase:", err);
      }
    }
  };

  const handleSave = async (id: string, updates: UpdateChaseRequest) => {
    try {
      await updateChase(id, updates);
      await refresh();
      setEditingChase(null);
      setViewingItem(null);
    } catch (err) {
      logger.error("Failed to update chase:", err);
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
        searchPlaceholder="Search chases..."
        addButtonLabel="Add Chase"
        onAddClick={() => openGenerator("chase")}
        addButtonColor="indigo"
        loading={loading}
        error={error}
        emptyIcon="Zap"
        emptyTitle="No chases yet"
        emptyDescription="Create pursuit sequences and action scenes."
        emptyCTALabel="Create Your First Chase"
        onEmptyCTAClick={() => openGenerator("chase")}
        hasItems={filteredItems.length > 0}
      >
        <div className="space-y-3">
          {filteredItems.map((chase) => {
            const diffColor =
              difficultyColors[chase.difficulty] || difficultyColors.medium;
            return (
              <ContentCard
                key={chase.id}
                title={chase.name}
                preview={chase.description || undefined}
                icon="Zap"
                iconColor="indigo"
                date={chase.created_at}
                badges={[
                  { label: chase.chase_type.replace(/_/g, " ") },
                  {
                    label: chase.terrain,
                    color: "text-blue-400",
                    bgColor: "bg-blue-500/10",
                  },
                  {
                    label: chase.difficulty,
                    color: diffColor.text,
                    bgColor: diffColor.bg,
                  },
                ]}
                onClick={() => setViewingItem(chase)}
                onDelete={() => handleDelete(chase)}
                onAssign={() =>
                  setAssignModalItem({
                    id: chase.id,
                    name: chase.name,
                    currentCampaignId: chase.campaign_id,
                  })
                }
              />
            );
          })}
        </div>
      </ContentListLayout>

      {viewingItem && !editingChase && (
        <ChaseDetailModal
          chase={viewingItem}
          onClose={() => setViewingItem(null)}
          onDelete={() => handleDelete(viewingItem)}
          onEdit={() => setEditingChase(viewingItem)}
        />
      )}

      {editingChase && (
        <EditChaseModal
          chase={editingChase}
          onClose={() => {
            setEditingChase(null);
            setViewingItem(null);
          }}
          onSave={handleSave}
        />
      )}

      {assignModalItem && (
        <AssignCampaignModal
          isOpen={true}
          onClose={() => setAssignModalItem(null)}
          contentType="chases"
          contentId={assignModalItem.id}
          contentName={assignModalItem.name}
          currentCampaignId={assignModalItem.currentCampaignId}
          onSuccess={refresh}
        />
      )}
    </div>
  );
}

interface ChaseDetailModalProps {
  chase: Chase;
  onClose: () => void;
  onDelete: () => void;
  onEdit: () => void;
}

function ChaseDetailModal({
  chase,
  onClose,
  onDelete,
  onEdit,
}: ChaseDetailModalProps) {
  let obstacles: any[] = [];
  let complications: any[] = [];
  let shortcuts: any[] = [];
  let participants: any[] = [];
  let chasePhases: any[] = [];
  let endingConditions: any[] = [];
  let rewards: any = null;
  let environmentalFactors: any[] = [];

  try {
    obstacles = chase.obstacles
      ? typeof chase.obstacles === "string"
        ? JSON.parse(chase.obstacles)
        : chase.obstacles
      : [];
    complications = chase.complications
      ? typeof chase.complications === "string"
        ? JSON.parse(chase.complications)
        : chase.complications
      : [];
    shortcuts = chase.shortcuts
      ? typeof chase.shortcuts === "string"
        ? JSON.parse(chase.shortcuts)
        : chase.shortcuts
      : [];
    participants = chase.participants
      ? typeof chase.participants === "string"
        ? JSON.parse(chase.participants)
        : chase.participants
      : [];
    chasePhases = chase.chase_phases
      ? typeof chase.chase_phases === "string"
        ? JSON.parse(chase.chase_phases)
        : chase.chase_phases
      : [];
    endingConditions = chase.ending_conditions
      ? typeof chase.ending_conditions === "string"
        ? JSON.parse(chase.ending_conditions)
        : chase.ending_conditions
      : [];
    rewards = chase.rewards
      ? typeof chase.rewards === "string"
        ? JSON.parse(chase.rewards)
        : chase.rewards
      : null;
    environmentalFactors = chase.environmental_factors
      ? typeof chase.environmental_factors === "string"
        ? JSON.parse(chase.environmental_factors)
        : chase.environmental_factors
      : [];
  } catch (err) {
    logger.error("Failed to parse chase data:", err);
  }

  const diffColor =
    difficultyColors[chase.difficulty] || difficultyColors.medium;

  return (
    <ContentDetailModal
      isOpen={true}
      onClose={onClose}
      icon="Zap"
      iconColor="indigo"
      title={chase.name}
      subtitle={chase.chase_type.replace(/_/g, " ")}
      onDelete={onDelete}
      onEdit={onEdit}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-3">
          <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-xs text-text-muted">Terrain</p>
            <p className="text-lg font-semibold text-blue-400 capitalize">
              {chase.terrain}
            </p>
          </div>
          <div
            className={`px-4 py-2 ${diffColor.bg} border border-indigo-500/30 rounded-lg`}
          >
            <p className="text-xs text-text-muted">Difficulty</p>
            <p className={`text-lg font-semibold ${diffColor.text} capitalize`}>
              {chase.difficulty}
            </p>
          </div>
        </div>

        {chase.description && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Description
            </h4>
            <p className="text-text leading-relaxed">{chase.description}</p>
          </div>
        )}

        {chase.setting && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Setting
            </h4>
            <p className="text-text leading-relaxed">{chase.setting}</p>
          </div>
        )}

        {chase.starting_conditions && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Starting Conditions
            </h4>
            <p className="text-text leading-relaxed">
              {chase.starting_conditions}
            </p>
          </div>
        )}

        {participants.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Participants
            </h4>
            <div className="space-y-2">
              {participants.map((p: any, i: number) => (
                <div
                  key={i}
                  className="bg-purple-500/10 p-3 rounded-lg border border-purple-500/30"
                >
                  <p className="text-purple-400 font-medium">
                    {p.name || p.role || "Participant"}
                    {p.role && ` (${p.role})`}
                  </p>
                  {p.speed && (
                    <p className="text-text-muted text-sm mt-1">
                      Speed: {p.speed}
                    </p>
                  )}
                  {p.abilities && (
                    <p className="text-text text-sm mt-1">{p.abilities}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {obstacles.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Obstacles
            </h4>
            <div className="space-y-2">
              {obstacles.map((o: any, i: number) => (
                <div
                  key={i}
                  className="bg-orange-500/10 p-3 rounded-lg border border-orange-500/30"
                >
                  <p className="text-orange-400 font-medium">{o.name || o}</p>
                  {o.description && (
                    <p className="text-text-muted text-sm mt-1">
                      {o.description}
                    </p>
                  )}
                  {o.dc && (
                    <p className="text-text-muted text-sm mt-1">DC: {o.dc}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {complications.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Complications
            </h4>
            <ul className="list-disc list-inside text-text space-y-1">
              {complications.map((c: any, i: number) => (
                <li key={i}>
                  {typeof c === "string" ? c : c.description || c.name}
                </li>
              ))}
            </ul>
          </div>
        )}

        {shortcuts.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Shortcuts
            </h4>
            <div className="space-y-2">
              {shortcuts.map((s: any, i: number) => (
                <div
                  key={i}
                  className="bg-green-500/10 p-3 rounded-lg border border-green-500/30"
                >
                  <p className="text-green-400 font-medium">{s.name || s}</p>
                  {s.description && (
                    <p className="text-text-muted text-sm mt-1">
                      {s.description}
                    </p>
                  )}
                  {s.benefit && (
                    <p className="text-green-400 text-sm mt-1">
                      Benefit: {s.benefit}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {chasePhases.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Chase Phases
            </h4>
            <div className="space-y-2">
              {chasePhases.map((phase: any, i: number) => (
                <div
                  key={i}
                  className="bg-cyan-500/10 p-3 rounded-lg border border-cyan-500/30"
                >
                  <p className="text-cyan-400 font-medium">
                    Round {phase.round || i + 1}
                    {phase.name && `: ${phase.name}`}
                  </p>
                  {phase.description && (
                    <p className="text-text text-sm mt-1">
                      {phase.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {endingConditions.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Ending Conditions
            </h4>
            <ul className="list-disc list-inside text-text space-y-1">
              {endingConditions.map((condition: any, i: number) => (
                <li key={i}>
                  {typeof condition === "string"
                    ? condition
                    : condition.description || condition.type}
                </li>
              ))}
            </ul>
          </div>
        )}

        {rewards && (
          <div className="bg-amber-500/10 p-4 rounded-lg border border-amber-500/30">
            <h4 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-2">
              Rewards
            </h4>
            {typeof rewards === "string" ? (
              <p className="text-amber-300">{rewards}</p>
            ) : (
              <div className="space-y-1 text-amber-300">
                {rewards.success && (
                  <p>
                    <span className="font-semibold">Success:</span>{" "}
                    {rewards.success}
                  </p>
                )}
                {rewards.failure && (
                  <p>
                    <span className="font-semibold">Failure:</span>{" "}
                    {rewards.failure}
                  </p>
                )}
                {rewards.items && (
                  <ul className="list-disc list-inside ml-4 mt-2">
                    {rewards.items.map((item: string, i: number) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {environmentalFactors.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Environmental Factors
            </h4>
            <div className="space-y-2">
              {environmentalFactors.map((factor: any, i: number) => (
                <div
                  key={i}
                  className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/30"
                >
                  <p className="text-blue-400 font-medium">
                    {typeof factor === "string"
                      ? factor
                      : factor.name || factor.type}
                  </p>
                  {factor.effect && (
                    <p className="text-text-muted text-sm mt-1">
                      {factor.effect}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {chase.special_rules && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Special Rules
            </h4>
            <p className="text-text leading-relaxed whitespace-pre-wrap">
              {chase.special_rules}
            </p>
          </div>
        )}
      </div>
    </ContentDetailModal>
  );
}

interface EditChaseModalProps {
  chase: Chase;
  onClose: () => void;
  onSave: (id: string, updates: UpdateChaseRequest) => Promise<void>;
}

function EditChaseModal({ chase, onClose, onSave }: EditChaseModalProps) {
  const [formData, setFormData] = useState({
    name: chase.name,
    chase_type: chase.chase_type || "",
    description: chase.description || "",
    starting_distance: chase.starting_distance?.toString() || "",
    dm_notes: chase.special_rules || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const updates: UpdateChaseRequest = {
        name: formData.name,
        chase_type: formData.chase_type || undefined,
        description: formData.description || undefined,
        starting_distance: formData.starting_distance
          ? parseInt(formData.starting_distance)
          : undefined,
        dm_notes: formData.dm_notes || undefined,
      };

      await onSave(chase.id, updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save chase");
      setSaving(false);
    }
  };

  return (
    <ContentDetailModal
      isOpen={true}
      onClose={onClose}
      icon="Zap"
      iconColor="indigo"
      title="Edit Chase"
      subtitle={chase.name}
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
              Chase Type
            </label>
            <input
              type="text"
              value={formData.chase_type}
              onChange={(e) =>
                setFormData({ ...formData, chase_type: e.target.value })
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
              placeholder="urban, wilderness, vehicular"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">
              Starting Distance
            </label>
            <input
              type="number"
              value={formData.starting_distance}
              onChange={(e) =>
                setFormData({ ...formData, starting_distance: e.target.value })
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
              placeholder="Distance in feet"
              min="0"
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
            placeholder="Describe the chase scenario..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-muted mb-2">
            DM Notes / Special Rules
          </label>
          <textarea
            value={formData.dm_notes}
            onChange={(e) =>
              setFormData({ ...formData, dm_notes: e.target.value })
            }
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
            rows={4}
            placeholder="Special rules and notes..."
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
