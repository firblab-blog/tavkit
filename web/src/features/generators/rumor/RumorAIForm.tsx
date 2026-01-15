// AI Generation Form for Rumors

import { Dispatch, SetStateAction } from 'react'
import { FormField } from '@/components/ui/FormField'
import CampaignSelector from '@/components/common/CampaignSelector'
import AISettings from '@/components/generators/AISettings'
import type { AIGenerationSettings } from '../hooks/useGenerator'
import {
  rumorTypeOptions,
  rumorUrgencyOptions,
  rumorScopeOptions,
  rumorVeracityOptions,
} from '../schemas/rumor'

export interface RumorFormData {
  count: number
  veracity: string
  rumor_type: string
  urgency: string
  scope: string
  special_requests: string
}

interface RumorAIFormProps {
  campaignId: string | null
  onCampaignSelect: (id: string | null) => void
  formData: RumorFormData
  setFormData: Dispatch<SetStateAction<RumorFormData>>
  aiSettings: AIGenerationSettings
  setAiSettings: (settings: AIGenerationSettings) => void
}

export function RumorAIForm({
  campaignId,
  onCampaignSelect,
  formData,
  setFormData,
  setAiSettings,
}: RumorAIFormProps) {
  return (
    <>
      <AISettings generatorType="rumor" onSettingsChange={setAiSettings} />
      <CampaignSelector selectedCampaignId={campaignId} onSelect={onCampaignSelect} />

      <FormField label="Number of Rumors" description="How many rumors to generate">
        <input
          type="number"
          min="1"
          max="10"
          value={formData.count}
          onChange={(e) => setFormData((prev) => ({ ...prev, count: parseInt(e.target.value) || 1 }))}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      <FormField label="Veracity">
        <select
          value={formData.veracity}
          onChange={(e) => setFormData((prev) => ({ ...prev, veracity: e.target.value }))}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {rumorVeracityOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Type">
        <select
          value={formData.rumor_type}
          onChange={(e) => setFormData((prev) => ({ ...prev, rumor_type: e.target.value }))}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {rumorTypeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Urgency">
        <select
          value={formData.urgency}
          onChange={(e) => setFormData((prev) => ({ ...prev, urgency: e.target.value }))}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {rumorUrgencyOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Scope">
        <select
          value={formData.scope}
          onChange={(e) => setFormData((prev) => ({ ...prev, scope: e.target.value }))}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {rumorScopeOptions.map((opt) => (
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
          placeholder="e.g., 'About a missing shipment of weapons' or 'Involving dragons and ancient prophecies' or 'Related to the thieves guild'"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={3}
        />
      </FormField>
    </>
  )
}
