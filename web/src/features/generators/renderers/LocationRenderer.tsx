// Location Result Renderer
// Displays generated Location data in a structured format

import Icon from '@/components/common/Icon'
import { ActionsBar } from '@/components/ui/ActionsBar'
import { RawDataViewer, ParseWarning } from '../components'
import type { GeneratedLocationData } from '../normalizers/location'

interface LocationRendererProps {
  location: GeneratedLocationData
  showRawResponse: boolean
  isSaved: boolean
  onSave: () => void
  onCopy: () => void
}

export function LocationRenderer({
  location,
  showRawResponse,
  isSaved,
  onSave,
  onCopy,
}: LocationRendererProps) {
  return (
    <div className="space-y-6">
      {/* Parse warning */}
      {location._parseError && <ParseWarning message={location._parseError} />}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-primary">{location.name}</h2>
        <p className="text-sm text-text-muted capitalize">
          {location.type}
          {location.size && ` • ${location.size}`}
          {location.danger_level && ` • ${location.danger_level} danger`}
          {location.theme && ` • ${location.theme}`}
        </p>
      </div>

      {/* Description */}
      {location.description && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="FileText" className="w-5 h-5 text-primary" />
            Description
          </h3>
          <div className="bg-background p-4 rounded border border-border">
            <p className="text-text whitespace-pre-line">{location.description}</p>
          </div>
        </div>
      )}

      {/* Features */}
      {location.features && location.features.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Map" className="w-5 h-5 text-primary" />
            Features
          </h3>
          <div className="space-y-2">
            {location.features.map((feature, i) => (
              <div key={i} className="bg-background p-3 rounded border border-primary/30">
                <p className="text-text">{feature}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Secrets */}
      {location.secrets && location.secrets.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-amber-400 mb-3 flex items-center gap-2">
            <Icon name="Eye" className="w-5 h-5" />
            Secrets (DM Only)
          </h3>
          <div className="space-y-2">
            {location.secrets.map((secret, i) => (
              <div key={i} className="bg-amber-500/10 p-3 rounded border border-amber-500/30">
                <p className="text-text">{secret}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notable NPCs */}
      {location.npcs && location.npcs.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Users" className="w-5 h-5 text-primary" />
            Notable NPCs
          </h3>
          <div className="space-y-2">
            {location.npcs.map((npc, i) => (
              <div key={i} className="bg-background p-3 rounded border border-border">
                <p className="text-text">{npc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Encounter Hooks */}
      {location.encounters && location.encounters.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-red-400 mb-3 flex items-center gap-2">
            <Icon name="Swords" className="w-5 h-5" />
            Encounter Hooks
          </h3>
          <div className="space-y-2">
            {location.encounters.map((encounter, i) => (
              <div key={i} className="bg-red-500/10 p-3 rounded border border-red-500/30">
                <p className="text-text">{encounter}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Factions */}
      {location.factions && location.factions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Shield" className="w-5 h-5 text-primary" />
            Factions
          </h3>
          <div className="space-y-2">
            {location.factions.map((faction, i) => (
              <div key={i} className="bg-background p-3 rounded border border-purple-500/30">
                <p className="text-text">{faction}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw/unexpected fields */}
      {location._raw && <RawDataViewer data={location._raw} defaultExpanded={showRawResponse} />}

      <ActionsBar
        onCopy={onCopy}
        onSave={isSaved ? undefined : onSave}
        showRegenerate={false}
        isSaved={isSaved}
      />
    </div>
  )
}

// Helper to format Location for clipboard
export function formatLocationForClipboard(location: GeneratedLocationData): string {
  let text = `${location.name}\n${location.type}${location.theme ? ` • ${location.theme}` : ''}\n\n${location.description}`

  if (location.features && location.features.length > 0) {
    text += '\n\nFeatures:\n'
    location.features.forEach((feature) => {
      text += `- ${feature}\n`
    })
  }

  if (location.secrets && location.secrets.length > 0) {
    text += '\nSecrets:\n'
    location.secrets.forEach((secret) => {
      text += `- ${secret}\n`
    })
  }

  if (location.npcs && location.npcs.length > 0) {
    text += '\nNotable NPCs:\n'
    location.npcs.forEach((npc) => {
      text += `- ${npc}\n`
    })
  }

  if (location.encounters && location.encounters.length > 0) {
    text += '\nEncounter Hooks:\n'
    location.encounters.forEach((encounter) => {
      text += `- ${encounter}\n`
    })
  }

  if (location.factions && location.factions.length > 0) {
    text += '\nFactions:\n'
    location.factions.forEach((faction) => {
      text += `- ${faction}\n`
    })
  }

  return text
}
