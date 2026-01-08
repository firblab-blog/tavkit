import { useState, useEffect } from 'react'
import { useAI } from '../../contexts/AIContext'
import Icon from '../common/Icon'

export default function AIProviderSettings() {
  const {
    enabled,
    currentProvider,
    availableProviders,
    loading,
    error: contextError,
    switchProvider,
  } = useAI()

  const [selectedProvider, setSelectedProvider] = useState(currentProvider || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (currentProvider) {
      setSelectedProvider(currentProvider)
    }
  }, [currentProvider])

  if (loading) {
    return (
      <section className="bg-background-panel border border-border rounded-lg p-6">
        <div className="flex items-center justify-center p-8">
          <div className="text-text-muted">Loading AI configuration...</div>
        </div>
      </section>
    )
  }

  if (!enabled) {
    return (
      <section className="bg-background-panel border border-border rounded-lg p-6">
        <div className="flex items-start gap-3 mb-6">
          <Icon name="Sparkles" className="w-6 h-6 text-primary mt-0.5" />
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-text">AI Provider Configuration</h2>
            <p className="text-sm text-text-muted mt-1">
              Configure AI providers for content generation
            </p>
          </div>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500 text-yellow-500 px-4 py-3 rounded-lg flex items-center gap-2">
          <Icon name="AlertCircle" className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1">
            <div className="font-medium">AI Features Disabled</div>
            <p className="text-sm mt-1">
              AI features are disabled in this TavKit deployment. To enable AI, set{' '}
              <code className="px-1.5 py-0.5 bg-background rounded text-xs">ENABLE_AI=true</code> in
              your environment configuration and redeploy.
            </p>
          </div>
        </div>
      </section>
    )
  }

  const handleSwitchProvider = async () => {
    if (!selectedProvider) {
      setError('Please select a provider')
      return
    }

    if (selectedProvider === currentProvider) {
      setError('This provider is already active')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      await switchProvider(selectedProvider)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch provider')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="bg-background-panel border border-border rounded-lg p-6">
      <div className="flex items-start gap-3 mb-6">
        <Icon name="Sparkles" className="w-6 h-6 text-primary mt-0.5" />
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-text">AI Provider Configuration</h2>
          <p className="text-sm text-text-muted mt-1">Switch between configured AI providers</p>
        </div>
      </div>

      {/* Alerts */}
      {contextError && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg flex items-center gap-2 mb-4">
          <Icon name="AlertCircle" className="w-5 h-5 flex-shrink-0" />
          <span>{contextError}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg flex items-center gap-2 mb-4">
          <Icon name="AlertCircle" className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500 text-green-500 px-4 py-3 rounded-lg flex items-center gap-2 mb-4">
          <Icon name="Check" className="w-5 h-5 flex-shrink-0" />
          <span>Successfully switched to {selectedProvider}!</span>
        </div>
      )}

      <div className="space-y-6">
        {/* Current Provider Status */}
        <div>
          <label className="text-sm font-semibold text-text mb-3 block">Current Provider</label>
          <div className="p-4 rounded-lg border border-primary bg-primary/10">
            <div className="flex items-center gap-3">
              <Icon name="Check" className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text">
                    {availableProviders.find((p) => p.type === currentProvider)?.name ||
                      currentProvider}
                  </span>
                  <span className="px-2 py-0.5 text-xs rounded bg-primary text-white">Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Available Providers */}
        <div>
          <label className="text-sm font-semibold text-text mb-3 block">
            Available Providers ({availableProviders.length})
          </label>
          <div className="space-y-2">
            {availableProviders.map((provider) => (
              <button
                key={provider.type}
                onClick={() => setSelectedProvider(provider.type)}
                disabled={!provider.available}
                className={`w-full flex items-center justify-between p-4 rounded-lg border transition-all text-left ${
                  selectedProvider === provider.type
                    ? 'border-primary bg-primary/10'
                    : provider.available
                      ? 'border-border bg-background hover:border-primary/40'
                      : 'border-border bg-background-muted opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  {provider.available ? (
                    <Icon name="Check" className="w-5 h-5 text-green-400" />
                  ) : (
                    <Icon name="X" className="w-5 h-5 text-red-400" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text">{provider.name}</span>
                      {provider.type === currentProvider && (
                        <span className="px-2 py-0.5 text-xs rounded bg-green-500/20 text-green-400">
                          Current
                        </span>
                      )}
                      {!provider.available && (
                        <span className="px-2 py-0.5 text-xs rounded bg-red-500/20 text-red-400">
                          Unavailable
                        </span>
                      )}
                    </div>
                    {provider.error && (
                      <p className="text-xs text-red-400 mt-1">{provider.error}</p>
                    )}
                  </div>
                  {selectedProvider === provider.type && provider.type !== currentProvider && (
                    <Icon name="ArrowRight" className="w-5 h-5 text-primary" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Provider Info */}
        <div className="pt-4 border-t border-border">
          <h3 className="text-sm font-semibold text-text mb-3">About AI Providers</h3>
          <div className="space-y-3">
            <div className="p-3 bg-background rounded-lg border border-border">
              <div className="font-medium text-text text-sm">Ollama (Local)</div>
              <p className="text-xs text-text-muted mt-1">
                Self-hosted AI running on your own hardware. No external API calls, complete
                privacy. Configured via OLLAMA_BASE_URL and OLLAMA_MODEL environment variables.
              </p>
            </div>
            <div className="p-3 bg-background rounded-lg border border-border">
              <div className="font-medium text-text text-sm">Anthropic (Claude)</div>
              <p className="text-xs text-text-muted mt-1">
                High-quality AI from Anthropic's Claude models. Pay-per-use pricing. Requires
                ANTHROPIC_API_KEY and ANTHROPIC_MODEL environment variables.
              </p>
            </div>
            <div className="p-3 bg-background rounded-lg border border-border">
              <div className="font-medium text-text text-sm">OpenAI (GPT)</div>
              <p className="text-xs text-text-muted mt-1">
                Industry-leading AI from OpenAI's GPT models. Pay-per-use pricing. Requires
                OPENAI_API_KEY and OPENAI_MODEL environment variables.
              </p>
            </div>
          </div>
          <p className="text-xs text-text-muted mt-3">
            <Icon name="AlertCircle" className="w-3 h-3 inline mr-1" />
            Note: Providers must be configured in your .env file before deployment. This interface
            only allows switching between already-configured providers.
          </p>
        </div>
      </div>

      <button
        onClick={handleSwitchProvider}
        disabled={saving || !selectedProvider || selectedProvider === currentProvider}
        className="mt-6 px-4 py-2 bg-primary hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
      >
        {saving ? 'Switching...' : 'Switch to Selected Provider'}
      </button>
    </section>
  )
}
