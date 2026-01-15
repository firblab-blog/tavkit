// Encounter Generator
// Rebuilt using the generator framework pattern

import { useState, useCallback, useRef, useMemo } from 'react'
import { useGenerator, type GeneratorConfig } from '../hooks/useGenerator'
import { GeneratorLayout, EntryModeToggle, ManualEntryPreview, SaveModal } from '../components'
import { EncounterRenderer, formatEncounterForClipboard } from '../renderers/EncounterRenderer'
import {
  normalizeEncounterResponse,
  hasValidEncounterContent,
  type GeneratedEncounterData,
} from '../normalizers/encounter'
import { defaultEncounterData, type ManualEncounterData } from '../schemas/encounter'
import { EncounterAIForm, type EncounterFormData } from './EncounterAIForm'
import { EncounterManualForm } from './EncounterManualForm'
import { generateEncounter, saveEncounter, type EncounterGenerationRequest } from '@/api/generators'

// ============================================================================
// Component
// ============================================================================

export function EncounterGenerator() {
  // AI form state - use ref to make it accessible in config closures
  const [formData, setFormData] = useState<EncounterFormData>({
    party_level: 5,
    party_size: 4,
    difficulty: 'medium',
    encounter_type: 'random',
    environment: 'random',
    special_requests: '',
  })

  // Ref to track current form data for use in config closures
  const formDataRef = useRef(formData)
  formDataRef.current = formData

  // Create config with refs to access current form state
  const encounterConfig = useMemo((): GeneratorConfig<
    GeneratedEncounterData,
    ManualEncounterData,
    EncounterGenerationRequest
  > => ({
    generateApi: generateEncounter as unknown as (
      params: EncounterGenerationRequest,
      timeout: number
    ) => Promise<Record<string, unknown>>,
    saveApi: (data: unknown) => saveEncounter(data as Record<string, unknown>),
    normalizeResponse: (raw: Record<string, unknown>) => {
      // API returns { encounter: {...} }
      if (raw.encounter && typeof raw.encounter === 'object') {
        const normalized = normalizeEncounterResponse(raw.encounter as Record<string, unknown>)
        // Check if we got valid encounter content
        if (!hasValidEncounterContent(normalized)) {
          normalized._parseError =
            'AI response missing essential encounter content. Showing raw response.'
        }
        return normalized
      }
      // No encounter wrapper - try to normalize the raw response
      const normalized = normalizeEncounterResponse(raw)
      normalized._parseError = 'Unexpected response format. Attempting to display.'
      return normalized
    },
    hasValidContent: hasValidEncounterContent,
    entityKey: 'encounter',
    defaultManualData: defaultEncounterData,

    buildSavePayload: (encounter: GeneratedEncounterData, campaignId: string | null) => {
      const currentForm = formDataRef.current
      return {
        name: encounter.name || 'Unnamed Encounter',
        party_level: typeof currentForm.party_level === 'number' ? currentForm.party_level : 5,
        party_size: typeof currentForm.party_size === 'number' ? currentForm.party_size : 4,
        difficulty: encounter.difficulty || currentForm.difficulty || 'medium',
        description: encounter.description || '',
        environment: encounter.environment,
        creatures: encounter.creatures,
        treasure: encounter.treasure,
        xp_total: encounter.xp_total,
        xp_per_player: encounter.xp_per_player,
        notes: encounter.expected_duration
          ? `Expected Duration: ${encounter.expected_duration}`
          : '',
        campaign_id: campaignId || undefined,
        ai_generated: true,
      }
    },

    buildManualSavePayload: (data: ManualEncounterData, campaignId: string | null) => {
      const currentForm = formDataRef.current
      return {
        campaign_id: campaignId || undefined,
        name: data.name.trim(),
        party_level: typeof currentForm.party_level === 'number' ? currentForm.party_level : 5,
        party_size: typeof currentForm.party_size === 'number' ? currentForm.party_size : 4,
        difficulty: data.difficulty,
        description: data.description.trim() || '',
        environment: {
          setting: data.environment.trim() || '',
          features: data.terrain_features.filter((f: string) => f.trim()),
          lighting: '',
        },
        creatures: data.creatures
          .filter((c) => c.name.trim())
          .map((c) => ({
            name: c.name,
            count: c.count || 1,
            cr: 1,
            role: '',
            tactics: c.notes,
          })),
        treasure: {
          coins: {},
          items: data.treasure.filter((t: string) => t.trim()),
        },
        xp_total: 0,
        xp_per_player: 0,
        notes: [data.setup, ...data.tactics, ...data.complications]
          .filter((n: string) => n.trim())
          .join('\n'),
        ai_generated: false,
      }
    },
  }), [])

  const state = useGenerator(encounterConfig)

  // Handle AI generation
  const handleGenerate = useCallback(() => {
    state.generate({
      campaign_id: state.campaignId || undefined,
      party_level: typeof formData.party_level === 'number' ? formData.party_level : 5,
      party_size: typeof formData.party_size === 'number' ? formData.party_size : 4,
      difficulty: formData.difficulty || 'medium',
      environment: formData.environment !== 'random' ? formData.environment : 'random',
      special_requests: formData.special_requests || undefined,
    })
  }, [state, formData])

  // Handle copy to clipboard
  const handleCopy = useCallback(() => {
    if (state.generatedData) {
      navigator.clipboard.writeText(formatEncounterForClipboard(state.generatedData))
    }
  }, [state.generatedData])

  // Build form content based on entry mode
  const formContent =
    state.entryMode === 'ai' ? (
      <>
        <EntryModeToggle mode={state.entryMode} onChange={state.setEntryMode} />
        <EncounterAIForm
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
        <EncounterManualForm
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
    <EncounterRenderer
      encounter={state.generatedData}
      showRawResponse={state.showRawResponse}
      isSaved={state.isSaved}
      onSave={() => state.setShowSaveModal(true)}
      onCopy={handleCopy}
    />
  ) : state.entryMode === 'manual' ? (
    <ManualEntryPreview entityType="Encounter" />
  ) : null

  return (
    <>
      <GeneratorLayout
        title="Encounter Builder"
        description="Create balanced combat encounters with creatures, environment, and treasure"
        icon="Swords"
        formTitle={state.entryMode === 'ai' ? 'Encounter Parameters' : 'Manual Entry'}
        formIcon={state.entryMode === 'ai' ? 'Settings' : 'Edit'}
        resultsTitle={state.entryMode === 'ai' ? 'Generated Encounter' : 'Preview'}
        formContent={formContent}
        generatedContent={resultContent}
        isGenerating={state.loading}
        onGenerate={handleGenerate}
        generateButtonText="Generate Encounter"
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

export default EncounterGenerator
