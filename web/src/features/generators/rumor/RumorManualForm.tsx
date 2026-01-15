// Manual Entry Form for Rumors

import Icon from "@/components/common/Icon";
import { FormField } from "@/components/ui/FormField";
import CampaignSelector from "@/components/common/CampaignSelector";
import { ArrayFieldEditor } from "../components/Fields";
import { veracityOptions, type ManualRumorData } from "../schemas/rumor";

interface RumorManualFormProps {
  campaignId: string | null;
  onCampaignSelect: (id: string | null) => void;
  manualData: ManualRumorData;
  setManualData: (
    data: ManualRumorData | ((prev: ManualRumorData) => ManualRumorData),
  ) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  error: string | null;
}

export function RumorManualForm({
  campaignId,
  onCampaignSelect,
  manualData,
  setManualData,
  onSave,
  saving,
  saved,
  error,
}: RumorManualFormProps) {
  return (
    <>
      <CampaignSelector
        selectedCampaignId={campaignId}
        onSelect={onCampaignSelect}
      />

      <FormField
        label="Rumor Text"
        description="The actual rumor content"
        required
      >
        <textarea
          value={manualData.text}
          onChange={(e) =>
            setManualData({ ...manualData, text: e.target.value })
          }
          placeholder="e.g., 'I heard the old mill is haunted. Strange lights have been seen there at midnight...'"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={4}
        />
      </FormField>

      <FormField label="Source" description="Who shared this rumor">
        <input
          type="text"
          value={manualData.source}
          onChange={(e) =>
            setManualData({ ...manualData, source: e.target.value })
          }
          placeholder="e.g., 'Drunk patron at the tavern', 'Town crier'"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      <FormField
        label="Veracity"
        description="Is this rumor true, false, or unknown?"
      >
        <select
          value={manualData.veracity}
          onChange={(e) =>
            setManualData({ ...manualData, veracity: e.target.value })
          }
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {veracityOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField
        label="Adventure Hook"
        description="What could this rumor lead to?"
      >
        <textarea
          value={manualData.leads_to}
          onChange={(e) =>
            setManualData({ ...manualData, leads_to: e.target.value })
          }
          placeholder="e.g., 'Investigation of the old mill reveals a secret meeting place for the thieves guild'"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={2}
        />
      </FormField>

      <FormField
        label="Context"
        description="Background information or setting"
      >
        <textarea
          value={manualData.context}
          onChange={(e) =>
            setManualData({ ...manualData, context: e.target.value })
          }
          placeholder="e.g., 'The mill has been abandoned for 10 years since the miller disappeared'"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={2}
        />
      </FormField>

      <FormField label="Foreshadowing">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={manualData.foreshadowing}
            onChange={(e) =>
              setManualData({ ...manualData, foreshadowing: e.target.checked })
            }
            className="w-5 h-5 rounded border-border bg-background text-primary focus:ring-primary focus:ring-offset-0"
          />
          <span className="text-text">
            This rumor foreshadows future events
          </span>
        </label>
      </FormField>

      <ArrayFieldEditor
        label="Tags"
        values={manualData.tags}
        onChange={(tags) => setManualData({ ...manualData, tags })}
        placeholder="Add a tag..."
        description="Keywords to help organize rumors"
      />

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
        disabled={saving || !manualData.text.trim()}
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
            Save Rumor
          </>
        )}
      </button>

      {saved && (
        <div className="text-center text-green-400 text-sm">
          Rumor saved! You can find it in the Saved Content section.
        </div>
      )}
    </>
  );
}
