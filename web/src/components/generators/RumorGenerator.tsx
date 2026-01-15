import { useState, useEffect, useRef } from 'react'
import { GeneratorLayout } from './GeneratorLayout'
import { FormField } from '@/components/ui/FormField'
import { ActionsBar } from '@/components/ui/ActionsBar'
import Icon from '../common/Icon'
import CampaignSelector from '../common/CampaignSelector'
import { useCampaignStore } from '../../store/campaignStore'
import AISettings, { AIGenerationSettings, getMaxTokensFromSettings } from './AISettings'
import { emitContentSaved } from '@/lib/contentEvents'
import { EntryModeToggle, type EntryMode } from './shared/EntryModeToggle'
import { ArrayFieldEditor } from './shared/fields'
import { SaveModal, ParseWarning, RawDataViewer, ManualEntryPreview } from './shared'
import {
  veracityOptions,
  defaultRumorData,
  type ManualRumorData,
} from './shared/schemas/rumorSchema'
import {
  generateRumor as generateRumorApi,
  saveRumor as saveRumorApi,
  getErrorMessage,
} from '@/api/generators'
import { normalizeStringArray } from '@/utils/aiResponseNormalizer'
import { logger } from '@/utils/logger'

// Expected rumor structure
interface RumorData {
  text: string
  source: string
  veracity: string
  leads_to: string
  context: string
  foreshadowing: boolean
  tags: string[]
  // For any unexpected fields from AI
  _raw?: Record<string, unknown>
}

// Response structure
interface RumorsResponse {
  rumors: RumorData[]
  _parseError?: string
}

/**
 * Normalize a single rumor to proper structure
 */
function normalizeSingleRumor(value: unknown): RumorData | null {
  if (!value || typeof value !== 'object') {
    // If it's just a string, wrap it as a rumor
    if (typeof value === 'string' && value.trim()) {
      return {
        text: value,
        source: 'Unknown',
        veracity: 'unknown',
        leads_to: '',
        context: '',
        foreshadowing: false,
        tags: [],
      }
    }
    return null
  }

  const rumor = value as Record<string, unknown>

  // Expected fields for tracking unexpected ones
  const expectedFields = [
    'text',
    'content',
    'description',
    'message',
    'source',
    'speaker',
    'origin',
    'from',
    'veracity',
    'truth',
    'accuracy',
    'is_true',
    'leads_to',
    'adventure_hook',
    'hooks',
    'hook',
    'context',
    'background',
    'foreshadowing',
    'tags',
    'keywords',
    'categories',
    'related_id',
  ]

  // Collect unexpected fields
  const unexpectedFields: Record<string, unknown> = {}
  for (const key of Object.keys(rumor)) {
    if (!expectedFields.includes(key)) {
      unexpectedFields[key] = rumor[key]
    }
  }

  // Get text from various possible field names
  let text = ''
  if (rumor.text) text = String(rumor.text)
  else if (rumor.content) text = String(rumor.content)
  else if (rumor.description) text = String(rumor.description)
  else if (rumor.message) text = String(rumor.message)

  // Get source from various possible field names
  let source = 'Unknown'
  if (rumor.source) source = String(rumor.source)
  else if (rumor.speaker) source = String(rumor.speaker)
  else if (rumor.origin) source = String(rumor.origin)
  else if (rumor.from) source = String(rumor.from)

  // Get veracity from various possible field names
  let veracity = 'unknown'
  if (rumor.veracity) veracity = String(rumor.veracity)
  else if (rumor.truth) veracity = String(rumor.truth)
  else if (rumor.accuracy) veracity = String(rumor.accuracy)
  else if (typeof rumor.is_true === 'boolean') {
    veracity = rumor.is_true ? 'true' : 'false'
  }

  // Get leads_to from various possible field names
  let leadsTo = ''
  if (rumor.leads_to) leadsTo = String(rumor.leads_to)
  else if (rumor.adventure_hook) leadsTo = String(rumor.adventure_hook)
  else if (rumor.hook) leadsTo = String(rumor.hook)
  else if (Array.isArray(rumor.hooks) && rumor.hooks.length > 0) {
    leadsTo = String(rumor.hooks[0])
  }

  // Get context
  let context = ''
  if (rumor.context) context = String(rumor.context)
  else if (rumor.background) context = String(rumor.background)

  // Get foreshadowing
  let foreshadowing = false
  if (typeof rumor.foreshadowing === 'boolean') {
    foreshadowing = rumor.foreshadowing
  } else if (typeof rumor.foreshadowing === 'string') {
    foreshadowing =
      rumor.foreshadowing.toLowerCase() === 'true' || rumor.foreshadowing.toLowerCase() === 'yes'
  }

  // Get tags
  const tags = normalizeStringArray(rumor.tags || rumor.keywords || rumor.categories)

  return {
    text,
    source,
    veracity,
    leads_to: leadsTo,
    context,
    foreshadowing,
    tags,
    _raw: Object.keys(unexpectedFields).length > 0 ? unexpectedFields : undefined,
  }
}

