import { useEffect, useState, useMemo, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import Icon from "../../../../common/Icon";
import {
  useCampaignStore,
  type CampaignContent,
} from "../../../../../store/campaignStore";
import { logger } from "../../../../../utils/logger";
import CampaignContentEditorModal from "../../../../campaign/CampaignContentEditorModal";

interface FactionsContentProps {
  campaignId: string;
}

/**
 * FactionsContent - Display factions from the campaign.
 */
export default function FactionsContent({ campaignId }: FactionsContentProps) {
  const { fetchCampaignContent, deleteCampaignContent, createCampaignContent } =
    useCampaignStore();

  const [factions, setFactions] = useState<CampaignContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingFaction, setViewingFaction] = useState<CampaignContent | null>(
    null,
  );
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const loadFactions = async () => {
      setLoading(true);
      setError(null);
      try {
        const content = await fetchCampaignContent(campaignId, "factions");
        setFactions(content);
      } catch (err) {
        setError("Failed to load factions");
        logger.error("Failed to load factions:", err);
      } finally {
        setLoading(false);
      }
    };
    loadFactions();
  }, [campaignId, fetchCampaignContent]);

  const refreshContent = useCallback(async () => {
    try {
      const content = await fetchCampaignContent(campaignId, "factions");
      setFactions(content);
    } catch (err) {
      logger.error("Failed to refresh content:", err);
    }
  }, [campaignId, fetchCampaignContent]);

  const filteredFactions = useMemo(() => {
    if (!searchQuery) return factions;
    const query = searchQuery.toLowerCase();
    return factions.filter(
      (faction) =>
        faction.title.toLowerCase().includes(query) ||
        faction.content?.toLowerCase().includes(query),
    );
  }, [factions, searchQuery]);

  const handleDelete = async (faction: CampaignContent) => {
    if (window.confirm(`Delete "${faction.title}"? This cannot be undone.`)) {
      try {
        await deleteCampaignContent(campaignId, faction.id);
        setFactions((prev) => prev.filter((f) => f.id !== faction.id));
        if (viewingFaction?.id === faction.id) {
          setViewingFaction(null);
        }
      } catch (err) {
        logger.error("Failed to delete faction:", err);
      }
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
        section: "factions",
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
            placeholder="Search factions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            id="factions-file-upload"
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading}
            accept=".txt,.md,.markdown,.pdf"
          />
          <label
            htmlFor="factions-file-upload"
            className="flex items-center gap-2 px-4 py-2 bg-background-panel hover:bg-background border border-border text-text font-medium rounded-lg transition-colors text-sm cursor-pointer"
          >
            <Icon name="Upload" className="w-4 h-4" />
            {uploading ? "Importing..." : "Import File"}
          </label>
          <button
            onClick={() => setShowEditorModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors text-sm"
          >
            <Icon name="Plus" className="w-4 h-4" />
            Add Faction
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
      {!loading && filteredFactions.length === 0 && (
        <div className="text-center py-8 bg-background-panel border border-border rounded-xl">
          <Icon
            name="Shield"
            className="w-10 h-10 text-text-muted mx-auto mb-3"
          />
          <h3 className="text-text font-medium mb-1">
            {searchQuery ? "No matching factions" : "No factions yet"}
          </h3>
          <p className="text-text-muted text-sm mb-4">
            {searchQuery
              ? "Try adjusting your search."
              : "Add organizations, guilds, and power groups to your campaign."}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowEditorModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors text-sm mx-auto"
            >
              <Icon name="Plus" className="w-4 h-4" />
              Add Faction
            </button>
          )}
        </div>
      )}

      {/* Faction Grid */}
      {!loading && filteredFactions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredFactions.map((faction) => (
            <div
              key={faction.id}
              onClick={() => setViewingFaction(faction)}
              className="bg-background-panel border border-purple-500/30 rounded-xl p-4 hover:border-purple-500/50 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                    <Icon name="Shield" className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-text font-medium">{faction.title}</h4>
                    {faction.content && (
                      <p className="text-text-muted text-sm mt-1 line-clamp-2">
                        {faction.content.substring(0, 100)}...
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(faction);
                  }}
                  className="p-1.5 hover:bg-red-500/10 rounded text-text-muted hover:text-red-400 flex-shrink-0"
                >
                  <Icon name="Trash2" className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Modal */}
      {viewingFaction && (
        <FactionDetailModal
          faction={viewingFaction}
          onClose={() => setViewingFaction(null)}
          onDelete={() => handleDelete(viewingFaction)}
        />
      )}

      <CampaignContentEditorModal
        isOpen={showEditorModal}
        onClose={() => setShowEditorModal(false)}
        campaignId={campaignId}
        section="factions"
        onSaved={refreshContent}
      />
    </div>
  );
}

// Faction Detail Modal
interface FactionDetailModalProps {
  faction: CampaignContent;
  onClose: () => void;
  onDelete: () => void;
}

function FactionDetailModal({
  faction,
  onClose,
  onDelete,
}: FactionDetailModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-background-panel border border-border rounded-xl w-full max-w-5xl h-[95vh] sm:h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-border px-4 sm:px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Icon name="Shield" className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-text">
                {faction.title}
              </h3>
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
          {faction.content ? (
            <div className="prose prose-invert prose-tavern max-w-none">
              <ReactMarkdown>
                {faction.content.replace(/\\n/g, "\n")}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-text-muted italic">No content</p>
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
          <button
            onClick={onClose}
            className="px-5 py-2 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
