import ContentListLayout from "../../../../common/ContentListLayout";
import { useGeneratorModalStore } from "../../../../../store/generatorModalStore";
import ContentDetailModal from "../../../../common/ContentDetailModal";
import AssignCampaignModal from "../../../../common/AssignCampaignModal";
import Icon from "../../../../common/Icon";
import { useLibraryContent } from "../../../../../hooks/useLibraryContent";
import { useCampaignStore } from "../../../../../store/campaignStore";
import { useState } from "react";
import { logger } from "@/utils/logger";
import { updateRumor, UpdateRumorRequest } from "../../../../../api/rumors";

interface Rumor {
  id: string;
  text: string;
  campaign_id?: string | null;
  source?: string;
  veracity: string;
  leads_to?: string;
  related_id?: string;
  context?: string;
  foreshadowing?: boolean;
  tags?: any;
  revealed: boolean;
  ai_generated?: boolean;
  created_at: string;
}

interface RumorsContentProps {
  campaignId?: string;
  showCampaignFilter?: boolean;
}

const veracityColors: Record<string, { bg: string; text: string }> = {
  true: { bg: "bg-green-500/10", text: "text-green-400" },
  partially_true: { bg: "bg-yellow-500/10", text: "text-yellow-400" },
  false: { bg: "bg-red-500/10", text: "text-red-400" },
};

export default function RumorsContent({
  campaignId,
  showCampaignFilter,
}: RumorsContentProps) {
  const { openGenerator } = useGeneratorModalStore();
  const { campaigns } = useCampaignStore();
  const [assignModalItem, setAssignModalItem] = useState<{
    id: string;
    name: string;
    currentCampaignId?: string | null;
  } | null>(null);
  const [editingItem, setEditingItem] = useState<Rumor | null>(null);

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
  } = useLibraryContent<Rumor>({
    contentType: "rumors",
    campaignId,
    showCampaignFilter,
    searchFields: ["text", "source", "context"],
  });

  const handleDelete = async (rumor: Rumor) => {
    const preview =
      rumor.text.substring(0, 40) + (rumor.text.length > 40 ? "..." : "");
    if (window.confirm(`Delete rumor "${preview}"? This cannot be undone.`)) {
      try {
        await deleteItem(rumor.id);
      } catch (err) {
        logger.error("Failed to delete rumor:", err);
      }
    }
  };

  const handleSave = async (id: string, updates: UpdateRumorRequest) => {
    try {
      await updateRumor(id, updates);
      await refresh();
      setEditingItem(null);
      setViewingItem(null);
    } catch (err) {
      logger.error("Failed to update rumor:", err);
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
        searchPlaceholder="Search rumors..."
        addButtonLabel="Add Rumor"
        onAddClick={() => openGenerator("rumor")}
        addButtonColor="rose"
        loading={loading}
        error={error}
        emptyIcon="Quote"
        emptyTitle="No rumors yet"
        emptyDescription="Create tavern gossip and plot hooks."
        emptyCTALabel="Create Your First Rumor"
        onEmptyCTAClick={() => openGenerator("rumor")}
        hasItems={filteredItems.length > 0}
      >
        <div className="space-y-3">
          {filteredItems.map((rumor) => {
            const veracityColor =
              veracityColors[rumor.veracity] || veracityColors.partially_true;
            return (
              <div
                key={rumor.id}
                onClick={() => setViewingItem(rumor)}
                className="bg-background-panel border border-rose-500/30 rounded-xl p-4 hover:border-rose-500/50 transition-colors cursor-pointer"
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-text mb-2 line-clamp-3 italic">
                      &ldquo;{rumor.text}&rdquo;
                    </p>
                    <div className="flex flex-wrap gap-2 items-center">
                      <span
                        className={`px-2 py-1 ${veracityColor.bg} ${veracityColor.text} rounded text-xs capitalize`}
                      >
                        {rumor.veracity.replace("_", " ")}
                      </span>
                      {rumor.revealed && (
                        <span className="px-2 py-1 bg-purple-500/10 text-purple-400 rounded text-xs">
                          Revealed
                        </span>
                      )}
                      {rumor.source && (
                        <span className="text-text-muted text-sm">
                          Source: {rumor.source}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAssignModalItem({
                          id: rumor.id,
                          name: rumor.text.substring(0, 40),
                          currentCampaignId: rumor.campaign_id,
                        });
                      }}
                      className="p-1.5 hover:bg-background rounded text-text-muted hover:text-text"
                    >
                      <Icon name="FolderInput" className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(rumor);
                      }}
                      className="p-1.5 hover:bg-red-500/10 rounded text-text-muted hover:text-red-400"
                    >
                      <Icon name="Trash2" className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ContentListLayout>

      {viewingItem && !editingItem && (
        <RumorDetailModal
          rumor={viewingItem}
          onClose={() => setViewingItem(null)}
          onDelete={() => handleDelete(viewingItem)}
          onEdit={() => setEditingItem(viewingItem)}
        />
      )}

      {/* Edit Modal */}
      {editingItem && (
        <EditRumorModal
          rumor={editingItem}
          onClose={() => {
            setEditingItem(null);
            setViewingItem(null);
          }}
          onSave={handleSave}
        />
      )}

      {assignModalItem && (
        <AssignCampaignModal
          isOpen={true}
          onClose={() => setAssignModalItem(null)}
          contentType="rumors"
          contentId={assignModalItem.id}
          contentName={assignModalItem.name}
          currentCampaignId={assignModalItem.currentCampaignId}
          onSuccess={refresh}
        />
      )}
    </div>
  );
}

interface RumorDetailModalProps {
  rumor: Rumor;
  onClose: () => void;
  onDelete: () => void;
  onEdit: () => void;
}

function RumorDetailModal({
  rumor,
  onClose,
  onDelete,
  onEdit,
}: RumorDetailModalProps) {
  const veracityColor =
    veracityColors[rumor.veracity] || veracityColors.partially_true;

  let tags: any[] = [];
  try {
    tags = rumor.tags
      ? typeof rumor.tags === "string"
        ? JSON.parse(rumor.tags)
        : rumor.tags
      : [];
  } catch (err) {
    logger.error("Failed to parse rumor tags:", err);
  }

  return (
    <ContentDetailModal
      isOpen={true}
      onClose={onClose}
      icon="Quote"
      iconColor="rose"
      title="Rumor"
      subtitle={rumor.source ? `Source: ${rumor.source}` : undefined}
      onDelete={onDelete}
      onEdit={onEdit}
    >
      <div className="space-y-6">
        <div className="bg-rose-500/5 p-6 rounded-lg border border-rose-500/20">
          <p className="text-text text-lg italic leading-relaxed">
            &ldquo;{rumor.text}&rdquo;
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div
            className={`px-4 py-2 ${veracityColor.bg} border border-rose-500/30 rounded-lg`}
          >
            <p className="text-xs text-text-muted">Veracity</p>
            <p
              className={`text-lg font-semibold ${veracityColor.text} capitalize`}
            >
              {rumor.veracity.replace("_", " ")}
            </p>
          </div>
          {rumor.revealed && (
            <div className="px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <p className="text-xs text-text-muted">Status</p>
              <p className="text-lg font-semibold text-purple-400">Revealed</p>
            </div>
          )}
        </div>

        {rumor.context && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Context
            </h4>
            <p className="text-text leading-relaxed">{rumor.context}</p>
          </div>
        )}

        {rumor.leads_to && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Leads To
            </h4>
            <p className="text-text leading-relaxed capitalize">
              {rumor.leads_to}
              {rumor.related_id && (
                <span className="text-text-muted ml-2 text-sm">
                  (ID: {rumor.related_id.substring(0, 8)})
                </span>
              )}
            </p>
          </div>
        )}

        {tags.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
              Tags
            </h4>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag: string, i: number) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-rose-500/10 text-rose-400 rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {rumor.foreshadowing && (
          <div className="bg-amber-500/10 p-3 rounded-lg border border-amber-500/30">
            <p className="text-amber-400 font-medium">
              ⚡ This rumor foreshadows future events
            </p>
          </div>
        )}
      </div>
    </ContentDetailModal>
  );
}

