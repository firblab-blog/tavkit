import Icon from "../../common/Icon";
import { JournalEntry } from "../../../store/playerJournalStore";

interface JournalEntryModalProps {
  entry: JournalEntry;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function JournalEntryModal({
  entry,
  onClose,
  onEdit,
  onDelete,
}: JournalEntryModalProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const tagCount =
    (entry.tagged_npcs?.length || 0) +
    (entry.tagged_locations?.length || 0) +
    (entry.tagged_quests?.length || 0);

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-background-panel border border-border rounded-xl w-full max-w-3xl my-8 relative">
        {/* Modal Header */}
        <div className="sticky top-0 bg-background-panel border-b border-border rounded-t-xl px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Icon
              name="BookOpen"
              className="w-6 h-6 text-purple-400 flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-text truncate">
                {entry.title}
              </h2>
              {entry.session_date && (
                <p className="text-sm text-text-muted">
                  {formatDate(entry.session_date)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onEdit}
              className="p-2 hover:bg-background rounded-lg transition-colors text-text-muted hover:text-text"
              title="Edit"
            >
              <Icon name="Pencil" className="w-5 h-5" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-text-muted hover:text-red-400"
              title="Delete"
            >
              <Icon name="Trash2" className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-background rounded-lg transition-colors text-text-muted hover:text-text"
            >
              <Icon name="X" className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Metadata */}
          <div className="flex flex-wrap gap-2">
            {entry.session_number && (
              <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-sm font-medium rounded-lg">
                Session {entry.session_number}
              </span>
            )}
            {entry.is_private && (
              <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-sm font-medium rounded-lg flex items-center gap-1.5">
                <Icon name="EyeOff" className="w-4 h-4" />
                Private
              </span>
            )}
            {entry.created_at && (
              <span className="px-3 py-1 bg-background text-text-muted text-sm rounded-lg">
                Created {formatDate(entry.created_at)}
              </span>
            )}
          </div>

          {/* Content */}
          {entry.content && (
            <div className="prose prose-invert max-w-none">
              <div className="text-text whitespace-pre-wrap leading-relaxed">
                {entry.content}
              </div>
            </div>
          )}

          {/* Tags */}
          {tagCount > 0 && (
            <div className="space-y-3 pt-4 border-t border-border">
              <h3 className="text-sm font-medium text-text-muted uppercase">
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {entry.tagged_npcs?.map((npc, i) => (
                  <span
                    key={`npc-${i}`}
                    className="px-3 py-1 bg-blue-500/10 text-blue-300 text-sm rounded-lg flex items-center gap-1.5"
                  >
                    <Icon name="User" className="w-3.5 h-3.5" />
                    {typeof npc === "string" ? npc : npc.name || "Unknown"}
                  </span>
                ))}
                {entry.tagged_locations?.map((location, i) => (
                  <span
                    key={`loc-${i}`}
                    className="px-3 py-1 bg-emerald-500/10 text-emerald-300 text-sm rounded-lg flex items-center gap-1.5"
                  >
                    <Icon name="MapPin" className="w-3.5 h-3.5" />
                    {typeof location === "string"
                      ? location
                      : location.name || "Unknown"}
                  </span>
                ))}
                {entry.tagged_quests?.map((quest, i) => (
                  <span
                    key={`quest-${i}`}
                    className="px-3 py-1 bg-amber-500/10 text-amber-300 text-sm rounded-lg flex items-center gap-1.5"
                  >
                    <Icon name="Scroll" className="w-3.5 h-3.5" />
                    {typeof quest === "string"
                      ? quest
                      : (quest as any).title || quest.name || "Unknown"}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
