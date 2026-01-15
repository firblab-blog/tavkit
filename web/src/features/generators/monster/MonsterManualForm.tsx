// Manual Entry Form for Monsters

import Icon from "@/components/common/Icon";
import { FormField } from "@/components/ui/FormField";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import CampaignSelector from "@/components/common/CampaignSelector";
import { ArrayFieldEditor, ObjectArrayEditor } from "../components/Fields";
import {
  creatureTypeOptions,
  sizeOptions,
  alignmentOptions,
  challengeRatingOptions,
  type ManualMonsterData,
} from "../schemas/monster";

interface MonsterManualFormProps {
  campaignId: string | null;
  onCampaignSelect: (id: string | null) => void;
  manualData: ManualMonsterData;
  setManualData: (
    data: ManualMonsterData | ((prev: ManualMonsterData) => ManualMonsterData),
  ) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  error: string | null;
}

export function MonsterManualForm({
  campaignId,
  onCampaignSelect,
  manualData,
  setManualData,
  onSave,
  saving,
  saved,
  error,
}: MonsterManualFormProps) {
  return (
    <>
      <CampaignSelector
        selectedCampaignId={campaignId}
        onSelect={onCampaignSelect}
      />

      {/* Basic Information */}
      <FormField label="Monster Name" required>
        <input
          type="text"
          value={manualData.name}
          onChange={(e) =>
            setManualData({ ...manualData, name: e.target.value })
          }
          placeholder="e.g., Shadow Serpent, Flame Horror"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Creature Type">
          <select
            value={manualData.creature_type}
            onChange={(e) =>
              setManualData({ ...manualData, creature_type: e.target.value })
            }
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {creatureTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Size">
          <select
            value={manualData.size}
            onChange={(e) =>
              setManualData({ ...manualData, size: e.target.value })
            }
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {sizeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Alignment">
          <select
            value={manualData.alignment}
            onChange={(e) =>
              setManualData({ ...manualData, alignment: e.target.value })
            }
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {alignmentOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Challenge Rating">
          <select
            value={manualData.challenge_rating}
            onChange={(e) =>
              setManualData({ ...manualData, challenge_rating: e.target.value })
            }
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {challengeRatingOptions.map((opt) => (
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
          onChange={(e) =>
            setManualData({ ...manualData, description: e.target.value })
          }
          placeholder="Physical description of the creature..."
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={2}
        />
      </FormField>

      {/* Core Stats */}
      <CollapsibleSection title="Core Stats" defaultExpanded>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <FormField label="AC">
              <input
                type="number"
                min={1}
                value={manualData.stats.ac || ""}
                onChange={(e) =>
                  setManualData({
                    ...manualData,
                    stats: {
                      ...manualData.stats,
                      ac: e.target.value ? parseInt(e.target.value) : null,
                    },
                  })
                }
                placeholder="10"
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </FormField>

            <FormField label="HP">
              <input
                type="number"
                min={1}
                value={manualData.stats.hp || ""}
                onChange={(e) =>
                  setManualData({
                    ...manualData,
                    stats: {
                      ...manualData.stats,
                      hp: e.target.value ? parseInt(e.target.value) : null,
                    },
                  })
                }
                placeholder="1"
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
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
                placeholder="30 ft"
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-6 gap-2">
            {(["str", "dex", "con", "int", "wis", "cha"] as const).map(
              (stat) => (
                <FormField key={stat} label={stat.toUpperCase()}>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={manualData.stats[stat] || ""}
                    onChange={(e) =>
                      setManualData({
                        ...manualData,
                        stats: {
                          ...manualData.stats,
                          [stat]: e.target.value
                            ? parseInt(e.target.value)
                            : null,
                        },
                      })
                    }
                    placeholder="10"
                    className="w-full px-2 py-2 bg-background border border-border rounded-lg text-text text-center focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </FormField>
              ),
            )}
          </div>
        </div>
      </CollapsibleSection>

      {/* Resistances & Immunities */}
      <CollapsibleSection
        title="Resistances & Immunities"
        defaultExpanded={false}
      >
        <div className="space-y-3">
          <ArrayFieldEditor
            label="Damage Resistances"
            values={manualData.damage_resistances}
            onChange={(damage_resistances) =>
              setManualData({ ...manualData, damage_resistances })
            }
            placeholder="Add damage resistance..."
          />

          <ArrayFieldEditor
            label="Damage Immunities"
            values={manualData.damage_immunities}
            onChange={(damage_immunities) =>
              setManualData({ ...manualData, damage_immunities })
            }
            placeholder="Add damage immunity..."
          />

          <ArrayFieldEditor
            label="Condition Immunities"
            values={manualData.condition_immunities}
            onChange={(condition_immunities) =>
              setManualData({ ...manualData, condition_immunities })
            }
            placeholder="Add condition immunity..."
          />
        </div>
      </CollapsibleSection>

      {/* Senses & Languages */}
      <CollapsibleSection title="Senses & Languages" defaultExpanded={false}>
        <div className="space-y-3">
          <ArrayFieldEditor
            label="Senses"
            values={manualData.senses}
            onChange={(senses) => setManualData({ ...manualData, senses })}
            placeholder="Add a sense (e.g., Darkvision 60 ft)..."
          />

          <ArrayFieldEditor
            label="Languages"
            values={manualData.languages}
            onChange={(languages) =>
              setManualData({ ...manualData, languages })
            }
            placeholder="Add a language..."
          />
        </div>
      </CollapsibleSection>

      {/* Traits */}
      <CollapsibleSection title="Traits" defaultExpanded={false}>
        <ObjectArrayEditor
          label="Traits"
          values={manualData.traits}
          onChange={(traits) => setManualData({ ...manualData, traits })}
          namePlaceholder="Trait name"
          descriptionPlaceholder="Trait description"
        />
      </CollapsibleSection>

      {/* Actions */}
      <CollapsibleSection title="Actions" defaultExpanded={false}>
        <ObjectArrayEditor
          label="Actions"
          values={manualData.actions}
          onChange={(actions) => setManualData({ ...manualData, actions })}
          namePlaceholder="Action name"
          descriptionPlaceholder="Action description"
        />
      </CollapsibleSection>

      {/* Reactions */}
      <CollapsibleSection title="Reactions" defaultExpanded={false}>
        <ObjectArrayEditor
          label="Reactions"
          values={manualData.reactions}
          onChange={(reactions) => setManualData({ ...manualData, reactions })}
          namePlaceholder="Reaction name"
          descriptionPlaceholder="Reaction description"
        />
      </CollapsibleSection>

      {/* Legendary Actions */}
      <CollapsibleSection title="Legendary Actions" defaultExpanded={false}>
        <ObjectArrayEditor
          label="Legendary Actions"
          values={manualData.legendary_actions}
          onChange={(legendary_actions) =>
            setManualData({ ...manualData, legendary_actions })
          }
          namePlaceholder="Legendary action name"
          descriptionPlaceholder="Legendary action description"
        />
      </CollapsibleSection>

      {/* Tactics & Lore */}
      <CollapsibleSection title="Tactics & Lore" defaultExpanded={false}>
        <div className="space-y-3">
          <FormField label="Tactics">
            <textarea
              value={manualData.tactics}
              onChange={(e) =>
                setManualData({ ...manualData, tactics: e.target.value })
              }
              placeholder="How does this creature fight?"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={2}
            />
          </FormField>

          <FormField label="Lore">
            <textarea
              value={manualData.lore}
              onChange={(e) =>
                setManualData({ ...manualData, lore: e.target.value })
              }
              placeholder="Background, habitat, behavior..."
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={3}
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
            Save Monster
          </>
        )}
      </button>

      {saved && (
        <div className="text-center text-green-400 text-sm">
          Monster saved! You can find it in the Saved Content section.
        </div>
      )}
    </>
  );
}
