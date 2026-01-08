import { useState, useEffect } from 'react'
import { useUISettingsStore } from '../../store/uiSettingsStore'
import { useTheme } from '../../contexts/ThemeContext'
import { getThemeList } from '../../config/themes'
import Icon from '../common/Icon'
import { getApiUrl } from '../../config/api'
import AIConfiguration from './AIConfiguration'
import { authFetch } from '@/utils/authFetch'

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

export default function AdminSettings() {
  const [registrationEnabled, setRegistrationEnabled] = useState(false)
  const [defaultCampaignEnabled, setDefaultCampaignEnabled] = useState(true)

  // RAG Knowledge Base state
  const [ragEnabled, setRagEnabled] = useState(true)
  const [settingPacks, setSettingPacks] = useState<SettingPack[]>([])
  const [enabledPacks, setEnabledPacks] = useState<string[]>([])
  const [loadingPacks, setLoadingPacks] = useState(false)
  const [scrapingSlug, setScrapingSlug] = useState<string | null>(null)
  const [activeJobs, setActiveJobs] = useState<Record<string, ScrapeJobProgress>>({})
  const [pollingJobIds, setPollingJobIds] = useState<Record<string, string>>({}) // slug -> job_id
  const [gameSystem, setGameSystem] = useState('Dungeons & Dragons 5th Edition')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingGameSystem, setSavingGameSystem] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [gameSystemSuccess, setGameSystemSuccess] = useState('')
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    backend: 'checking',
    aiService: 'checking',
    database: 'checking',
  })

  // UI Settings
  const {
    iconSet,
    toolbarPosition,
    enabledTools,
    enabledGenerators,
    showCampaignSummary,
    hiddenSections,
    mobileTabBarBehavior,
    setIconSet,
    setToolbarPosition,
    setToolEnabled,
    setGeneratorEnabled,
    setShowCampaignSummary,
    toggleSectionVisibility,
    setMobileTabBarBehavior,
  } = useUISettingsStore()

  // Theme
  const { themeId, mode, setTheme, setMode } = useTheme()
  const themes = getThemeList()

  useEffect(() => {
    fetchSettings()
    fetchUserProfile()
    checkSystemHealth()
    fetchSettingPacks()
  }, [])

  // Poll for active scrape job status
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

            // Stop polling if job completed or failed
            if (jobData.status === 'completed' || jobData.status === 'failed') {
              setPollingJobIds((prev) => {
                const { [slug]: _, ...rest } = prev
                return rest
              })
              // Refresh packs to get final status
              fetchSettingPacks()
            }
          }
        } catch {
          // Silent fail on polling errors
        }
      }
    }

    // Poll every 2 seconds
    const interval = setInterval(pollJobStatus, 2000)
    // Initial poll
    pollJobStatus()

    return () => clearInterval(interval)
  }, [pollingJobIds])

  const fetchUserProfile = async () => {
    try {
      const res = await authFetch('/api/v1/users/me')
      const userData = await res.json()
      if (userData.game_system) {
        setGameSystem(userData.game_system)
      }
    } catch {
      // Use default if fetch fails
    }
  }

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

      // Load UI settings if available
      if (data.ui_settings) {
        if (data.ui_settings.icon_set) setIconSet(data.ui_settings.icon_set)
        if (data.ui_settings.toolbar_position) setToolbarPosition(data.ui_settings.toolbar_position)
        if (data.ui_settings.enabled_tools) {
          Object.entries(data.ui_settings.enabled_tools).forEach(([tool, enabled]) => {
            setToolEnabled(tool as any, enabled as boolean)
          })
        }
        if (data.ui_settings.enabled_generators) {
          Object.entries(data.ui_settings.enabled_generators).forEach(([generator, enabled]) => {
            setGeneratorEnabled(generator as any, enabled as boolean)
          })
        }
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
      // RAG service might not be running
      console.warn('Could not fetch setting packs')
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

        // Start tracking this job
        if (data.job_id) {
          setPollingJobIds((prev) => ({ ...prev, [slug]: data.job_id }))
          setActiveJobs((prev) => ({ ...prev, [slug]: data }))
        }

        // Refresh packs to show updated status
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

  const checkSystemHealth = async () => {
    // Check backend health
    try {
      const response = await fetch(getApiUrl('/health'))
      if (response.ok) {
        setSystemHealth((prev) => ({ ...prev, backend: 'healthy', database: 'healthy' }))
      } else {
        setSystemHealth((prev) => ({ ...prev, backend: 'unhealthy', database: 'unhealthy' }))
      }
    } catch (error) {
      setSystemHealth((prev) => ({ ...prev, backend: 'unhealthy', database: 'unhealthy' }))
    }

    // Check if AI service is accessible by checking if backend can reach it
    // We'll mark it as healthy if backend is healthy (backend proxies to AI service)
    try {
      const response = await fetch(getApiUrl('/health/ready'))
      if (response.ok) {
        setSystemHealth((prev) => ({ ...prev, aiService: 'healthy' }))
      } else {
        setSystemHealth((prev) => ({ ...prev, aiService: 'unhealthy' }))
      }
    } catch (error) {
      setSystemHealth((prev) => ({ ...prev, aiService: 'unhealthy' }))
    }
  }

  const handleSaveGameSystem = async () => {
    setGameSystemSuccess('')
    setError('')
    setSavingGameSystem(true)

    try {
      const res = await authFetch('/api/v1/users/me', {
        method: 'PUT',
        body: JSON.stringify({
          game_system: gameSystem,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save game system')
      }

      setGameSystemSuccess(
        'Game system saved! This will be applied to all artificer toolkit generators.'
      )
      setTimeout(() => setGameSystemSuccess(''), 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save game system')
    } finally {
      setSavingGameSystem(false)
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
          ui_settings: {
            icon_set: iconSet,
            toolbar_position: toolbarPosition,
            enabled_tools: enabledTools,
            enabled_generators: enabledGenerators,
            hidden_sections: hiddenSections,
            mobile_tab_bar_behavior: mobileTabBarBehavior,
          },
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
        <div className="text-text-muted">Loading settings...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text mb-2">Settings</h1>
        <p className="text-text-muted">Manage your preferences and system configuration</p>
      </div>

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
      <section className="bg-background-panel border border-border rounded-lg p-6">
        <div className="flex items-start gap-3 mb-4">
          <Icon name="Wrench" className="w-6 h-6 text-primary mt-0.5" />
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-text">System Status</h2>
            <p className="text-sm text-text-muted mt-1">
              Real-time health status of backend services
            </p>
          </div>
        </div>
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

      {/* Game System */}
      <section className="bg-background-panel border border-border rounded-lg p-6">
        <div className="flex items-start gap-3 mb-4">
          <Icon name="Dices" className="w-6 h-6 text-primary mt-0.5" />
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-text">Game System</h2>
            <p className="text-sm text-text-muted mt-1">
              Set the default RPG system for AI-generated content
            </p>
          </div>
        </div>

        {gameSystemSuccess && (
          <div className="bg-green-500/10 border border-green-500 text-green-500 px-4 py-3 rounded-lg flex items-center gap-2 mb-4">
            <Icon name="Check" className="w-5 h-5 flex-shrink-0" />
            <span>{gameSystemSuccess}</span>
          </div>
        )}

        <div className="space-y-3">
          {[
            'Dungeons & Dragons 5th Edition',
            'Pathfinder 2nd Edition',
            'Call of Cthulhu 7th Edition',
            'Shadowrun 5th Edition',
            'Starfinder',
            'Cyberpunk RED',
            'Vampire: The Masquerade 5th Edition',
            'Savage Worlds',
            'FATE Core',
            'OSR (Old School Renaissance)',
          ].map((system) => (
            <button
              key={system}
              onClick={() => setGameSystem(system)}
              className={`w-full px-4 py-3 rounded-lg border text-sm font-medium transition-all text-left ${
                gameSystem === system
                  ? 'border-primary bg-primary/10 text-primary shadow-sm'
                  : 'border-border bg-background hover:border-primary/40 text-text'
              }`}
            >
              {system}
            </button>
          ))}
        </div>

        <button
          onClick={handleSaveGameSystem}
          disabled={savingGameSystem}
          className="mt-4 px-4 py-2 bg-primary hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
        >
          {savingGameSystem ? 'Saving...' : 'Save Game System'}
        </button>
      </section>

      {/* AI Configuration */}
      <AIConfiguration />

      {/* RAG Knowledge Base Settings */}
      <section className="bg-background-panel border border-border rounded-lg p-6">
        <div className="flex items-start gap-3 mb-6">
          <Icon name="Globe" className="w-6 h-6 text-primary mt-0.5" />
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-text">RAG Knowledge Base</h2>
            <p className="text-sm text-text-muted mt-1">
              Configure wiki-based knowledge for AI-generated content. Scrape D&D setting wikis to
              enhance generators with canonical lore.
            </p>
          </div>
        </div>

        {/* Master Toggle */}
        <div className="flex items-center justify-between py-3 px-4 rounded-lg border border-border bg-background mb-6">
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

        {/* Setting Packs List */}
        {ragEnabled && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text">Available Setting Packs</h3>
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
                      {/* Header row */}
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
                          {/* Start Scrape Button */}
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
                          {/* Enable/Disable Toggle */}
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

                      {/* Progress indicator for active jobs */}
                      {isJobActive && activeJob && (
                        <div className="mt-3 space-y-2">
                          {/* Progress bar */}
                          <div className="relative w-full h-2 bg-background-muted rounded-full overflow-hidden">
                            <div
                              className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-primary rounded-full transition-all duration-500 ease-out"
                              style={{ width: `${activeJob.progress_percent}%` }}
                            />
                          </div>

                          {/* Progress stats */}
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
                                <>
                                  <span className="flex items-center gap-1">
                                    <Icon name="Sparkles" className="w-3 h-3" />
                                    {activeJob.chunks_embedded}/{activeJob.chunks_created} chunks
                                    embedded
                                  </span>
                                </>
                              )}
                            </div>
                            <span className="font-medium text-primary">
                              {activeJob.progress_percent}%
                            </span>
                          </div>

                          {/* Error message if any */}
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

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-6 px-4 py-2 bg-primary hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
        >
          {saving ? 'Saving...' : 'Save RAG Settings'}
        </button>
      </section>

      {/* UI Preferences */}
      <section className="bg-background-panel border border-border rounded-lg p-6">
        <div className="flex items-start gap-3 mb-6">
          <Icon name="Palette" className="w-6 h-6 text-primary mt-0.5" />
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-text">UI Preferences</h2>
            <p className="text-sm text-text-muted mt-1">
              Customize the look and feel of your workspace
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Theme Selector */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-text">Color Theme</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMode('dark')}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-1.5 ${
                    mode === 'dark'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background hover:border-primary/40 text-text'
                  }`}
                >
                  <Icon name="Moon" className="w-3.5 h-3.5" />
                  Dark
                </button>
                <button
                  onClick={() => setMode('light')}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-1.5 ${
                    mode === 'light'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background hover:border-primary/40 text-text'
                  }`}
                >
                  <Icon name="Sun" className="w-3.5 h-3.5" />
                  Light
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-2">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setTheme(theme.id)}
                  className={`relative p-3 rounded-lg border text-left transition-all group ${
                    themeId === theme.id
                      ? 'border-primary bg-primary/10 shadow-sm'
                      : 'border-border bg-background hover:border-primary/40'
                  }`}
                >
                  {/* Theme Name */}
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-sm font-medium ${
                        themeId === theme.id ? 'text-primary' : 'text-text'
                      }`}
                    >
                      {theme.name}
                    </span>
                    {themeId === theme.id && (
                      <Icon name="Check" className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                  </div>

                  {/* Color Swatches */}
                  <div className="grid grid-cols-8 gap-1">
                    {Object.values(theme.palette).map((color, idx) => (
                      <div
                        key={idx}
                        className="aspect-square rounded border border-border/50"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-text-muted mt-3">
              Choose a color palette that suits your style. Each theme supports both light and dark
              modes.
            </p>
          </div>

          {/* Icon Set */}
          <div>
            <label className="text-sm font-semibold text-text mb-3 block">Icon Library</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { value: 'lucide', label: 'Lucide' },
                { value: 'heroicons', label: 'Heroicons' },
                { value: 'react-icons', label: 'Game Icons' },
                { value: 'tabler', label: 'Tabler' },
                { value: 'phosphor', label: 'Phosphor' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setIconSet(value as any)}
                  className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                    iconSet === value
                      ? 'border-primary bg-primary/10 text-primary shadow-sm'
                      : 'border-border bg-background hover:border-primary/40 text-text'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-text-muted mt-2">
              Game Icons provides D&D-themed icons perfect for fantasy RPGs
            </p>
          </div>

          {/* Toolbar Position */}
          <div>
            <label className="text-sm font-semibold text-text mb-3 block">Toolbar Position</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['top', 'left', 'right', 'bottom'] as const).map((position) => (
                <button
                  key={position}
                  onClick={() => setToolbarPosition(position)}
                  className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all capitalize ${
                    toolbarPosition === position
                      ? 'border-primary bg-primary/10 text-primary shadow-sm'
                      : 'border-border bg-background hover:border-primary/40 text-text'
                  }`}
                >
                  {position}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Tab Bar Behavior */}
          <div>
            <label className="text-sm font-semibold text-text mb-3 block">
              Mobile Tab Bar Behavior
            </label>
            <p className="text-xs text-text-muted mb-3">
              Choose how breadcrumb tabs appear on mobile devices (screens smaller than 768px)
            </p>
            <div className="space-y-2">
              <button
                onClick={() => setMobileTabBarBehavior('auto-hide')}
                className={`w-full px-4 py-3 rounded-lg border text-left transition-all ${
                  mobileTabBarBehavior === 'auto-hide'
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'border-border bg-background hover:border-primary/40'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="mobileTabBar"
                    checked={mobileTabBarBehavior === 'auto-hide'}
                    onChange={() => setMobileTabBarBehavior('auto-hide')}
                    className="mt-1 text-primary focus:ring-primary"
                  />
                  <div className="flex-1">
                    <div
                      className={`text-sm font-medium mb-1 ${
                        mobileTabBarBehavior === 'auto-hide' ? 'text-primary' : 'text-text'
                      }`}
                    >
                      Auto-Hide (Smart)
                    </div>
                    <div className="text-xs text-text-muted">
                      Tab bar hides when scrolling down, shows when scrolling up or after pausing
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setMobileTabBarBehavior('always-show')}
                className={`w-full px-4 py-3 rounded-lg border text-left transition-all ${
                  mobileTabBarBehavior === 'always-show'
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'border-border bg-background hover:border-primary/40'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="mobileTabBar"
                    checked={mobileTabBarBehavior === 'always-show'}
                    onChange={() => setMobileTabBarBehavior('always-show')}
                    className="mt-1 text-primary focus:ring-primary"
                  />
                  <div className="flex-1">
                    <div
                      className={`text-sm font-medium mb-1 ${
                        mobileTabBarBehavior === 'always-show' ? 'text-primary' : 'text-text'
                      }`}
                    >
                      Always Show
                    </div>
                    <div className="text-xs text-text-muted">
                      Tab bar stays fixed at the bottom of the screen
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setMobileTabBarBehavior('hidden')}
                className={`w-full px-4 py-3 rounded-lg border text-left transition-all ${
                  mobileTabBarBehavior === 'hidden'
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'border-border bg-background hover:border-primary/40'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="mobileTabBar"
                    checked={mobileTabBarBehavior === 'hidden'}
                    onChange={() => setMobileTabBarBehavior('hidden')}
                    className="mt-1 text-primary focus:ring-primary"
                  />
                  <div className="flex-1">
                    <div
                      className={`text-sm font-medium mb-1 ${
                        mobileTabBarBehavior === 'hidden' ? 'text-primary' : 'text-text'
                      }`}
                    >
                      Hidden
                    </div>
                    <div className="text-xs text-text-muted">
                      No tab bar on mobile - use drawer menu for navigation
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Campaign Summary Toggle */}
          <div className="pt-4 border-t border-border">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={showCampaignSummary}
                onChange={(e) => setShowCampaignSummary(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-border bg-background text-primary focus:ring-primary focus:ring-offset-0"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-text group-hover:text-primary transition-colors">
                  Show AI Campaign Summaries
                </span>
                <p className="text-xs text-text-muted mt-1">
                  Display AI-generated summaries with key NPCs, locations, and plot points
                </p>
              </div>
            </label>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-6 px-4 py-2 bg-primary hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
        >
          {saving ? 'Saving...' : 'Save UI Preferences'}
        </button>
      </section>

      {/* External Tools */}
      <section className="bg-background-panel border border-border rounded-lg p-6">
        <div className="flex items-start gap-3 mb-6">
          <Icon name="Wrench" className="w-6 h-6 text-primary mt-0.5" />
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-text">External Tools</h2>
            <p className="text-sm text-text-muted mt-1">
              Enable or disable third-party tool integrations
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {[
            {
              key: 'dnd5etools',
              name: 'D&D 5E Tools',
              description: 'Official D&D 5th Edition reference',
              beta: false,
            },
            {
              key: 'dndbeyond',
              name: 'D&D Beyond',
              description: 'Wizards of the Coast digital toolset',
              beta: true,
            },
            {
              key: 'roll20',
              name: 'Roll20',
              description: 'Virtual tabletop with dice rolling',
              beta: true,
            },
            {
              key: 'foundryvtt',
              name: 'Foundry VTT',
              description: 'Self-hosted virtual tabletop',
              beta: true,
            },
            {
              key: 'koboldplus',
              name: 'Kobold Plus Club',
              description: 'Encounter builder and CR calculator',
              beta: false,
            },
            {
              key: 'tabletopaudio',
              name: 'Tabletop Audio',
              description: 'Ambient sounds and music for sessions',
              beta: true,
            },
            {
              key: 'fantasynamegen',
              name: 'Fantasy Name Generators',
              description: 'Random name generators for characters and places',
              beta: false,
            },
            {
              key: 'dungeonscrawl',
              name: 'Dungeon Scrawl',
              description: 'Free dungeon map maker',
              beta: false,
            },
            {
              key: 'thievesguild',
              name: 'Thieves Guild',
              description: 'Random generators for NPCs, treasures, and more',
              beta: false,
            },
          ].map((tool) => (
            <div
              key={tool.key}
              className="flex items-center justify-between py-3 px-4 rounded-lg border border-border bg-background hover:border-primary/40 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text">{tool.name}</span>
                  {tool.beta && (
                    <span className="px-1.5 py-0.5 text-xs rounded bg-blue-500/20 text-blue-400">
                      Beta
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted mt-1">{tool.description}</p>
              </div>
              <button
                onClick={() =>
                  setToolEnabled(
                    tool.key as any,
                    !enabledTools[tool.key as keyof typeof enabledTools]
                  )
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                  enabledTools[tool.key as keyof typeof enabledTools]
                    ? 'bg-primary'
                    : 'bg-background-muted'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    enabledTools[tool.key as keyof typeof enabledTools]
                      ? 'translate-x-6'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-6 px-4 py-2 bg-primary hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
        >
          {saving ? 'Saving...' : 'Save Tool Settings'}
        </button>
      </section>

      {/* AI Generators */}
      <section className="bg-background-panel border border-border rounded-lg p-6">
        <div className="flex items-start gap-3 mb-6">
          <Icon name="Sparkles" className="w-6 h-6 text-primary mt-0.5" />
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-text">AI Generators</h2>
            <p className="text-sm text-text-muted mt-1">
              Enable or disable individual AI content generators
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {[
            {
              key: 'npc',
              name: 'NPC Generator',
              description: 'Create detailed non-player characters',
              beta: false,
            },
            {
              key: 'monster',
              name: 'Monster Generator',
              description: 'Generate custom monsters and creatures',
              beta: false,
            },
            {
              key: 'location',
              name: 'Location Generator',
              description: 'Create places, dungeons, and environments',
              beta: false,
            },
            {
              key: 'item',
              name: 'Item Generator',
              description: 'Generate magical items and treasure',
              beta: false,
            },
            {
              key: 'encounter',
              name: 'Encounter Builder',
              description: 'Build balanced combat encounters',
              beta: false,
            },
            {
              key: 'rumor',
              name: 'Rumor Generator',
              description: 'Generate tavern rumors and plot hooks',
              beta: false,
            },
            {
              key: 'tavern',
              name: 'Tavern Generator',
              description: 'Create inns, taverns, and gathering places',
              beta: false,
            },
            {
              key: 'merchant',
              name: 'Merchant Generator',
              description: 'Generate shops and merchants',
              beta: false,
            },
            {
              key: 'trap',
              name: 'Trap Generator',
              description: 'Create traps, puzzles, and hazards',
              beta: false,
            },
            {
              key: 'critter',
              name: 'Critter Generator',
              description: 'Generate creatures and companions',
              beta: false,
            },
            {
              key: 'quest',
              name: 'Quest Generator',
              description: 'Generate quest hooks and objectives',
              beta: false,
            },
            {
              key: 'dialogue',
              name: 'Dialogue Builder',
              description: 'Create NPC conversations and dialogue trees',
              beta: false,
            },
            {
              key: 'chase',
              name: 'Chase Generator',
              description: 'Generate chase and pursuit scenes',
              beta: false,
            },
          ].map((generator) => (
            <div
              key={generator.key}
              className="flex items-center justify-between py-3 px-4 rounded-lg border border-border bg-background hover:border-primary/40 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text">{generator.name}</span>
                  {generator.beta && (
                    <span className="px-1.5 py-0.5 text-xs rounded bg-amber-500/20 text-amber-400">
                      Beta
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted mt-1">{generator.description}</p>
              </div>
              <button
                onClick={() =>
                  setGeneratorEnabled(
                    generator.key as any,
                    !enabledGenerators[generator.key as keyof typeof enabledGenerators]
                  )
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                  enabledGenerators[generator.key as keyof typeof enabledGenerators]
                    ? 'bg-primary'
                    : 'bg-background-muted'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    enabledGenerators[generator.key as keyof typeof enabledGenerators]
                      ? 'translate-x-6'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-6 px-4 py-2 bg-primary hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
        >
          {saving ? 'Saving...' : 'Save Generator Settings'}
        </button>
      </section>

      {/* Hidden Campaign Sections */}
      <section className="bg-background-panel border border-border rounded-lg p-6">
        <div className="flex items-start gap-3 mb-4">
          <Icon name="EyeOff" className="w-6 h-6 text-primary mt-0.5" />
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-text">Visible Campaign Sections</h2>
            <p className="text-sm text-text-muted mt-1">
              Hide unused sections to reduce sidebar clutter. Sections with existing content will
              still be accessible.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { id: 'summary', name: 'Campaign Summary', icon: 'Sparkles' },
            { id: 'overview', name: 'Campaign Overview', icon: 'BookMarked' },
            { id: 'sessions', name: 'Sessions', icon: 'Calendar' },
            { id: 'locations', name: 'Locations', icon: 'Map' },
            { id: 'npcs', name: 'NPCs', icon: 'Users' },
            { id: 'pcs', name: 'Player Characters', icon: 'User' },
            { id: 'factions', name: 'Factions', icon: 'Shield' },
            { id: 'quests', name: 'Quests', icon: 'Scroll' },
            { id: 'items', name: 'Items', icon: 'Package' },
            { id: 'monsters', name: 'Monsters', icon: 'Skull' },
            { id: 'encounters', name: 'Encounters', icon: 'Swords' },
            { id: 'rumors', name: 'Rumors', icon: 'MessageSquare' },
            { id: 'dialogues', name: 'Dialogues', icon: 'MessageCircle' },
            { id: 'taverns', name: 'Taverns', icon: 'Beer' },
            { id: 'merchants', name: 'Merchants', icon: 'Store' },
            { id: 'traps', name: 'Traps', icon: 'AlertCircle' },
            { id: 'critters', name: 'Critters', icon: 'Shield' },
            { id: 'chases', name: 'Chases', icon: 'Sparkles' },
            { id: 'lore', name: 'Lore', icon: 'BookOpen' },
            { id: 'maps', name: 'Maps', icon: 'MapPin' },
            { id: 'handouts', name: 'Handouts', icon: 'FileText' },
            { id: 'props', name: 'Props', icon: 'Box' },
            { id: 'art', name: 'Art', icon: 'Image' },
            { id: 'statblocks', name: 'Stat Blocks', icon: 'Swords' },
            { id: 'soundscapes', name: 'Soundscapes', icon: 'Music' },
            { id: 'gm-notes', name: 'GM Notes', icon: 'FileEdit' },
            { id: 'tracking', name: 'Tracking', icon: 'ListChecks' },
          ].map((section) => {
            const isVisible = !hiddenSections.includes(section.id)
            return (
              <button
                key={section.id}
                onClick={() => toggleSectionVisibility(section.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                  isVisible
                    ? 'border-primary bg-primary/10 text-text hover:bg-primary/20'
                    : 'border-border bg-background text-text-muted hover:bg-background-muted'
                }`}
              >
                <Icon
                  name={isVisible ? 'Eye' : 'EyeOff'}
                  className={`w-4 h-4 flex-shrink-0 ${isVisible ? 'text-primary' : 'text-text-muted'}`}
                />
                <span className="text-sm font-medium truncate">{section.name}</span>
              </button>
            )
          })}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-6 px-4 py-2 bg-primary hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
        >
          {saving ? 'Saving...' : 'Save Section Visibility'}
        </button>
      </section>

      {/* System Settings */}
      <section className="bg-background-panel border border-border rounded-lg p-6">
        <div className="flex items-start gap-3 mb-6">
          <Icon name="Settings" className="w-6 h-6 text-primary mt-0.5" />
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-text">System Settings</h2>
            <p className="text-sm text-text-muted mt-1">
              Configure server and user management options
            </p>
          </div>
        </div>

        <div className="space-y-6">
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
                Include the demo campaign "Crossroads Chronicle" for new users. This campaign
                showcases TavKit's features with pre-built NPCs, locations, quests, and items.
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

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-6 px-4 py-2 bg-primary hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
        >
          {saving ? 'Saving...' : 'Save System Settings'}
        </button>
      </section>
    </div>
  )
}
