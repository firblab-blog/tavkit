// Rumor Generator
// Rebuilt using the generator framework pattern
// Note: This generator creates multiple rumors at once

import { useState, useCallback, useEffect, useRef } from 'react'
import { useCampaignStore } from '@/store/campaignStore'
import { GeneratorLayout, EntryModeToggle, ManualEntryPreview, SaveModal } from '../components'
import { RumorRenderer, formatRumorsForClipboard } from '../renderers/RumorRenderer'
import {
  normalizeRumorsResponse,
  hasValidRumorsContent,
  type GeneratedRumorsData,
} from '../normalizers/rumor'
import { defaultRumorData, type ManualRumorData } from '../schemas/rumor'
import { RumorAIForm, type RumorFormData } from './RumorAIForm'
import { RumorManualForm } from './RumorManualForm'
import { generateRumor, saveRumor, getErrorMessage } from '@/api/generators'
import { getMaxTokensFromSettings, type AIGenerationSettings } from '../hooks/useGenerator'
import { emitContentSaved } from '@/lib/contentEvents'

type EntryMode = 'ai' | 'manual'

// ============================================================================
// Component
// ============================================================================

export function RumorGenerator() {
  // Entry mode
  const [entryMode, setEntryMode] = useState<EntryMode>('ai')

  // Campaign selection
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const hasUserSelectedCampaign = useRef(false)
  const { fetchCampaigns, activeCampaignId } = useCampaignStore()

  // AI generation state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rumorsResponse, setRumorsResponse] = useState<GeneratedRumorsData | null>(null)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  // Manual entry state
  const [manualData, setManualData] = useState<ManualRumorData>(defaultRumorData)
  const [manualSaving, setManualSaving] = useState(false)
  const [manualSaved, setManualSaved] = useState(false)

  // AI settings
  const [aiSettings, setAiSettings] = useState<AIGenerationSettings>({
    detailLevel: 'high',
    timeout: 120,
  })

  // AI form state
  const [formData, setFormData] = useState<RumorFormData>({
    count: 3,
    veracity: 'mixed',
    rumor_type: 'random',
    urgency: 'moderate',
    scope: 'local',
    special_requests: '',
  })

  // Fetch campaigns on mount
  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  // Auto-select active campaign on mount
  useEffect(() => {
    if (activeCampaignId && !hasUserSelectedCampaign.current) {
      setCampaignId(activeCampaignId)
    }
  }, [activeCampaignId])

  // Reset manual saved state when switching modes or changing data
  useEffect(() => {
    setManualSaved(false)
  }, [entryMode, manualData])

  // Handle campaign selection
  const handleCampaignSelect = useCallback((id: string | null) => {
    hasUserSelectedCampaign.current = true
    setCampaignId(id)
  }, [])

  // Handle AI generation
  const handleGenerate = useCallback(async () => {
    setLoading(true)
    setError(null)
    setRumorsResponse(null)
    setIsSaved(false)

    try {
      const data = await generateRumor(
        {
          campaign_id: campaignId || undefined,
          count: formData.count || 3,
          veracity: formData.veracity || 'mixed',
          rumor_type: formData.rumor_type || 'random',
          urgency: formData.urgency || 'moderate',
          scope: formData.scope || 'local',
          special_requests: formData.special_requests || undefined,
          max_tokens: getMaxTokensFromSettings(aiSettings),
          timeout: aiSettings.timeout,
        },
        aiSettings.timeout
      )

      const normalized = normalizeRumorsResponse(data as unknown as Record<string, unknown>)

      if (!hasValidRumorsContent(normalized)) {
        normalized._parseError =
          normalized._parseError || 'AI response missing essential rumor content.'
      }

      setRumorsResponse(normalized)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [campaignId, formData, aiSettings])

  // Handle save (multiple rumors)
  const handleSave = useCallback(async () => {
    if (!rumorsResponse || rumorsResponse.rumors.length === 0) return

    setError(null)

    try {
      const currentCampaignId = useCampaignStore.getState().activeCampaignId

      // Save each rumor individually
      const savePromises = rumorsResponse.rumors.map((rumor) =>
        saveRumor({
          text: rumor.text,
          source: rumor.source || 'Unknown source',
          veracity: rumor.veracity || 'unknown',
          leads_to: rumor.leads_to || '',
          context: rumor.context || '',
          foreshadowing: rumor.foreshadowing || false,
          tags: rumor.tags || [],
          campaign_id: currentCampaignId || undefined,
          ai_generated: true,
        })
      )

      await Promise.all(savePromises)

      setShowSaveModal(false)
      setIsSaved(true)
      emitContentSaved()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }, [rumorsResponse])

  // Save manual entry
  const handleManualSave = useCallback(async () => {
    if (!manualData.text.trim()) return

    setManualSaving(true)
    setError(null)

    try {
      const currentCampaignId = useCampaignStore.getState().activeCampaignId

      await saveRumor({
        text: manualData.text,
        source: manualData.source || 'Unknown source',
        veracity: manualData.veracity || 'unknown',
        leads_to: manualData.leads_to || '',
        context: manualData.context || '',
        foreshadowing: manualData.foreshadowing || false,
        tags: manualData.tags || [],
        campaign_id: currentCampaignId || undefined,
        ai_generated: false,
      })

      setManualSaved(true)
      emitContentSaved()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setManualSaving(false)
    }
  }, [manualData])

  // Handle copy to clipboard
  const handleCopy = useCallback(() => {
    if (rumorsResponse) {
      navigator.clipboard.writeText(formatRumorsForClipboard(rumorsResponse))
    }
  }, [rumorsResponse])

  // Build form content based on entry mode
  const formContent =
    entryMode === 'ai' ? (
      <>
        <EntryModeToggle mode={entryMode} onChange={setEntryMode} />
        <RumorAIForm
          campaignId={campaignId}
          onCampaignSelect={handleCampaignSelect}
          formData={formData}
          setFormData={setFormData}
          aiSettings={aiSettings}
          setAiSettings={setAiSettings}
        />
      </>
    ) : (
      <>
        <EntryModeToggle mode={entryMode} onChange={setEntryMode} />
        <RumorManualForm
          campaignId={campaignId}
          onCampaignSelect={handleCampaignSelect}
          manualData={manualData}
          setManualData={setManualData}
          onSave={handleManualSave}
          saving={manualSaving}
          saved={manualSaved}
          error={error}
        />
      </>
    )

  // Build result content
  const resultContent = rumorsResponse ? (
    <RumorRenderer
      rumors={rumorsResponse}
      isSaved={isSaved}
      onSave={() => setShowSaveModal(true)}
      onCopy={handleCopy}
    />
  ) : entryMode === 'manual' ? (
    <ManualEntryPreview entityType="Rumor" />
  ) : null

  return (
    <>
      <GeneratorLayout
        title="Rumor Generator"
        description="Generate rumors, plot hooks, and gossip for your campaign"
        icon="Quote"
        formTitle={entryMode === 'ai' ? 'Rumor Parameters' : 'Create Rumor'}
        formIcon={entryMode === 'ai' ? 'Settings' : 'Pencil'}
        resultsTitle={entryMode === 'ai' ? 'Generated Rumors' : 'Preview'}
        formContent={formContent}
        generatedContent={resultContent}
        isGenerating={loading}
        onGenerate={handleGenerate}
        generateButtonText="Generate Rumors"
        generateButtonIcon="Sparkles"
        error={entryMode === 'ai' ? error ?? undefined : undefined}
        hideGenerateButton={entryMode === 'manual'}
      />

      {/* Save Modal */}
      {rumorsResponse && (
        <SaveModal
          isOpen={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          onSave={handleSave}
          entityName={`${rumorsResponse.rumors.length} rumor${rumorsResponse.rumors.length > 1 ? 's' : ''}`}
          campaignId={campaignId}
        />
      )}
    </>
  )
}

export default RumorGenerator