/**
 * Main normalization function - converts raw AI response to typed RumorsResponse
 */
function normalizeRumorsResponse(raw: Record<string, unknown>): RumorsResponse {
  logger.debug('[RumorGenerator] normalizeRumorsResponse input:', raw)

  let rumors: RumorData[] = []
  let parseError: string | undefined

  // Try to extract rumors array
  const rawRumors = raw.rumors || raw.rumor_list || raw.items || raw.results

  if (Array.isArray(rawRumors)) {
    rumors = rawRumors
      .map((r) => normalizeSingleRumor(r))
      .filter((r): r is RumorData => r !== null && !!r.text)
  } else if (rawRumors && typeof rawRumors === 'object') {
    // Single rumor object
    const single = normalizeSingleRumor(rawRumors)
    if (single && single.text) {
      rumors = [single]
    }
  }

  // If no rumors found, check if the raw response itself is a single rumor
  if (rumors.length === 0 && (raw.text || raw.content || raw.description)) {
    const single = normalizeSingleRumor(raw)
    if (single && single.text) {
      rumors = [single]
    }
  }

  // If still no rumors, check for parse warning
  if (rumors.length === 0) {
    if (raw._parse_warning) {
      parseError = String(raw._parse_warning)
    } else {
      parseError = 'No valid rumors found in AI response'
    }
  }

  const result: RumorsResponse = {
    rumors,
    _parseError: parseError,
  }

  logger.debug('[RumorGenerator] Normalized result:', result)
  return result
}

/**
 * Check if response has valid rumor content
 */
