// AI Generation Form for Items

import { Dispatch, SetStateAction } from 'react'
import { FormField } from '@/components/ui/FormField'
import CampaignSelector from '@/components/common/CampaignSelector'
import AISettings from '@/components/generators/AISettings'
import type { AIGenerationSettings } from '../hooks/useGenerator'
import {
  itemTypeOptions,
  itemRarityOptions,
  itemCategoryOptions,
  cursedOptions,
} from '../schemas/item'

export interface ItemFormData {
  type: string
  rarity: string
  category: string
  cursed: string
  special_requests: string
}

interface ItemAIFormProps {
  campaignId: string | null
  onCampaignSelect: (id: string | null) => void
  formData: ItemFormData
  setFormData: Dispatch<SetStateAction<ItemFormData>>
  aiSettings: AIGenerationSettings
  setAiSettings: (settings: AIGenerationSettings) => void
}

export function ItemAIForm({
  campaignId,
  onCampaignSelect,
  formData,
  setFormData,
  setAiSettings,
}: ItemAIFormProps) {
  return (
    <>
      <AISettings generatorType="item" onSettingsChange={setAiSettings} />
      <CampaignSelector selectedCampaignId={campaignId} onSelect={onCampaignSelect} />

      <FormField label="Item Type">
        <select
          value={formData.type}
          onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {itemTypeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Rarity">
        <select
          value={formData.rarity}
          onChange={(e) => setFormData((prev) => ({ ...prev, rarity: e.target.value }))}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {itemRarityOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Category">
        <select
          value={formData.category}
          onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {itemCategoryOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Cursed?">
        <select
          value={formData.cursed}
          onChange={(e) => setFormData((prev) => ({ ...prev, cursed: e.target.value }))}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {cursedOptions.map((opt) => (
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
          placeholder="e.g., 'Forged from meteor iron' or 'Whispers ancient secrets to its wielder' or 'Once belonged to a legendary dragon slayer'"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={3}
        />
      </FormField>
    </>
  )
}
