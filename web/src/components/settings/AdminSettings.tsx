import { useState, useEffect } from 'react'
import Icon from '../common/Icon'
import { getApiUrl } from '../../config/api'
import { authFetch } from '@/utils/authFetch'
import { logger } from '../../utils/logger'

interface SystemHealth {
  backend: 'healthy' | 'unhealthy' | 'checking'
  aiService: 'healthy' | 'unhealthy' | 'checking'
  database: 'healthy' | 'unhealthy' | 'checking'
}

interface SettingPack {
  id: string
  name: string
  slug: string
  game_system: string
  description: string | null
  scrape_status: 'pending' | 'in_progress' | 'completed' | 'failed'
  total_pages: number
  total_chunks: number
  is_active: boolean
}

interface ScrapeJobProgress {
  job_id: string
  setting_pack_id: string
  status: 'pending' | 'scraping' | 'embedding' | 'completed' | 'failed'
  current_phase: string | null
  pages_found: number
  pages_scraped: number
  pages_failed: number
  chunks_created: number
  chunks_embedded: number
  progress_percent: number
  error_message: string | null
}

interface ActiveScrapeJob extends ScrapeJobProgress {
  setting_slug: string
  setting_name: string
}

export default function AdminSettings() {
  const [registrationEnabled, setRegistrationEnabled] = useState(false)
  const [defaultCampaignEnabled, setDefaultCampaignEnabled] = useState(true)
  const [ragEnabled, setRagEnabled] = useState(true)
  const [settingPacks, setSettingPacks] = useState<SettingPack[]>([])
  const [enabledPacks, setEnabledPacks] = useState<string[]>([])
  const [loadingPacks, setLoadingPacks] = useState(false)
  const [scrapingSlug, setScrapingSlug] = useState<string | null>(null)
  const [activeJobs, setActiveJobs] = useState<Record<string, ScrapeJobProgress>>({})
  const [pollingJobIds, setPollingJobIds] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    backend: 'checking',
    aiService: 'checking',
    database: 'checking',
  })

  useEffect(() => {
    fetchSettings()
    checkSystemHealth()
    fetchSettingPacks()
  }, [])

  useEffect(() => {
    const recoverActiveJobs = async () => {
      try {
        const response = await authFetch('/api/v1/admin/rag/scrape/jobs/active')
        if (response.ok) {
          const activeJobsList: ActiveScrapeJob[] = await response.json()
          if (activeJobsList.length > 0) {
            const newPollingJobIds: Record<string, string> = {}
            const newActiveJobsMap: Record<string, ScrapeJobProgress> = {}

            for (const job of activeJobsList) {
              newPollingJobIds[job.setting_slug] = job.job_id
              newActiveJobsMap[job.setting_slug] = job
            }

            setPollingJobIds((prev) => ({ ...prev, ...newPollingJobIds }))
            setActiveJobs((prev) => ({ ...prev, ...newActiveJobsMap }))
          }
        }
      } catch (err) {
        logger.error('Failed to recover active scrape jobs:', err)
      }
    }

    recoverActiveJobs()
  }, [])

  useEffect(() => {
    const jobSlugEntries = Object.entries(pollingJobIds)
    if (jobSlugEntries.length === 0) return

    const pollJobStatus = async () => {
      for (const [slug, jobId] of jobSlugEntries) {
        try {
          const res = await authFetch(`/api/v1/admin/rag/scrape/job/${jobId}`)
          if (res.ok) {
            const jobData: ScrapeJobProgress = await res.json()
            setActiveJobs((prev) => ({ ...prev, [slug]: jobData }))

            if (jobData.status === 'completed' || jobData.status === 'failed') {
              setPollingJobIds((prev) => {
                const { [slug]: _, ...rest } = prev
                return rest
              })
              fetchSettingPacks()
            }
          }
        } catch {
          // Silent fail on polling errors
        }
      }
    }

    const interval = setInterval(pollJobStatus, 2000)
    pollJobStatus()

    return () => clearInterval(interval)
  }, [pollingJobIds])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/v1/settings')
      const data = await res.json()
      setRegistrationEnabled(data.registration_enabled)
      setDefaultCampaignEnabled(data.default_campaign_enabled ?? true)
      setRagEnabled(data.rag_knowledge_base_enabled ?? true)
      if (data.enabled_setting_packs) {
        setEnabledPacks(data.enabled_setting_packs)
      }
    } catch {
      setError('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const fetchSettingPacks = async () => {
    setLoadingPacks(true)
    try {
      const res = await authFetch('/api/v1/admin/rag/packs')
      if (res.ok) {
        const packs = await res.json()
        setSettingPacks(packs)
      }
    } catch {
      logger.warn('Could not fetch setting packs')
    } finally {
      setLoadingPacks(false)
    }
  }

  const handleStartScrape = async (slug: string) => {
    setScrapingSlug(slug)
    try {
      const res = await authFetch(`/api/v1/admin/rag/scrape/${slug}`, {
        method: 'POST',
      })
      if (res.ok) {
        const data = await res.json()
        setSuccess(`Started indexing ${slug}. This may take several minutes.`)
        setTimeout(() => setSuccess(''), 5000)

        if (data.job_id) {
          setPollingJobIds((prev) => ({ ...prev, [slug]: data.job_id }))
          setActiveJobs((prev) => ({ ...prev, [slug]: data }))
        }

        setTimeout(fetchSettingPacks, 2000)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to start scrape')
      }
    } catch {
      setError('Failed to start wiki scrape')
    } finally {
      setScrapingSlug(null)
    }
  }

  const togglePackEnabled = (slug: string) => {
    setEnabledPacks((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    )
  }

  const handleCancelJob = async (slug: string, jobId: string) => {
    if (!confirm('Cancel this indexing job? You can restart it later.')) return

    try {
      const res = await authFetch(`/api/v1/admin/rag/scrape/job/${jobId}/cancel`, {
        method: 'POST',
      })
      if (res.ok) {
        setSuccess('Job cancelled successfully')
        setTimeout(() => setSuccess(''), 3000)

        setPollingJobIds((prev) => {
          const updated = { ...prev }
          delete updated[slug]
          return updated
        })
        setActiveJobs((prev) => {
          const updated = { ...prev }
          delete updated[slug]
          return updated
        })

        fetchSettingPacks()
      } else {
        const data = await res.json()
        setError(data.error || data.detail || 'Failed to cancel job')
      }
    } catch {
      setError('Failed to cancel job')
    }
  }

  const checkSystemHealth = async () => {
    try {
      const response = await fetch(getApiUrl('/health'))
      if (response.ok) {
        setSystemHealth((prev) => ({ ...prev, backend: 'healthy', database: 'healthy' }))
      } else {
        setSystemHealth((prev) => ({ ...prev, backend: 'unhealthy', database: 'unhealthy' }))
      }
    } catch {
      setSystemHealth((prev) => ({ ...prev, backend: 'unhealthy', database: 'unhealthy' }))
    }

    try {
      const response = await fetch(getApiUrl('/health/ready'))
      if (response.ok) {
        setSystemHealth((prev) => ({ ...prev, aiService: 'healthy' }))
      } else {
        setSystemHealth((prev) => ({ ...prev, aiService: 'unhealthy' }))
      }
    } catch {
      setSystemHealth((prev) => ({ ...prev, aiService: 'unhealthy' }))
    }
  }

  const handleSave = async () => {
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      const res = await authFetch('/api/v1/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({
          registration_enabled: registrationEnabled,
          default_campaign_enabled: defaultCampaignEnabled,
          rag_knowledge_base_enabled: ragEnabled,
          enabled_setting_packs: enabledPacks,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save settings')
      }

      setSuccess('Settings saved successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const getHealthColor = (status: SystemHealth[keyof SystemHealth]) => {
    switch (status) {
      case 'healthy':
        return 'text-green-400'
      case 'unhealthy':
        return 'text-red-400'
      default:
        return 'text-yellow-400'
    }
  }

  const getHealthIcon = (status: SystemHealth[keyof SystemHealth]) => {
    switch (status) {
      case 'healthy':
        return 'Check'
      case 'unhealthy':
        return 'X'
      default:
        return 'AlertCircle'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-text-muted">Loading admin settings...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Global Alerts */}
      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg flex items-center gap-2">
          <Icon name="AlertCircle" className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500 text-green-500 px-4 py-3 rounded-lg flex items-center gap-2">
          <Icon name="Check" className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* System Status */}
      <section>
        <h3 className="text-lg font-semibold text-text mb-2">System Status</h3>
        <p className="text-sm text-text-muted mb-4">Real-time health status of backend services</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
            <span className="text-text font-medium">Backend API</span>
            <div className="flex items-center gap-2">
              <Icon
                name={getHealthIcon(systemHealth.backend)}
                className={`w-5 h-5 ${getHealthColor(systemHealth.backend)}`}
              />
              <span className={`text-sm ${getHealthColor(systemHealth.backend)}`}>
                {systemHealth.backend}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
            <span className="text-text font-medium">AI Service</span>
            <div className="flex items-center gap-2">
              <Icon
                name={getHealthIcon(systemHealth.aiService)}
                className={`w-5 h-5 ${getHealthColor(systemHealth.aiService)}`}
              />
              <span className={`text-sm ${getHealthColor(systemHealth.aiService)}`}>
                {systemHealth.aiService}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
            <span className="text-text font-medium">Database</span>
            <div className="flex items-center gap-2">
              <Icon
                name={getHealthIcon(systemHealth.database)}
                className={`w-5 h-5 ${getHealthColor(systemHealth.database)}`}
              />
              <span className={`text-sm ${getHealthColor(systemHealth.database)}`}>
                {systemHealth.database}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* RAG Knowledge Base */}
      <section>
        <h3 className="text-lg font-semibold text-text mb-2">RAG Knowledge Base</h3>
        <p className="text-sm text-text-muted mb-4">
          Configure wiki-based knowledge for AI-generated content. Scrape D&D setting wikis to
          enhance generators with canonical lore.
        </p>

        {/* Master Toggle */}
        <div className="flex items-center justify-between py-3 px-4 rounded-lg border border-border bg-background mb-4">
          <div className="flex-1">
            <span className="text-sm font-medium text-text">Enable RAG Knowledge Base</span>
            <p className="text-xs text-text-muted mt-1">
              Allow AI generators to use wiki knowledge for setting-aware content
            </p>
          </div>
          <button
            onClick={() => setRagEnabled(!ragEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
              ragEnabled ? 'bg-primary' : 'bg-background-muted'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                ragEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Setting Packs */}
        {ragEnabled && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-text">Available Setting Packs</h4>
            {loadingPacks ? (
              <div className="text-sm text-text-muted py-4 text-center">
                Loading setting packs...
              </div>
            ) : settingPacks.length === 0 ? (
              <div className="text-sm text-text-muted py-4 text-center border border-border rounded-lg bg-background">
                No setting packs available. The AI service may not be running.
              </div>
            ) : (
              <div className="space-y-3">
                {settingPacks.map((pack) => {
                  const activeJob = activeJobs[pack.slug]
                  const isJobActive =
                    activeJob &&
                    (activeJob.status === 'scraping' ||
                      activeJob.status === 'embedding' ||
                      activeJob.status === 'pending')

                  return (
                    <div
                      key={pack.slug}
                      className="py-3 px-4 rounded-lg border border-border bg-background"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-text">{pack.name}</span>
                            <span className="px-1.5 py-0.5 text-xs rounded bg-primary/20 text-primary">
                              {pack.game_system}
                            </span>
                            {pack.scrape_status === 'completed' && !isJobActive && (
                              <span className="px-1.5 py-0.5 text-xs rounded bg-green-500/20 text-green-400">
                                {pack.total_chunks} facts indexed
                              </span>
                            )}
                            {(pack.scrape_status === 'in_progress' || isJobActive) && (
                              <span className="px-1.5 py-0.5 text-xs rounded bg-blue-500/20 text-blue-400 flex items-center gap-1">
                                <Icon name="Loader2" className="w-3 h-3 animate-spin" />
                                {activeJob?.current_phase || 'Indexing...'}
                              </span>
                            )}
                            {pack.scrape_status === 'pending' && !isJobActive && (
                              <span className="px-1.5 py-0.5 text-xs rounded bg-yellow-500/20 text-yellow-400">
                                Not indexed
                              </span>
                            )}
                            {pack.scrape_status === 'failed' && !isJobActive && (
                              <span className="px-1.5 py-0.5 text-xs rounded bg-red-500/20 text-red-400">
                                Failed
                              </span>
                            )}
                          </div>
                          {pack.description && !isJobActive && (
                            <p className="text-xs text-text-muted mt-1 truncate">
                              {pack.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                          {(pack.scrape_status === 'pending' || pack.scrape_status === 'failed') &&
                            !isJobActive && (
                              <button
                                onClick={() => handleStartScrape(pack.slug)}
                                disabled={scrapingSlug === pack.slug}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-primary text-primary hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                {scrapingSlug === pack.slug ? 'Starting...' : 'Index Wiki'}
                              </button>
                            )}
                          <button
                            onClick={() => togglePackEnabled(pack.slug)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                              enabledPacks.includes(pack.slug)
                                ? 'bg-primary'
                                : 'bg-background-muted'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                enabledPacks.includes(pack.slug) ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {isJobActive && activeJob && (
                        <div className="mt-3 space-y-2">
                          <div className="relative w-full h-2 bg-background-muted rounded-full overflow-hidden">
                            <div
                              className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-primary rounded-full transition-all duration-500 ease-out"
                              style={{ width: `${activeJob.progress_percent}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs text-text-muted">
                            <div className="flex items-center gap-4">
                              {activeJob.status === 'scraping' && (
                                <>
                                  <span className="flex items-center gap-1">
                                    <Icon name="Globe" className="w-3 h-3" />
                                    {activeJob.pages_scraped}/{activeJob.pages_found} pages
                                  </span>
                                  {activeJob.pages_failed > 0 && (
                                    <span className="text-red-400">
                                      {activeJob.pages_failed} failed
                                    </span>
                                  )}
                                </>
                              )}
                              {activeJob.status === 'embedding' && (
                                <span className="flex items-center gap-1">
                                  <Icon name="Sparkles" className="w-3 h-3" />
                                  {activeJob.chunks_embedded}/{activeJob.chunks_created} chunks
                                  embedded
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-primary">
                                {activeJob.progress_percent}%
                              </span>
                              <button
                                onClick={() => handleCancelJob(pack.slug, activeJob.job_id)}
                                className="px-2 py-0.5 text-xs font-medium rounded border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                          {activeJob.error_message && (
                            <div className="text-xs text-red-400 mt-1">
                              Error: {activeJob.error_message}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            <p className="text-xs text-text-muted">
              Indexing a wiki scrapes its pages and creates vector embeddings for RAG queries. This
              process can take 10-30 minutes per setting.
            </p>
          </div>
        )}
      </section>

      {/* System Settings */}
      <section>
        <h3 className="text-lg font-semibold text-text mb-2">System Settings</h3>
        <p className="text-sm text-text-muted mb-4">Configure server and user management options</p>

        <div className="space-y-4">
          {/* Registration Toggle */}
          <div className="flex items-center justify-between py-3 px-4 rounded-lg border border-border bg-background">
            <div className="flex-1">
              <span className="text-sm font-medium text-text">User Registration</span>
              <p className="text-xs text-text-muted mt-1">Allow new users to create accounts</p>
            </div>
            <button
              onClick={() => setRegistrationEnabled(!registrationEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                registrationEnabled ? 'bg-primary' : 'bg-background-muted'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  registrationEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Default Campaign Toggle */}
          <div className="flex items-center justify-between py-3 px-4 rounded-lg border border-border bg-background">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text">Default Campaign</span>
                <span className="px-1.5 py-0.5 text-xs rounded bg-primary/20 text-primary">
                  Crossroads Chronicle
                </span>
              </div>
              <p className="text-xs text-text-muted mt-1">
                Include the demo campaign "Crossroads Chronicle" for new users.
              </p>
            </div>
            <button
              onClick={() => setDefaultCampaignEnabled(!defaultCampaignEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                defaultCampaignEnabled ? 'bg-primary' : 'bg-background-muted'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  defaultCampaignEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="px-4 py-2 bg-primary hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
      >
        {saving ? 'Saving...' : 'Save Admin Settings'}
      </button>
    </div>
  )
}
