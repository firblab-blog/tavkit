// Renderer for generated Encounter content

import Icon from '@/components/common/Icon'
import { ActionsBar } from '@/components/ui/ActionsBar'
import { RawDataViewer, ParseWarning } from '../components'
import type { GeneratedEncounterData } from '../normalizers/encounter'

interface EncounterRendererProps {
  encounter: GeneratedEncounterData
  showRawResponse?: boolean
  isSaved: boolean
  onSave: () => void
  onCopy: () => void
}

export function EncounterRenderer({
  encounter,
  showRawResponse,
  isSaved,
  onSave,
  onCopy,
}: EncounterRendererProps) {
  return (
    <div className="space-y-6">
      {/* Parse warning */}
      {encounter._parseError && <ParseWarning message={encounter._parseError} />}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-primary">{encounter.name}</h2>
        <p className="text-sm text-text-muted capitalize">{encounter.difficulty} Encounter</p>
      </div>

      {/* Description */}
      {encounter.description && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="FileText" className="w-5 h-5 text-primary" />
            Description
          </h3>
          <div className="bg-background p-4 rounded border border-primary/30">
            <p className="text-text whitespace-pre-line">{encounter.description}</p>
          </div>
        </div>
      )}

      {/* Environment */}
      {(encounter.environment.setting || encounter.environment.features.length > 0) && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Map" className="w-5 h-5 text-green-400" />
            Environment
          </h3>
          <div className="bg-green-500/10 p-4 rounded border border-green-500/30 space-y-2">
            {encounter.environment.setting && (
              <p className="text-text">
                <strong className="text-green-400">Setting:</strong> {encounter.environment.setting}
              </p>
            )}
            {encounter.environment.lighting && (
              <p className="text-text">
                <strong className="text-green-400">Lighting:</strong>{' '}
                {encounter.environment.lighting}
              </p>
            )}
            {encounter.environment.features.length > 0 && (
              <div className="mt-2">
                <strong className="text-green-400">Environmental Features:</strong>
                <ul className="mt-1 space-y-1">
                  {encounter.environment.features.map((feature, idx) => (
                    <li key={idx} className="text-text flex items-start gap-2">
                      <span className="text-green-400">•</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Creatures */}
      {encounter.creatures.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Skull" className="w-5 h-5 text-red-400" />
            Creatures
          </h3>
          <div className="space-y-3">
            {encounter.creatures.map((creature, idx) => (
              <div key={idx} className="bg-red-500/10 p-4 rounded border border-red-500/30">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="text-lg font-medium text-red-400">
                      {creature.count}x {creature.name}
                    </h4>
                    <p className="text-sm text-text-muted">CR {creature.cr}</p>
                  </div>
                  {creature.role && (
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-sm font-medium">
                      {creature.role}
                    </span>
                  )}
                </div>
                {creature.tactics && (
                  <p className="text-text text-sm">
                    <strong className="text-red-400">Tactics:</strong> {creature.tactics}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* XP */}
      {(encounter.xp_total > 0 || encounter.xp_per_player > 0) && (
        <div className="grid md:grid-cols-2 gap-3">
          {encounter.xp_total > 0 && (
            <div className="bg-background p-3 rounded border border-border">
              <p className="text-xs text-text-muted mb-1">XP Total</p>
              <p className="text-xl font-bold text-amber-400">
                {encounter.xp_total.toLocaleString()}
              </p>
            </div>
          )}
          {encounter.xp_per_player > 0 && (
            <div className="bg-background p-3 rounded border border-border">
              <p className="text-xs text-text-muted mb-1">XP per Player</p>
              <p className="text-xl font-bold text-amber-400">
                {encounter.xp_per_player.toLocaleString()}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Treasure */}
      {(Object.keys(encounter.treasure.coins).length > 0 ||
        encounter.treasure.items.length > 0) && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Sparkles" className="w-5 h-5 text-amber-400" />
            Treasure
          </h3>
          {Object.keys(encounter.treasure.coins).length > 0 && (
            <div className="mb-3">
              <h4 className="font-medium text-amber-400 mb-2">Coins</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(encounter.treasure.coins).map(([type, amount]) => (
                  <div
                    key={type}
                    className="bg-amber-500/10 border border-amber-500/30 rounded p-2"
                  >
                    <span className="text-amber-400 font-medium">
                      {amount} <span className="text-text-muted uppercase">{type}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {encounter.treasure.items.length > 0 && (
            <div>
              <h4 className="font-medium text-amber-400 mb-2">Items</h4>
              <ul className="space-y-1">
                {encounter.treasure.items.map((item, idx) => (
                  <li key={idx} className="text-text flex items-start gap-2">
                    <span className="text-amber-400">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Expected Duration */}
      {encounter.expected_duration && (
        <div className="bg-background p-4 rounded border border-primary/30">
          <p className="text-text">
            <strong className="text-primary">Expected Duration:</strong>{' '}
            {encounter.expected_duration}
          </p>
        </div>
      )}

      {/* Raw/unexpected fields */}
      {encounter._raw && <RawDataViewer data={encounter._raw} defaultExpanded={showRawResponse} />}

      <ActionsBar
        onCopy={onCopy}
        onSave={isSaved ? undefined : onSave}
        showRegenerate={false}
        isSaved={isSaved}
      />
    </div>
  )
}

// Format encounter for clipboard
export function formatEncounterForClipboard(encounter: GeneratedEncounterData): string {
  let text = `${encounter.name}\n${encounter.difficulty} Encounter\n\n${encounter.description}`

  if (encounter.environment.setting) {
    text += `\n\nEnvironment: ${encounter.environment.setting}`
  }
  if (encounter.environment.lighting) {
    text += `\nLighting: ${encounter.environment.lighting}`
  }
  if (encounter.environment.features.length > 0) {
    text += `\n\nEnvironmental Features:\n${encounter.environment.features.map((f) => `- ${f}`).join('\n')}`
  }

  if (encounter.creatures.length > 0) {
    text += '\n\nCreatures:'
    encounter.creatures.forEach((creature) => {
      text += `\n\n${creature.count}x ${creature.name} (CR ${creature.cr})`
      if (creature.role) text += `\nRole: ${creature.role}`
      if (creature.tactics) text += `\nTactics: ${creature.tactics}`
    })
  }

  if (encounter.xp_total > 0) {
    text += `\n\nXP Total: ${encounter.xp_total.toLocaleString()}`
  }
  if (encounter.xp_per_player > 0) {
    text += `\nXP per Player: ${encounter.xp_per_player.toLocaleString()}`
  }
  if (encounter.expected_duration) {
    text += `\n\nExpected Duration: ${encounter.expected_duration}`
  }

  if (encounter.treasure.coins && Object.keys(encounter.treasure.coins).length > 0) {
    text += '\n\nTreasure (Coins):'
    Object.entries(encounter.treasure.coins).forEach(([type, amount]) => {
      text += `\n${amount} ${type}`
    })
  }

  if (encounter.treasure.items && encounter.treasure.items.length > 0) {
    text += '\n\nTreasure (Items):'
    encounter.treasure.items.forEach((item) => {
      text += `\n- ${item}`
    })
  }

  return text
}
