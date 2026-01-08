import Icon from '../common/Icon'
import type { ChaseComplication } from '../../types/chase'
import { ABILITIES } from '../../types/chase'

interface ComplicationCardProps {
  complication: ChaseComplication
  onResolve?: (complicationId: string) => void
  showResolveButton?: boolean
}

export default function ComplicationCard({
  complication,
  onResolve,
  showResolveButton = true,
}: ComplicationCardProps) {
  // Get complication type styling
  const getTypeStyle = (type: string) => {
    const styles = {
      obstacle: {
        bg: 'bg-orange-950/30',
        border: 'border-orange-700',
        text: 'text-orange-300',
        icon: 'alert-triangle',
      },
      hazard: {
        bg: 'bg-red-950/30',
        border: 'border-red-700',
        text: 'text-red-300',
        icon: 'flame',
      },
      bystander: {
        bg: 'bg-yellow-950/30',
        border: 'border-yellow-700',
        text: 'text-yellow-300',
        icon: 'users',
      },
      terrain: {
        bg: 'bg-green-950/30',
        border: 'border-green-700',
        text: 'text-green-300',
        icon: 'map',
      },
    }
    return styles[type as keyof typeof styles] || styles.obstacle
  }

  // Get ability name
  const getAbilityName = (abilityKey: string): string => {
    const ability = ABILITIES.find((a) => a.value === abilityKey)
    return ability?.label || abilityKey.toUpperCase()
  }

  const typeStyle = getTypeStyle(complication.complication_type)

  return (
    <div
      className={`p-4 rounded-lg border-2 transition-all ${typeStyle.bg} ${typeStyle.border} ${
        complication.resolved ? 'opacity-50' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${typeStyle.bg} ${typeStyle.border} border`}
          >
            <Icon name={typeStyle.icon as any} size={16} className={typeStyle.text} />
          </div>
          <div>
            <div className="text-sm font-medium text-stone-400">Round {complication.round}</div>
            <div>
              <span className="text-lg font-bold capitalize text-stone-200">
                {complication.complication_type.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Resolved badge */}
        {complication.resolved && (
          <div className="px-2 py-1 bg-green-900/30 border border-green-700 rounded text-xs text-green-300 font-medium flex items-center gap-1">
            <Icon name="Check" size={12} />
            Resolved
          </div>
        )}
      </div>

      {/* Description */}
      <div className="mb-4 p-3 bg-stone-900/50 rounded border border-stone-700">
        <p className="text-stone-200 text-sm leading-relaxed">{complication.description}</p>
      </div>

      {/* Save requirement */}
      {complication.save_ability && complication.save_dc && (
        <div className="mb-4 p-3 bg-stone-800/50 rounded border border-stone-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon name="Shield" size={16} className="text-blue-400" />
              <span className="text-sm text-stone-300">Saving Throw Required</span>
            </div>
            <div className="text-right">
              <div className="text-xs text-stone-400">
                {getAbilityName(complication.save_ability)} Save
              </div>
              <div className="text-xl font-bold text-blue-300">DC {complication.save_dc}</div>
            </div>
          </div>
        </div>
      )}

      {/* Effect */}
      {complication.effect && (
        <div className="mb-4 p-3 bg-stone-800/50 rounded border border-stone-700">
          <div className="text-xs text-stone-400 mb-1">Effect</div>
          <div className="text-sm text-stone-300">{complication.effect}</div>
        </div>
      )}

      {/* Action button */}
      {showResolveButton && !complication.resolved && onResolve && (
        <button
          onClick={() => onResolve(complication.id)}
          className="w-full px-4 py-2 bg-green-900/30 hover:bg-green-900/50 border border-green-700 text-green-300 font-medium rounded transition-colors flex items-center justify-center gap-2"
        >
          <Icon name="Check" size={16} />
          Mark as Resolved
        </button>
      )}
    </div>
  )
}
