import Icon from '../common/Icon'
import { TavernEncounter, TIME_OF_DAY, CROWD_SIZE, ATMOSPHERE } from './TavernSession'

interface AtmospherePanelProps {
  encounter: TavernEncounter
  onUpdate: (updates: Partial<TavernEncounter>) => void
  disabled?: boolean
}

export default function AtmospherePanel({
  encounter,
  onUpdate,
  disabled = false,
}: AtmospherePanelProps) {
  const currentTime = TIME_OF_DAY.find((t) => t.value === encounter.time_of_day)
  const currentAtmo = ATMOSPHERE.find((a) => a.value === encounter.atmosphere)

  return (
    <div className="bg-background-panel border border-border rounded-xl p-4 space-y-4">
      {/* Time of Day */}
      <div>
        <h3 className="font-semibold text-text mb-2 flex items-center gap-2">
          <Icon name={currentTime?.icon || 'Sun'} className="w-4 h-4 text-primary" />
          Time of Day
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {TIME_OF_DAY.map((time) => (
            <button
              key={time.value}
              onClick={() => !disabled && onUpdate({ time_of_day: time.value })}
              disabled={disabled}
              className={`p-2 rounded-lg border text-sm transition-colors ${
                encounter.time_of_day === time.value
                  ? 'border-primary bg-primary/10 text-text'
                  : 'border-border text-text-muted hover:border-primary/40'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Icon name={time.icon} className="w-4 h-4 mx-auto mb-0.5" />
              {time.label}
            </button>
          ))}
        </div>
      </div>

      {/* Crowd Size */}
      <div>
        <h3 className="font-semibold text-text mb-2 flex items-center gap-2">
          <Icon name="Users" className="w-4 h-4 text-text-muted" />
          Crowd Size
        </h3>
        <div className="flex flex-wrap gap-1">
          {CROWD_SIZE.map((size) => (
            <button
              key={size.value}
              onClick={() => !disabled && onUpdate({ crowd_size: size.value })}
              disabled={disabled}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                encounter.crowd_size === size.value
                  ? 'bg-primary text-background'
                  : 'bg-background text-text-muted hover:text-text border border-border hover:border-primary/40'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {size.label}
            </button>
          ))}
        </div>
        <div className="mt-2 h-2 bg-background rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{
              width: `${
                (CROWD_SIZE.findIndex((c) => c.value === encounter.crowd_size) + 1) *
                (100 / CROWD_SIZE.length)
              }%`,
            }}
          />
        </div>
      </div>

      {/* Atmosphere */}
      <div>
        <h3 className="font-semibold text-text mb-2 flex items-center gap-2">
          <Icon name={currentAtmo?.icon || 'Smile'} className="w-4 h-4 text-text-muted" />
          Atmosphere
        </h3>
        <div className="flex flex-wrap gap-1">
          {ATMOSPHERE.map((atmo) => (
            <button
              key={atmo.value}
              onClick={() => !disabled && onUpdate({ atmosphere: atmo.value })}
              disabled={disabled}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
                encounter.atmosphere === atmo.value
                  ? 'bg-primary text-background'
                  : 'bg-background text-text-muted hover:text-text border border-border hover:border-primary/40'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Icon name={atmo.icon} className="w-3 h-3" />
              {atmo.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <h3 className="font-semibold text-text mb-2 flex items-center gap-2">
          <Icon name="FileText" className="w-4 h-4 text-text-muted" />
          Notes
        </h3>
        <textarea
          value={encounter.notes || ''}
          onChange={(e) => onUpdate({ notes: e.target.value })}
          placeholder="Session notes..."
          className="w-full h-24 px-3 py-2 bg-background border border-border rounded-lg text-text placeholder:text-text-muted resize-none focus:border-primary focus:outline-none text-sm"
          disabled={disabled}
        />
      </div>
    </div>
  )
}
