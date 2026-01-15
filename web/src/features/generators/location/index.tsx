// Location Generator
// Rebuilt using the generator framework pattern

import { useState, useCallback } from 'react'
import { useGenerator, type GeneratorConfig } from '../hooks/useGenerator'
import { GeneratorLayout, EntryModeToggle, ManualEntryPreview, SaveModal } from '../components'
import { LocationRenderer, formatLocationForClipboard } from '../renderers/LocationRenderer'
import {
  normalizeLocationResponse,
  hasValidLocationContent,
  type GeneratedLocationData,
} from '../normalizers/location'
import { defaultLocationData, type ManualLocationData } from '../schemas/location'
import { LocationAIForm } from './LocationAIForm'
import { LocationManualForm } from './LocationManualForm'
import { generateLocation, saveLocation, type LocationGenerationRequest } from '@/api/generators'

// ============================================================================
// Configuration
// ============================================================================

type LocationParams = LocationGenerationRequest

const locationConfig: GeneratorConfig<GeneratedLocationData, ManualLocationData, LocationParams> = {
  generateApi: generateLocation as unknown as (
    params: LocationParams,
    timeout: number
  ) => Promise<Record<string, unknown>>,
  saveApi: (data) => saveLocation(data as Record<string, unknown>),
  normalizeResponse: normalizeLocationResponse,
  hasValidContent: hasValidLocationContent,
  entityKey: 'location',
  defaultManualData: defaultLocationData,

  buildSavePayload: (location, campaignId) => ({
    name: location.name || 'Unnamed Location',
    type: location.type || 'dungeon',
    theme: location.theme || '',
    description: location.description,
    features: location.features || [],
    secrets: location.secrets || [],
    factions: location.factions || [],
    npcs: location.npcs || [],
    encounters: location.encounters || [],
    campaign_id: campaignId || undefined,
    ai_generated: true,
  }),

  buildManualSavePayload: (data, campaignId) => ({
    campaign_id: campaignId || undefined,
    name: data.name.trim(),
    type: data.location_type,
    theme: '',
    description: data.description.trim() || '',
    features: data.notable_features.filter((f) => f.trim()),
    secrets: data.secrets.filter((s) => s.trim()),
    factions: [],
    npcs: data.inhabitants.filter((i) => i.trim()),
    encounters: data.hazards.filter((h) => h.trim()),
    ai_generated: false,
  }),
}

// ============================================================================
// Component
// ============================================================================

export function LocationGenerator() {
  const state = useGenerator(locationConfig)

  // AI form state
  const [formData, setFormData] = useState({
    type: 'city',
    size: 'medium',
    danger_level: 'moderate',
    theme: 'fantasy',
    special_requests: '',
  })

  // Handle AI generation
  const handleGenerate = useCallback(() => {
    state.generate(formData)
  }, [state, formData])

  // Handle copy to clipboard
  const handleCopy = useCallback(() => {
    if (state.generatedData) {
      navigator.clipboard.writeText(formatLocationForClipboard(state.generatedData))
    }
  }, [state.generatedData])

  // Build form content based on entry mode
  const formContent =
    state.entryMode === 'ai' ? (
      <>
        <EntryModeToggle mode={state.entryMode} onChange={state.setEntryMode} />
        <LocationAIForm
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
        <LocationManualForm
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
    <LocationRenderer
      location={state.generatedData}
      showRawResponse={state.showRawResponse}
      isSaved={state.isSaved}
      onSave={() => state.setShowSaveModal(true)}
      onCopy={handleCopy}
    />
  ) : state.entryMode === 'manual' ? (
    <ManualEntryPreview entityType="Location" />
  ) : null

  return (
    <>
      <GeneratorLayout
        title="Location Generator"
        description="Create detailed locations with features, secrets, and encounters"
        icon="Map"
        formTitle={state.entryMode === 'ai' ? 'Location Parameters' : 'Manual Entry'}
        formIcon={state.entryMode === 'ai' ? 'Sparkles' : 'Edit'}
        resultsTitle={state.entryMode === 'ai' ? 'Generated Location' : 'Preview'}
        formContent={formContent}
        generatedContent={resultContent}
        isGenerating={state.loading}
        onGenerate={handleGenerate}
        generateButtonText="Generate Location"
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

export default LocationGenerator
