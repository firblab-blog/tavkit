/**
 * CampaignContentEditorModal - Modal for creating/editing campaign content.
 *
 * Used for manual content entry (Sessions, Factions, Lore, GM Notes, etc.)
 * that doesn't have a dedicated AI generator.
 */
import { useState, useRef, useEffect } from "react";
import Icon, { IconName } from "../common/Icon";
import MarkdownToolbar from "../common/MarkdownToolbar";
import {
  useCampaignStore,
  type CampaignContent,
} from "../../store/campaignStore";
import { logger } from "@/utils/logger";

export type ContentSection = "sessions" | "factions" | "lore" | "gm-notes";

interface CampaignContentEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  section: ContentSection;
  editingContent?: CampaignContent | null;
  onSaved?: () => void;
}

const SECTION_CONFIG: Record<
  ContentSection,
  { title: string; icon: IconName; color: string; placeholder: string }
> = {
  sessions: {
    title: "Session Notes",
    icon: "Calendar",
    color: "blue",
    placeholder:
      "Write your session notes here... You can use Markdown for formatting.",
  },
  factions: {
    title: "Faction",
    icon: "Shield",
    color: "purple",
    placeholder:
      "Describe this faction - their goals, members, relationships, and influence...",
  },
  lore: {
    title: "Lore Entry",
    icon: "BookOpen",
    color: "amber",
    placeholder:
      "Document world lore, history, legends, or other background information...",
  },
  "gm-notes": {
    title: "GM Note",
    icon: "FileEdit",
    color: "rose",
    placeholder: "Write private GM notes, plot ideas, or reminders...",
  },
};

export default function CampaignContentEditorModal({
  isOpen,
  onClose,
  campaignId,
  section,
  editingContent,
  onSaved,
}: CampaignContentEditorModalProps) {
  const { createCampaignContent, updateCampaignContent } = useCampaignStore();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const config = SECTION_CONFIG[section];
  const isEditing = !!editingContent;

  // Populate form when editing
  useEffect(() => {
    if (editingContent) {
      setTitle(editingContent.title);
      setContent(editingContent.content || "");
    } else {
      setTitle("");
      setContent("");
    }
    setError(null);
  }, [editingContent, isOpen]);

  // Focus title input when modal opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure modal is rendered
      const timer = setTimeout(() => {
        const titleInput = document.getElementById("content-title-input");
        titleInput?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Map section names to backend section format
      const backendSection = section === "gm-notes" ? "gm_notes" : section;

      if (isEditing && editingContent) {
        await updateCampaignContent(campaignId, editingContent.id, {
          title: title.trim(),
          content: content.trim(),
        });
      } else {
        await createCampaignContent(campaignId, {
          section: backendSection,
          subsection: null,
          title: title.trim(),
          content: content.trim(),
          type: "manual",
        });
      }

      onSaved?.();
      onClose();
    } catch (err) {
      logger.error("Failed to save content:", err);
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-background-panel border border-border rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 fade-in duration-200">
        {/* Header */}
        <div
          className={`px-6 py-4 border-b border-border bg-gradient-to-r from-${config.color}-500/10 to-transparent`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg bg-${config.color}-500/10 flex items-center justify-center`}
              >
                <Icon
                  name={config.icon}
                  className={`w-5 h-5 text-${config.color}-400`}
                />
              </div>
              <div>
                <h2 className="text-xl font-bold text-text">
                  {isEditing ? `Edit ${config.title}` : `New ${config.title}`}
                </h2>
                <p className="text-sm text-text-muted">
                  {isEditing
                    ? "Update your content"
                    : "Add new content to your campaign"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-background rounded-lg text-text-muted hover:text-text transition-colors"
            >
              <Icon name="X" className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Title Input */}
          <div>
            <label
              htmlFor="content-title-input"
              className="block text-sm font-medium text-text mb-2"
            >
              Title <span className="text-red-400">*</span>
            </label>
            <input
              id="content-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Enter ${config.title.toLowerCase()} title...`}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Content Editor */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Content
            </label>
            <div className="border border-border rounded-lg overflow-hidden">
              <MarkdownToolbar
                textareaRef={textareaRef}
                value={content}
                onChange={setContent}
              />
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={config.placeholder}
                rows={12}
                className="w-full px-4 py-3 bg-background text-text placeholder-text-muted focus:outline-none resize-none font-mono text-sm"
              />
            </div>
            <p className="text-xs text-text-muted mt-2">
              Supports Markdown formatting. Use the toolbar above for quick
              formatting.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-text-muted hover:text-text hover:bg-background rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className={`px-6 py-2 bg-${config.color}-500 hover:bg-${config.color}-600 disabled:bg-${config.color}-500/50 text-white font-medium rounded-lg transition-colors flex items-center gap-2`}
          >
            {saving ? (
              <>
                <Icon name="Loader2" className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Icon name="Save" className="w-4 h-4" />
                {isEditing ? "Update" : "Save"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
