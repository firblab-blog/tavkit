import { useState } from 'react'
import Icon from '../../common/Icon'
import {
  usePlayerCombatStore,
  CONDITION_INFO,
  ConditionType,
  ActiveCondition,
} from '../../../store/playerCombatStore'

interface ConditionPickerProps {
  characterId: string
  onClose: () => void
}

const ALL_CONDITIONS: ConditionType[] = [
  'blinded',
  'charmed',
  'deafened',
  'frightened',
  'grappled',
  'incapacitated',
  'invisible',
  'paralyzed',
  'petrified',
  'poisoned',
  'prone',
  'restrained',
  'stunned',
  'unconscious',
  'exhaustion',
]

export default function ConditionPicker({ characterId, onClose }: ConditionPickerProps) {
  const { combat, addCondition, loading } = usePlayerCombatStore()
  const [selectedCondition, setSelectedCondition] = useState<ConditionType | null>(null)
  const [source, setSource] = useState('')
  const [duration, setDuration] = useState('')

  const activeConditionTypes = new Set(combat.conditions.map((c) => c.type))

  const handleAdd = async () => {
    if (!selectedCondition) return

    const condition: ActiveCondition = {
      type: selectedCondition,
      source: source.trim() || undefined,
      duration: duration.trim() || undefined,
    }

    await addCondition(characterId, condition)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-background-panel border border-border rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="border-b border-border px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Icon name="AlertTriangle" className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-semibold text-text">Add Condition</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-background rounded text-text-muted hover:text-text"
          >
            <Icon name="X" className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1">
          {/* Condition Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
            {ALL_CONDITIONS.map((type) => {
              const info = CONDITION_INFO[type]
              const isActive = activeConditionTypes.has(type)
              const isSelected = selectedCondition === type

              return (
                <button
                  key={type}
                  onClick={() => !isActive && setSelectedCondition(type)}
                  disabled={isActive}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    isActive
                      ? 'border-gray-500/30 bg-gray-500/10 text-gray-500 cursor-not-allowed'
                      : isSelected
                        ? 'border-amber-500 bg-amber-500/20'
                        : 'border-border hover:border-amber-500/50 bg-background'
                  }`}
                >
                  <span
                    className={`font-medium ${isActive ? 'text-gray-500' : isSelected ? 'text-amber-300' : 'text-text'}`}
                  >
                    {info.name}
                  </span>
                  {isActive && (
                    <span className="text-xs text-gray-500 block mt-1">Already active</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Selected condition details */}
          {selectedCondition && (
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <h4 className="text-amber-300 font-medium mb-1">
                  {CONDITION_INFO[selectedCondition].name}
                </h4>
                <p className="text-text-muted text-sm">
                  {CONDITION_INFO[selectedCondition].description}
                </p>
              </div>

              {/* Optional source */}
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">
                  Source (optional)
                </label>
                <input
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="e.g., Hold Person spell, Dragon's Frightful Presence"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary"
                />
              </div>

              {/* Optional duration */}
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">
                  Duration (optional)
                </label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g., 1 minute, until end of turn"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-5 py-4 flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-text-muted hover:text-text transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!selectedCondition || loading}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <Icon name="Loader2" className="w-4 h-4 animate-spin" />}
            Add Condition
          </button>
        </div>
      </div>
    </div>
  )
}
