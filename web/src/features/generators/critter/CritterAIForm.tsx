// AI Generation Form for Critters

import { Dispatch, SetStateAction } from 'react'
import { FormField } from '@/components/ui/FormField'
import CampaignSelector from '@/components/common/CampaignSelector'
import AISettings from '@/components/generators/AISettings'
import type { AIGenerationSettings } from '../hooks/useGenerator'
import {
  critterTypeOptions,
  critterSizeOptions,
  temperamentOptions,
  habitatOptions,
} from '../schemas/critter'

export interface CritterFormData {
  critter_type: string
  size: string
  temperament: string
  habitat: string
  special_requests: string
}

interface CritterAIFormProps {
  campaignId: string | null
  onCampaignSelect: (id: string | null) => void
  formData: CritterFormData
  setFormData: Dispatch<SetStateAction<CritterFormData>>
  aiSettings: AIGenerationSettings
  setAiSettings: (settings: AIGenerationSettings) => void
}

export function CritterAIForm({
  campaignId,
  onCampaignSelect,
  formData,
  setFormData,
  setAiSettings,
}: CritterAIFormProps) {
  return (
    <>
      <AISettings generatorType="critter" onSettingsChange={setAiSettings} />
      <CampaignSelector selectedCampaignId={campaignId} onSelect={onCampaignSelect} />

      <FormField label="Type of Critter">
        <select
          value={formData.critter_type}
          onChange={(e) => setFormData((prev) => ({ ...prev, critter_type: e.target.value }))}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {critterTypeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Size">
        <select
          value={formData.size}
          onChange={(e) => setFormData((prev) => ({ ...prev, size: e.target.value }))}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {critterSizeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Temperament">
        <select
          value={formData.temperament}
          onChange={(e) => setFormData((prev) => ({ ...prev, temperament: e.target.value }))}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {temperamentOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Habitat">
        <select
          value={formData.habitat}
          onChange={(e) => setFormData((prev) => ({ ...prev, habitat: e.target.value }))}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {habitatOptions.map((opt) => (
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
          placeholder="e.g., 'Can be trained as a mount' or 'Has bioluminescence' or 'Native to the Feywild'"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={3}
        />
      </FormField>
    </>
  )
}
