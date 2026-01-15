// AI Generation Form for Taverns

import { Dispatch, SetStateAction } from "react";
import { FormField } from "@/components/ui/FormField";
import CampaignSelector from "@/components/common/CampaignSelector";
import AISettings from "@/components/generators/AISettings";
import type { AIGenerationSettings } from "../hooks/useGenerator";
import {
  tavernTypeOptions,
  tavernQualityOptions,
  tavernSizeOptions,
} from "../schemas/tavern";

export interface TavernFormData {
  tavern_type: string;
  quality: string;
  size: string;
  special_requests: string;
}

interface TavernAIFormProps {
  campaignId: string | null;
  onCampaignSelect: (id: string | null) => void;
  formData: TavernFormData;
  setFormData: Dispatch<SetStateAction<TavernFormData>>;
  aiSettings: AIGenerationSettings;
  setAiSettings: (settings: AIGenerationSettings) => void;
}

export function TavernAIForm({
  campaignId,
  onCampaignSelect,
  formData,
  setFormData,
  setAiSettings,
}: TavernAIFormProps) {
  return (
    <>
      <AISettings generatorType="tavern" onSettingsChange={setAiSettings} />
      <CampaignSelector
        selectedCampaignId={campaignId}
        onSelect={onCampaignSelect}
      />

      <FormField label="Type of Establishment">
        <select
          value={formData.tavern_type}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, tavern_type: e.target.value }))
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

      <FormField label="Quality">
        <select
          value={formData.quality}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, quality: e.target.value }))
          }
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {tavernQualityOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Size">
        <select
          value={formData.size}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, size: e.target.value }))
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

      <FormField label="Special Requests" description="(optional)">
        <textarea
          value={formData.special_requests}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              special_requests: e.target.value,
            }))
          }
          placeholder="e.g., 'Has a secret entrance to the thieves' guild' or 'Known for their legendary meat pies'"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={3}
        />
      </FormField>
    </>
  );
}