interface EditRumorModalProps {
  rumor: Rumor;
  onClose: () => void;
  onSave: (id: string, updates: UpdateRumorRequest) => Promise<void>;
}

function EditRumorModal({ rumor, onClose, onSave }: EditRumorModalProps) {
  const [formData, setFormData] = useState({
    text: rumor.text,
    source: rumor.source || "",
    truth_level: rumor.veracity,
    related_id: rumor.related_id || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const updates: UpdateRumorRequest = {
        rumor_text: formData.text,
        source: formData.source || undefined,
        truth_level: formData.truth_level,
        related_id: formData.related_id || undefined,
      };

      await onSave(rumor.id, updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save rumor");
      setSaving(false);
    }
  };

  return (
    <ContentDetailModal
      isOpen={true}
      onClose={onClose}
      icon="Quote"
      iconColor="rose"
      title="Edit Rumor"
      subtitle={rumor.source || undefined}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-text-muted mb-2">
            Rumor Text *
          </label>
          <textarea
            value={formData.text}
            onChange={(e) => setFormData({ ...formData, text: e.target.value })}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
            rows={4}
            placeholder="The rumor text..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-muted mb-2">
            Source
          </label>
          <input
            type="text"
            value={formData.source}
            onChange={(e) =>
              setFormData({ ...formData, source: e.target.value })
            }
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
            placeholder="Tavern keeper, Guard, Merchant..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-muted mb-2">
            Truth Level *
          </label>
          <select
            value={formData.truth_level}
            onChange={(e) =>
              setFormData({ ...formData, truth_level: e.target.value })
            }
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
            required
          >
            <option value="true">True</option>
            <option value="partially_true">Partially True</option>
            <option value="false">False</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-muted mb-2">
            Related ID
          </label>
          <input
            type="text"
            value={formData.related_id}
            onChange={(e) =>
              setFormData({ ...formData, related_id: e.target.value })
            }
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
            placeholder="ID of related content..."
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
