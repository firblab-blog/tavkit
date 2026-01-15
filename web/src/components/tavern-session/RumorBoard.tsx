import { useState } from "react";
import Icon from "../common/Icon";
import { RumorTracking, PatronInteraction } from "./TavernSession";

interface RumorBoardProps {
  rumors: RumorTracking[];
  patrons: PatronInteraction[];
  onAddRumor: (data: { rumor_text: string; source_patron?: string }) => void;
  onUpdateRumor: (rumorId: string, updates: Partial<RumorTracking>) => void;
  disabled?: boolean;
}

export default function RumorBoard({
  rumors,
  patrons,
  onAddRumor,
  onUpdateRumor,
  disabled = false,
}: RumorBoardProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRumorText, setNewRumorText] = useState("");
  const [newRumorSource, setNewRumorSource] = useState("");

  const handleAddRumor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRumorText.trim()) return;

    onAddRumor({
      rumor_text: newRumorText.trim(),
      source_patron: newRumorSource || undefined,
    });

    setNewRumorText("");
    setNewRumorSource("");
    setShowAddForm(false);
  };

  const verifiedRumors = rumors.filter((r) => r.verified);
  const unverifiedRumors = rumors.filter((r) => !r.verified);

  return (
    <div className="bg-background-panel border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-text flex items-center gap-2">
          <Icon name="MessageCircle" className="w-4 h-4 text-primary" />
          Rumors Heard
        </h3>
        {!disabled && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="p-1.5 hover:bg-background rounded-lg transition-colors text-text-muted hover:text-primary"
          >
            <Icon name={showAddForm ? "X" : "Plus"} className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Add Rumor Form */}
      {showAddForm && !disabled && (
        <form
          onSubmit={handleAddRumor}
          className="p-4 border-b border-border bg-background/50"
        >
          <div className="space-y-3">
            <textarea
              value={newRumorText}
              onChange={(e) => setNewRumorText(e.target.value)}
              placeholder="What did you hear?"
              className="w-full h-20 px-3 py-2 bg-background border border-border rounded-lg text-text placeholder:text-text-muted resize-none focus:border-primary focus:outline-none"
              autoFocus
            />
            <select
              value={newRumorSource}
              onChange={(e) => setNewRumorSource(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:border-primary focus:outline-none"
            >
              <option value="">Unknown source</option>
              {patrons.map((patron) => (
                <option key={patron.id} value={patron.patron_name}>
                  {patron.patron_name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={!newRumorText.trim()}
              className="w-full px-3 py-2 bg-primary hover:bg-primary/90 text-background font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              Add Rumor
            </button>
          </div>
        </form>
      )}

      {/* Rumors List */}
      {rumors.length === 0 ? (
        <div className="p-6 text-center text-text-muted">
          <Icon
            name="MessageCircle"
            className="w-8 h-8 mx-auto mb-2 opacity-50"
          />
          <p>No rumors recorded yet</p>
          <p className="text-sm mt-1">Add rumors as you hear them</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {/* Unverified Rumors */}
          {unverifiedRumors.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-background/50 text-xs font-medium text-text-muted uppercase">
                Unverified ({unverifiedRumors.length})
              </div>
              {unverifiedRumors.map((rumor) => (
                <RumorItem
                  key={rumor.id}
                  rumor={rumor}
                  onUpdate={(updates) => onUpdateRumor(rumor.id, updates)}
                  disabled={disabled}
                />
              ))}
            </div>
          )}

          {/* Verified Rumors */}
          {verifiedRumors.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-emerald-500/10 text-xs font-medium text-emerald-400 uppercase">
                Verified ({verifiedRumors.length})
              </div>
              {verifiedRumors.map((rumor) => (
                <RumorItem
                  key={rumor.id}
                  rumor={rumor}
                  onUpdate={(updates) => onUpdateRumor(rumor.id, updates)}
                  disabled={disabled}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RumorItem({
  rumor,
  onUpdate,
  disabled,
}: {
  rumor: RumorTracking;
  onUpdate: (updates: Partial<RumorTracking>) => void;
  disabled?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`p-4 ${rumor.verified ? "bg-emerald-500/5" : ""}`}>
      <div className="flex items-start gap-3">
        {/* Verified Toggle */}
        <button
          onClick={() => !disabled && onUpdate({ verified: !rumor.verified })}
          disabled={disabled}
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            rumor.verified
              ? "bg-emerald-500 border-emerald-500"
              : "border-border hover:border-emerald-500/50"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          title={rumor.verified ? "Mark as unverified" : "Mark as verified"}
        >
          {rumor.verified && (
            <Icon name="Check" className="w-3 h-3 text-white" />
          )}
        </button>

        {/* Rumor Content */}
        <div className="flex-1 min-w-0">
          <p className="text-text text-sm">{rumor.rumor_text}</p>
          {rumor.source_patron && (
            <p className="text-xs text-text-muted mt-1">
              Source:{" "}
              <span className="text-primary">{rumor.source_patron}</span>
            </p>
          )}
          {rumor.notes && (
            <p className="text-xs text-text-muted mt-1 italic">{rumor.notes}</p>
          )}
        </div>

        {/* Expand Toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-background rounded transition-colors text-text-muted"
        >
          <Icon
            name={isExpanded ? "ChevronUp" : "ChevronDown"}
            className="w-4 h-4"
          />
        </button>
      </div>

      {/* Expanded Notes */}
      {isExpanded && (
        <div className="mt-3 pl-9">
          <label className="block text-xs text-text-muted mb-1">Notes</label>
          <textarea
            value={rumor.notes || ""}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            placeholder="Additional notes about this rumor..."
            className="w-full h-16 px-3 py-2 bg-background border border-border rounded-lg text-text text-sm placeholder:text-text-muted resize-none focus:border-primary focus:outline-none"
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}
