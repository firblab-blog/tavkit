// Quest Generator
// Rebuilt using the generator framework pattern

import { useState, useCallback } from 'react'
import { useGenerator, type GeneratorConfig } from '../hooks/useGenerator'
import { GeneratorLayout, EntryModeToggle, ManualEntryPreview, SaveModal } from '../components'
import { QuestRenderer, formatQuestForClipboard } from '../renderers/QuestRenderer'
import {
  normalizeQuestResponse,
  hasValidQuestContent,
  type GeneratedQuestData,
} from '../normalizers/quest'
import { defaultQuestData, type ManualQuestData } from '../schemas/quest'
import { QuestAIForm } from './QuestAIForm'
import { QuestManualForm } from './QuestManualForm'
import { generateQuest, saveQuest, type QuestGenerationRequest } from '@/api/generators'

// ============================================================================
// Configuration
// ============================================================================

type QuestParams = QuestGenerationRequest

const questConfig: GeneratorConfig<GeneratedQuestData, ManualQuestData, QuestParams> = {
  generateApi: generateQuest as unknown as (
    params: QuestParams,
    timeout: number
  ) => Promise<Record<string, unknown>>,
  saveApi: (data) => saveQuest(data as Record<string, unknown>),
  normalizeResponse: normalizeQuestResponse,
  hasValidContent: hasValidQuestContent,
  entityKey: 'quest',
  defaultManualData: defaultQuestData,

  buildSavePayload: (quest, campaignId) => ({
    title: quest.title || 'Untitled Quest',
    type: quest.type || 'main',
    category: quest.category || '',
    description: quest.description,
    objectives: quest.objectives || [],
    rewards: quest.rewards || [],
    complications: quest.complications || [],
    npcs_involved: quest.npcs_involved || [],
    locations_involved: quest.locations_involved || [],
    faction_alignment: quest.faction_alignment || '',
    party_level: quest.party_level || 1,
    moral_ambiguity: quest.moral_ambiguity || false,
    combat_intensity: quest.combat_intensity || 'medium',
    time_limit: quest.time_limit || '',
    status: 'available',
    campaign_id: campaignId || undefined,
    ai_generated: true,
  }),

  buildManualSavePayload: (data, campaignId) => ({
    campaign_id: campaignId || undefined,
    title: data.title.trim(),
    type: data.type,
    category: data.combat_intensity,
    description: data.description.trim() || undefined,
    objectives: data.objectives.filter((o) => o.trim()),
    rewards: data.rewards.filter((r) => r.trim()),
    complications: data.complications.filter((c) => c.trim()),
    npcs_involved: data.npcs_involved.filter((n) => n.trim()),
    locations_involved: data.locations_involved.filter((l) => l.trim()),
    party_level: data.party_level ?? 5,
    combat_intensity: data.combat_intensity,
    time_limit: data.time_limit.trim() || undefined,
    status: 'available',
    ai_generated: false,
  }),
}

// ============================================================================
// Component
// ============================================================================

export function QuestGenerator() {
  const state = useGenerator(questConfig)

  // AI form state
  const [formData, setFormData] = useState({
    type: 'main',
    difficulty: 'medium',
    party_level: 5,
    quest_length: 'medium',
    special_requests: '',
  })

  // Handle AI generation
  const handleGenerate = useCallback(() => {
    state.generate({
      type: formData.type || 'main',
      category: formData.difficulty || undefined,
      party_level: formData.party_level || 1,
      party_size: 4,
      moral_ambiguity: false,
      combat_intensity: formData.difficulty || 'medium',
      quest_length: formData.quest_length || 'medium',
      include_factions: [],
      include_locations: [],
      include_npcs: [],
      special_requests: formData.special_requests.trim() || undefined,
      campaign_id: state.campaignId || undefined,
    })
  }, [state, formData])

  // Handle copy to clipboard
  const handleCopy = useCallback(() => {
    if (state.generatedData) {
      navigator.clipboard.writeText(formatQuestForClipboard(state.generatedData))
    }
  }, [state.generatedData])

  // Build form content based on entry mode
  const formContent =
    state.entryMode === 'ai' ? (
      <>
        <EntryModeToggle mode={state.entryMode} onChange={state.setEntryMode} />
        <QuestAIForm
          campaignId={state.campaignId}
          onCampaignSelect={state.handleCampaignSelect}
          formData={formData}
          setFormData={setFormData}
          aiSettings={state.aiSettings}
          setAiSettings={state.setAiSettings}
        />
      </>
    ) : (
      <>
        <EntryModeToggle mode={state.entryMode} onChange={state.setEntryMode} />
        <QuestManualForm
          campaignId={state.campaignId}
          onCampaignSelect={state.handleCampaignSelect}
          manualData={state.manualData}
          setManualData={state.setManualData}
          onSave={state.saveManual}
          saving={state.manualSaving}
          saved={state.manualSaved}
          error={state.error}
        />
      </>
    )

  // Build result content
  const resultContent = state.generatedData ? (
    <QuestRenderer
      quest={state.generatedData}
      showRawResponse={state.showRawResponse}
      isSaved={state.isSaved}
      onSave={() => state.setShowSaveModal(true)}
      onCopy={handleCopy}
      formDifficulty={formData.difficulty}
      formPartyLevel={formData.party_level}
    />
  ) : state.entryMode === 'manual' ? (
    <ManualEntryPreview entityType="Quest" />
  ) : null

  return (
    <>
      <GeneratorLayout
        title="Quest Generator"
        description="Generate engaging quests with objectives, rewards, and complications"
        icon="Scroll"
        formTitle={state.entryMode === 'ai' ? 'Quest Parameters' : 'Manual Entry'}
        formIcon={state.entryMode === 'ai' ? 'Sparkles' : 'Edit'}
        resultsTitle={state.entryMode === 'ai' ? 'Generated Quest' : 'Preview'}
        formContent={formContent}
        generatedContent={resultContent}
        isGenerating={state.loading}
        onGenerate={handleGenerate}
        generateButtonText="Generate Quest"
        generateButtonIcon="Sparkles"
        error={state.entryMode === 'ai' ? state.error ?? undefined : undefined}
        hideGenerateButton={state.entryMode === 'manual'}
      />

      {/* Save Modal */}
      {state.generatedData && (
        <SaveModal
          isOpen={state.showSaveModal}
          onClose={() => state.setShowSaveModal(false)}
          onSave={state.saveGenerated}
          entityName={state.generatedData.title}
          campaignId={state.campaignId}
        />
      )}
    </>
  )
}

export default QuestGenerator
