// Manual Entry Form for NPCs

import Icon from "@/components/common/Icon";
import { FormField } from "@/components/ui/FormField";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import CampaignSelector from "@/components/common/CampaignSelector";
import { ArrayFieldEditor } from "../components/Fields";
import { raceOptions, classOptions, type ManualNPCData } from "../schemas/npc";

interface NPCManualFormProps {
  campaignId: string | null;
  onCampaignSelect: (id: string | null) => void;
  manualData: ManualNPCData;
  setManualData: (
    data: ManualNPCData | ((prev: ManualNPCData) => ManualNPCData),
  ) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  error: string | null;
}

export function NPCManualForm({
  campaignId,
  onCampaignSelect,
  manualData,
  setManualData,
  onSave,
  saving,
  saved,
  error,
}: NPCManualFormProps) {
  return (
    <>
      <CampaignSelector
        selectedCampaignId={campaignId}
        onSelect={onCampaignSelect}
      />

      {/* Basic Information */}
      <FormField label="NPC Name" required>
        <input
          type="text"
          value={manualData.name}
          onChange={(e) =>
            setManualData({ ...manualData, name: e.target.value })
          }
          placeholder="e.g., Theron Blackwood, Lady Mira"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      <div className="grid grid-cols-3 gap-3">
        <FormField label="Race">
          <select
            value={manualData.race}
            onChange={(e) =>
              setManualData({ ...manualData, race: e.target.value })
            }
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {raceOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Class">
          <select
            value={manualData.class}
            onChange={(e) =>
              setManualData({ ...manualData, class: e.target.value })
            }
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {classOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Level">
          <input
            type="number"
            min={1}
            max={20}
            value={manualData.level || ""}
            onChange={(e) =>
              setManualData({
                ...manualData,
                level: e.target.value ? parseInt(e.target.value) : null,
              })
            }
            placeholder="1-20"
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </FormField>
      </div>

      <FormField label="Occupation/Role">
        <input
          type="text"
          value={manualData.occupation}
          onChange={(e) =>
            setManualData({ ...manualData, occupation: e.target.value })
          }
          placeholder="e.g., Blacksmith, Tavern owner, Merchant"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      {/* Appearance & Description */}
      <CollapsibleSection title="Appearance & Description" defaultExpanded>
        <div className="space-y-3">
          <FormField label="Appearance">
            <textarea
              value={manualData.appearance}
              onChange={(e) =>
                setManualData({ ...manualData, appearance: e.target.value })
              }
              placeholder="Physical description..."
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={2}
            />
          </FormField>

          <FormField label="Personality Summary">
            <textarea
              value={manualData.personality}
              onChange={(e) =>
                setManualData({ ...manualData, personality: e.target.value })
              }
              placeholder="Brief personality description..."
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={2}
            />
          </FormField>

          <FormField label="Voice Notes">
            <input
              type="text"
              value={manualData.voice_notes}
              onChange={(e) =>
                setManualData({ ...manualData, voice_notes: e.target.value })
              }
              placeholder="e.g., Deep gravelly voice, Speaks quickly"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </FormField>
        </div>
      </CollapsibleSection>

      {/* Personality Traits */}
      <CollapsibleSection
        title="Personality Traits (D&D Style)"
        defaultExpanded={false}
      >
        <div className="space-y-3">
          <ArrayFieldEditor
            label="Traits"
            values={manualData.traits}
            onChange={(traits) => setManualData({ ...manualData, traits })}
            placeholder="Add a personality trait..."
          />

          <FormField label="Ideals">
            <input
              type="text"
              value={manualData.ideals}
              onChange={(e) =>
                setManualData({ ...manualData, ideals: e.target.value })
              }
              placeholder="What do they believe in?"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </FormField>

          <FormField label="Bonds">
            <input
              type="text"
              value={manualData.bonds}
              onChange={(e) =>
                setManualData({ ...manualData, bonds: e.target.value })
              }
              placeholder="What/who are they connected to?"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </FormField>

          <FormField label="Flaws">
            <input
              type="text"
              value={manualData.flaws}
              onChange={(e) =>
                setManualData({ ...manualData, flaws: e.target.value })
              }
              placeholder="What are their weaknesses?"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </FormField>
        </div>
      </CollapsibleSection>

      {/* Background & Motivation */}
      <CollapsibleSection
        title="Background & Motivation"
        defaultExpanded={false}
      >
        <div className="space-y-3">
          <FormField label="Backstory">
            <textarea
              value={manualData.backstory}
              onChange={(e) =>
                setManualData({ ...manualData, backstory: e.target.value })
              }
              placeholder="Their history..."
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={3}
            />
          </FormField>

          <FormField label="Motivation">
            <textarea
              value={manualData.motivation}
              onChange={(e) =>
                setManualData({ ...manualData, motivation: e.target.value })
              }
              placeholder="What drives them?"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={2}
            />
          </FormField>
        </div>
      </CollapsibleSection>

      {/* Skills & Equipment */}
      <CollapsibleSection title="Skills & Equipment" defaultExpanded={false}>
        <div className="space-y-3">
          <ArrayFieldEditor
            label="Skills"
            values={manualData.skills}
            onChange={(skills) => setManualData({ ...manualData, skills })}
            placeholder="Add a skill..."
          />

          <ArrayFieldEditor
            label="Equipment"
            values={manualData.equipment}
            onChange={(equipment) =>
              setManualData({ ...manualData, equipment })
            }
            placeholder="Add equipment..."
          />
        </div>
      </CollapsibleSection>

      {/* Plot Hooks */}
      <CollapsibleSection title="Plot Hooks" defaultExpanded={false}>
        <ArrayFieldEditor
          label="Plot Hooks"
          values={manualData.plot_hooks}
          onChange={(plot_hooks) =>
            setManualData({ ...manualData, plot_hooks })
          }
          placeholder="Add a plot hook..."
        />
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
            Save NPC
          </>
        )}
      </button>

      {saved && (
        <div className="text-center text-green-400 text-sm">
          NPC saved! You can find it in the Saved Content section.
        </div>
      )}
    </>
  );
}
