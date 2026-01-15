// Manual Entry Form for Merchants

import Icon from "@/components/common/Icon";
import { FormField } from "@/components/ui/FormField";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import CampaignSelector from "@/components/common/CampaignSelector";
import { ArrayFieldEditor } from "../components/Fields";
import {
  merchantTypeOptions,
  type ManualMerchantData,
} from "../schemas/merchant";

interface MerchantManualFormProps {
  campaignId: string | null;
  onCampaignSelect: (id: string | null) => void;
  manualData: ManualMerchantData;
  setManualData: (
    data:
      | ManualMerchantData
      | ((prev: ManualMerchantData) => ManualMerchantData),
  ) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  error: string | null;
}

export function MerchantManualForm({
  campaignId,
  onCampaignSelect,
  manualData,
  setManualData,
  onSave,
  saving,
  saved,
  error,
}: MerchantManualFormProps) {
  return (
    <>
      <CampaignSelector
        selectedCampaignId={campaignId}
        onSelect={onCampaignSelect}
      />

      {/* Basic Information */}
      <FormField label="Merchant Name" required>
        <input
          type="text"
          value={manualData.name}
          onChange={(e) =>
            setManualData({ ...manualData, name: e.target.value })
          }
          placeholder="e.g., Grimshaw's Emporium, The Wandering Peddler"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      <FormField label="Merchant Type">
        <select
          value={manualData.merchant_type}
          onChange={(e) =>
            setManualData({ ...manualData, merchant_type: e.target.value })
          }
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {merchantTypeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Description">
        <textarea
          value={manualData.description}
          onChange={(e) =>
            setManualData({ ...manualData, description: e.target.value })
          }
          placeholder="Describe the shop and its atmosphere..."
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={3}
        />
      </FormField>

      {/* Merchant Details */}
      <CollapsibleSection title="Merchant Details" defaultExpanded>
        <div className="space-y-3">
          <FormField label="Personality">
            <input
              type="text"
              value={manualData.personality}
              onChange={(e) =>
                setManualData({ ...manualData, personality: e.target.value })
              }
              placeholder="e.g., Gruff but fair, Overly friendly"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </FormField>

          <FormField label="Appearance">
            <textarea
              value={manualData.appearance}
              onChange={(e) =>
                setManualData({ ...manualData, appearance: e.target.value })
              }
              placeholder="Physical description..."
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={2}
            />
          </FormField>

          <FormField label="Backstory">
            <textarea
              value={manualData.backstory}
              onChange={(e) =>
                setManualData({ ...manualData, backstory: e.target.value })
              }
              placeholder="How did they become a merchant?"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={2}
            />
          </FormField>
        </div>
      </CollapsibleSection>

      {/* Inventory */}
      <CollapsibleSection title="Inventory" defaultExpanded={false}>
        <div className="space-y-3">
          {manualData.inventory.map((item, idx) => (
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
                    const newItems = [...manualData.inventory];
                    newItems.splice(idx, 1);
                    setManualData({ ...manualData, inventory: newItems });
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
                    const newItems = [...manualData.inventory];
                    newItems[idx] = { ...item, name: e.target.value };
                    setManualData({ ...manualData, inventory: newItems });
                  }}
                  placeholder="Item name"
                  className="w-full px-3 py-1.5 bg-background border border-border rounded text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <input
                  type="text"
                  value={item.price}
                  onChange={(e) => {
                    const newItems = [...manualData.inventory];
                    newItems[idx] = { ...item, price: e.target.value };
                    setManualData({ ...manualData, inventory: newItems });
                  }}
                  placeholder="Price (e.g., 5 gp)"
                  className="w-full px-3 py-1.5 bg-background border border-border rounded text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <input
                type="text"
                value={item.description}
                onChange={(e) => {
                  const newItems = [...manualData.inventory];
                  newItems[idx] = { ...item, description: e.target.value };
                  setManualData({ ...manualData, inventory: newItems });
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
                inventory: [
                  ...manualData.inventory,
                  { name: "", description: "", price: "" },
                ],
              })
            }
            className="w-full px-3 py-2 border border-dashed border-border text-text-muted hover:border-primary hover:text-primary rounded transition-colors text-sm"
          >
            + Add Inventory Item
          </button>
        </div>
      </CollapsibleSection>

      {/* Services */}
      <CollapsibleSection title="Services Offered" defaultExpanded={false}>
        <ArrayFieldEditor
          label="Services"
          values={manualData.services}
          onChange={(services) => setManualData({ ...manualData, services })}
          placeholder="Add a service..."
        />
      </CollapsibleSection>

      {/* Specialties */}
      <CollapsibleSection title="Specialties" defaultExpanded={false}>
        <ArrayFieldEditor
          label="Specialties"
          values={manualData.specialties}
          onChange={(specialties) =>
            setManualData({ ...manualData, specialties })
          }
          placeholder="Add a specialty..."
        />
      </CollapsibleSection>

      {/* Quirks */}
      <CollapsibleSection title="Quirks & Traits" defaultExpanded={false}>
        <ArrayFieldEditor
          label="Quirks"
          values={manualData.quirks}
          onChange={(quirks) => setManualData({ ...manualData, quirks })}
          placeholder="Add a quirk..."
        />
      </CollapsibleSection>

      {/* Rumors */}
      <CollapsibleSection title="Rumors" defaultExpanded={false}>
        <ArrayFieldEditor
          label="Rumors"
          values={manualData.rumors}
          onChange={(rumors) => setManualData({ ...manualData, rumors })}
          placeholder="Add a rumor..."
        />
      </CollapsibleSection>

      {/* Connections */}
      <CollapsibleSection title="Connections" defaultExpanded={false}>
        <ArrayFieldEditor
          label="Connections"
          values={manualData.connections}
          onChange={(connections) =>
            setManualData({ ...manualData, connections })
          }
          placeholder="Add a connection..."
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
            Save Merchant
          </>
        )}
      </button>

      {saved && (
        <div className="text-center text-green-400 text-sm">
          Merchant saved! You can find it in the Saved Content section.
        </div>
      )}
    </>
  );
}
