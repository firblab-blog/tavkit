import { useEffect, useState, useMemo } from "react";
import Icon from "../../../../common/Icon";
import {
  useCampaignStore,
  type CampaignContent,
} from "../../../../../store/campaignStore";
import { logger } from "../../../../../utils/logger";

interface MapsArtContentProps {
  campaignId: string;
}

type MediaType = "all" | "maps" | "art";

/**
 * MapsArtContent - Display maps and art from the campaign.
 */
export default function MapsArtContent({ campaignId }: MapsArtContentProps) {
  const { fetchCampaignContent, deleteCampaignContent } = useCampaignStore();

  const [maps, setMaps] = useState<CampaignContent[]>([]);
  const [art, setArt] = useState<CampaignContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mediaFilter, setMediaFilter] = useState<MediaType>("all");
  const [viewingMedia, setViewingMedia] = useState<CampaignContent | null>(
    null,
  );

  useEffect(() => {
    const loadMedia = async () => {
      setLoading(true);
      setError(null);
      try {
        const [mapsContent, artContent] = await Promise.all([
          fetchCampaignContent(campaignId, "maps"),
          fetchCampaignContent(campaignId, "art"),
        ]);
        setMaps(mapsContent);
        setArt(artContent);
      } catch (err) {
        setError("Failed to load maps and art");
        logger.error("Failed to load maps and art:", err);
      } finally {
        setLoading(false);
      }
    };
    loadMedia();
  }, [campaignId, fetchCampaignContent]);

  const allMedia = useMemo(() => {
    const combined = [
      ...maps.map((m) => ({ ...m, mediaType: "maps" as const })),
      ...art.map((a) => ({ ...a, mediaType: "art" as const })),
    ];
    return combined.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [maps, art]);

  const filteredMedia = useMemo(() => {
    let filtered = allMedia;
    if (mediaFilter !== "all") {
      filtered = filtered.filter((m) => m.mediaType === mediaFilter);
    }
    if (!searchQuery) return filtered;
    const query = searchQuery.toLowerCase();
    return filtered.filter(
      (media) =>
        media.title.toLowerCase().includes(query) ||
        media.content?.toLowerCase().includes(query),
    );
  }, [allMedia, searchQuery, mediaFilter]);

  const handleDelete = async (
    media: CampaignContent & { mediaType: "maps" | "art" },
  ) => {
    if (window.confirm(`Delete "${media.title}"? This cannot be undone.`)) {
      try {
        await deleteCampaignContent(campaignId, media.id);
        if (media.mediaType === "maps") {
          setMaps((prev) => prev.filter((m) => m.id !== media.id));
        } else {
          setArt((prev) => prev.filter((a) => a.id !== media.id));
        }
        if (viewingMedia?.id === media.id) {
          setViewingMedia(null);
        }
      } catch (err) {
        logger.error("Failed to delete media:", err);
      }
    }
  };

  const isImageFile = (filename?: string) => {
    if (!filename) return false;
    const ext = filename.toLowerCase().split(".").pop();
    return ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext || "");
  };

  return (
    <div className="space-y-4">
      {/* Header with search and filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-1 gap-2 sm:gap-3">
          <div className="relative flex-1 sm:max-w-xs">
            <Icon
              name="Search"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
            />
            <input
              type="text"
              placeholder="Search maps & art..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary text-sm"
            />
          </div>
          <select
            value={mediaFilter}
            onChange={(e) => setMediaFilter(e.target.value as MediaType)}
            className="px-3 py-2 bg-background border border-border rounded-lg text-text text-sm focus:outline-none focus:border-primary"
          >
            <option value="all">All</option>
            <option value="maps">Maps</option>
            <option value="art">Art</option>
          </select>
        </div>
        {/* Add button removed - will be re-added with proper functionality */}
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
      {!loading && filteredMedia.length === 0 && (
        <div className="text-center py-8 bg-background-panel border border-border rounded-xl">
          <Icon
            name="Image"
            className="w-10 h-10 text-text-muted mx-auto mb-3"
          />
          <h3 className="text-text font-medium mb-1">
            {searchQuery || mediaFilter !== "all"
              ? "No matching media"
              : "No maps or art yet"}
          </h3>
          <p className="text-text-muted text-sm mb-4">
            {searchQuery || mediaFilter !== "all"
              ? "Try adjusting your search or filter."
              : "Add battle maps, world maps, character art, and visuals."}
          </p>
          {/* Empty state CTA removed - will be re-added with proper functionality */}
        </div>
      )}

      {/* Media Grid */}
      {!loading && filteredMedia.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredMedia.map((media) => (
            <div
              key={media.id}
              onClick={() => setViewingMedia(media)}
              className={`bg-background-panel border rounded-xl overflow-hidden hover:border-opacity-70 transition-colors cursor-pointer ${
                media.mediaType === "maps"
                  ? "border-teal-500/30 hover:border-teal-500/50"
                  : "border-pink-500/30 hover:border-pink-500/50"
              }`}
            >
              {/* Thumbnail area */}
              <div className="aspect-square bg-background flex items-center justify-center">
                {isImageFile(media.file_name) ? (
                  <div className="w-full h-full flex items-center justify-center text-text-muted">
                    <Icon
                      name={media.mediaType === "maps" ? "Map" : "Image"}
                      className="w-12 h-12"
                    />
                  </div>
                ) : (
                  <Icon
                    name={media.mediaType === "maps" ? "Map" : "Image"}
                    className={`w-12 h-12 ${
                      media.mediaType === "maps"
                        ? "text-teal-400"
                        : "text-pink-400"
                    }`}
                  />
                )}
              </div>
              {/* Info */}
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-text font-medium text-sm truncate">
                      {media.title}
                    </h4>
                    <p className="text-text-muted text-xs capitalize">
                      {media.mediaType}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(media);
                    }}
                    className="p-1 hover:bg-red-500/10 rounded text-text-muted hover:text-red-400 flex-shrink-0"
                  >
                    <Icon name="Trash2" className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Modal */}
      {viewingMedia && (
        <MediaDetailModal
          media={viewingMedia}
          onClose={() => setViewingMedia(null)}
          onDelete={() =>
            handleDelete(
              viewingMedia as CampaignContent & { mediaType: "maps" | "art" },
            )
          }
        />
      )}
    </div>
  );
}

