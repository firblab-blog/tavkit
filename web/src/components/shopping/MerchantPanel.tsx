import Icon from '../common/Icon'
import { ShoppingEncounter, RELATIONSHIP_LEVELS } from './ShoppingSession'

interface MerchantPanelProps {
  encounter: ShoppingEncounter
  onUpdate: (updates: Partial<ShoppingEncounter>) => void
  disabled?: boolean
}

export default function MerchantPanel({
  encounter,
  onUpdate,
  disabled = false,
}: MerchantPanelProps) {
  const getMoodLabel = (mood: number) => {
    if (mood <= -4) return 'Hostile'
    if (mood <= -2) return 'Irritated'
    if (mood <= 0) return 'Neutral'
    if (mood <= 2) return 'Pleasant'
    return 'Delighted'
  }

  const getMoodColor = (mood: number) => {
    if (mood <= -4) return 'text-red-500'
    if (mood <= -2) return 'text-orange-500'
    if (mood <= 0) return 'text-gray-400'
    if (mood <= 2) return 'text-emerald-500'
    return 'text-blue-500'
  }

  const getMoodEmoji = (mood: number) => {
    if (mood <= -4) return '😠'
    if (mood <= -2) return '😒'
    if (mood <= 0) return '😐'
    if (mood <= 2) return '🙂'
    return '😊'
  }

  const moodPosition = ((encounter.merchant_mood + 5) / 10) * 100

  return (
    <div className="bg-background-panel border border-border rounded-xl p-4 space-y-4">
      {/* Mood Display */}
      <div className="text-center">
        <div className="text-4xl mb-2">{getMoodEmoji(encounter.merchant_mood)}</div>
        <h3 className={`text-xl font-bold ${getMoodColor(encounter.merchant_mood)}`}>
          {getMoodLabel(encounter.merchant_mood)}
        </h3>
        <p className="text-sm text-text-muted">
          Merchant Mood: {encounter.merchant_mood > 0 ? '+' : ''}
          {encounter.merchant_mood}
        </p>
      </div>

      {/* Mood Bar */}
      <div className="relative">
        <div className="h-3 bg-gradient-to-r from-red-500 via-gray-500 to-emerald-500 rounded-full overflow-hidden" />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-background-panel rounded-full shadow-lg transition-all"
          style={{ left: `calc(${moodPosition}% - 8px)` }}
        />
        <div className="flex justify-between text-xs text-text-muted mt-1">
          <span>-5</span>
          <span>0</span>
          <span>+5</span>
        </div>
      </div>

      {/* Manual Mood Adjustment */}
      {!disabled && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => onUpdate({ merchant_mood: Math.max(-5, encounter.merchant_mood - 1) })}
            disabled={encounter.merchant_mood <= -5}
            className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors disabled:opacity-50"
            title="Decrease Mood"
          >
            <Icon name="ChevronDown" className="w-4 h-4" />
          </button>
          <span className="text-sm text-text-muted">Adjust Mood</span>
          <button
            onClick={() => onUpdate({ merchant_mood: Math.min(5, encounter.merchant_mood + 1) })}
            disabled={encounter.merchant_mood >= 5}
            className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-colors disabled:opacity-50"
            title="Increase Mood"
          >
            <Icon name="ChevronUp" className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Relationship Level */}
      <div className="border-t border-border pt-4">
        <h4 className="font-semibold text-text mb-2 flex items-center gap-2">
          <Icon name="Users" className="w-4 h-4 text-text-muted" />
          Relationship
        </h4>
        <div className="flex flex-wrap gap-1">
          {RELATIONSHIP_LEVELS.map((rel) => (
            <button
              key={rel.value}
              onClick={() => {
                if (!disabled) {
                  onUpdate({
                    relationship_level: rel.value,
                    discount_percentage: rel.discount,
                  })
                }
              }}
              disabled={disabled}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                encounter.relationship_level === rel.value
                  ? rel.color
                  : 'bg-background text-text-muted border border-border hover:border-primary/40'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {rel.label}
            </button>
          ))}
        </div>
      </div>

      {/* Discount */}
      <div className="bg-background rounded-lg p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-muted">Price Adjustment</span>
          <span
            className={`text-lg font-bold ${
              encounter.discount_percentage > 0
                ? 'text-emerald-400'
                : encounter.discount_percentage < 0
                  ? 'text-red-400'
                  : 'text-text-muted'
            }`}
          >
            {encounter.discount_percentage > 0 ? '-' : encounter.discount_percentage < 0 ? '+' : ''}
            {Math.abs(encounter.discount_percentage)}%
          </span>
        </div>
        <p className="text-xs text-text-muted mt-1">
          {encounter.discount_percentage > 0
            ? 'Discount applied to all purchases'
            : encounter.discount_percentage < 0
              ? 'Markup applied to all purchases'
              : 'Standard prices apply'}
        </p>
      </div>

      {/* Notes */}
      <div>
        <h4 className="font-semibold text-text mb-2 flex items-center gap-2">
          <Icon name="FileText" className="w-4 h-4 text-text-muted" />
          Notes
        </h4>
        <textarea
          value={encounter.notes || ''}
          onChange={(e) => onUpdate({ notes: e.target.value })}
          placeholder="Session notes..."
          className="w-full h-24 px-3 py-2 bg-background border border-border rounded-lg text-text placeholder:text-text-muted resize-none focus:border-primary focus:outline-none text-sm"
          disabled={disabled}
        />
      </div>

      {/* Total Purchased (when completed) */}
      {encounter.status === 'completed' && encounter.total_purchased && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-center">
          <p className="text-sm text-text-muted">Total Purchased</p>
          <p className="text-2xl font-bold text-emerald-400">{encounter.total_purchased}</p>
        </div>
      )}
    </div>
  )
}
