import { useState } from 'react'
import Icon from '../common/Icon'
import { TIME_OF_DAY, CROWD_SIZE, ATMOSPHERE } from './TavernSession'

interface TavernSetupProps {
  onStart: (data: {
    tavern_id: string
    tavern_name: string
    time_of_day: string
    crowd_size: string
    atmosphere: string
  }) => void
  isLoading: boolean
}

export default function TavernSetup({ onStart, isLoading }: TavernSetupProps) {
  const [tavernName, setTavernName] = useState('')
  const [timeOfDay, setTimeOfDay] = useState('evening')
  const [crowdSize, setCrowdSize] = useState('moderate')
  const [atmosphere, setAtmosphere] = useState('lively')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!tavernName.trim()) return

    onStart({
      tavern_id: `tavern-${Date.now()}`, // Generate temporary ID
      tavern_name: tavernName.trim(),
      time_of_day: timeOfDay,
      crowd_size: crowdSize,
      atmosphere: atmosphere,
    })
  }

  return (
    <div className="bg-background-panel border border-border rounded-xl overflow-hidden">
      <div className="p-6 border-b border-border">
        <h2 className="text-lg font-bold text-text flex items-center gap-2">
          <Icon name="Beer" className="w-5 h-5 text-primary" />
          Start Tavern Session
        </h2>
        <p className="text-sm text-text-muted mt-1">
          Track patron interactions, rumors heard, and tabs during a tavern visit.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Tavern Name */}
        <div>
          <label className="block text-sm font-medium text-text mb-2">Tavern Name</label>
          <input
            type="text"
            value={tavernName}
            onChange={(e) => setTavernName(e.target.value)}
            placeholder="e.g., The Prancing Pony, The Rusty Dragon"
            className="w-full px-4 py-3 bg-background border border-border rounded-lg text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
            required
          />
        </div>

        {/* Time of Day */}
        <div>
          <label className="block text-sm font-medium text-text mb-2">Time of Day</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TIME_OF_DAY.map((time) => (
              <button
                key={time.value}
                type="button"
                onClick={() => setTimeOfDay(time.value)}
                className={`p-3 rounded-lg border text-center transition-colors ${
                  timeOfDay === time.value
                    ? 'border-primary bg-primary/10 text-text'
                    : 'border-border text-text-muted hover:border-primary/40'
                }`}
              >
                <Icon name={time.icon} className="w-5 h-5 mx-auto mb-1" />
                <span className="text-sm font-medium">{time.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Crowd Size */}
        <div>
          <label className="block text-sm font-medium text-text mb-2">Crowd Size</label>
          <div className="flex flex-wrap gap-2">
            {CROWD_SIZE.map((size) => (
              <button
                key={size.value}
                type="button"
                onClick={() => setCrowdSize(size.value)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  crowdSize === size.value
                    ? 'border-primary bg-primary/10 text-text'
                    : 'border-border text-text-muted hover:border-primary/40'
                }`}
              >
                {size.label}
              </button>
            ))}
          </div>
        </div>

        {/* Atmosphere */}
        <div>
          <label className="block text-sm font-medium text-text mb-2">Atmosphere</label>
          <div className="flex flex-wrap gap-2">
            {ATMOSPHERE.map((atmo) => (
              <button
                key={atmo.value}
                type="button"
                onClick={() => setAtmosphere(atmo.value)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2 ${
                  atmosphere === atmo.value
                    ? 'border-primary bg-primary/10 text-text'
                    : 'border-border text-text-muted hover:border-primary/40'
                }`}
              >
                <Icon name={atmo.icon} className="w-4 h-4" />
                {atmo.label}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading || !tavernName.trim()}
          className="w-full px-4 py-3 bg-primary hover:bg-primary/90 text-background font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Icon name="Loader2" className="w-5 h-5 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <Icon name="Play" className="w-5 h-5" />
              Begin Session
            </>
          )}
        </button>
      </form>
    </div>
  )
}
