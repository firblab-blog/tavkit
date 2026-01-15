// AI Generation Form for Locations

import { Dispatch, SetStateAction } from 'react'
import { FormField } from '@/components/ui/FormField'
import CampaignSelector from '@/components/common/CampaignSelector'
import AISettings from '@/components/generators/AISettings'
import type { AIGenerationSettings } from '../hooks/useGenerator'
import {
  locationTypeOptions,
  locationSizeOptions,
  dangerLevelOptions,
  themeOptions,
} from '../schemas/location'

export interface LocationFormData {
  type: string
  size: string
  danger_level: string
  theme: string
  special_requests: string
}

interface LocationAIFormProps {
  campaignId: string | null
  onCampaignSelect: (id: string | null) => void
  formData: LocationFormData
  setFormData: Dispatch<SetStateAction<LocationFormData>>
  aiSettings: AIGenerationSettings
  setAiSettings: (settings: AIGenerationSettings) => void
}

export function LocationAIForm({
  campaignId,
  onCampaignSelect,
  formData,
  setFormData,
  setAiSettings,
}: LocationAIFormProps) {
  return (
    <>
      <AISettings generatorType="location" onSettingsChange={setAiSettings} />
      <CampaignSelector selectedCampaignId={campaignId} onSelect={onCampaignSelect} />

      <FormField label="Type">
        <select
          value={formData.type}
          onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {locationTypeOptions.map((opt) => (
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
          {locationSizeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Danger Level">
        <select
          value={formData.danger_level}
          onChange={(e) => setFormData((prev) => ({ ...prev, danger_level: e.target.value }))}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {dangerLevelOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Theme">
        <select
          value={formData.theme}
          onChange={(e) => setFormData((prev) => ({ ...prev, theme: e.target.value }))}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {themeOptions.map((opt) => (
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
          placeholder="e.g., 'Built inside a massive geode' or 'Floating in the sky on crystal platforms'"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={3}
        />
      </FormField>
    </>
  )
}