function hasValidRumorContent(response: RumorsResponse): boolean {
  return response.rumors.length > 0 && response.rumors.some((r) => !!r.text)
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function RumorGenerator() {
  // Entry mode: AI or Manual
  const [entryMode, setEntryMode] = useState<EntryMode>('ai')

  // Manual entry state
  const [manualData, setManualData] = useState<ManualRumorData>(defaultRumorData)
  const [manualSaving, setManualSaving] = useState(false)
  const [manualSaved, setManualSaved] = useState(false)

  // AI generation state
  const [specialRequests, setSpecialRequests] = useState('')
  const [count, setCount] = useState<number>(3)
  const [veracity, setVeracity] = useState('mixed')
  const [rumorType, setRumorType] = useState('random')
  const [urgency, setUrgency] = useState('moderate')
  const [scope, setScope] = useState('local')
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rumorsResponse, setRumorsResponse] = useState<RumorsResponse | null>(null)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  // Track if user has made an explicit campaign selection
  const hasUserSelectedCampaign = useRef(false)

  // AI settings for controlling token generation
  const [aiSettings, setAiSettings] = useState<AIGenerationSettings>({
    detailLevel: 'high',
    timeout: 120,
  })

  const { fetchCampaigns, activeCampaignId } = useCampaignStore()

  // Fetch campaigns on mount
  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  // Auto-select active campaign ONLY on initial mount (not after user interaction)
  useEffect(() => {
    if (activeCampaignId && !hasUserSelectedCampaign.current) {
      setCampaignId(activeCampaignId)
    }
  }, [activeCampaignId])

  // Reset manual saved state when switching modes or changing data
  useEffect(() => {
    setManualSaved(false)
  }, [entryMode, manualData])

  const handleGenerate = async () => {
    setLoading(true)
    setError('')
    setRumorsResponse(null)
    setIsSaved(false)

    try {
      const data = await generateRumorApi(
        {
          campaign_id: campaignId || undefined,
          count: count || 3,
          veracity: veracity || 'mixed',
          rumor_type: rumorType || 'random',
          urgency: urgency || 'moderate',
          scope: scope || 'local',
          special_requests: specialRequests || undefined,
          max_tokens: getMaxTokensFromSettings(aiSettings),
          timeout: aiSettings.timeout,
        },
        aiSettings.timeout
      )
      logger.debug('[RumorGenerator] Raw API response:', data)

      // Normalize the response
      const normalized = normalizeRumorsResponse(data as unknown as Record<string, unknown>)

      // Check if we got valid content
      if (!hasValidRumorContent(normalized)) {
        normalized._parseError =
          normalized._parseError || 'AI response missing essential rumor content.'
      }

      setRumorsResponse(normalized)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!rumorsResponse || rumorsResponse.rumors.length === 0) return

    setError('')

    try {
      const activeCampaignId = useCampaignStore.getState().activeCampaignId

      // Save each rumor individually
      const savePromises = rumorsResponse.rumors.map((rumor) =>
        saveRumorApi({
          text: rumor.text,
          source: rumor.source || 'Unknown source',
          veracity: rumor.veracity || 'unknown',
          leads_to: rumor.leads_to || '',
          context: rumor.context || '',
          foreshadowing: rumor.foreshadowing || false,
          tags: rumor.tags || [],
          campaign_id: activeCampaignId || undefined,
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
  }

  // Save manual entry
  const handleManualSave = async () => {
    if (!manualData.text.trim()) return

    setManualSaving(true)
    setError('')

    try {
      const activeCampaignId = useCampaignStore.getState().activeCampaignId

      await saveRumorApi({
        text: manualData.text,
        source: manualData.source || 'Unknown source',
        veracity: manualData.veracity || 'unknown',
        leads_to: manualData.leads_to || '',
        context: manualData.context || '',
        foreshadowing: manualData.foreshadowing || false,
        tags: manualData.tags || [],
        campaign_id: activeCampaignId || undefined,
        ai_generated: false,
      })

      setManualSaved(true)
      emitContentSaved()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setManualSaving(false)
    }
  }

  // Reset manual form
  const handleManualReset = () => {
    setManualData(defaultRumorData)
    setManualSaved(false)
    setError('')
  }

  const handleCopy = () => {
    if (!rumorsResponse || rumorsResponse.rumors.length === 0) return
    let text = 'Generated Rumors:\n\n'
    rumorsResponse.rumors.forEach((rumor, index) => {
      text += `${index + 1}. "${rumor.text}"\n`
      text += `   Source: ${rumor.source}\n`
      text += `   Veracity: ${rumor.veracity}\n`
      if (rumor.leads_to) {
        text += `   Leads To: ${rumor.leads_to}\n`
      }
      if (rumor.context) {
        text += `   Context: ${rumor.context}\n`
      }
      if (rumor.foreshadowing) {
        text += `   Foreshadowing: Yes\n`
      }
      if (rumor.tags && rumor.tags.length > 0) {
        text += `   Tags: ${rumor.tags.join(', ')}\n`
      }
      text += '\n'
    })
    navigator.clipboard.writeText(text)
  }

  // AI Form content
  const aiFormContent = (
    <>
      <AISettings generatorType="rumor" onSettingsChange={setAiSettings} />
      <CampaignSelector
        selectedCampaignId={campaignId}
        onSelect={(id) => {
          hasUserSelectedCampaign.current = true
          setCampaignId(id)
        }}
      />

      <FormField label="Number of Rumors" description="How many rumors to generate">
        <input
          type="number"
          min="1"
          max="10"
          value={count}
          onChange={(e) => setCount(parseInt(e.target.value) || 1)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      <FormField label="Veracity">
        <select
          value={veracity}
          onChange={(e) => setVeracity(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="mixed">Mixed (true & false)</option>
          <option value="true">True (all accurate)</option>
          <option value="false">False (all misleading)</option>
          <option value="partial">Partial (half-truths)</option>
        </select>
      </FormField>

      <FormField label="Type">
        <select
          value={rumorType}
          onChange={(e) => setRumorType(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="random">Random</option>
          <option value="plot_hook">Plot Hook</option>
          <option value="background">Background/Lore</option>
          <option value="danger">Danger/Warning</option>
          <option value="opportunity">Opportunity</option>
          <option value="gossip">Gossip/Social</option>
          <option value="prophecy">Prophecy/Omen</option>
        </select>
      </FormField>

      <FormField label="Urgency">
        <select
          value={urgency}
          onChange={(e) => setUrgency(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="low">Low (distant/vague)</option>
          <option value="moderate">Moderate (interesting)</option>
          <option value="high">High (immediate concern)</option>
          <option value="critical">Critical (urgent action needed)</option>
        </select>
      </FormField>

      <FormField label="Scope">
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="local">Local (immediate area)</option>
          <option value="regional">Regional (nearby lands)</option>
          <option value="national">National (entire kingdom)</option>
          <option value="global">Global (world-spanning)</option>
          <option value="planar">Planar (cosmic/otherworldly)</option>
        </select>
      </FormField>

      <FormField label="Special Requests" description="(optional)">
        <textarea
          value={specialRequests}
          onChange={(e) => setSpecialRequests(e.target.value)}
          placeholder="e.g., 'About a missing shipment of weapons' or 'Involving dragons and ancient prophecies' or 'Related to the thieves guild'"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={3}
        />
      </FormField>
    </>
  )

  // Manual entry form content
  const manualFormContent = (
    <>
      <CampaignSelector
        selectedCampaignId={campaignId}
        onSelect={(id) => {
          hasUserSelectedCampaign.current = true
          setCampaignId(id)
        }}
      />

      <FormField label="Rumor Text" description="The actual rumor content" required>
        <textarea
          value={manualData.text}
          onChange={(e) => setManualData({ ...manualData, text: e.target.value })}
          placeholder="e.g., 'I heard the old mill is haunted. Strange lights have been seen there at midnight...'"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={4}
        />
      </FormField>

      <FormField label="Source" description="Who shared this rumor">
        <input
          type="text"
          value={manualData.source}
          onChange={(e) => setManualData({ ...manualData, source: e.target.value })}
          placeholder="e.g., 'Drunk patron at the tavern', 'Town crier'"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </FormField>

      <FormField label="Veracity" description="Is this rumor true, false, or unknown?">
        <select
          value={manualData.veracity}
          onChange={(e) => setManualData({ ...manualData, veracity: e.target.value })}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {veracityOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Adventure Hook" description="What could this rumor lead to?">
        <textarea
          value={manualData.leads_to}
          onChange={(e) => setManualData({ ...manualData, leads_to: e.target.value })}
          placeholder="e.g., 'Investigation of the old mill reveals a secret meeting place for the thieves guild'"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={2}
        />
      </FormField>

      <FormField label="Context" description="Background information or setting">
        <textarea
          value={manualData.context}
          onChange={(e) => setManualData({ ...manualData, context: e.target.value })}
          placeholder="e.g., 'The mill has been abandoned for 10 years since the miller disappeared'"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={2}
        />
      </FormField>

      <FormField label="Foreshadowing">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={manualData.foreshadowing}
            onChange={(e) => setManualData({ ...manualData, foreshadowing: e.target.checked })}
            className="w-5 h-5 rounded border-border bg-background text-primary focus:ring-primary focus:ring-offset-0"
          />
          <span className="text-text">This rumor foreshadows future events</span>
        </label>
      </FormField>

      <ArrayFieldEditor
        label="Tags"
        values={manualData.tags}
        onChange={(tags) => setManualData({ ...manualData, tags })}
        placeholder="Add a tag..."
        description="Keywords to help organize rumors"
      />

      {/* Manual save button */}
      <button
        onClick={handleManualSave}
        disabled={!manualData.text.trim() || manualSaving || manualSaved}
        className="
          w-full py-3 px-6 rounded-lg font-semibold
          bg-primary hover:bg-primary/90
          disabled:bg-primary/50 disabled:cursor-not-allowed
          text-white transition-colors
          flex items-center justify-center gap-2
          shadow-md hover:shadow-lg
        "
      >
        {manualSaving ? (
          <>
            <Icon name="Loader2" className="w-5 h-5 animate-spin" />
            Saving...
          </>
        ) : manualSaved ? (
          <>
            <Icon name="Check" className="w-5 h-5" />
            Saved!
          </>
        ) : (
          <>
            <Icon name="Save" className="w-5 h-5" />
            Save Rumor
          </>
        )}
      </button>

      {manualSaved && (
        <button
          onClick={handleManualReset}
          className="w-full py-2 px-4 text-sm text-text-muted hover:text-text border border-border rounded-lg transition-colors"
        >
          Create Another Rumor
        </button>
      )}
    </>
  )

  // Form content with mode toggle
  const formContent = (
    <>
      <EntryModeToggle mode={entryMode} onChange={setEntryMode} disabled={loading} />
      {entryMode === 'ai' ? aiFormContent : manualFormContent}
    </>
  )

  // Get veracity color
  const getVeracityColor = (veracity: string) => {
    const lower = veracity.toLowerCase()
    if (lower === 'true' || lower === 'accurate' || lower === 'verified') {
      return { text: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30' }
    }
    if (lower === 'false' || lower === 'misleading' || lower === 'lie') {
      return { text: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' }
    }
    if (lower === 'partial' || lower === 'half-truth') {
      return { text: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30' }
    }
    return { text: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30' }
  }

  // Render a single rumor card (shared between AI and manual preview)
  const renderRumorCard = (rumor: RumorData, index: number, isManual: boolean = false) => {
    const veracityColor = getVeracityColor(rumor.veracity)
    return (
      <div key={index} className="bg-background p-4 rounded border border-primary/30">
        <div className="flex items-start gap-3">
          <Icon name="Quote" className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
          <div className="flex-1">
            <p className="text-text italic mb-4 text-lg">"{rumor.text}"</p>

            {/* Source and Veracity - styled cards */}
            <div className="grid md:grid-cols-2 gap-3 mb-3">
              <div className="bg-blue-500/10 p-3 rounded border border-blue-500/30">
                <p className="text-xs text-text-muted mb-1">Source</p>
                <p className="text-blue-400 font-medium">{rumor.source || 'Unknown'}</p>
              </div>
              <div className={`${veracityColor.bg} p-3 rounded border ${veracityColor.border}`}>
                <p className="text-xs text-text-muted mb-1">Veracity</p>
                <p className={`${veracityColor.text} font-medium capitalize`}>{rumor.veracity}</p>
              </div>
            </div>

            {/* Leads To - styled with amber accent */}
            {rumor.leads_to && (
              <div className="bg-amber-500/10 p-3 rounded border border-amber-500/30 mb-3">
                <p className="text-xs text-text-muted mb-1">Adventure Hook</p>
                <p className="text-amber-400">{rumor.leads_to}</p>
              </div>
            )}

            {/* Context - styled with purple accent */}
            {rumor.context && (
              <div className="bg-purple-500/10 p-3 rounded border border-purple-500/30 mb-3">
                <p className="text-xs text-text-muted mb-1">Context</p>
                <p className="text-text">{rumor.context}</p>
              </div>
            )}

            {/* Badges row */}
            <div className="flex flex-wrap gap-2">
              {isManual && (
                <span className="px-2 py-1 bg-primary/20 text-primary border border-primary/30 rounded text-xs font-medium">
                  Manual Entry
                </span>
              )}
              {rumor.foreshadowing && (
                <span className="px-2 py-1 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded text-xs font-medium">
                  Foreshadowing
                </span>
              )}
              {rumor.tags &&
                rumor.tags.length > 0 &&
                rumor.tags.map((tag, tagIdx) => (
                  <span
                    key={tagIdx}
                    className="px-2 py-1 bg-background border border-border rounded text-xs text-text-muted"
                  >
                    {tag}
                  </span>
                ))}
            </div>

            {/* Raw/unexpected fields for this rumor */}
            {rumor._raw && <RawDataViewer data={rumor._raw} />}
          </div>
        </div>
      </div>
    )
  }

  // Manual mode: no preview needed, just show a simple message
  const manualPreviewContent = <ManualEntryPreview entityType="rumor" />

  // AI generated content
  const aiGeneratedContent =
    rumorsResponse && rumorsResponse.rumors.length > 0 ? (
      <div className="space-y-6">
        {/* Parse warning */}
        {rumorsResponse._parseError && <ParseWarning message={rumorsResponse._parseError} />}

        {/* Header - styled like Monster/NPC */}
        <div>
          <h2 className="text-2xl font-bold text-primary mb-2">Generated Rumors</h2>
          <p className="text-text-muted">{rumorsResponse.rumors.length} rumors created</p>
        </div>

        {/* Rumors list - styled with colored cards */}
        <div className="space-y-4">
          {rumorsResponse.rumors.map((rumor, index) => renderRumorCard(rumor, index))}
        </div>

        <ActionsBar
          onCopy={handleCopy}
          onSave={isSaved ? undefined : () => setShowSaveModal(true)}
          showRegenerate={false}
          isSaved={isSaved}
        />
      </div>
    ) : null

  // Choose which content to show based on mode
  const generatedContent = entryMode === 'manual' ? manualPreviewContent : aiGeneratedContent

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
        generatedContent={generatedContent}
        isGenerating={loading}
        onGenerate={handleGenerate}
        generateButtonText="Generate Rumors"
        hideGenerateButton={entryMode === 'manual'}
        error={error}
      />

      {/* Save Modal (AI mode only) */}
      <SaveModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSave}
        entityName={`${rumorsResponse?.rumors.length || 0} rumor${(rumorsResponse?.rumors.length || 0) > 1 ? 's' : ''}`}
        campaignId={campaignId}
      />
    </>
  )
}
