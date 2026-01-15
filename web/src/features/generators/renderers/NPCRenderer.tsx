// NPC Result Renderer
// Displays generated NPC data in a structured format

import Icon from '@/components/common/Icon'
import { ActionsBar } from '@/components/ui/ActionsBar'
import { RawDataViewer, ParseWarning } from '../components'
import type { GeneratedNPCData } from '../normalizers/npc'

interface NPCRendererProps {
  npc: GeneratedNPCData
  showRawResponse: boolean
  isSaved: boolean
  onSave: () => void
  onCopy: () => void
}

function getModifier(score: number): string {
  const mod = Math.floor((score - 10) / 2)
  return mod >= 0 ? `+${mod}` : `${mod}`
}

export function NPCRenderer({
  npc,
  showRawResponse,
  isSaved,
  onSave,
  onCopy,
}: NPCRendererProps) {
  return (
    <div className="space-y-6">
      {/* Parse warning */}
      {npc._parseError && <ParseWarning message={npc._parseError} />}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-primary">{npc.name}</h2>
        <p className="text-sm text-text-muted">
          {npc.race} {npc.class} {npc.level}
          {npc.alignment && `, ${npc.alignment}`}
        </p>
      </div>

      {/* Appearance */}
      {npc.appearance && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="User" className="w-5 h-5 text-primary" />
            Appearance
          </h3>
          <p className="text-text">{npc.appearance}</p>
        </div>
      )}

      {/* Personality */}
      {(npc.personality.traits.length > 0 ||
        npc.personality.ideals ||
        npc.personality.bonds ||
        npc.personality.flaws) && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Smile" className="w-5 h-5 text-primary" />
            Personality
          </h3>
          <div className="grid gap-3">
            {npc.personality.traits.length > 0 && (
              <div className="bg-background p-3 rounded border border-primary/30">
                <p className="text-xs text-text-muted mb-1">Traits</p>
                <p className="text-text">{npc.personality.traits.join(', ')}</p>
              </div>
            )}
            {npc.personality.ideals && (
              <div className="bg-background p-3 rounded border border-border">
                <p className="text-xs text-text-muted mb-1">Ideals</p>
                <p className="text-text">{npc.personality.ideals}</p>
              </div>
            )}
            {npc.personality.bonds && (
              <div className="bg-background p-3 rounded border border-border">
                <p className="text-xs text-text-muted mb-1">Bonds</p>
                <p className="text-text">{npc.personality.bonds}</p>
              </div>
            )}
            {npc.personality.flaws && (
              <div className="bg-background p-3 rounded border border-border">
                <p className="text-xs text-text-muted mb-1">Flaws</p>
                <p className="text-text">{npc.personality.flaws}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Background */}
      {npc.background && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="Book" className="w-5 h-5 text-primary" />
            Background
          </h3>
          <p className="text-text">{npc.background}</p>
        </div>
      )}

      {/* Motivation */}
      {npc.motivation && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="Sparkles" className="w-5 h-5 text-primary" />
            Motivation
          </h3>
          <p className="text-text">{npc.motivation}</p>
        </div>
      )}

      {/* Ability Scores */}
      <div>
        <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
          <Icon name="Dices" className="w-5 h-5 text-primary" />
          Ability Scores
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {Object.entries(npc.abilities).map(([stat, value]) => (
            <div key={stat} className="bg-background p-2 rounded border border-border text-center">
              <p className="text-xs text-text-muted mb-1">{stat}</p>
              <p className="text-lg font-bold text-text">{value}</p>
              <p className="text-xs text-primary">{getModifier(value)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Combat Stats (if present) */}
      {npc.combat && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Shield" className="w-5 h-5 text-primary" />
            Combat
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {npc.combat.ac !== undefined && (
              <div className="bg-background p-3 rounded border border-border">
                <p className="text-xs text-text-muted mb-1">Armor Class</p>
                <p className="text-xl font-bold text-primary">{npc.combat.ac}</p>
              </div>
            )}
            {npc.combat.hp !== undefined && (
              <div className="bg-background p-3 rounded border border-border">
                <p className="text-xs text-text-muted mb-1">Hit Points</p>
                <p className="text-xl font-bold text-red-400">{npc.combat.hp}</p>
              </div>
            )}
            {npc.combat.speed && (
              <div className="bg-background p-3 rounded border border-border">
                <p className="text-xs text-text-muted mb-1">Speed</p>
                <p className="text-xl font-bold text-blue-400">{npc.combat.speed}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Skills */}
      {npc.skills.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="ListChecks" className="w-5 h-5 text-primary" />
            Skills
          </h3>
          <p className="text-text">{npc.skills.join(', ')}</p>
        </div>
      )}

      {/* Equipment */}
      {npc.equipment.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="Package" className="w-5 h-5 text-primary" />
            Equipment
          </h3>
          <ul className="space-y-1">
            {npc.equipment.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-text">
                <span className="text-primary mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Role */}
      {npc.role && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="Users" className="w-5 h-5 text-primary" />
            Role
          </h3>
          <p className="text-text capitalize">{npc.role.replace(/_/g, ' ')}</p>
        </div>
      )}

      {/* Plot Hooks */}
      {npc.plot_hooks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Link" className="w-5 h-5 text-primary" />
            Plot Hooks
          </h3>
          <div className="space-y-2">
            {npc.plot_hooks.map((hook, i) => (
              <div key={i} className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                <p className="text-text">{hook}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw/unexpected fields - collapsible */}
      {npc._raw && <RawDataViewer data={npc._raw} defaultExpanded={showRawResponse} />}

      <ActionsBar
        onCopy={onCopy}
        onSave={isSaved ? undefined : onSave}
        showRegenerate={false}
        isSaved={isSaved}
      />
    </div>
  )
}

// Helper to format NPC for clipboard
export function formatNPCForClipboard(npc: GeneratedNPCData): string {
  const traits = npc.personality.traits.join(', ') || 'N/A'
  const abilities = Object.entries(npc.abilities)
    .map(([stat, value]) => `${stat} ${value}`)
    .join(', ')

  return `${npc.name}
${npc.race} ${npc.class} ${npc.level}, ${npc.alignment}

Appearance: ${npc.appearance || 'N/A'}

Personality:
Traits: ${traits}
Ideals: ${npc.personality.ideals || 'N/A'}
Bonds: ${npc.personality.bonds || 'N/A'}
Flaws: ${npc.personality.flaws || 'N/A'}

Background: ${npc.background || 'N/A'}

Motivation: ${npc.motivation || 'N/A'}

Abilities: ${abilities}

Skills: ${npc.skills.join(', ') || 'N/A'}

Equipment: ${npc.equipment.join(', ') || 'N/A'}

Role: ${npc.role || 'N/A'}
${npc.plot_hooks.length ? `\nPlot Hooks:\n${npc.plot_hooks.map((h) => `- ${h}`).join('\n')}` : ''}`
}
