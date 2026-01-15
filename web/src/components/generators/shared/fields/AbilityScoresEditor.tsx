interface AbilityScores {
  str: number | null
  dex: number | null
  con: number | null
  int: number | null
  wis: number | null
  cha: number | null
}

interface AbilityScoresEditorProps {
  values: AbilityScores
  onChange: (values: AbilityScores) => void
  label?: string
  description?: string
}

const ABILITY_LABELS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const

function getModifier(score: number | null): string {
  if (score === null) return '-'
  const mod = Math.floor((score - 10) / 2)
  return mod >= 0 ? `+${mod}` : `${mod}`
}

export function AbilityScoresEditor({
  values,
  onChange,
  label = 'Ability Scores',
  description,
}: AbilityScoresEditorProps) {
  const handleChange = (key: keyof AbilityScores, value: string) => {
    const numValue = value === '' ? null : parseInt(value, 10)
    onChange({ ...values, [key]: isNaN(numValue as number) ? null : numValue })
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-text">{label}</label>
      {description && <p className="text-xs text-text-muted">{description}</p>}

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {ABILITY_LABELS.map((ability) => {
          const key = ability.toLowerCase() as keyof AbilityScores
          const value = values[key]
          return (
            <div
              key={ability}
              className="bg-background border border-border rounded-lg p-2 text-center"
            >
              <p className="text-xs text-text-muted mb-1">{ability}</p>
              <input
                type="number"
                min="1"
                max="30"
                value={value ?? ''}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder="-"
                className="w-full text-center text-lg font-bold bg-transparent text-text focus:outline-none focus:ring-1 focus:ring-primary rounded [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <p className="text-xs text-text-muted mt-1">{getModifier(value)}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
