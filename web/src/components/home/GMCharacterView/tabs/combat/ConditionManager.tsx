import { useState } from 'react'
import Icon from '../../../../common/Icon'

export type ConditionType =
  | 'blinded'
  | 'charmed'
  | 'deafened'
  | 'frightened'
  | 'grappled'
  | 'incapacitated'
  | 'invisible'
  | 'paralyzed'
  | 'petrified'
  | 'poisoned'
  | 'prone'
  | 'restrained'
  | 'stunned'
  | 'unconscious'
  | 'exhaustion'
  | 'concentrating'

export interface ActiveCondition {
  type: ConditionType
  source?: string
  duration?: string
  notes?: string
}

export const CONDITION_INFO: Record<ConditionType, { name: string; icon: string; color: string }> =
  {
    blinded: { name: 'Blinded', icon: '🙈', color: 'bg-gray-500' },
    charmed: { name: 'Charmed', icon: '💖', color: 'bg-pink-500' },
    deafened: { name: 'Deafened', icon: '🔇', color: 'bg-gray-500' },
    frightened: { name: 'Frightened', icon: '😱', color: 'bg-purple-500' },
    grappled: { name: 'Grappled', icon: '🤝', color: 'bg-orange-500' },
    incapacitated: { name: 'Incapacitated', icon: '💤', color: 'bg-red-500' },
    invisible: { name: 'Invisible', icon: '👻', color: 'bg-blue-400' },
    paralyzed: { name: 'Paralyzed', icon: '🧊', color: 'bg-cyan-500' },
    petrified: { name: 'Petrified', icon: '🗿', color: 'bg-gray-600' },
    poisoned: { name: 'Poisoned', icon: '☠️', color: 'bg-green-600' },
    prone: { name: 'Prone', icon: '⬇️', color: 'bg-yellow-600' },
    restrained: { name: 'Restrained', icon: '⛓️', color: 'bg-orange-600' },
    stunned: { name: 'Stunned', icon: '⭐', color: 'bg-yellow-500' },
    unconscious: { name: 'Unconscious', icon: '😵', color: 'bg-red-600' },
    exhaustion: { name: 'Exhaustion', icon: '🥵', color: 'bg-amber-600' },
    concentrating: { name: 'Concentrating', icon: '🧠', color: 'bg-indigo-500' },
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
  'concentrating',
]

interface ConditionManagerProps {
  readonly conditions: ActiveCondition[]
  readonly onChange: (conditions: ActiveCondition[]) => Promise<void>
}

export default function ConditionManager({ conditions, onChange }: ConditionManagerProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [selectedType, setSelectedType] = useState<ConditionType | null>(null)
  const [duration, setDuration] = useState('')
  const [source, setSource] = useState('')

  const activeTypes = new Set(conditions.map((c) => c.type))

  const handleAdd = async () => {
    if (!selectedType) return

    const newCondition: ActiveCondition = {
      type: selectedType,
      duration: duration.trim() || undefined,
      source: source.trim() || undefined,
    }

    await onChange([...conditions, newCondition])
    setShowPicker(false)
    setSelectedType(null)
    setDuration('')
    setSource('')
  }

  const handleRemove = async (type: ConditionType) => {
    await onChange(conditions.filter((c) => c.type !== type))
  }

  return (
    <div className="relative">
      {/* Condition Badges */}
      <div className="flex items-center gap-1 flex-wrap">
        {conditions.map((condition, index) => {
          const info = CONDITION_INFO[condition.type]
          return (
            <div
              key={`${condition.type}-${index}`}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white ${info.color}`}
              title={condition.duration ? `Duration: ${condition.duration}` : undefined}
            >
              <span>{info.icon}</span>
              <span>{info.name}</span>
              <button
                onClick={() => handleRemove(condition.type)}
                className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
              >
                <Icon name="X" className="w-3 h-3" />
              </button>
            </div>
          )
        })}

        {/* Add Button */}
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border border-border text-text-muted hover:text-text hover:border-text-muted transition-colors"
          title="Add condition"
        >
          <Icon name="Plus" className="w-3 h-3" />
        </button>
      </div>

      {/* Condition Picker Popover */}
      {showPicker && (
        <div className="absolute top-full left-0 mt-2 bg-background-panel border border-border rounded-xl shadow-xl z-50 p-4 w-80">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-text">Add Condition</h4>
            <button
              onClick={() => setShowPicker(false)}
              className="text-text-muted hover:text-text"
            >
              <Icon name="X" className="w-4 h-4" />
            </button>
          </div>

          {/* Condition Grid */}
          <div className="grid grid-cols-3 gap-1 mb-3 max-h-48 overflow-y-auto">
            {ALL_CONDITIONS.map((type) => {
              const info = CONDITION_INFO[type]
              const isActive = activeTypes.has(type)
              const isSelected = selectedType === type

              return (
                <button
                  key={type}
                  onClick={() => !isActive && setSelectedType(type)}
                  disabled={isActive}
                  className={`p-2 rounded-lg border text-xs font-medium transition-colors ${
                    isActive
                      ? 'border-gray-500/30 bg-gray-500/10 text-gray-500 cursor-not-allowed'
                      : isSelected
                        ? `border-${info.color.replace('bg-', 'border-')} ${info.color}/20 text-text`
                        : 'border-border hover:border-text-muted bg-background text-text-muted'
                  }`}
                  title={info.name}
                >
                  <div className="text-center">
                    <div className="text-base">{info.icon}</div>
                    <div className="truncate">{info.name}</div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Condition Details */}
          {selectedType && (
            <div className="space-y-2 pt-3 border-t border-border">
              <input
                type="text"
                placeholder="Duration (e.g., 3 rounds)"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder:text-text-muted focus:border-primary focus:outline-none text-sm"
              />
              <input
                type="text"
                placeholder="Source (optional)"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder:text-text-muted focus:border-primary focus:outline-none text-sm"
              />
              <button
                onClick={handleAdd}
                className="w-full px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
              >
                Add {CONDITION_INFO[selectedType].name}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
