// AI Generation Form for Quests

import { Dispatch, SetStateAction } from 'react'
import { FormField } from '@/components/ui/FormField'
import CampaignSelector from '@/components/common/CampaignSelector'
import AISettings from '@/components/generators/AISettings'
import type { AIGenerationSettings } from '../hooks/useGenerator'
import { questTypeOptions, questDifficultyOptions, questLengthOptions } from '../schemas/quest'

export interface QuestFormData {
  type: string
  difficulty: string
  party_level: number
  quest_length: string
  special_requests: string
}

interface QuestAIFormProps {
  campaignId: string | null
  onCampaignSelect: (id: string | null) => void
  formData: QuestFormData
  setFormData: Dispatch<SetStateAction<QuestFormData>>
  aiSettings: AIGenerationSettings
  setAiSettings: (settings: AIGenerationSettings) => void
}

export function QuestAIForm({
  campaignId,
  onCampaignSelect,
  formData,
  setFormData,
  setAiSettings,
}: QuestAIFormProps) {
  return (
    <>
      <AISettings generatorType="quest" onSettingsChange={setAiSettings} />
      <CampaignSelector selectedCampaignId={campaignId} onSelect={onCampaignSelect} />

      <FormField label="Quest Type">
        <select
          value={formData.type}
          onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {questTypeOptions.map((opt) => (
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
          {questDifficultyOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Party Level" description="Determines appropriate challenges and rewards">
        <input
          type="number"
          value={formData.party_level}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, party_level: parseInt(e.target.value) || 1 }))
          }
          min="1"
          max="20"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      <FormField label="Quest Length">
        <select
          value={formData.quest_length}
          onChange={(e) => setFormData((prev) => ({ ...prev, quest_length: e.target.value }))}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {questLengthOptions.map((opt) => (
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
          placeholder="e.g., 'Involves ancient dragon cult' or 'Requires underwater exploration' or 'Political intrigue with noble families'"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={3}
        />
      </FormField>
    </>
  )
}
