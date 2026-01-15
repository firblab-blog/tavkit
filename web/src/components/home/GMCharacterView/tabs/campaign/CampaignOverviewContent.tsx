/**
 * CampaignOverviewContent - Campaign overview with AI summary and metadata.
 *
 * This component provides:
 * - Campaign metadata display (name, description, theme, tone, etc.)
 * - AI-powered campaign summary generation
 * - Edit campaign button
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import Icon from '../../../../common/Icon'
import { authFetch } from '@/utils/authFetch'
import { useCampaignStore } from '../../../../../store/campaignStore'
import { useAuthStore } from '../../../../../store/authStore'
import { logger } from '@/utils/logger'
import SummaryContentSettings from '../../../../campaign/SummaryContentSettings'

interface SummaryJob {
  job_id: string
  campaign_id: string
  status: 'pending' | 'extracting' | 'synthesizing' | 'completed' | 'failed'
  current_stage?: string
  current_batch: number
  total_batches: number
  progress_percent: number
  error_message?: string
  started_at?: string
  completed_at?: string
}

interface CampaignOverviewContentProps {
  campaignId: string
}

const COMPLETION_COOLDOWN_MS = 5000

const STAGE_LABELS: Record<string, string> = {
  npcs: 'NPCs',
  locations: 'Locations',
  quests: 'Quests',
  monsters: 'Monsters',
  items: 'Items',
  encounters: 'Encounters',
  rumors: 'Rumors',
  dialogues: 'Dialogues',
  taverns: 'Taverns',
  merchants: 'Merchants',
  traps: 'Traps',
  critters: 'Critters',
  chases: 'Chases',
  campaign_content: 'Campaign Content',
  overview: 'Overview',
  setting: 'Setting',
  characters: 'Characters',
  plot: 'Plot',
  tone: 'Tone',
}

export default function CampaignOverviewContent({ campaignId }: CampaignOverviewContentProps) {
  const { campaigns, openEditCampaignModal } = useCampaignStore()
  const { isAuthenticated } = useAuthStore()

  const campaign = campaigns.find((c) => c.id === campaignId)

  // Summary state
  const [campaignContext, setCampaignContext] = useState<any>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [activeJob, setActiveJob] = useState<SummaryJob | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showContentSettings, setShowContentSettings] = useState(false)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastCompletionRef = useRef<number>(0)

  const hasSummary = campaignContext?.summary_available === true

  // Fetch campaign context/summary
  const fetchCampaignContext = useCallback(async () => {
    if (!campaignId || !isAuthenticated) return

    setLoadingSummary(true)
    try {
      const url = `${import.meta.env.VITE_API_URL}/api/v1/campaigns/${campaignId}/context`
      const response = await authFetch(url)

      if (response.ok) {
        const data = await response.json()
        setCampaignContext(data)
      } else {
        logger.error('Failed to fetch campaign context:', response.status)
      }
    } catch (err) {
      logger.error('Failed to fetch campaign context:', err)
    } finally {
      setLoadingSummary(false)
    }
  }, [campaignId, isAuthenticated])

  // Fetch on mount and when campaignId changes
  useEffect(() => {
    fetchCampaignContext()
  }, [fetchCampaignContext])

  // Poll for active job status
  const pollJobStatus = useCallback(
    async (jobId: string) => {
      if (!campaignId) return

      try {
        const response = await authFetch(
          `${import.meta.env.VITE_API_URL}/api/v1/campaigns/${campaignId}/summary/job/${jobId}`
        )
        if (response.ok) {
          const job: SummaryJob = await response.json()
          setActiveJob(job)

          if (job.status === 'completed' || job.status === 'failed') {
            if (pollingRef.current) {
              clearInterval(pollingRef.current)
              pollingRef.current = null
            }
            setIsGenerating(false)
            lastCompletionRef.current = Date.now()

            if (job.status === 'completed') {
              fetchCampaignContext()
            }
          }
        }
      } catch (err) {
        logger.error('Failed to poll job status:', err)
      }
    },
    [campaignId, fetchCampaignContext]
  )

  // Check for active job on mount
  useEffect(() => {
    const checkActiveJob = async () => {
      if (!campaignId) return

      if (Date.now() - lastCompletionRef.current < COMPLETION_COOLDOWN_MS) {
        return
      }

      try {
        const response = await authFetch(
          `${import.meta.env.VITE_API_URL}/api/v1/campaigns/${campaignId}/summary/job`
        )
        if (response.ok) {
          const data = await response.json()
          if (data.active_job) {
            setActiveJob(data.active_job)
            setIsGenerating(true)
            pollingRef.current = setInterval(() => {
              pollJobStatus(data.active_job.job_id)
            }, 2000)
          }
        }
      } catch (err) {
        logger.error('Failed to check active job:', err)
      }
    }

    checkActiveJob()

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [campaignId, pollJobStatus])

  // Start chunked generation
  const startChunkedGeneration = async () => {
    if (!campaignId) return

    setIsGenerating(true)
    try {
      const response = await authFetch(
        `${import.meta.env.VITE_API_URL}/api/v1/campaigns/${campaignId}/summary/generate`,
        { method: 'POST' }
      )

      if (response.ok) {
        const data = await response.json()
        setActiveJob({
          job_id: data.job_id,
          campaign_id: data.campaign_id,
          status: 'pending',
          current_batch: 0,
          total_batches: 0,
          progress_percent: 0,
        })

        pollingRef.current = setInterval(() => {
          pollJobStatus(data.job_id)
        }, 2000)
      } else if (response.status === 409) {
        const activeResponse = await authFetch(
          `${import.meta.env.VITE_API_URL}/api/v1/campaigns/${campaignId}/summary/job`
        )
        if (activeResponse.ok) {
          const data = await activeResponse.json()
          if (data.active_job) {
            setActiveJob(data.active_job)
            pollingRef.current = setInterval(() => {
              pollJobStatus(data.active_job.job_id)
            }, 2000)
          }
        }
      } else {
        setIsGenerating(false)
      }
    } catch (err) {
      logger.error('Failed to start chunked generation:', err)
      setIsGenerating(false)
    }
  }

  const showProgress =
    isGenerating && activeJob && activeJob.status !== 'completed' && activeJob.status !== 'failed'

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <Icon name="AlertCircle" className="w-12 h-12 text-text-muted mx-auto mb-3" />
        <p className="text-text-muted">Campaign not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Campaign Metadata Card */}
      <div className="bg-background-panel border border-border rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-text flex items-center gap-2">
              <Icon name="BookMarked" className="w-5 h-5 text-primary" />
              Campaign Details
            </h3>
            <p className="text-sm text-text-muted mt-1">Basic information about your campaign</p>
          </div>
          <button
            onClick={() => openEditCampaignModal(campaignId)}
            className="px-3 py-1.5 text-sm bg-background hover:bg-primary/10 border border-border hover:border-primary/40 text-text rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Icon name="Pencil" className="w-4 h-4" />
            Edit
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaign.description && (
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
                Description
              </label>
              <p className="mt-1 text-text">{campaign.description}</p>
            </div>
          )}

          {campaign.game_system && (
            <div>
              <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
                Game System
              </label>
              <p className="mt-1 text-text">{campaign.game_system}</p>
            </div>
          )}

          {campaign.theme && (
            <div>
              <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
                Theme
              </label>
              <p className="mt-1 text-text">{campaign.theme}</p>
            </div>
          )}

          {campaign.tone && (
            <div>
              <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
                Tone
              </label>
              <p className="mt-1 text-text">{campaign.tone}</p>
            </div>
          )}

          {campaign.magic_level && (
            <div>
              <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
                Magic Level
              </label>
              <p className="mt-1 text-text">{campaign.magic_level}</p>
            </div>
          )}

          {campaign.tech_level && (
            <div>
              <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
                Tech Level
              </label>
              <p className="mt-1 text-text">{campaign.tech_level}</p>
            </div>
          )}
        </div>

        {campaign.history && (
          <div className="mt-4 pt-4 border-t border-border">
            <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
              World History
            </label>
            <p className="mt-1 text-text whitespace-pre-wrap">{campaign.history}</p>
          </div>
        )}
      </div>

      {/* AI Summary Section */}
      <div className="bg-background-panel border border-border rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Icon name="Sparkles" className="w-6 h-6 text-primary" />
            <div>
              <h3 className="text-lg font-bold text-text">AI Campaign Summary</h3>
              <p className="text-sm text-text-muted mt-1">AI-generated overview of your campaign</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowContentSettings(true)}
              disabled={loadingSummary || isGenerating}
              className="p-2 hover:bg-background rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Configure summary content"
            >
              <Icon name="Settings" className="w-5 h-5 text-text-muted hover:text-primary" />
            </button>

            <button
              onClick={startChunkedGeneration}
              disabled={loadingSummary || isGenerating}
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loadingSummary || isGenerating ? (
                <>
                  <Icon name="Loader2" className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : hasSummary ? (
                <>
                  <Icon name="RefreshCw" className="w-4 h-4" />
                  Regenerate
                </>
              ) : (
                <>
                  <Icon name="Sparkles" className="w-4 h-4" />
                  Generate
                </>
              )}
            </button>
          </div>
        </div>

        {showProgress ? (
          <div className="text-center py-6">
            <Icon name="Loader2" className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
            <p className="text-text font-medium">
              {activeJob.status === 'extracting'
                ? 'Extracting facts...'
                : activeJob.status === 'synthesizing'
                  ? 'Synthesizing summary...'
                  : 'Preparing...'}
            </p>
            {activeJob.current_stage && (
              <p className="text-sm text-text-muted mt-1">
                Processing: {STAGE_LABELS[activeJob.current_stage] || activeJob.current_stage}
              </p>
            )}

            <div className="w-full bg-background rounded-full h-2.5 mt-4 mb-2">
              <div
                className="bg-primary h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${activeJob.progress_percent}%` }}
              />
            </div>
            <p className="text-sm text-text-muted">
              {activeJob.progress_percent}% complete
              {activeJob.total_batches > 0 && (
                <span className="ml-2">
                  ({activeJob.current_batch} / {activeJob.total_batches} batches)
                </span>
              )}
            </p>
          </div>
        ) : activeJob?.status === 'failed' ? (
          <div className="text-center py-6 bg-red-500/10 rounded-lg">
            <Icon name="AlertCircle" className="w-8 h-8 text-red-500 mx-auto mb-3" />
            <p className="text-red-400 font-medium">Summary generation failed</p>
            {activeJob.error_message && (
              <p className="text-sm text-red-400/70 mt-2">{activeJob.error_message}</p>
            )}
            <button
              onClick={() => {
                setActiveJob(null)
                startChunkedGeneration()
              }}
              className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : loadingSummary ? (
          <div className="text-center py-12">
            <Icon name="Loader2" className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
            <p className="text-text-muted">Loading campaign summary...</p>
          </div>
        ) : campaignContext?.summary ? (
          <div className="space-y-4">
            {campaignContext.summary.overview && (
              <div className="border-l-2 border-primary pl-4">
                <h4 className="text-sm font-semibold text-text flex items-center gap-2 mb-2">
                  <Icon name="BookOpen" className="w-4 h-4 text-primary" />
                  Overview
                </h4>
                <div className="prose prose-invert prose-sm max-w-none text-text-muted">
                  <ReactMarkdown>{campaignContext.summary.overview}</ReactMarkdown>
                </div>
              </div>
            )}

            {campaignContext.summary.setting_summary && (
              <div className="border-l-2 border-cyan-400 pl-4">
                <h4 className="text-sm font-semibold text-text flex items-center gap-2 mb-2">
                  <Icon name="Map" className="w-4 h-4 text-cyan-400" />
                  World & Setting
                </h4>
                <div className="prose prose-invert prose-sm max-w-none text-text-muted">
                  <ReactMarkdown>{campaignContext.summary.setting_summary}</ReactMarkdown>
                </div>
              </div>
            )}

            {campaignContext.summary.characters_summary && (
              <div className="border-l-2 border-emerald-400 pl-4">
                <h4 className="text-sm font-semibold text-text flex items-center gap-2 mb-2">
                  <Icon name="Users" className="w-4 h-4 text-emerald-400" />
                  Characters & Factions
                </h4>
                <div className="prose prose-invert prose-sm max-w-none text-text-muted">
                  <ReactMarkdown>{campaignContext.summary.characters_summary}</ReactMarkdown>
                </div>
              </div>
            )}

            {campaignContext.summary.plot_summary && (
              <div className="border-l-2 border-amber-400 pl-4">
                <h4 className="text-sm font-semibold text-text flex items-center gap-2 mb-2">
                  <Icon name="Scroll" className="w-4 h-4 text-amber-400" />
                  Plot & Quests
                </h4>
                <div className="prose prose-invert prose-sm max-w-none text-text-muted">
                  <ReactMarkdown>{campaignContext.summary.plot_summary}</ReactMarkdown>
                </div>
              </div>
            )}

            {campaignContext.summary.recent_events && (
              <div className="border-l-2 border-purple-400 pl-4">
                <h4 className="text-sm font-semibold text-text flex items-center gap-2 mb-2">
                  <Icon name="Calendar" className="w-4 h-4 text-purple-400" />
                  Recent Events
                </h4>
                <div className="prose prose-invert prose-sm max-w-none text-text-muted">
                  <ReactMarkdown>{campaignContext.summary.recent_events}</ReactMarkdown>
                </div>
              </div>
            )}

            {campaignContext.summary.next_steps && (
              <div className="border-l-2 border-rose-400 pl-4">
                <h4 className="text-sm font-semibold text-text flex items-center gap-2 mb-2">
                  <Icon name="Target" className="w-4 h-4 text-rose-400" />
                  Next Steps
                </h4>
                <div className="prose prose-invert prose-sm max-w-none text-text-muted">
                  <ReactMarkdown>{campaignContext.summary.next_steps}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 border border-dashed border-border rounded-lg">
            <Icon name="Sparkles" className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-50" />
            <p className="text-text-muted mb-2">No campaign summary generated yet</p>
            <p className="text-sm text-text-muted">
              Click "Generate" to create an AI-powered summary of your campaign
            </p>
          </div>
        )}
      </div>

      {/* Summary Content Settings Modal */}
      <SummaryContentSettings
        campaignId={campaignId}
        isOpen={showContentSettings}
        onClose={() => setShowContentSettings(false)}
        onSave={() => {}}
      />
    </div>
  )
}
