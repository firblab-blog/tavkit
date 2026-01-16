import { useEffect, useState, useMemo, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import Icon from "../../../../common/Icon";
import {
  useCampaignStore,
  type CampaignContent,
} from "../../../../../store/campaignStore";
import { logger } from "../../../../../utils/logger";
import CampaignContentEditorModal from "../../../../campaign/CampaignContentEditorModal";
import {
  updateCampaignContent,
  UpdateCampaignContentRequest,
} from "../../../../../api/campaignContent";

interface MonstersContentProps {
  campaignId: string;
}

/**
 * MonstersContent - Display monsters from the campaign using campaign_content system.
 */
export default function MonstersContent({ campaignId }: MonstersContentProps) {
  const { fetchCampaignContent, deleteCampaignContent, createCampaignContent } =
    useCampaignStore();

  const [monsters, setMonsters] = useState<CampaignContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingMonster, setViewingMonster] = useState<CampaignContent | null>(
    null,
  );
  const [editingItem, setEditingItem] = useState<CampaignContent | null>(null);
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const loadMonsters = async () => {
      setLoading(true);
      setError(null);
      try {
        const content = await fetchCampaignContent(campaignId, "monsters");
        setMonsters(content);
      } catch (err) {
        setError("Failed to load monsters");
        logger.error("Failed to load monsters:", err);
      } finally {
        setLoading(false);
      }
    };
    loadMonsters();
  }, [campaignId, fetchCampaignContent]);

  const refreshContent = useCallback(async () => {
    try {
      const content = await fetchCampaignContent(campaignId, "monsters");
      setMonsters(content);
    } catch (err) {
      logger.error("Failed to refresh content:", err);
    }
  }, [campaignId, fetchCampaignContent]);

  const filteredMonsters = useMemo(() => {
    if (!searchQuery) return monsters;
    const query = searchQuery.toLowerCase();
    return monsters.filter(
      (monster) =>
        monster.title.toLowerCase().includes(query) ||
        monster.content?.toLowerCase().includes(query),
    );
  }, [monsters, searchQuery]);

  const handleDelete = async (monster: CampaignContent) => {
    if (window.confirm(`Delete "${monster.title}"? This cannot be undone.`)) {
      try {
        await deleteCampaignContent(campaignId, monster.id);
        setMonsters((prev) => prev.filter((m) => m.id !== monster.id));
        if (viewingMonster?.id === monster.id) {
          setViewingMonster(null);
        }
      } catch (err) {
        logger.error("Failed to delete monster:", err);
      }
    }
  };

  const handleSave = async (
    contentId: string,
    updates: UpdateCampaignContentRequest,
  ) => {
    try {
      await updateCampaignContent(campaignId, contentId, updates);
      await refreshContent();
      setEditingItem(null);
      setViewingMonster(null);
    } catch (err) {
      logger.error("Failed to update monster:", err);
      throw err;
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      let content = "";
      const fileType = file.type;

      if (fileType.startsWith("image/")) {
        const reader = new FileReader();
        content = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } else {
        content = await file.text();
        // eslint-disable-next-line no-control-regex
        content = content.replace(/\x00/g, "");
      }

      await createCampaignContent(campaignId, {
        section: "monsters",
        subsection: null,
        title: file.name.replace(/\.[^/.]+$/, ""),
        content: content,
        type: "imported",
        file_name: file.name,
      });

      await refreshContent();
    } catch (error) {
      logger.error("File upload failed:", error);
      alert("Failed to import file");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Icon
            name="Search"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
          />
          <input
            type="text"
            placeholder="Search monsters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            id="monsters-file-upload"
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading}
            accept=".txt,.md,.markdown,.pdf,image/*,.jpg,.jpeg,.png,.gif,.webp"
          />
          <label
            htmlFor="monsters-file-upload"
            className="flex items-center gap-2 px-4 py-2 bg-background-panel hover:bg-background border border-border text-text font-medium rounded-lg transition-colors text-sm cursor-pointer"
          >
            <Icon name="Upload" className="w-4 h-4" />
            {uploading ? "Importing..." : "Import File"}
          </label>
          <button
            onClick={() => setShowEditorModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors text-sm"
          >
            <Icon name="Plus" className="w-4 h-4" />
            Add Monster
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Icon name="Loader2" className="w-6 h-6 text-primary animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredMonsters.length === 0 && (
        <div className="text-center py-8 bg-background-panel border border-border rounded-xl">
          <Icon
            name="Skull"
            className="w-10 h-10 text-text-muted mx-auto mb-3"
          />
          <h3 className="text-text font-medium mb-1">
            {searchQuery ? "No matching monsters" : "No monsters yet"}
          </h3>
          <p className="text-text-muted text-sm mb-4">
            {searchQuery
              ? "Try adjusting your search."
              : "Add custom monsters, bosses, and creatures."}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowEditorModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors text-sm mx-auto"
            >
              <Icon name="Plus" className="w-4 h-4" />
              Add Monster
            </button>
          )}
        </div>
      )}

      {/* Monster Grid */}
      {!loading && filteredMonsters.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMonsters.map((monster) => (
            <div
              key={monster.id}
              onClick={() => setViewingMonster(monster)}
              className="bg-background-panel border border-orange-500/30 rounded-xl p-4 hover:border-orange-500/50 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                    <Icon name="Skull" className="w-5 h-5 text-orange-400" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-text font-medium truncate">
                      {monster.title}
                    </h4>
                    {monster.subsection && (
                      <p className="text-text-muted text-sm">
                        {monster.subsection}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(monster);
                  }}
                  className="p-1 hover:bg-red-500/10 rounded text-text-muted hover:text-red-400 flex-shrink-0"
                >
                  <Icon name="Trash2" className="w-4 h-4" />
                </button>
              </div>

              {monster.content && (
                <p className="text-text-muted text-sm line-clamp-2">
                  {monster.content.substring(0, 150)}
                  {monster.content.length > 150 ? "..." : ""}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* View Modal */}
      {viewingMonster && !editingItem && (
        <MonsterDetailModal
          monster={viewingMonster}
          onClose={() => setViewingMonster(null)}
          onDelete={() => handleDelete(viewingMonster)}
          onEdit={() => setEditingItem(viewingMonster)}
        />
      )}

      {/* Edit Modal */}
      {editingItem && (
        <EditMonsterModal
          monster={editingItem}
          onClose={() => {
            setEditingItem(null);
            setViewingMonster(null);
          }}
          onSave={handleSave}
        />
      )}

      {/* New Monster Editor Modal */}
      <CampaignContentEditorModal
        isOpen={showEditorModal}
        campaignId={campaignId}
        section="monsters"
        onClose={() => setShowEditorModal(false)}
        onSaved={async () => {
          await refreshContent();
          setShowEditorModal(false);
        }}
      />
    </div>
  );
}

// Monster Detail Modal
interface MonsterDetailModalProps {
  monster: CampaignContent;
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
  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-background-panel border border-border rounded-xl w-full max-w-5xl h-[95vh] sm:h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-border px-4 sm:px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Icon name="Skull" className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-text">
                {monster.title}
              </h3>
              {monster.subsection && (
                <p className="text-sm text-text-muted">{monster.subsection}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-background rounded-lg text-text-muted hover:text-text"
          >
            <Icon name="X" className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {monster.content ? (
            <div className="prose prose-invert prose-tavern max-w-none">
              <ReactMarkdown>
                {monster.content.replace(/\\n/g, "\n")}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-text-muted italic">No content yet</p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 sm:px-6 py-4 flex justify-between flex-shrink-0">
          <button
            onClick={onDelete}
            className="px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-sm flex items-center gap-2"
          >
            <Icon name="Trash2" className="w-4 h-4" />
            Delete
          </button>
          <div className="flex gap-3">
            <button
              onClick={onEdit}
              className="px-4 py-2 text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors text-sm flex items-center gap-2"
            >
              <Icon name="Edit" className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface EditMonsterModalProps {
  monster: CampaignContent;
  onClose: () => void;
  onSave: (
    contentId: string,
    updates: UpdateCampaignContentRequest,
  ) => Promise<void>;
}

function EditMonsterModal({ monster, onClose, onSave }: EditMonsterModalProps) {
  const [formData, setFormData] = useState({
    title: monster.title,
    content: monster.content || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const updates: UpdateCampaignContentRequest = {
        title: formData.title,
        content: formData.content || undefined,
      };

      await onSave(monster.id, updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save monster");
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-background-panel border border-border rounded-xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-border px-4 sm:px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Icon name="Skull" className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-text">
                Edit Monster
              </h3>
              <p className="text-sm text-text-muted">{monster.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-background rounded-lg text-text-muted hover:text-text"
          >
            <Icon name="X" className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4"
        >
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">
              Content
            </label>
            <textarea
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary font-mono text-sm"
              rows={20}
              placeholder="Monster description, stats, abilities... (Markdown supported)"
            />
            <p className="text-xs text-text-muted mt-1">
              Supports Markdown formatting
            </p>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
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
      </div>
    </div>
  );
}
