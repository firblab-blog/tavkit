import { useState, useEffect } from "react";
import Icon from "../../../../common/Icon";
import {
  GENERATOR_CONTENT_TYPES,
  CONTENT_TYPE_GROUPS,
  getContentTypeConfig,
} from "../../../../../constants/contentTypes";
import {
  getContentTypeVisibility,
  updateContentTypeVisibility,
} from "../../../../../api/campaigns";

interface ContentVisibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  onUpdate: (types: string[]) => void;
}

export default function ContentVisibilityModal({
  isOpen,
  onClose,
  campaignId,
  onUpdate,
}: ContentVisibilityModalProps) {
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Load current visibility settings
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError("");
      getContentTypeVisibility(campaignId)
        .then((types) => {
          setSelectedTypes(new Set(types));
        })
        .catch((err) => {
          setError(err.message || "Failed to load settings");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, campaignId]);

  if (!isOpen) return null;

  const handleToggle = (typeId: string) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(typeId)) {
        next.delete(typeId);
      } else {
        next.add(typeId);
      }
      return next;
    });
  };

  const handleSelectAll = (group: "core" | "extended") => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      CONTENT_TYPE_GROUPS[group].forEach((id) => next.add(id));
      return next;
    });
  };

  const handleDeselectAll = (group: "core" | "extended") => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      CONTENT_TYPE_GROUPS[group].forEach((id) => next.delete(id));
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");

    try {
      // Preserve the order from GENERATOR_CONTENT_TYPES
      const orderedTypes = GENERATOR_CONTENT_TYPES.filter((t) =>
        selectedTypes.has(t.id),
      ).map((t) => t.id);

      const updated = await updateContentTypeVisibility(
        campaignId,
        orderedTypes,
      );
      onUpdate(updated);
      onClose();
    } catch (err: any) {
      setError(
        err.response?.data?.error || err.message || "Failed to save settings",
      );
    } finally {
      setSaving(false);
    }
  };

  const renderTypeCheckbox = (typeId: string) => {
    const config = getContentTypeConfig(typeId);
    if (!config) return null;

    const isChecked = selectedTypes.has(typeId);

    return (
      <label
        key={typeId}
        className="flex items-center gap-3 p-2 rounded-lg hover:bg-background cursor-pointer transition-colors"
      >
        <input
          type="checkbox"
          checked={isChecked}
          onChange={() => handleToggle(typeId)}
          className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0 focus:ring-1 bg-background"
        />
        <Icon
          name={config.icon}
          className={`w-4 h-4 text-${config.color}-400`}
        />
        <span className="text-text">{config.label}</span>
      </label>
    );
  };

  const coreSelected = CONTENT_TYPE_GROUPS.core.filter((id) =>
    selectedTypes.has(id),
  ).length;
  const extendedSelected = CONTENT_TYPE_GROUPS.extended.filter((id) =>
    selectedTypes.has(id),
  ).length;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-background-panel border border-border rounded-xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Icon name="Settings" className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-text">
              Campaign Content Tabs
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-1 hover:bg-background rounded-lg transition-colors"
          >
            <Icon name="X" className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          <p className="text-text-muted text-sm">
            Choose which content types appear as tabs in your campaign. You can
            always access all content from the Library.
          </p>

          {error && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Icon
                name="Loader2"
                className="w-6 h-6 text-primary animate-spin"
              />
            </div>
          ) : (
            <>
              {/* Core Content Types */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-text">
                    Core Content ({coreSelected}/
                    {CONTENT_TYPE_GROUPS.core.length})
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSelectAll("core")}
                      className="text-xs text-primary hover:text-primary-hover"
                    >
                      Select All
                    </button>
                    <span className="text-text-muted">|</span>
                    <button
                      onClick={() => handleDeselectAll("core")}
                      className="text-xs text-text-muted hover:text-text"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1 bg-background/50 rounded-lg p-2">
                  {CONTENT_TYPE_GROUPS.core.map(renderTypeCheckbox)}
                </div>
              </div>

              {/* Extended Content Types */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-text">
                    Extended Content ({extendedSelected}/
                    {CONTENT_TYPE_GROUPS.extended.length})
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSelectAll("extended")}
                      className="text-xs text-primary hover:text-primary-hover"
                    >
                      Select All
                    </button>
                    <span className="text-text-muted">|</span>
                    <button
                      onClick={() => handleDeselectAll("extended")}
                      className="text-xs text-text-muted hover:text-text"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1 bg-background/50 rounded-lg p-2">
                  {CONTENT_TYPE_GROUPS.extended.map(renderTypeCheckbox)}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border bg-background/50 flex-shrink-0">
          <p className="text-text-muted text-xs">
            {selectedTypes.size} tab{selectedTypes.size !== 1 ? "s" : ""}{" "}
            selected
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-text-muted hover:text-text transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving && (
                <Icon name="Loader2" className="w-4 h-4 animate-spin" />
              )}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
