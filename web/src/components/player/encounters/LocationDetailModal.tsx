import Icon from "../../common/Icon";
import { LocationVisit } from "../../../store/playerEncountersStore";

interface LocationDetailModalProps {
  location: LocationVisit;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function LocationDetailModal({
  location,
  onClose,
  onEdit,
  onDelete,
}: LocationDetailModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-background-panel border border-border rounded-xl w-full max-w-2xl my-8">
        {/* Header */}
        <div className="sticky top-0 bg-background-panel border-b border-border rounded-t-xl px-6 py-4 z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <Icon name="MapPin" className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-text">{location.name}</h2>
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
          {location.is_gm_revealed && (
            <div className="flex items-center gap-2 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <Icon name="Eye" className="w-5 h-5 text-purple-400" />
              <p className="text-purple-300 text-sm font-medium">
                Revealed by GM
              </p>
            </div>
          )}

          {location.description && (
            <div>
              <h3 className="text-sm font-medium text-text-muted uppercase mb-2">
                Description
              </h3>
              <p className="text-text leading-relaxed whitespace-pre-wrap">
                {location.description}
              </p>
            </div>
          )}

          {location.first_visit_session && (
            <div>
              <h4 className="text-sm font-medium text-text-muted uppercase mb-2">
                First Visited
              </h4>
              <p className="text-text flex items-center gap-1.5">
                <Icon name="Calendar" className="w-4 h-4 text-blue-400" />
                Session {location.first_visit_session}
              </p>
            </div>
          )}

          {location.notes && (
            <div>
              <h3 className="text-sm font-medium text-text-muted uppercase mb-2">
                Notes
              </h3>
              <p className="text-text-muted text-sm leading-relaxed whitespace-pre-wrap">
                {location.notes}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
