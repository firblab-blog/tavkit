import Icon from '../../common/Icon'
import { PartyLootItem } from '../../../store/partyLootStore'

interface LootItemCardProps {
  item: PartyLootItem
  onClick: () => void
  onEdit: () => void
  onDelete: () => void
  onClaim: () => void
}

export default function LootItemCard({
  item,
  onClick,
  onEdit,
  onDelete,
  onClaim,
}: LootItemCardProps) {
  const isClaimed = !!item.claimed_by

  return (
    <div
      onClick={onClick}
      className={`bg-background-panel border rounded-xl p-4 transition-colors cursor-pointer ${
        isClaimed
          ? 'border-emerald-500/30 hover:border-emerald-500/50'
          : 'border-yellow-500/30 hover:border-yellow-500/50'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-start gap-2 min-w-0">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              isClaimed ? 'bg-emerald-500/10' : 'bg-yellow-500/10'
            }`}
          >
            <Icon
              name="Gem"
              className={`w-4 h-4 ${isClaimed ? 'text-emerald-400' : 'text-yellow-400'}`}
            />
          </div>
          <div className="min-w-0">
            <h4 className="text-text font-medium truncate">{item.name}</h4>
            {item.quantity > 1 && <span className="text-xs text-text-muted">x{item.quantity}</span>}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            className="p-1 hover:bg-background rounded text-text-muted hover:text-text"
            title="Edit"
          >
            <Icon name="Pencil" className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="p-1 hover:bg-red-500/10 rounded text-text-muted hover:text-red-400"
            title="Delete"
          >
            <Icon name="Trash2" className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Description */}
      {item.description && (
        <p className="text-text-muted text-sm line-clamp-2 mb-2">{item.description}</p>
      )}

      {/* Meta info */}
      <div className="flex flex-wrap gap-2 text-xs text-text-muted mb-3">
        {item.value && (
          <span className="flex items-center gap-1">
            <Icon name="Gem" className="w-3 h-3 text-yellow-400" />
            {item.value}
          </span>
        )}
        {item.session_acquired && (
          <span className="flex items-center gap-1">
            <Icon name="Calendar" className="w-3 h-3" />
            Session {item.session_acquired}
          </span>
        )}
        {item.source && (
          <span className="flex items-center gap-1 truncate max-w-[150px]">
            <Icon name="MapPin" className="w-3 h-3" />
            {item.source}
          </span>
        )}
      </div>

      {/* Claim status / button */}
      {isClaimed ? (
        <div className="flex items-center justify-between">
          <span className="text-xs text-emerald-400 flex items-center gap-1">
            <Icon name="Check" className="w-3 h-3" />
            Claimed by {item.claimed_by_name || 'Unknown'}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onClaim()
            }}
            className="text-xs text-text-muted hover:text-text"
          >
            Change
          </button>
        </div>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClaim()
          }}
          className="w-full py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
        >
          <Icon name="UserPlus" className="w-4 h-4" />
          Claim Item
        </button>
      )}

      {/* Notes */}
      {item.notes && (
        <p className="text-text-muted/70 text-xs mt-2 italic line-clamp-1">{item.notes}</p>
      )}
    </div>
  )
}