// Media Detail Modal
interface MediaDetailModalProps {
  media: CampaignContent;
  onClose: () => void;
  onDelete: () => void;
}

function MediaDetailModal({ media, onClose, onDelete }: MediaDetailModalProps) {
  const isMap = media.section === "maps" || (media as any).mediaType === "maps";

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-background-panel border border-border rounded-xl w-full max-w-5xl h-[95vh] sm:h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-border px-4 sm:px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isMap ? "bg-teal-500/10" : "bg-pink-500/10"
              }`}
            >
              <Icon
                name={isMap ? "Map" : "Image"}
                className={`w-5 h-5 ${isMap ? "text-teal-400" : "text-pink-400"}`}
              />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-text">
                {media.title}
              </h3>
              <p className="text-sm text-text-muted capitalize">
                {isMap ? "Map" : "Art"}
              </p>
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
          {media.content ? (
            <div className="text-center">
              <Icon
                name={isMap ? "Map" : "Image"}
                className={`w-24 h-24 mx-auto mb-4 ${isMap ? "text-teal-400" : "text-pink-400"}`}
              />
              <p className="text-text">{media.content}</p>
            </div>
          ) : (
            <div className="text-center">
              <Icon
                name={isMap ? "Map" : "Image"}
                className={`w-24 h-24 mx-auto mb-4 ${isMap ? "text-teal-400" : "text-pink-400"}`}
              />
              <p className="text-text-muted italic">No preview available</p>
              {media.file_name && (
                <p className="text-text-muted text-sm mt-2">
                  File: {media.file_name}
                </p>
              )}
            </div>
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
