import { useState } from "react";
import Icon from "../../common/Icon";
import {
  usePartyLootStore,
  PartyLootItem,
} from "../../../store/partyLootStore";

interface LootEditorProps {
  item?: PartyLootItem | null;
  campaignId: string;
  onClose: () => void;
}

export default function LootEditor({
  item,
  campaignId,
  onClose,
}: LootEditorProps) {
  const { createLoot, updateLoot, loading } = usePartyLootStore();
  const isEditing = !!item;

  const [formData, setFormData] = useState({
    name: item?.name || "",
    description: item?.description || "",
    quantity: item?.quantity?.toString() || "1",
    value: item?.value || "",
    source: item?.source || "",
    session_acquired: item?.session_acquired?.toString() || "",
    notes: item?.notes || "",
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError("Name is required");
      return;
    }

    try {
      const data = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        quantity: parseInt(formData.quantity) || 1,
        value: formData.value.trim() || undefined,
        source: formData.source.trim() || undefined,
        session_acquired: formData.session_acquired
          ? parseInt(formData.session_acquired)
          : undefined,
        notes: formData.notes.trim() || undefined,
      };

      if (isEditing && item) {
        await updateLoot(campaignId, item.id, data);
      } else {
        await createLoot(campaignId, data);
      }
      onClose();
    } catch {
      setError("Failed to save item");
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={handleSubmit}
        className="bg-background-panel border border-border rounded-xl w-full max-w-md"
      >
        {/* Header */}
        <div className="border-b border-border px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon name="Gem" className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg font-semibold text-text">
              {isEditing ? "Edit Item" : "Add Loot"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-background rounded text-text-muted hover:text-text"
          >
            <Icon name="X" className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Name and Quantity */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-text-muted mb-1">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Item name"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">
                Qty
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value })
                }
                min="1"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Item description"
              rows={2}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary resize-y"
            />
          </div>

          {/* Value and Session */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">
                Value
              </label>
              <input
                type="text"
                value={formData.value}
                onChange={(e) =>
                  setFormData({ ...formData, value: e.target.value })
                }
                placeholder="e.g., 50 gp"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">
                Session Found
              </label>
              <input
                type="number"
                value={formData.session_acquired}
                onChange={(e) =>
                  setFormData({ ...formData, session_acquired: e.target.value })
                }
                placeholder="e.g., 5"
                min="1"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Source */}
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">
              Source
            </label>
            <input
              type="text"
              value={formData.source}
              onChange={(e) =>
                setFormData({ ...formData, source: e.target.value })
              }
              placeholder="Where was it found?"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Additional notes"
              rows={2}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary resize-y"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-5 py-4 flex justify-end gap-3">
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
            className="px-5 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading && (
              <Icon name="Loader2" className="w-4 h-4 animate-spin" />
            )}
            {isEditing ? "Save" : "Add Item"}
          </button>
        </div>
      </form>
    </div>
  );
}
