// Manual Entry Form for Critters

import Icon from '@/components/common/Icon'
import { FormField } from '@/components/ui/FormField'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'
import CampaignSelector from '@/components/common/CampaignSelector'
import { ArrayFieldEditor, ObjectArrayEditor, AbilityScoresEditor } from '../components/Fields'
import {
  critterTypeOptions,
  critterSizeOptions,
  temperamentOptions,
  habitatOptions,
  type ManualCritterData,
} from '../schemas/critter'

interface CritterManualFormProps {
  campaignId: string | null
  onCampaignSelect: (id: string | null) => void
  manualData: ManualCritterData
  setManualData: (data: ManualCritterData | ((prev: ManualCritterData) => ManualCritterData)) => void
  onSave: () => void
  saving: boolean
  saved: boolean
  error: string | null
}

export function CritterManualForm({
  campaignId,
  onCampaignSelect,
  manualData,
  setManualData,
  onSave,
  saving,
  saved,
  error,
}: CritterManualFormProps) {
  return (
    <>
      <CampaignSelector selectedCampaignId={campaignId} onSelect={onCampaignSelect} />

      {/* Basic Information */}
      <FormField label="Critter Name" required>
        <input
          type="text"
          value={manualData.name}
          onChange={(e) => setManualData({ ...manualData, name: e.target.value })}
          placeholder="e.g., 'Glimmerwing', 'Forest Prowler'"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      <FormField label="Species" description="Scientific or common species name">
        <input
          type="text"
          value={manualData.species}
          onChange={(e) => setManualData({ ...manualData, species: e.target.value })}
          placeholder="e.g., 'Felis luminosa', 'Giant Beetle'"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Type">
          <select
            value={manualData.critter_type}
            onChange={(e) => setManualData({ ...manualData, critter_type: e.target.value })}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {critterTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Size">
          <select
            value={manualData.size}
            onChange={(e) => setManualData({ ...manualData, size: e.target.value })}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {critterSizeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Temperament">
          <select
            value={manualData.temperament}
            onChange={(e) => setManualData({ ...manualData, temperament: e.target.value })}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {temperamentOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Habitat">
          <select
            value={manualData.habitat}
            onChange={(e) => setManualData({ ...manualData, habitat: e.target.value })}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {habitatOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField label="Description">
        <textarea
          value={manualData.description}
          onChange={(e) => setManualData({ ...manualData, description: e.target.value })}
          placeholder="Physical appearance, coloring, distinguishing features..."
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={3}
        />
      </FormField>

      <FormField label="Behavior">
        <textarea
          value={manualData.behavior}
          onChange={(e) => setManualData({ ...manualData, behavior: e.target.value })}
          placeholder="How it acts, hunting patterns, social structure..."
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={2}
        />
      </FormField>

      {/* Stats Section */}
      <CollapsibleSection title="Stats" icon="Shield" defaultExpanded={false}>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <FormField label="AC">
              <input
                type="number"
                value={manualData.stats.ac ?? ''}
                onChange={(e) =>
                  setManualData({
                    ...manualData,
                    stats: {
                      ...manualData.stats,
                      ac: e.target.value ? parseInt(e.target.value) : null,
                    },
                  })
                }
                placeholder="-"
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </FormField>
            <FormField label="HP">
              <input
                type="number"
                value={manualData.stats.hp ?? ''}
                onChange={(e) =>
                  setManualData({
                    ...manualData,
                    stats: {
                      ...manualData.stats,
                      hp: e.target.value ? parseInt(e.target.value) : null,
                    },
                  })
                }
                placeholder="-"
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </FormField>
            <FormField label="Speed">
              <input
                type="text"
                value={manualData.stats.speed}
                onChange={(e) =>
                  setManualData({
                    ...manualData,
                    stats: { ...manualData.stats, speed: e.target.value },
                  })
                }
                placeholder="30 ft."
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </FormField>
          </div>

          <AbilityScoresEditor
            values={manualData.stats}
            onChange={(stats) =>
              setManualData({ ...manualData, stats: { ...manualData.stats, ...stats } })
            }
          />
        </div>
      </CollapsibleSection>

      {/* Special Abilities */}
      <CollapsibleSection title="Special Abilities" icon="Sparkles" defaultExpanded={false}>
        <ObjectArrayEditor
          label=""
          values={manualData.special_abilities.map((a) => ({
            name: a.name,
            description: a.description,
          }))}
          onChange={(abilities) =>
            setManualData({
              ...manualData,
              special_abilities: abilities.map((a) => ({
                name: a.name,
                description: a.description,
              })),
            })
          }
          nameLabel="Ability Name"
          descriptionLabel="Effect"
          namePlaceholder="e.g., 'Keen Senses'"
          descriptionPlaceholder="What this ability does..."
        />
      </CollapsibleSection>

      {/* Uses */}
      <CollapsibleSection title="Potential Uses" icon="Wrench" defaultExpanded={false}>
        <ArrayFieldEditor
          label=""
          values={manualData.uses}
          onChange={(uses) => setManualData({ ...manualData, uses })}
          placeholder="Add a use..."
          description="How adventurers might use this critter"
        />
      </CollapsibleSection>

      {/* Additional Details */}
      <CollapsibleSection title="Additional Details" icon="FileText" defaultExpanded={false}>
        <div className="space-y-4">
          <FormField label="Training Difficulty">
            <input
              type="text"
              value={manualData.training_difficulty}
              onChange={(e) =>
                setManualData({ ...manualData, training_difficulty: e.target.value })
              }
              placeholder="e.g., 'Easy', 'Moderate', 'Nearly Impossible'"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </FormField>

          <FormField label="Diet">
            <input
              type="text"
              value={manualData.diet}
              onChange={(e) => setManualData({ ...manualData, diet: e.target.value })}
              placeholder="e.g., 'Carnivore', 'Omnivore', 'Magical energy'"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </FormField>

          <FormField label="Lifespan">
            <input
              type="text"
              value={manualData.lifespan}
              onChange={(e) => setManualData({ ...manualData, lifespan: e.target.value })}
              placeholder="e.g., '5-10 years', 'Centuries', 'Unknown'"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </FormField>

          <ArrayFieldEditor
            label="Interesting Facts"
            values={manualData.interesting_facts}
            onChange={(facts) => setManualData({ ...manualData, interesting_facts: facts })}
            placeholder="Add a fact..."
          />

          <FormField label="Encounter Notes">
            <textarea
              value={manualData.encounter_notes}
              onChange={(e) => setManualData({ ...manualData, encounter_notes: e.target.value })}
              placeholder="DM notes for encounters..."
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={2}
            />
          </FormField>
        </div>
      </CollapsibleSection>

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Save Button */}
      <button
        type="button"
        onClick={onSave}
        disabled={saving || !manualData.name.trim()}
        className="w-full px-4 py-3 bg-primary hover:bg-primary-dark disabled:bg-primary/50 text-tavern-darkest font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {saving ? (
          <>
            <Icon name="Loader2" className="w-5 h-5 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Icon name="Save" className="w-5 h-5" />
            Save Critter
          </>
        )}
      </button>

      {saved && (
        <div className="text-center text-green-400 text-sm">
          Critter saved! You can find it in the Saved Content section.
        </div>
      )}
    </>
  )
}
