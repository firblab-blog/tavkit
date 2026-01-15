// AI Generation Form for Merchants

import { Dispatch, SetStateAction } from "react";
import { FormField } from "@/components/ui/FormField";
import CampaignSelector from "@/components/common/CampaignSelector";
import AISettings from "@/components/generators/AISettings";
import type { AIGenerationSettings } from "../hooks/useGenerator";
import {
  merchantTypeOptions,
  merchantQualityOptions,
  merchantSizeOptions,
} from "../schemas/merchant";

export interface MerchantFormData {
  shop_type: string;
  quality: string;
  size: string;
  party_level: number;
  special_requests: string;
}

interface MerchantAIFormProps {
  campaignId: string | null;
  onCampaignSelect: (id: string | null) => void;
  formData: MerchantFormData;
  setFormData: Dispatch<SetStateAction<MerchantFormData>>;
  aiSettings: AIGenerationSettings;
  setAiSettings: (settings: AIGenerationSettings) => void;
}

export function MerchantAIForm({
  campaignId,
  onCampaignSelect,
  formData,
  setFormData,
  setAiSettings,
}: MerchantAIFormProps) {
  return (
    <>
      <AISettings generatorType="merchant" onSettingsChange={setAiSettings} />
      <CampaignSelector
        selectedCampaignId={campaignId}
        onSelect={onCampaignSelect}
      />

      <FormField label="Type of Shop">
        <select
          value={formData.shop_type}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, shop_type: e.target.value }))
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

      <FormField label="Quality">
        <select
          value={formData.quality}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, quality: e.target.value }))
          }
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {merchantQualityOptions.map((opt) => (
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
          {merchantSizeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField
        label="Party Level"
        description="Determines item rarity and prices"
      >
        <input
          type="number"
          min="1"
          max="20"
          value={formData.party_level}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              party_level: parseInt(e.target.value) || 1,
            }))
          }
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
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
          placeholder="e.g., 'Has a secret back room with illegal goods' or 'Specializes in dragonbone weapons'"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={3}
        />
      </FormField>
    </>
  );
}
