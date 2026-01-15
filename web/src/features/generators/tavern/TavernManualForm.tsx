// Manual Entry Form for Taverns

import Icon from "@/components/common/Icon";
import { FormField } from "@/components/ui/FormField";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import CampaignSelector from "@/components/common/CampaignSelector";
import { ArrayFieldEditor } from "../components/Fields";
import {
  tavernTypeOptions,
  tavernSizeOptions,
  type ManualTavernData,
} from "../schemas/tavern";

interface TavernManualFormProps {
  campaignId: string | null;
  onCampaignSelect: (id: string | null) => void;
  manualData: ManualTavernData;
  setManualData: (
    data: ManualTavernData | ((prev: ManualTavernData) => ManualTavernData),
  ) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  error: string | null;
}

export function TavernManualForm({
  campaignId,
  onCampaignSelect,
  manualData,
  setManualData,
  onSave,
  saving,
  saved,
  error,
}: TavernManualFormProps) {
  return (
    <>
      <CampaignSelector
        selectedCampaignId={campaignId}
        onSelect={onCampaignSelect}
      />

      {/* Basic Information */}
      <FormField label="Tavern Name" required>
        <input
          type="text"
          value={manualData.name}
          onChange={(e) =>
            setManualData({ ...manualData, name: e.target.value })
          }
          placeholder="e.g., The Rusty Anchor, Dragon's Breath Inn"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Establishment Type">
          <select
            value={manualData.tavern_type}
            onChange={(e) =>
              setManualData({ ...manualData, tavern_type: e.target.value })
            }
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {tavernTypeOptions.map((opt) => (
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
            {tavernSizeOptions.map((opt) => (
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
          placeholder="Describe the tavern's appearance and layout..."
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={3}
        />
      </FormField>

      <FormField label="Atmosphere">
        <input
          type="text"
          value={manualData.atmosphere}
          onChange={(e) =>
            setManualData({ ...manualData, atmosphere: e.target.value })
          }
          placeholder="e.g., Warm and cozy, Rowdy and loud, Dark and mysterious"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      {/* Owner/Keeper */}
      <CollapsibleSection title="Owner/Keeper" defaultExpanded>
        <div className="space-y-3">
          <FormField label="Owner Name">
            <input
              type="text"
              value={manualData.owner_name}
              onChange={(e) =>
                setManualData({ ...manualData, owner_name: e.target.value })
              }
              placeholder="e.g., Greta Ironhand, Old Tom"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </FormField>

          <FormField label="Owner Description">
            <textarea
              value={manualData.owner_description}
              onChange={(e) =>
                setManualData({
                  ...manualData,
                  owner_description: e.target.value,
                })
              }
              placeholder="Describe the owner's appearance and personality..."
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={2}
            />
          </FormField>
        </div>
      </CollapsibleSection>

      {/* Notable Staff */}
      <CollapsibleSection title="Notable Staff" defaultExpanded={false}>
        <ArrayFieldEditor
          label="Staff Members"
          values={manualData.notable_staff}
          onChange={(notable_staff) =>
            setManualData({ ...manualData, notable_staff })
          }
          placeholder="Add a staff member..."
        />
      </CollapsibleSection>

      {/* Menu Items */}
      <CollapsibleSection title="Menu Items" defaultExpanded={false}>
        <div className="space-y-3">
          {manualData.menu_items.map((item, idx) => (
            <div
              key={idx}
              className="bg-background p-3 rounded border border-border space-y-2"
            >
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-text">
                  Item {idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const newItems = [...manualData.menu_items];
                    newItems.splice(idx, 1);
                    setManualData({ ...manualData, menu_items: newItems });
                  }}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => {
                    const newItems = [...manualData.menu_items];
                    newItems[idx] = { ...item, name: e.target.value };
                    setManualData({ ...manualData, menu_items: newItems });
                  }}
                  placeholder="Item name"
                  className="w-full px-3 py-1.5 bg-background border border-border rounded text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <input
                  type="text"
                  value={item.price}
                  onChange={(e) => {
                    const newItems = [...manualData.menu_items];
                    newItems[idx] = { ...item, price: e.target.value };
                    setManualData({ ...manualData, menu_items: newItems });
                  }}
                  placeholder="Price (e.g., 2 sp)"
                  className="w-full px-3 py-1.5 bg-background border border-border rounded text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <input
                type="text"
                value={item.description}
                onChange={(e) => {
                  const newItems = [...manualData.menu_items];
                  newItems[idx] = { ...item, description: e.target.value };
                  setManualData({ ...manualData, menu_items: newItems });
                }}
                placeholder="Description (optional)"
                className="w-full px-3 py-1.5 bg-background border border-border rounded text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setManualData({
                ...manualData,
                menu_items: [
                  ...manualData.menu_items,
                  { name: "", description: "", price: "" },
                ],
              })
            }
            className="w-full px-3 py-2 border border-dashed border-border text-text-muted hover:border-primary hover:text-primary rounded transition-colors text-sm"
          >
            + Add Menu Item
          </button>
        </div>
      </CollapsibleSection>

      {/* Regular Patrons */}
      <CollapsibleSection title="Regular Patrons" defaultExpanded={false}>
        <ArrayFieldEditor
          label="Patrons"
          values={manualData.regular_patrons}
          onChange={(regular_patrons) =>
            setManualData({ ...manualData, regular_patrons })
          }
          placeholder="Add a regular patron..."
        />
      </CollapsibleSection>

      {/* Rumors */}
      <CollapsibleSection title="Rumors & Gossip" defaultExpanded={false}>
        <ArrayFieldEditor
          label="Rumors"
          values={manualData.rumors}
          onChange={(rumors) => setManualData({ ...manualData, rumors })}
          placeholder="Add a rumor..."
        />
      </CollapsibleSection>

      {/* Special Features */}
      <CollapsibleSection title="Special Features" defaultExpanded={false}>
        <ArrayFieldEditor
          label="Features"
          values={manualData.special_features}
          onChange={(special_features) =>
            setManualData({ ...manualData, special_features })
          }
          placeholder="Add a special feature..."
        />
      </CollapsibleSection>

      {/* Secrets */}
      <CollapsibleSection title="Secrets (DM Only)" defaultExpanded={false}>
        <ArrayFieldEditor
          label="Secrets"
          values={manualData.secrets}
          onChange={(secrets) => setManualData({ ...manualData, secrets })}
          placeholder="Add a secret..."
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
            Save Tavern
          </>
        )}
      </button>

      {saved && (
        <div className="text-center text-green-400 text-sm">
          Tavern saved! You can find it in the Saved Content section.
        </div>
      )}
    </>
  );
}
