// AI Generation Form for Dialogues

import { Dispatch, SetStateAction } from "react";
import { FormField } from "@/components/ui/FormField";
import CampaignSelector from "@/components/common/CampaignSelector";
import AISettings from "@/components/generators/AISettings";
import type { AIGenerationSettings } from "../hooks/useGenerator";
import {
  dialogueTypeOptions,
  personalityOptions,
  toneOptions,
  complexityOptions,
} from "../schemas/dialogue";

export interface DialogueFormData {
  character_name: string;
  dialogue_type: string;
  personality: string;
  tone: string;
  complexity: string;
  special_requests: string;
}

interface DialogueAIFormProps {
  campaignId: string | null;
  onCampaignSelect: (id: string | null) => void;
  formData: DialogueFormData;
  setFormData: Dispatch<SetStateAction<DialogueFormData>>;
  aiSettings: AIGenerationSettings;
  setAiSettings: (settings: AIGenerationSettings) => void;
}

export function DialogueAIForm({
  campaignId,
  onCampaignSelect,
  formData,
  setFormData,
  setAiSettings,
}: DialogueAIFormProps) {
  return (
    <>
      <AISettings generatorType="dialogue" onSettingsChange={setAiSettings} />
      <CampaignSelector
        selectedCampaignId={campaignId}
        onSelect={onCampaignSelect}
      />

      <FormField label="Character Name" description="(optional)">
        <input
          type="text"
          value={formData.character_name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, character_name: e.target.value }))
          }
          placeholder="e.g., Grim the Merchant"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      <FormField label="Dialogue Type">
        <select
          value={formData.dialogue_type}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, dialogue_type: e.target.value }))
          }
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {dialogueTypeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Personality">
        <select
          value={formData.personality}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, personality: e.target.value }))
          }
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {personalityOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Tone">
        <select
          value={formData.tone}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, tone: e.target.value }))
          }
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {toneOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Complexity">
        <select
          value={formData.complexity}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, complexity: e.target.value }))
          }
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {complexityOptions.map((opt) => (
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
          placeholder="e.g., 'Include Persuasion DC 15 check' or 'NPC knows location of hidden temple' or 'Can lead to secret quest if befriended'"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={3}
        />
      </FormField>
    </>
  );
}
