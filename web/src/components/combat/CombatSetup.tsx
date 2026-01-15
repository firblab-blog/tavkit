import { useState } from 'react'
import Icon from '../common/Icon'

interface CombatSetupProps {
  onCreateCombat: (name: string, difficulty?: string, environment?: string) => void
  loading: boolean
}

const DIFFICULTIES = ['Trivial', 'Easy', 'Medium', 'Hard', 'Deadly']
const ENVIRONMENTS = [
  'Open Field',
  'Forest',
  'Dungeon',
  'Cave',
  'Urban',
  'Underwater',
  'Aerial',
  'Ship/Boat',
  'Mountain',
  'Swamp',
  'Desert',
  'Arctic',
]

export default function CombatSetup({ onCreateCombat, loading }: CombatSetupProps) {
  const [name, setName] = useState('')
  const [difficulty, setDifficulty] = useState<string>('')
  const [environment, setEnvironment] = useState<string>('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onCreateCombat(name.trim(), difficulty || undefined, environment || undefined)
  }

  return (
    <div className="h-full flex items-center justify-center bg-background p-6">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 mb-4">
            <Icon name="Swords" className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-3xl font-bold text-text mb-2">Combat Tracker</h1>
          <p className="text-text-muted">
            Track initiative, HP, conditions, and more during combat encounters.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-background-panel border border-border rounded-xl p-6 space-y-6"
        >
          {/* Encounter Name */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Encounter Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Goblin Ambush, Boss Fight"
              className="w-full px-4 py-3 bg-background border border-border rounded-lg text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
              autoFocus
            />
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Difficulty (Optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(difficulty === d ? '' : d)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    difficulty === d
                      ? 'bg-primary text-background'
                      : 'bg-background border border-border text-text-muted hover:border-primary/40'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Environment */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Environment (Optional)
            </label>
            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg text-text focus:border-primary focus:outline-none"
            >
              <option value="">Select environment...</option>
              {ENVIRONMENTS.map((env) => (
                <option key={env} value={env}>
                  {env}
                </option>
              ))}
            </select>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!name.trim() || loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary/80 text-background font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Icon name="Loader2" className="w-5 h-5 animate-spin" />
            ) : (
              <Icon name="Swords" className="w-5 h-5" />
            )}
            Start Combat
          </button>
        </form>

        {/* Quick Tips */}
        <div className="mt-6 p-4 bg-background-panel/50 border border-border/50 rounded-lg">
          <h3 className="text-sm font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="Sparkles" className="w-4 h-4 text-primary" />
            Quick Tips
          </h3>
          <ul className="text-xs text-text-muted space-y-1">
            <li>• Add participants from PCs, NPCs, or monsters in your campaign</li>
            <li>• Roll or set initiative for each combatant</li>
            <li>• Track HP changes, temp HP, and conditions</li>
            <li>• Use Next Turn to advance through the initiative order</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
