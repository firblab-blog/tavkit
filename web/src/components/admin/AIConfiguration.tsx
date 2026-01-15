import { useState, useEffect } from "react";
import { useAI } from "../../contexts/AIContext";
import Icon from "../common/Icon";
import { authFetch } from "@/utils/authFetch";

export default function AIConfiguration() {
  // Token no longer needed - using cookie-based auth
  const {
    enabled,
    currentProvider,
    availableProviders,
    loading: aiLoading,
    error: contextError,
    switchProvider,
  } = useAI();

  // Provider switching state
  const [selectedProvider, setSelectedProvider] = useState(
    currentProvider || "",
  );
  const [switchingSaving, setSwitchingSaving] = useState(false);
  const [switchingError, setSwitchingError] = useState<string | null>(null);
  const [switchingSuccess, setSwitchingSuccess] = useState(false);

  // Settings state (AI Timeout)
  const [aiTimeoutSeconds, setAiTimeoutSeconds] = useState(120);
  const [ollamaURL, setOllamaURL] = useState("");
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);

  // Load current provider
  useEffect(() => {
    if (currentProvider) {
      setSelectedProvider(currentProvider);
    }
  }, [currentProvider]);

  // Load settings
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/v1/settings");
      const data = await res.json();
      setAiTimeoutSeconds(data.ai_timeout_seconds || 120);
      setOllamaURL(data.ollama_url || "");
    } catch {
      setSettingsError("Failed to load settings");
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSwitchProvider = async () => {
    if (!selectedProvider) {
      setSwitchingError("Please select a provider");
      return;
    }

    if (selectedProvider === currentProvider) {
      setSwitchingError("This provider is already active");
      return;
    }

    setSwitchingSaving(true);
    setSwitchingError(null);
    setSwitchingSuccess(false);

    try {
      await switchProvider(selectedProvider);
      setSwitchingSuccess(true);
      setTimeout(() => setSwitchingSuccess(false), 3000);
    } catch (err) {
      setSwitchingError(
        err instanceof Error ? err.message : "Failed to switch provider",
      );
    } finally {
      setSwitchingSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    setSettingsError(null);
    setSettingsSuccess(false);
    setSettingsSaving(true);

    try {
      const res = await authFetch("/api/v1/admin/settings", {
        method: "PUT",
        body: JSON.stringify({
          ai_timeout_seconds: aiTimeoutSeconds,
          ollama_url: ollamaURL,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save settings");
      }

      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err) {
      setSettingsError(
        err instanceof Error ? err.message : "Failed to save settings",
      );
    } finally {
      setSettingsSaving(false);
    }
  };

  if (aiLoading || settingsLoading) {
    return (
      <section className="bg-background-panel border border-border rounded-lg p-6">
        <div className="flex items-center justify-center p-8">
          <div className="text-text-muted">Loading AI configuration...</div>
        </div>
      </section>
    );
  }

  if (!enabled) {
    return (
      <section className="bg-background-panel border border-border rounded-lg p-6">
        <div className="flex items-start gap-3 mb-6">
          <Icon name="Sparkles" className="w-6 h-6 text-primary mt-0.5" />
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-text">
              AI Configuration
            </h2>
            <p className="text-sm text-text-muted mt-1">
              Configure AI providers, timeouts, and performance settings
            </p>
          </div>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500 text-yellow-500 px-4 py-3 rounded-lg flex items-center gap-2">
          <Icon name="AlertCircle" className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1">
            <div className="font-medium">AI Features Disabled</div>
            <p className="text-sm mt-1">
              AI features are disabled in this TavKit deployment. To enable AI,
              set{" "}
              <code className="px-1.5 py-0.5 bg-background rounded text-xs">
                ENABLE_AI=true
              </code>{" "}
              in your environment configuration and redeploy.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-background-panel border border-border rounded-lg p-6">
      <div className="flex items-start gap-3 mb-6">
        <Icon name="Sparkles" className="w-6 h-6 text-primary mt-0.5" />
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-text">AI Configuration</h2>
          <p className="text-sm text-text-muted mt-1">
            Configure AI providers, timeouts, and performance settings
          </p>
        </div>
      </div>

      {/* Global Alerts */}
      {contextError && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg flex items-center gap-2 mb-4">
          <Icon name="AlertCircle" className="w-5 h-5 flex-shrink-0" />
          <span>{contextError}</span>
        </div>
      )}

      <div className="space-y-8">
        {/* Provider Switching Section */}
        <div>
          <h3 className="text-lg font-semibold text-text mb-4">
            Active AI Provider
          </h3>

          {/* Switching Alerts */}
          {switchingError && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg flex items-center gap-2 mb-4">
              <Icon name="AlertCircle" className="w-5 h-5 flex-shrink-0" />
              <span>{switchingError}</span>
            </div>
          )}

          {switchingSuccess && (
            <div className="bg-green-500/10 border border-green-500 text-green-500 px-4 py-3 rounded-lg flex items-center gap-2 mb-4">
              <Icon name="Check" className="w-5 h-5 flex-shrink-0" />
              <span>Successfully switched to {selectedProvider}!</span>
            </div>
          )}

          <div className="space-y-4">
            {/* Current Provider Status */}
            <div>
              <label className="text-sm font-medium text-text mb-2 block">
                Current Provider
              </label>
              <div className="p-4 rounded-lg border border-primary bg-primary/10">
                <div className="flex items-center gap-3">
                  <Icon name="Check" className="w-5 h-5 text-primary" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text">
                        {availableProviders.find(
                          (p) => p.type === currentProvider,
                        )?.name || currentProvider}
                      </span>
                      <span className="px-2 py-0.5 text-xs rounded bg-primary text-white">
                        Active
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Available Providers */}
            <div>
              <label className="text-sm font-medium text-text mb-2 block">
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
                        ? "border-primary bg-primary/10"
                        : provider.available
                          ? "border-border bg-background hover:border-primary/40"
                          : "border-border bg-background-muted opacity-50 cursor-not-allowed"
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
                          <span className="text-sm font-medium text-text">
                            {provider.name}
                          </span>
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
                          <p className="text-xs text-red-400 mt-1">
                            {provider.error}
                          </p>
                        )}
                      </div>
                      {selectedProvider === provider.type &&
                        provider.type !== currentProvider && (
                          <Icon
                            name="ArrowRight"
                            className="w-5 h-5 text-primary"
                          />
                        )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSwitchProvider}
              disabled={
                switchingSaving ||
                !selectedProvider ||
                selectedProvider === currentProvider
              }
              className="w-full px-4 py-2 bg-primary hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
            >
              {switchingSaving ? "Switching..." : "Switch to Selected Provider"}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border"></div>

        {/* Performance Settings Section */}
        <div>
          <h3 className="text-lg font-semibold text-text mb-4">
            Performance Settings
          </h3>

          {/* Settings Alerts */}
          {settingsError && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg flex items-center gap-2 mb-4">
              <Icon name="AlertCircle" className="w-5 h-5 flex-shrink-0" />
              <span>{settingsError}</span>
            </div>
          )}

          {settingsSuccess && (
            <div className="bg-green-500/10 border border-green-500 text-green-500 px-4 py-3 rounded-lg flex items-center gap-2 mb-4">
              <Icon name="Check" className="w-5 h-5 flex-shrink-0" />
              <span>Settings saved successfully!</span>
            </div>
          )}

          <div className="space-y-6">
            {/* AI Timeout */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                AI Generation Timeout
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={aiTimeoutSeconds}
                  onChange={(e) => setAiTimeoutSeconds(Number(e.target.value))}
                  min="30"
                  max="600"
                  className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
                />
                <span className="text-sm text-text-muted">seconds</span>
              </div>
              <p className="text-xs text-text-muted mt-2">
                Maximum time to wait for AI generation requests (30-600
                seconds). Increase for complex generations or slower hardware.
              </p>
            </div>

            {/* Ollama URL */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Ollama Endpoint URL
              </label>
              <input
                type="text"
                value={ollamaURL}
                onChange={(e) => setOllamaURL(e.target.value)}
                placeholder="http://host.docker.internal:11434"
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:border-primary"
              />
              <p className="text-xs text-text-muted mt-2">
                Custom Ollama server URL. Leave empty to use the default
                environment configuration (
                <code className="px-1 py-0.5 bg-background-panel rounded text-xs">
                  http://host.docker.internal:11434
                </code>
                ). Format:{" "}
                <code className="px-1 py-0.5 bg-background-panel rounded text-xs">
                  http://host:port
                </code>
              </p>
            </div>

            <button
              onClick={handleSaveSettings}
              disabled={settingsSaving}
              className="w-full px-4 py-2 bg-primary hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
            >
              {settingsSaving ? "Saving..." : "Save Performance Settings"}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border"></div>

        {/* Provider Info Section */}
        <div>
          <h3 className="text-lg font-semibold text-text mb-4">
            About AI Providers
          </h3>
          <div className="space-y-3">
            <div className="p-4 bg-background rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="Sparkles" className="w-4 h-4 text-primary" />
                <div className="font-medium text-text text-sm">
                  Ollama (Local)
                </div>
              </div>
              <p className="text-xs text-text-muted">
                Self-hosted AI running on your own hardware. Uses the Go backend
                directly for maximum performance (same architecture as
                Anthropic/OpenAI). Configured via OLLAMA_BASE_URL and
                OLLAMA_MODEL environment variables.
              </p>
            </div>
            <div className="p-4 bg-background rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="Globe" className="w-4 h-4 text-primary" />
                <div className="font-medium text-text text-sm">
                  Anthropic (Claude)
                </div>
              </div>
              <p className="text-xs text-text-muted">
                High-quality AI from Anthropic's Claude models. Pay-per-use
                pricing. Requires ANTHROPIC_API_KEY and ANTHROPIC_MODEL
                environment variables.
              </p>
            </div>
            <div className="p-4 bg-background rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="Sparkles" className="w-4 h-4 text-primary" />
                <div className="font-medium text-text text-sm">
                  OpenAI (GPT)
                </div>
              </div>
              <p className="text-xs text-text-muted">
                Industry-leading AI from OpenAI's GPT models. Pay-per-use
                pricing. Requires OPENAI_API_KEY and OPENAI_MODEL environment
                variables.
              </p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-xs text-text-muted flex items-start gap-2">
              <Icon
                name="AlertCircle"
                className="w-3 h-3 mt-0.5 text-yellow-500 flex-shrink-0"
              />
              <span>
                <span className="font-medium text-text">Note:</span> Providers
                must be configured in your .env file before deployment. This
                interface only allows switching between already-configured
                providers and adjusting runtime performance settings.
              </span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
