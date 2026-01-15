// Trap Generator
// Rebuilt using the generator framework pattern

import { useState, useCallback } from 'react'
import { useGenerator, type GeneratorConfig } from '../hooks/useGenerator'
import { GeneratorLayout, EntryModeToggle, ManualEntryPreview, SaveModal } from '../components'
import { TrapRenderer, formatTrapForClipboard } from '../renderers/TrapRenderer'
import {
  normalizeTrapResponse,
  hasValidTrapContent,
  type GeneratedTrapData,
} from '../normalizers/trap'
import { defaultTrapData, type ManualTrapData } from '../schemas/trap'
import { TrapAIForm, type TrapFormData } from './TrapAIForm'
import { TrapManualForm } from './TrapManualForm'
import { generateTrap, saveTrap, type TrapGenerationRequest } from '@/api/generators'

// ============================================================================
// Configuration
// ============================================================================

type TrapParams = TrapGenerationRequest

const trapConfig: GeneratorConfig<GeneratedTrapData, ManualTrapData, TrapParams> = {
  generateApi: generateTrap as unknown as (
    params: TrapParams,
    timeout: number
  ) => Promise<Record<string, unknown>>,
  saveApi: (data) => saveTrap(data as Record<string, unknown>),
  normalizeResponse: (raw) => {
    // API returns { trap: {...} }
    if (raw.trap && typeof raw.trap === 'object') {
      return normalizeTrapResponse(raw.trap as Record<string, unknown>)
    }
    return normalizeTrapResponse(raw)
  },
  hasValidContent: hasValidTrapContent,
  entityKey: 'trap',
  defaultManualData: defaultTrapData,

  buildSavePayload: (trap, campaignId) => ({
    campaign_id: campaignId || undefined,
    name: trap.name || 'Unnamed Trap',
    trap_type: trap.trap_type,
    difficulty: trap.difficulty,
    description: trap.description || '',
    environment: trap.environment || '',
    trigger: trap.trigger || '',
    effect: trap.effect || '',
    damage: trap.damage || '',
    detection: trap.detection || {},
    solution_paths: trap.solution_paths || [],
    complications: trap.complications || [],
    rewards: trap.rewards || [],
    scaling: trap.scaling || {},
    dm_notes: trap.dm_notes || '',
    ai_generated: true,
  }),

  buildManualSavePayload: (data, campaignId) => ({
    campaign_id: campaignId || undefined,
    name: data.name.trim(),
    trap_type: data.trap_type,
    difficulty: '',
    description: data.lore.trim() || '',
    environment: '',
    trigger: data.trigger.trim() || '',
    effect: data.effect.trim() || '',
    damage: data.damage.trim() || '',
    detection: {
      passive_perception_dc: data.detection_dc,
      investigation_dc: null,
      clues: [],
    },
    solution_paths: data.disarm_dc
      ? [
          {
            approach: 'Disarm',
            skill: "Thieves' Tools",
            dc: data.disarm_dc,
            description: data.bypass.trim() || 'Standard disarm',
            time: '1 action',
            failure: 'Triggers the trap',
          },
        ]
      : [],
    complications: data.countermeasures.filter((c) => c.trim()),
    rewards: [],
    scaling: { easier: '', harder: '' },
    dm_notes: data.reset.trim() || '',
    ai_generated: false,
  }),
}

// ============================================================================
// Component
// ============================================================================

export function TrapGenerator() {
  const state = useGenerator(trapConfig)

  // AI form state
  const [formData, setFormData] = useState<TrapFormData>({
    trap_type: 'mechanical',
    difficulty: 'medium',
    party_level: 5,
    environment: 'dungeon',
    special_requests: '',
  })

  // Handle AI generation
  const handleGenerate = useCallback(() => {
    state.generate({
      campaign_id: state.campaignId || undefined,
      trap_type: formData.trap_type,
      difficulty: formData.difficulty,
      party_level: String(formData.party_level),
      environment: formData.environment,
      special_requests: formData.special_requests || undefined,
    })
  }, [state, formData])

  // Handle copy to clipboard
  const handleCopy = useCallback(() => {
    if (state.generatedData) {
      navigator.clipboard.writeText(formatTrapForClipboard(state.generatedData))
    }
  }, [state.generatedData])

  // Build form content based on entry mode
  const formContent =
    state.entryMode === 'ai' ? (
      <>
        <EntryModeToggle mode={state.entryMode} onChange={state.setEntryMode} />
        <TrapAIForm
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
        <TrapManualForm
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
    <TrapRenderer
      trap={state.generatedData}
      showRawResponse={state.showRawResponse}
      isSaved={state.isSaved}
      onSave={() => state.setShowSaveModal(true)}
      onCopy={handleCopy}
    />
  ) : state.entryMode === 'manual' ? (
    <ManualEntryPreview entityType="Trap" />
  ) : null

  return (
    <>
      <GeneratorLayout
        title="Trap & Puzzle Generator"
        description="Generate traps and puzzles with multiple solution paths for your campaign"
        icon="Skull"
        formTitle={state.entryMode === 'ai' ? 'Trap Details' : 'Manual Entry'}
        formIcon={state.entryMode === 'ai' ? 'Settings' : 'Edit'}
        resultsTitle={state.entryMode === 'ai' ? 'Generated Trap' : 'Preview'}
        formContent={formContent}
        generatedContent={resultContent}
        isGenerating={state.loading}
        onGenerate={handleGenerate}
        generateButtonText="Generate Trap"
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
          entityName={state.generatedData.name}
          campaignId={state.campaignId}
        />
      )}
    </>
  )
}

export default TrapGenerator
