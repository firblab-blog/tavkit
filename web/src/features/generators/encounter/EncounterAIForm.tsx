// AI Generation Form for Encounters

import { Dispatch, SetStateAction } from "react";
import { FormField } from "@/components/ui/FormField";
import CampaignSelector from "@/components/common/CampaignSelector";
import AISettings from "@/components/generators/AISettings";
import type { AIGenerationSettings } from "../hooks/useGenerator";
import {
  difficultyOptions,
  encounterEnvironmentOptions,
  encounterTypeOptions,
} from "../schemas/encounter";

export interface EncounterFormData {
  party_level: number | "";
  party_size: number | "";
  difficulty: string;
  encounter_type: string;
  environment: string;
  special_requests: string;
}

interface EncounterAIFormProps {
  campaignId: string | null;
  onCampaignSelect: (id: string | null) => void;
  formData: EncounterFormData;
  setFormData: Dispatch<SetStateAction<EncounterFormData>>;
  aiSettings: AIGenerationSettings;
  setAiSettings: (settings: AIGenerationSettings) => void;
}

export function EncounterAIForm({
  campaignId,
  onCampaignSelect,
  formData,
  setFormData,
  setAiSettings,
}: EncounterAIFormProps) {
  return (
    <>
      <AISettings generatorType="encounter" onSettingsChange={setAiSettings} />
      <CampaignSelector
        selectedCampaignId={campaignId}
        onSelect={onCampaignSelect}
      />

      <FormField label="Party Level" description="Average level of the party">
        <input
          type="number"
          min="1"
          max="20"
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

      <FormField label="Party Size" description="Number of players">
        <input
          type="number"
          min="1"
          max="10"
          value={formData.party_size}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              party_size: e.target.value ? parseInt(e.target.value) : "",
            }))
          }
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      <FormField label="Difficulty">
        <select
          value={formData.difficulty}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, difficulty: e.target.value }))
          }
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {difficultyOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Encounter Type">
        <select
          value={formData.encounter_type}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, encounter_type: e.target.value }))
          }
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="random">Random</option>
          {encounterTypeOptions.map((opt) => (
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
          {encounterEnvironmentOptions.map((opt) => (
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
          placeholder="e.g., 'Include a trap involving poison darts' or 'The enemies should use stealth tactics' or 'Add environmental hazards'"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={3}
        />
      </FormField>
    </>
  );
}
