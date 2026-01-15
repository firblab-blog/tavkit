import { useState } from 'react'
import Icon from '../../common/Icon'
import { JournalEntry } from '../../../store/playerJournalStore'

interface JournalEntryCardProps {
  entry: JournalEntry
  onClick: () => void
  onEdit: () => void
  onDelete: () => void
}

export default function JournalEntryCard({
  entry,
  onClick,
  onEdit,
  onDelete,
}: JournalEntryCardProps) {
  const [expanded, setExpanded] = useState(false)

  const formatDate = (dateString?: string) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Truncate content for preview
  const previewContent =
    entry.content && entry.content.length > 200
      ? entry.content.slice(0, 200) + '...'
      : entry.content

  // Count tags
  const tagCount =
    (entry.tagged_npcs?.length || 0) +
    (entry.tagged_locations?.length || 0) +
    (entry.tagged_quests?.length || 0)

  return (
    <div
      className="bg-background-panel border border-border rounded-xl overflow-hidden hover:border-border-hover transition-colors cursor-pointer"
      onClick={onClick}
    >
      {/* Header */}
      <div className="p-4 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {entry.session_number && (
              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs font-medium rounded">
                Session {entry.session_number}
              </span>
            )}
            {entry.is_private && (
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs font-medium rounded flex items-center gap-1">
                <Icon name="EyeOff" className="w-3 h-3" />
                Private
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-text truncate">{entry.title}</h3>
          {entry.session_date && (
            <p className="text-sm text-text-muted mt-0.5">{formatDate(entry.session_date)}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            className="p-2 hover:bg-background rounded-lg transition-colors text-text-muted hover:text-text"
            title="Edit entry"
          >
            <Icon name="Pencil" className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-text-muted hover:text-red-400"
            title="Delete entry"
          >
            <Icon name="Trash2" className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setExpanded(!expanded)
            }}
            className="p-2 hover:bg-background rounded-lg transition-colors text-text-muted hover:text-text"
            title={expanded ? 'Collapse' : 'Expand'}
          >
            <Icon name={expanded ? 'ChevronUp' : 'ChevronDown'} className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Preview or Full Content */}
      <div className="px-4 pb-4">
        {entry.content && (
          <div className="text-text-muted text-sm whitespace-pre-wrap">
            {expanded ? entry.content : previewContent}
          </div>
        )}

        {/* Tags */}
        {tagCount > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {entry.tagged_npcs?.map((npc, i) => (
              <span
                key={`npc-${i}`}
                className="px-2 py-0.5 bg-blue-500/10 text-blue-300 text-xs rounded flex items-center gap-1"
              >
                <Icon name="User" className="w-3 h-3" />
                {npc.name}
              </span>
            ))}
            {entry.tagged_locations?.map((loc, i) => (
              <span
                key={`loc-${i}`}
                className="px-2 py-0.5 bg-emerald-500/10 text-emerald-300 text-xs rounded flex items-center gap-1"
              >
                <Icon name="MapPin" className="w-3 h-3" />
                {loc.name}
              </span>
            ))}
            {entry.tagged_quests?.map((quest, i) => (
              <span
                key={`quest-${i}`}
                className="px-2 py-0.5 bg-amber-500/10 text-amber-300 text-xs rounded flex items-center gap-1"
              >
                <Icon name="Target" className="w-3 h-3" />
                {quest.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
