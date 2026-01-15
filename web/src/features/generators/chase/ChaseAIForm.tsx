// AI Generation Form for Chase Scenarios

import { Dispatch, SetStateAction } from "react";
import { FormField } from "@/components/ui/FormField";
import CampaignSelector from "@/components/common/CampaignSelector";
import AISettings from "@/components/generators/AISettings";
import type { AIGenerationSettings } from "../hooks/useGenerator";
import {
  chaseTypeOptions,
  chaseDifficultyOptions,
  chaseTerrainOptions,
} from "../schemas/chase";

export interface ChaseFormData {
  chase_type: string;
  terrain: string;
  difficulty: string;
  party_level: number | "";
  special_requests: string;
}

interface ChaseAIFormProps {
  campaignId: string | null;
  onCampaignSelect: (id: string | null) => void;
  formData: ChaseFormData;
  setFormData: Dispatch<SetStateAction<ChaseFormData>>;
  aiSettings: AIGenerationSettings;
  setAiSettings: (settings: AIGenerationSettings) => void;
}

export function ChaseAIForm({
  campaignId,
  onCampaignSelect,
  formData,
  setFormData,
  setAiSettings,
}: ChaseAIFormProps) {
  return (
    <>
      <AISettings generatorType="chase" onSettingsChange={setAiSettings} />
      <CampaignSelector
        selectedCampaignId={campaignId}
        onSelect={onCampaignSelect}
      />

      <FormField label="Chase Type">
        <select
          value={formData.chase_type}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, chase_type: e.target.value }))
          }
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {chaseTypeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Terrain">
        <select
          value={formData.terrain}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, terrain: e.target.value }))
          }
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {chaseTerrainOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Difficulty">
        <select
          value={formData.difficulty}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, difficulty: e.target.value }))
          }
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {chaseDifficultyOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Party Level">
        <input
          type="number"
          min={1}
          max={20}
          value={formData.party_level}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              party_level: e.target.value ? parseInt(e.target.value) : "",
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
          placeholder="e.g., 'Players are chasing a thief through a crowded festival' or 'Include a river crossing'"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={3}
        />
      </FormField>
    </>
  );
}
