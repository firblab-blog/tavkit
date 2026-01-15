import { useState } from "react";
import Icon from "../../common/Icon";
import {
  usePlayerJournalStore,
  JournalEntry,
  TaggedEntity,
} from "../../../store/playerJournalStore";

interface JournalEditorProps {
  entry?: JournalEntry | null;
  characterId?: string;
  campaignId?: string;
  onClose: () => void;
}

export default function JournalEditor({
  entry,
  characterId,
  campaignId,
  onClose,
}: JournalEditorProps) {
  const { createEntry, updateEntry, loading } = usePlayerJournalStore();
  const isEditing = !!entry;

  const [title, setTitle] = useState(entry?.title || "");
  const [content, setContent] = useState(entry?.content || "");
  const [sessionNumber, setSessionNumber] = useState(
    entry?.session_number?.toString() || "",
  );
  const [sessionDate, setSessionDate] = useState(entry?.session_date || "");
  const [isPrivate, setIsPrivate] = useState(entry?.is_private ?? true);
  const [taggedNPCs, setTaggedNPCs] = useState<TaggedEntity[]>(
    entry?.tagged_npcs || [],
  );
  const [taggedLocations, setTaggedLocations] = useState<TaggedEntity[]>(
    entry?.tagged_locations || [],
  );
  const [taggedQuests, setTaggedQuests] = useState<TaggedEntity[]>(
    entry?.tagged_quests || [],
  );
  const [newTag, setNewTag] = useState({ type: "npc", name: "" });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    try {
      if (isEditing && entry) {
        await updateEntry(entry.id, {
          title: title.trim(),
          content: content.trim() || undefined,
          session_number: sessionNumber ? parseInt(sessionNumber) : undefined,
          session_date: sessionDate || undefined,
          is_private: isPrivate,
          tagged_npcs: taggedNPCs,
          tagged_locations: taggedLocations,
          tagged_quests: taggedQuests,
        });
      } else {
        await createEntry({
          campaign_id: campaignId,
          character_id: characterId,
          title: title.trim(),
          content: content.trim() || undefined,
          session_number: sessionNumber ? parseInt(sessionNumber) : undefined,
          session_date: sessionDate || undefined,
          is_private: isPrivate,
          tagged_npcs: taggedNPCs,
          tagged_locations: taggedLocations,
          tagged_quests: taggedQuests,
        });
      }
      onClose();
    } catch {
      setError("Failed to save journal entry");
    }
  };

  const addTag = () => {
    if (!newTag.name.trim()) return;

    const tag: TaggedEntity = { name: newTag.name.trim() };

    switch (newTag.type) {
      case "npc":
        setTaggedNPCs([...taggedNPCs, tag]);
        break;
      case "location":
        setTaggedLocations([...taggedLocations, tag]);
        break;
      case "quest":
        setTaggedQuests([...taggedQuests, tag]);
        break;
    }

    setNewTag({ ...newTag, name: "" });
  };

  const removeTag = (type: string, index: number) => {
    switch (type) {
      case "npc":
        setTaggedNPCs(taggedNPCs.filter((_, i) => i !== index));
        break;
      case "location":
        setTaggedLocations(taggedLocations.filter((_, i) => i !== index));
        break;
      case "quest":
        setTaggedQuests(taggedQuests.filter((_, i) => i !== index));
        break;
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={handleSubmit}
        className="bg-background-panel border border-border rounded-xl w-full max-w-2xl my-8"
      >
        {/* Header */}
        <div className="sticky top-0 bg-background-panel border-b border-border rounded-t-xl px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <Icon name="BookOpen" className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-bold text-text">
              {isEditing ? "Edit Journal Entry" : "New Journal Entry"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-background rounded-lg transition-colors text-text-muted hover:text-text"
          >
            <Icon name="X" className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="A Fateful Encounter..."
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary"
            />
          </div>

          {/* Session Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">
                Session Number
              </label>
              <input
                type="number"
                value={sessionNumber}
                onChange={(e) => setSessionNumber(e.target.value)}
                placeholder="e.g., 12"
                min="1"
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">
                Session Date
              </label>
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">
              Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write about what happened during the session..."
              rows={8}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary resize-y"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">
              Tags
            </label>

            {/* Add Tag */}
            <div className="flex gap-2 mb-3">
              <select
                value={newTag.type}
                onChange={(e) => setNewTag({ ...newTag, type: e.target.value })}
                className="px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
              >
                <option value="npc">NPC</option>
                <option value="location">Location</option>
                <option value="quest">Quest</option>
              </select>
              <input
                type="text"
                value={newTag.name}
                onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                placeholder={`${newTag.type === "npc" ? "NPC" : newTag.type === "location" ? "Location" : "Quest"} name...`}
                className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-background hover:bg-background/80 border border-border rounded-lg text-text transition-colors"
              >
                <Icon name="Plus" className="w-4 h-4" />
              </button>
            </div>

            {/* Tag List */}
            <div className="flex flex-wrap gap-2">
              {taggedNPCs.map((npc, i) => (
                <span
                  key={`npc-${i}`}
                  className="px-2 py-1 bg-blue-500/10 text-blue-300 text-sm rounded flex items-center gap-1"
                >
                  <Icon name="User" className="w-3 h-3" />
                  {npc.name}
                  <button
                    type="button"
                    onClick={() => removeTag("npc", i)}
                    className="ml-1 hover:text-blue-100"
                  >
                    <Icon name="X" className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {taggedLocations.map((loc, i) => (
                <span
                  key={`loc-${i}`}
                  className="px-2 py-1 bg-emerald-500/10 text-emerald-300 text-sm rounded flex items-center gap-1"
                >
                  <Icon name="MapPin" className="w-3 h-3" />
                  {loc.name}
                  <button
                    type="button"
                    onClick={() => removeTag("location", i)}
                    className="ml-1 hover:text-emerald-100"
                  >
                    <Icon name="X" className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {taggedQuests.map((quest, i) => (
                <span
                  key={`quest-${i}`}
                  className="px-2 py-1 bg-amber-500/10 text-amber-300 text-sm rounded flex items-center gap-1"
                >
                  <Icon name="Target" className="w-3 h-3" />
                  {quest.name}
                  <button
                    type="button"
                    onClick={() => removeTag("quest", i)}
                    className="ml-1 hover:text-amber-100"
                  >
                    <Icon name="X" className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Privacy Toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsPrivate(!isPrivate)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                isPrivate ? "bg-blue-500" : "bg-border"
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  isPrivate ? "left-7" : "left-1"
                }`}
              />
            </button>
            <span className="text-sm text-text-muted flex items-center gap-1">
              <Icon name={isPrivate ? "EyeOff" : "Globe"} className="w-4 h-4" />
              {isPrivate
                ? "Private (only you can see)"
                : "Shared (party can see)"}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-text-muted hover:text-text transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading && (
              <Icon name="Loader2" className="w-4 h-4 animate-spin" />
            )}
            {isEditing ? "Save Changes" : "Create Entry"}
          </button>
        </div>
      </form>
    </div>
  );
}
