import { useEffect, useState, useMemo } from "react";
import Icon from "../../../../common/Icon";
import {
  useCampaignStore,
  type CampaignContent,
} from "../../../../../store/campaignStore";
import { logger } from "../../../../../utils/logger";
import {
  updateCampaignContent,
  UpdateCampaignContentRequest,
} from "../../../../../api/campaignContent";

interface MapsArtContentProps {
  campaignId: string;
}

type MediaType = "all" | "maps" | "art";

/**
 * MapsArtContent - Display maps and art from the campaign.
 */
export default function MapsArtContent({ campaignId }: MapsArtContentProps) {
  const { fetchCampaignContent, deleteCampaignContent, createCampaignContent } =
    useCampaignStore();

  const [maps, setMaps] = useState<CampaignContent[]>([]);
  const [art, setArt] = useState<CampaignContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mediaFilter, setMediaFilter] = useState<MediaType>("all");
  const [viewingMedia, setViewingMedia] = useState<CampaignContent | null>(
    null,
  );
  const [editingMedia, setEditingMedia] = useState<CampaignContent | null>(
    null,
  );
  const [uploading, setUploading] = useState(false);

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

  const refreshMedia = async () => {
    try {
      const [mapsContent, artContent] = await Promise.all([
        fetchCampaignContent(campaignId, "maps"),
        fetchCampaignContent(campaignId, "art"),
      ]);
      setMaps(mapsContent);
      setArt(artContent);
    } catch (err) {
      logger.error("Failed to refresh media:", err);
    }
  };

  const handleSave = async (
    contentId: string,
    updates: UpdateCampaignContentRequest,
  ) => {
    try {
      await updateCampaignContent(campaignId, contentId, updates);
      await refreshMedia();
      setEditingMedia(null);
      setViewingMedia(null);
    } catch (err) {
      logger.error("Failed to update media:", err);
      throw err;
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    section: "maps" | "art",
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
        section: section,
        subsection: null,
        title: file.name.replace(/\.[^/.]+$/, ""),
        content: content,
        type: "imported",
        file_name: file.name,
      });

      await refreshMedia();
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
        <div className="flex items-center gap-2">
          <input
            type="file"
            id="maps-file-upload"
            className="hidden"
            onChange={(e) => handleFileUpload(e, "maps")}
            disabled={uploading}
            accept="image/*,.jpg,.jpeg,.png,.gif,.webp,.svg"
          />
          <label
            htmlFor="maps-file-upload"
            className="flex items-center gap-2 px-4 py-2 bg-background-panel hover:bg-background border border-border text-text font-medium rounded-lg transition-colors text-sm cursor-pointer"
          >
            <Icon name="Map" className="w-4 h-4" />
            {uploading ? "Importing..." : "Import Map"}
          </label>
          <input
            type="file"
            id="art-file-upload"
            className="hidden"
            onChange={(e) => handleFileUpload(e, "art")}
            disabled={uploading}
            accept="image/*,.jpg,.jpeg,.png,.gif,.webp,.svg"
          />
          <label
            htmlFor="art-file-upload"
            className="flex items-center gap-2 px-4 py-2 bg-background-panel hover:bg-background border border-border text-text font-medium rounded-lg transition-colors text-sm cursor-pointer"
          >
            <Icon name="Palette" className="w-4 h-4" />
            {uploading ? "Importing..." : "Import Art"}
          </label>
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
              <div className="aspect-square bg-background flex items-center justify-center overflow-hidden">
                {(() => {
                  // Check if content is image data (with or without data URL prefix)
                  const isDataUrl = media.content?.startsWith("data:image/");
                  const isRawBase64 =
                    !isDataUrl &&
                    media.content &&
                    media.content.length > 100 &&
                    !media.content.includes(" ") &&
                    (media.file_name?.match(
                      /\.(jpg|jpeg|png|gif|webp|svg)$/i,
                    ) ||
                      media.content.startsWith("/9j/") ||
                      media.content.startsWith("iVBORw") ||
                      media.content.startsWith("R0lGOD"));

                  if (isDataUrl) {
                    return (
                      <img
                        src={media.content}
                        alt={media.title}
                        className="w-full h-full object-cover"
                      />
                    );
                  } else if (isRawBase64) {
                    const ext = media.file_name
                      ?.split(".")
                      .pop()
                      ?.toLowerCase();
                    let mimeType = "image/png";
                    if (
                      media.content?.startsWith("/9j/") ||
                      ext === "jpg" ||
                      ext === "jpeg"
                    )
                      mimeType = "image/jpeg";
                    else if (
                      media.content?.startsWith("R0lGOD") ||
                      ext === "gif"
                    )
                      mimeType = "image/gif";
                    else if (ext === "webp") mimeType = "image/webp";
                    return (
                      <img
                        src={`data:${mimeType};base64,${media.content}`}
                        alt={media.title}
                        className="w-full h-full object-cover"
                      />
                    );
                  } else {
                    return (
                      <Icon
                        name={media.mediaType === "maps" ? "Map" : "Image"}
                        className={`w-12 h-12 ${
                          media.mediaType === "maps"
                            ? "text-teal-400"
                            : "text-pink-400"
                        }`}
                      />
                    );
                  }
                })()}
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
      {viewingMedia && !editingMedia && (
        <MediaDetailModal
          media={viewingMedia}
          onClose={() => setViewingMedia(null)}
          onDelete={() =>
            handleDelete(
              viewingMedia as CampaignContent & { mediaType: "maps" | "art" },
            )
          }
          onEdit={() => setEditingMedia(viewingMedia)}
        />
      )}

      {/* Edit Modal */}
      {editingMedia && (
        <EditMediaModal
          media={editingMedia}
          onClose={() => {
            setEditingMedia(null);
            setViewingMedia(null);
          }}
          onSave={handleSave}
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
  onEdit: () => void;
}

function MediaDetailModal({
  media,
  onClose,
  onDelete,
  onEdit,
}: MediaDetailModalProps) {
  const isMap = media.section === "maps" || (media as any).mediaType === "maps";

  // Check if content is a base64 image data URL or raw base64 image data
  const isBase64DataUrl = media.content?.startsWith("data:image/");

  // Check if it's raw base64 data (long string without spaces, common image file extensions)
  const isRawBase64Image =
    !isBase64DataUrl &&
    media.content &&
    media.content.length > 100 &&
    !media.content.includes(" ") &&
    !media.content.includes("\n") &&
    (media.file_name?.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ||
      // Base64 image data typically starts with these patterns
      media.content.startsWith("/9j/") || // JPEG
      media.content.startsWith("iVBORw") || // PNG
      media.content.startsWith("R0lGOD")); // GIF

  const isBase64Image = isBase64DataUrl || isRawBase64Image;

  // Build the image src - add data URL prefix if missing
  const getImageSrc = () => {
    if (isBase64DataUrl) return media.content;
    if (isRawBase64Image) {
      // Detect image type from base64 header or file extension
      const ext = media.file_name?.split(".").pop()?.toLowerCase();
      let mimeType = "image/png"; // default
      if (media.content?.startsWith("/9j/") || ext === "jpg" || ext === "jpeg")
        mimeType = "image/jpeg";
      else if (media.content?.startsWith("R0lGOD") || ext === "gif")
        mimeType = "image/gif";
      else if (ext === "webp") mimeType = "image/webp";
      else if (ext === "svg") mimeType = "image/svg+xml";
      return `data:${mimeType};base64,${media.content}`;
    }
    return media.content;
  };

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
          {isBase64Image ? (
            // Render the image if it's a base64 data URL
            <img
              src={getImageSrc()}
              alt={media.title}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          ) : media.content ? (
            // Render text content if it's not an image
            <div className="text-center max-w-2xl">
              <Icon
                name={isMap ? "Map" : "Image"}
                className={`w-16 h-16 mx-auto mb-4 ${isMap ? "text-teal-400" : "text-pink-400"}`}
              />
              <p className="text-text whitespace-pre-wrap">{media.content}</p>
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
          <div className="flex gap-3">
            <button
              onClick={onEdit}
              className="px-4 py-2 text-teal-400 hover:bg-teal-500/10 rounded-lg transition-colors text-sm flex items-center gap-2"
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

interface EditMediaModalProps {
  media: CampaignContent;
  onClose: () => void;
  onSave: (
    contentId: string,
    updates: UpdateCampaignContentRequest,
  ) => Promise<void>;
}

function EditMediaModal({ media, onClose, onSave }: EditMediaModalProps) {
  const [formData, setFormData] = useState({
    title: media.title,
    content: media.content || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMap = media.section === "maps" || (media as any).mediaType === "maps";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const updates: UpdateCampaignContentRequest = {
        title: formData.title,
        content: formData.content || undefined,
      };

      await onSave(media.id, updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save media");
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
                Edit {isMap ? "Map" : "Art"}
              </h3>
              <p className="text-sm text-text-muted">{media.title}</p>
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
              placeholder="Add notes or description..."
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
