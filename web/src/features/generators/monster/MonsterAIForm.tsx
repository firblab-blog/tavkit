// AI Generation Form for Monsters

import { Dispatch, SetStateAction } from "react";
import { FormField } from "@/components/ui/FormField";
import CampaignSelector from "@/components/common/CampaignSelector";
import AISettings from "@/components/generators/AISettings";
import type { AIGenerationSettings } from "../hooks/useGenerator";
import {
  creatureTypeOptions,
  sizeOptions,
  environmentOptions,
} from "../schemas/monster";

export interface MonsterFormData {
  monster_type: string;
  size: string;
  challenge_rating: number;
  environment: string;
  special_requests: string;
}

interface MonsterAIFormProps {
  campaignId: string | null;
  onCampaignSelect: (id: string | null) => void;
  formData: MonsterFormData;
  setFormData: Dispatch<SetStateAction<MonsterFormData>>;
  aiSettings: AIGenerationSettings;
  setAiSettings: (settings: AIGenerationSettings) => void;
}

export function MonsterAIForm({
  campaignId,
  onCampaignSelect,
  formData,
  setFormData,
  setAiSettings,
}: MonsterAIFormProps) {
  return (
    <>
      <AISettings generatorType="monster" onSettingsChange={setAiSettings} />
      <CampaignSelector
        selectedCampaignId={campaignId}
        onSelect={onCampaignSelect}
      />

      <FormField
        label="Challenge Rating"
        description="Determines power level and appropriate XP"
      >
        <input
          type="number"
          min="0"
          max="30"
          value={formData.challenge_rating}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              challenge_rating: parseInt(e.target.value) || 0,
            }))
          }
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      <FormField label="Type">
        <select
          value={formData.monster_type}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, monster_type: e.target.value }))
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
          value={formData.size}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, size: e.target.value }))
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

      <FormField label="Environment">
        <select
          value={formData.environment}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, environment: e.target.value }))
          }
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {environmentOptions.map((opt) => (
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
          placeholder="e.g., 'Breathes lightning instead of fire' or 'Has spider-like climbing abilities'"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={3}
        />
      </FormField>
    </>
  );
}
