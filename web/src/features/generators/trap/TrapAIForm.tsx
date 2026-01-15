// AI Generation Form for Traps

import { Dispatch, SetStateAction } from 'react'
import { FormField } from '@/components/ui/FormField'
import CampaignSelector from '@/components/common/CampaignSelector'
import AISettings from '@/components/generators/AISettings'
import type { AIGenerationSettings } from '../hooks/useGenerator'
import { trapTypeOptions, trapDifficultyOptions, trapEnvironmentOptions } from '../schemas/trap'

export interface TrapFormData {
  trap_type: string
  difficulty: string
  party_level: number
  environment: string
  special_requests: string
}

interface TrapAIFormProps {
  campaignId: string | null
  onCampaignSelect: (id: string | null) => void
  formData: TrapFormData
  setFormData: Dispatch<SetStateAction<TrapFormData>>
  aiSettings: AIGenerationSettings
  setAiSettings: (settings: AIGenerationSettings) => void
}

export function TrapAIForm({
  campaignId,
  onCampaignSelect,
  formData,
  setFormData,
  setAiSettings,
}: TrapAIFormProps) {
  return (
    <>
      <AISettings generatorType="trap" onSettingsChange={setAiSettings} />
      <CampaignSelector selectedCampaignId={campaignId} onSelect={onCampaignSelect} />

      <FormField label="Trap Type">
        <select
          value={formData.trap_type}
          onChange={(e) => setFormData((prev) => ({ ...prev, trap_type: e.target.value }))}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {trapTypeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Difficulty">
        <select
          value={formData.difficulty}
          onChange={(e) => setFormData((prev) => ({ ...prev, difficulty: e.target.value }))}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {trapDifficultyOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Party Level" description="Determines appropriate damage and DCs">
        <input
          type="number"
          min="1"
          max="20"
          value={formData.party_level}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, party_level: parseInt(e.target.value) || 1 }))
          }
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      <FormField label="Environment">
        <select
          value={formData.environment}
          onChange={(e) => setFormData((prev) => ({ ...prev, environment: e.target.value }))}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {trapEnvironmentOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Special Requests" description="(optional)">
        <textarea
          value={formData.special_requests}
          onChange={(e) => setFormData((prev) => ({ ...prev, special_requests: e.target.value }))}
          placeholder="e.g., 'Uses a riddle to disarm' or 'Connected to the main villain' or 'Can be repurposed by clever players'"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={3}
        />
      </FormField>
    </>
  )
}
