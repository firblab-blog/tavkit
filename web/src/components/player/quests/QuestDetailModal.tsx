import Icon from '../../common/Icon'
import { QuestTracking, QuestStatus, QuestObjective } from '../../../store/playerQuestStore'

interface QuestDetailModalProps {
  quest: QuestTracking
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onToggleObjective: (objectiveIndex: number) => void
  onStatusChange: (newStatus: QuestStatus) => void
}

const statusColors: Record<QuestStatus, { bg: string; text: string; icon: string }> = {
  active: { bg: 'bg-blue-500/10', text: 'text-blue-300', icon: 'PlayCircle' },
  completed: { bg: 'bg-emerald-500/10', text: 'text-emerald-300', icon: 'CheckCircle2' },
  failed: { bg: 'bg-red-500/10', text: 'text-red-300', icon: 'XCircle' },
  abandoned: { bg: 'bg-gray-500/10', text: 'text-gray-400', icon: 'MinusCircle' },
}

const typeLabels: Record<string, string> = {
  personal: 'Personal Goal',
  main: 'Main Quest',
  side: 'Side Quest',
  gm_shared: 'GM Shared',
}

export default function QuestDetailModal({
  quest,
  onClose,
  onEdit,
  onDelete,
  onToggleObjective,
  onStatusChange,
}: QuestDetailModalProps) {
  const colors = statusColors[quest.status]
  const completedObjectives = quest.objectives?.filter((o) => o.completed).length || 0
  const totalObjectives = quest.objectives?.length || 0

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-background-panel border border-border rounded-xl w-full max-w-3xl my-8 relative">
        {/* Modal Header */}
        <div className="sticky top-0 bg-background-panel border-b border-border rounded-t-xl px-6 py-4 z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <Icon name="Scroll" className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-text mb-2">{quest.title}</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`px-2 py-1 ${colors.bg} ${colors.text} text-sm rounded-lg capitalize flex items-center gap-1.5`}
                  >
                    <Icon name={colors.icon as any} className="w-4 h-4" />
                    {quest.status}
                  </span>
                  <span className="px-2 py-1 bg-background text-text-muted text-sm rounded-lg">
                    {typeLabels[quest.quest_type]}
                  </span>
                  {quest.priority > 0 && (
                    <span className="px-2 py-1 bg-red-500/10 text-red-300 text-sm rounded-lg">
                      Priority {quest.priority}
                    </span>
                  )}
                </div>
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
          {/* Status Selector */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-text-muted">Change Status:</span>
            <select
              value={quest.status}
              onChange={(e) => onStatusChange(e.target.value as QuestStatus)}
              className="px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="abandoned">Abandoned</option>
            </select>
          </div>

          {/* Description */}
          {quest.description && (
            <div>
              <h3 className="text-sm font-medium text-text-muted uppercase mb-2">Description</h3>
              <p className="text-text leading-relaxed whitespace-pre-wrap">{quest.description}</p>
            </div>
          )}

          {/* Objectives */}
          {quest.objectives && quest.objectives.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-text-muted uppercase">
                  Objectives ({completedObjectives}/{totalObjectives})
                </h3>
                <div className="flex-1 max-w-xs ml-4">
                  <div className="h-2 bg-background rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all"
                      style={{
                        width:
                          totalObjectives > 0
                            ? `${(completedObjectives / totalObjectives) * 100}%`
                            : '0%',
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {quest.objectives.map((obj: QuestObjective, i: number) => (
                  <label
                    key={i}
                    className="flex items-start gap-3 p-3 bg-background rounded-lg cursor-pointer group hover:bg-background-hover transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={obj.completed}
                      onChange={() => onToggleObjective(i)}
                      className="mt-0.5 w-4 h-4 rounded border-2 border-border bg-transparent checked:bg-emerald-500 checked:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
                    />
                    <span
                      className={`text-sm flex-1 ${
                        obj.completed ? 'text-text-muted line-through' : 'text-text'
                      }`}
                    >
                      {obj.text}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {quest.notes && (
            <div>
              <h3 className="text-sm font-medium text-text-muted uppercase mb-2">Notes</h3>
              <p className="text-text-muted text-sm leading-relaxed whitespace-pre-wrap">
                {quest.notes}
              </p>
            </div>
          )}

          {/* Metadata */}
          <div className="pt-4 border-t border-border text-xs text-text-muted space-y-1">
            {quest.created_at && (
              <p>
                Created:{' '}
                {new Date(quest.created_at).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            )}
            {quest.updated_at && (
              <p>
                Last Updated:{' '}
                {new Date(quest.updated_at).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
