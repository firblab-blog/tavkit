// Item Result Renderer
// Displays generated Item data in a structured format

import Icon from '@/components/common/Icon'
import { ActionsBar } from '@/components/ui/ActionsBar'
import { RawDataViewer, ParseWarning } from '../components'
import type {
  GeneratedItemData,
  OriginObject,
  ValueObject,
  WeightObject,
} from '../normalizers/item'
import { getValueDisplay, getWeightDisplay } from '../normalizers/item'

interface ItemRendererProps {
  item: GeneratedItemData
  showRawResponse: boolean
  isSaved: boolean
  onSave: () => void
  onCopy: () => void
}

export function ItemRenderer({
  item,
  showRawResponse,
  isSaved,
  onSave,
  onCopy,
}: ItemRendererProps) {
  return (
    <div className="space-y-6">
      {/* Parse warning */}
      {item._parseError && <ParseWarning message={item._parseError} />}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-primary mb-2">{item.name}</h2>
        <p className="text-text-muted capitalize">
          {item.rarity} • {item.type}
        </p>
      </div>

      {/* Core Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-background p-3 rounded border border-border">
          <p className="text-xs text-text-muted mb-1">Value</p>
          <p className="text-xl font-bold text-amber-400">
            {getValueDisplay(item.value as number | ValueObject)}
          </p>
        </div>
        <div className="bg-background p-3 rounded border border-border">
          <p className="text-xs text-text-muted mb-1">Weight</p>
          <p className="text-xl font-bold text-blue-400">
            {getWeightDisplay(item.weight as number | WeightObject)}
          </p>
        </div>
        <div className="bg-background p-3 rounded border border-border">
          <p className="text-xs text-text-muted mb-1">Attunement</p>
          <p
            className={`text-xl font-bold ${item.attunement ? 'text-purple-400' : 'text-text-muted'}`}
          >
            {item.attunement ? 'Required' : 'No'}
          </p>
        </div>
      </div>

      {/* Description */}
      {item.description && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="FileText" className="w-5 h-5 text-primary" />
            Description
          </h3>
          <div className="bg-background p-4 rounded border border-primary/30">
            <p className="text-text whitespace-pre-line">{item.description}</p>
          </div>
        </div>
      )}

      {/* Origin */}
      {item.origin &&
        (typeof item.origin === 'string' ? item.origin : Object.keys(item.origin).length > 0) && (
          <div>
            <h3 className="text-lg font-semibold text-purple-400 mb-2 flex items-center gap-2">
              <Icon name="Book" className="w-5 h-5" />
              Origin
            </h3>
            <div className="bg-purple-500/10 p-4 rounded border border-purple-500/30">
              {typeof item.origin === 'string' ? (
                <p className="text-text">{item.origin}</p>
              ) : (
                <div className="space-y-2 text-text">
                  {(item.origin as OriginObject).creator && (
                    <p>
                      <strong className="text-purple-400">Creator:</strong>{' '}
                      {(item.origin as OriginObject).creator}
                    </p>
                  )}
                  {(item.origin as OriginObject).creation_date && (
                    <p>
                      <strong className="text-purple-400">Created:</strong>{' '}
                      {(item.origin as OriginObject).creation_date}
                    </p>
                  )}
                  {(item.origin as OriginObject).location_created && (
                    <p>
                      <strong className="text-purple-400">Location:</strong>{' '}
                      {(item.origin as OriginObject).location_created}
                    </p>
                  )}
                  {(item.origin as OriginObject).backstory && (
                    <p>
                      <strong className="text-purple-400">Backstory:</strong>{' '}
                      {(item.origin as OriginObject).backstory}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      {/* Properties */}
      {item.properties && Object.keys(item.properties).length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Sparkles" className="w-5 h-5 text-primary" />
            Properties
          </h3>
          <div className="space-y-3">
            {Object.entries(item.properties).map(([key, value]) => {
              let displayValue: string
              if (key === 'damage_dice' && typeof value === 'object' && value !== null) {
                const dice = value as Record<string, unknown>
                displayValue =
                  dice.count && dice.die
                    ? `${dice.count}d${dice.die}${dice.bonus ? ` + ${dice.bonus}` : ''}`
                    : JSON.stringify(value)
              } else if (typeof value === 'object' && value !== null) {
                displayValue = JSON.stringify(value)
              } else {
                displayValue = String(value)
              }

              return (
                <div key={key} className="bg-background p-4 rounded border border-primary/30">
                  <h4 className="font-medium text-primary mb-1 capitalize">
                    {key.replace(/_/g, ' ')}
                  </h4>
                  <p className="text-text text-sm">{displayValue}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Raw/unexpected fields */}
      {item._raw && <RawDataViewer data={item._raw} defaultExpanded={showRawResponse} />}

      <ActionsBar
        onCopy={onCopy}
        onSave={isSaved ? undefined : onSave}
        showRegenerate={false}
        isSaved={isSaved}
      />
    </div>
  )
}

// Helper to format Item for clipboard
export function formatItemForClipboard(item: GeneratedItemData): string {
  let text = `${item.name}\n${item.rarity} • ${item.type}\n\nDescription:\n${item.description}`

  if (item.origin) {
    if (typeof item.origin === 'string') {
      text += `\n\nOrigin:\n${item.origin}`
    } else {
      const origin = item.origin as OriginObject
      text += '\n\nOrigin:'
      if (origin.creator) text += `\nCreator: ${origin.creator}`
      if (origin.creation_date) text += `\nCreated: ${origin.creation_date}`
      if (origin.location_created) text += `\nLocation: ${origin.location_created}`
      if (origin.backstory) text += `\nBackstory: ${origin.backstory}`
    }
  }

  if (item.properties && Object.keys(item.properties).length > 0) {
    text += '\n\nProperties:'
    Object.entries(item.properties).forEach(([key, value]) => {
      if (key === 'damage_dice' && typeof value === 'object' && value !== null) {
        const dice = value as Record<string, unknown>
        const diceStr =
          dice.count && dice.die
            ? `${dice.count}d${dice.die}${dice.bonus ? ` + ${dice.bonus}` : ''}`
            : JSON.stringify(value)
        text += `\n- ${key.replace(/_/g, ' ')}: ${diceStr}`
      } else if (typeof value === 'object' && value !== null) {
        text += `\n- ${key.replace(/_/g, ' ')}: ${JSON.stringify(value)}`
      } else {
        text += `\n- ${key.replace(/_/g, ' ')}: ${String(value)}`
      }
    })
  }

  if (item.value) {
    text += `\n\nValue: ${getValueDisplay(item.value as number | ValueObject)}`
  }
  if (item.weight) {
    text += `\nWeight: ${getWeightDisplay(item.weight as number | WeightObject)}`
  }
  if (item.attunement) {
    text += '\nRequires Attunement'
  }

  return text
}
