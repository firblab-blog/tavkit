import Icon from "../../common/Icon";
import { PartyLootItem } from "../../../store/partyLootStore";

interface LootItemModalProps {
  item: PartyLootItem;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onClaim: () => void;
}

export default function LootItemModal({
  item,
  onClose,
  onEdit,
  onDelete,
  onClaim,
}: LootItemModalProps) {
  const isClaimed = !!item.claimed_by;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-background-panel border border-border rounded-xl w-full max-w-2xl my-8 relative">
        {/* Modal Header */}
        <div className="sticky top-0 bg-background-panel border-b border-border rounded-t-xl px-6 py-4 z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div
                className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isClaimed ? "bg-emerald-500/10" : "bg-yellow-500/10"
                }`}
              >
                <Icon
                  name="Gem"
                  className={`w-6 h-6 ${isClaimed ? "text-emerald-400" : "text-yellow-400"}`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-text mb-1">
                  {item.name}
                </h2>
                {item.quantity > 1 && (
                  <p className="text-sm text-text-muted">
                    Quantity: {item.quantity}
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
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Badge */}
          {isClaimed ? (
            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <Icon name="Check" className="w-5 h-5 text-emerald-400" />
              <div className="flex-1">
                <p className="text-emerald-300 font-medium">Claimed</p>
                <p className="text-emerald-400/70 text-sm">
                  by {item.claimed_by_name || "Unknown"}
                </p>
              </div>
              <button
                onClick={onClaim}
                className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-sm font-medium rounded-lg transition-colors"
              >
                Change Claim
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <Icon name="Package" className="w-5 h-5 text-yellow-400" />
              <div className="flex-1">
                <p className="text-yellow-300 font-medium">Available</p>
                <p className="text-yellow-400/70 text-sm">
                  This item has not been claimed yet
                </p>
              </div>
              <button
                onClick={onClaim}
                className="px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 text-sm font-medium rounded-lg transition-colors"
              >
                Claim Item
              </button>
            </div>
          )}

          {/* Description */}
          {item.description && (
            <div>
              <h3 className="text-sm font-medium text-text-muted uppercase mb-2">
                Description
              </h3>
              <p className="text-text leading-relaxed whitespace-pre-wrap">
                {item.description}
              </p>
            </div>
          )}

          {/* Details */}
          <div className="grid grid-cols-2 gap-4">
            {item.value && (
              <div>
                <h4 className="text-xs font-medium text-text-muted uppercase mb-1">
                  Value
                </h4>
                <p className="text-text flex items-center gap-1.5">
                  <Icon name="Gem" className="w-4 h-4 text-yellow-400" />
                  {item.value}
                </p>
              </div>
            )}
            {item.session_acquired && (
              <div>
                <h4 className="text-xs font-medium text-text-muted uppercase mb-1">
                  Session Acquired
                </h4>
                <p className="text-text flex items-center gap-1.5">
                  <Icon name="Calendar" className="w-4 h-4 text-blue-400" />
                  Session {item.session_acquired}
                </p>
              </div>
            )}
            {item.source && (
              <div className="col-span-2">
                <h4 className="text-xs font-medium text-text-muted uppercase mb-1">
                  Source
                </h4>
                <p className="text-text flex items-center gap-1.5">
                  <Icon name="MapPin" className="w-4 h-4 text-emerald-400" />
                  {item.source}
                </p>
              </div>
            )}
          </div>

          {/* Notes */}
          {item.notes && (
            <div>
              <h3 className="text-sm font-medium text-text-muted uppercase mb-2">
                Notes
              </h3>
              <p className="text-text-muted text-sm leading-relaxed whitespace-pre-wrap">
                {item.notes}
              </p>
            </div>
          )}

          {/* Metadata */}
          {item.created_at && (
            <div className="pt-4 border-t border-border text-xs text-text-muted">
              <p>
                Added:{" "}
                {new Date(item.created_at).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
