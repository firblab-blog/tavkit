import Icon from "../../common/Icon";
import {
  NPCEncounter,
  RelationshipType,
} from "../../../store/playerEncountersStore";

interface NPCDetailModalProps {
  npc: NPCEncounter;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const relationshipColors: Record<
  RelationshipType,
  { bg: string; text: string; icon: string }
> = {
  friendly: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-300",
    icon: "Heart",
  },
  neutral: { bg: "bg-blue-500/10", text: "text-blue-300", icon: "Minus" },
  hostile: { bg: "bg-red-500/10", text: "text-red-300", icon: "Sword" },
  unknown: { bg: "bg-gray-500/10", text: "text-gray-300", icon: "HelpCircle" },
};

export default function NPCDetailModal({
  npc,
  onClose,
  onEdit,
  onDelete,
}: NPCDetailModalProps) {
  const colors = relationshipColors[npc.relationship];

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
              <div
                className={`w-12 h-12 rounded-full ${colors.bg} flex items-center justify-center flex-shrink-0`}
              >
                <Icon name="User" className={`w-6 h-6 ${colors.text}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-text mb-1">{npc.name}</h2>
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-1 ${colors.bg} ${colors.text} text-sm rounded-lg capitalize`}
                >
                  <Icon name={colors.icon as any} className="w-4 h-4" />
                  {npc.relationship}
                </span>
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
          {npc.is_gm_revealed && (
            <div className="flex items-center gap-2 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <Icon name="Eye" className="w-5 h-5 text-purple-400" />
              <p className="text-purple-300 text-sm font-medium">
                Revealed by GM
              </p>
            </div>
          )}

          {npc.description && (
            <div>
              <h3 className="text-sm font-medium text-text-muted uppercase mb-2">
                Description
              </h3>
              <p className="text-text leading-relaxed whitespace-pre-wrap">
                {npc.description}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {npc.first_met_session && (
              <div>
                <h4 className="text-xs font-medium text-text-muted uppercase mb-1">
                  First Met
                </h4>
                <p className="text-text flex items-center gap-1.5">
                  <Icon name="Calendar" className="w-4 h-4 text-blue-400" />
                  Session {npc.first_met_session}
                </p>
              </div>
            )}
            {npc.first_met_location && (
              <div>
                <h4 className="text-xs font-medium text-text-muted uppercase mb-1">
                  Location
                </h4>
                <p className="text-text flex items-center gap-1.5">
                  <Icon name="MapPin" className="w-4 h-4 text-emerald-400" />
                  {npc.first_met_location}
                </p>
              </div>
            )}
          </div>

          {npc.notes && (
            <div>
              <h3 className="text-sm font-medium text-text-muted uppercase mb-2">
                Notes
              </h3>
              <p className="text-text-muted text-sm leading-relaxed whitespace-pre-wrap">
                {npc.notes}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
