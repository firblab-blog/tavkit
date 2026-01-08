package ai

import (
	"context"
	"fmt"
	"sync"
	"time"

	"tavkit/internal/ai/anthropic"
	"tavkit/internal/ai/ollama"
	"tavkit/internal/ai/openai"

	"go.uber.org/zap"
)

// Config holds AI configuration
type Config struct {
	Enabled         bool
	Provider        ProviderType
	OllamaHost      string
	OllamaModel     string
	AnthropicAPIKey string
	AnthropicModel  string
	OpenAIAPIKey    string
	OpenAIModel     string
}

// Factory manages AI provider instances
type Factory struct {
	config    Config
	providers map[ProviderType]Provider
	mu        sync.RWMutex
	logger    *zap.Logger
}

// providerAdapter adapts provider-specific types to the common Provider interface
type providerAdapter struct {
	ollama    *ollama.Client
	anthropic *anthropic.Client
	openai    *openai.Client
	pType     ProviderType
	logger    *zap.Logger
}

func (pa *providerAdapter) GenerateContent(ctx context.Context, req GenerateRequest) (*GenerateResponse, error) {
	switch pa.pType {
	case ProviderOllama:
		// Direct Ollama - Go backend handles all Ollama requests directly
		pa.logger.Debug("[ROUTING] Using direct Go backend for Ollama",
			zap.String("generator_type", req.GeneratorType),
			zap.Int("prompt_length", len(req.Prompt)))

		ollamaReq := ollama.GenerateRequest{
			Prompt:      req.Prompt,
			Model:       req.Model,
			Temperature: req.Temperature,
			MaxTokens:   req.MaxTokens,
			SystemMsg:   req.SystemMsg,
		}
		resp, err := pa.ollama.GenerateContent(ctx, ollamaReq)
		if err != nil {
			return nil, err
		}
		return &GenerateResponse{
			Content:  resp.Content,
			Model:    resp.Model,
			Provider: resp.Provider,
		}, nil

	case ProviderAnthropic:
		anthropicReq := anthropic.GenerateRequest{
			Prompt:      req.Prompt,
			Model:       req.Model,
			Temperature: req.Temperature,
			MaxTokens:   req.MaxTokens,
			SystemMsg:   req.SystemMsg,
		}
		resp, err := pa.anthropic.GenerateContent(ctx, anthropicReq)
		if err != nil {
			return nil, err
		}
		return &GenerateResponse{
			Content:  resp.Content,
			Model:    resp.Model,
			Provider: resp.Provider,
		}, nil

	case ProviderOpenAI:
		openaiReq := openai.GenerateRequest{
			Prompt:      req.Prompt,
			Model:       req.Model,
			Temperature: req.Temperature,
			MaxTokens:   req.MaxTokens,
			SystemMsg:   req.SystemMsg,
		}
		resp, err := pa.openai.GenerateContent(ctx, openaiReq)
		if err != nil {
			return nil, err
		}
		return &GenerateResponse{
			Content:  resp.Content,
			Model:    resp.Model,
			Provider: resp.Provider,
		}, nil

	default:
		return nil, fmt.Errorf("unknown provider type: %s", pa.pType)
	}
}

func (pa *providerAdapter) GetModels(ctx context.Context) ([]string, error) {
	switch pa.pType {
	case ProviderOllama:
		return pa.ollama.GetModels(ctx)
	case ProviderAnthropic:
		return pa.anthropic.GetModels(ctx)
	case ProviderOpenAI:
		return pa.openai.GetModels(ctx)
	default:
		return nil, fmt.Errorf("unknown provider type: %s", pa.pType)
	}
}

func (pa *providerAdapter) ValidateConnection(ctx context.Context) error {
	switch pa.pType {
	case ProviderOllama:
		return pa.ollama.ValidateConnection(ctx)
	case ProviderAnthropic:
		return pa.anthropic.ValidateConnection(ctx)
	case ProviderOpenAI:
		return pa.openai.ValidateConnection(ctx)
	default:
		return fmt.Errorf("unknown provider type: %s", pa.pType)
	}
}

func (pa *providerAdapter) GetProviderName() string {
	switch pa.pType {
	case ProviderOllama:
		return pa.ollama.GetProviderName()
	case ProviderAnthropic:
		return pa.anthropic.GetProviderName()
	case ProviderOpenAI:
		return pa.openai.GetProviderName()
	default:
		return "Unknown"
	}
}

// NewFactory creates a new provider factory
func NewFactory(cfg Config, logger *zap.Logger) (*Factory, error) {
	f := &Factory{
		config:    cfg,
		providers: make(map[ProviderType]Provider),
		logger:    logger,
	}

	if !cfg.Enabled {
		logger.Info("AI is disabled")
		return f, nil
	}

	// Initialize available providers based on configuration
	if err := f.initializeProviders(); err != nil {
		return nil, fmt.Errorf("failed to initialize providers: %w", err)
	}

	return f, nil
}

// initializeProviders attempts to initialize all configured providers
func (f *Factory) initializeProviders() error {
	var initErrors []error

	// Try to initialize Ollama if configured
	if f.config.OllamaHost != "" {
		if client, err := ollama.NewClient(f.config.OllamaHost, f.config.OllamaModel, f.logger); err == nil {
			// Ensure the configured model is available (pull if needed)
			ctx, cancel := context.WithTimeout(context.Background(), 35*time.Minute)
			if pullErr := client.EnsureModel(ctx, f.config.OllamaModel); pullErr != nil {
				f.logger.Warn("Failed to ensure Ollama model availability",
					zap.String("model", f.config.OllamaModel),
					zap.Error(pullErr))
				// Don't fail initialization - the model might still work or be pulled later
			}
			cancel()

			adapter := &providerAdapter{
				ollama: client,
				pType:  ProviderOllama,
				logger: f.logger,
			}

			f.providers[ProviderOllama] = adapter
			f.logger.Info("Initialized Ollama provider",
				zap.String("host", f.config.OllamaHost),
				zap.String("model", f.config.OllamaModel))
		} else {
			initErrors = append(initErrors, fmt.Errorf("ollama: %w", err))
		}
	}

	// Try to initialize Anthropic if API key provided
	if f.config.AnthropicAPIKey != "" {
		if client, err := anthropic.NewClient(f.config.AnthropicAPIKey, f.config.AnthropicModel, f.logger); err == nil {
			adapter := &providerAdapter{
				anthropic: client,
				pType:     ProviderAnthropic,
			}
			f.providers[ProviderAnthropic] = adapter
			f.logger.Info("Initialized Anthropic provider",
				zap.String("model", f.config.AnthropicModel))
		} else {
			initErrors = append(initErrors, fmt.Errorf("anthropic: %w", err))
		}
	}

	// Try to initialize OpenAI if API key provided
	if f.config.OpenAIAPIKey != "" {
		if client, err := openai.NewClient(f.config.OpenAIAPIKey, f.config.OpenAIModel, f.logger); err == nil {
			adapter := &providerAdapter{
				openai: client,
				pType:  ProviderOpenAI,
			}
			f.providers[ProviderOpenAI] = adapter
			f.logger.Info("Initialized OpenAI provider",
				zap.String("model", f.config.OpenAIModel))
		} else {
			initErrors = append(initErrors, fmt.Errorf("openai: %w", err))
		}
	}

	// If no providers could be initialized, return error
	if len(f.providers) == 0 {
		return fmt.Errorf("no providers could be initialized: %v", initErrors)
	}

	// Log any initialization errors but don't fail
	if len(initErrors) > 0 {
		for _, err := range initErrors {
			f.logger.Warn("Provider initialization warning", zap.Error(err))
		}
	}

	return nil
}

// GetProvider returns the provider for the specified type
func (f *Factory) GetProvider(providerType ProviderType) (Provider, error) {
	if !f.config.Enabled {
		return nil, fmt.Errorf("AI is disabled")
	}

	f.mu.RLock()
	defer f.mu.RUnlock()

	provider, ok := f.providers[providerType]
	if !ok {
		return nil, fmt.Errorf("provider %s not available", providerType)
	}

	return provider, nil
}

// GetCurrentProvider returns the currently configured default provider
func (f *Factory) GetCurrentProvider() (Provider, error) {
	return f.GetProvider(f.config.Provider)
}

// SetProvider updates the current provider (runtime switching)
func (f *Factory) SetProvider(providerType ProviderType) error {
	if !f.config.Enabled {
		return fmt.Errorf("AI is disabled")
	}

	// Verify provider exists
	if _, err := f.GetProvider(providerType); err != nil {
		return err
	}

	f.mu.Lock()
	f.config.Provider = providerType
	f.mu.Unlock()

	f.logger.Info("Switched AI provider", zap.String("provider", string(providerType)))

	return nil
}

// AddProvider adds or updates a provider (for runtime API key updates)
func (f *Factory) AddProvider(providerType ProviderType, apiKey, model string) error {
	if !f.config.Enabled {
		return fmt.Errorf("AI is disabled")
	}

	f.mu.Lock()
	defer f.mu.Unlock()

	var adapter *providerAdapter

	switch providerType {
	case ProviderAnthropic:
		client, err := anthropic.NewClient(apiKey, model, f.logger)
		if err != nil {
			return err
		}
		adapter = &providerAdapter{
			anthropic: client,
			pType:     ProviderAnthropic,
		}
	case ProviderOpenAI:
		client, err := openai.NewClient(apiKey, model, f.logger)
		if err != nil {
			return err
		}
		adapter = &providerAdapter{
			openai: client,
			pType:  ProviderOpenAI,
			logger: f.logger,
		}
	case ProviderOllama:
		// For Ollama, apiKey is actually the URL
		ollamaURL := apiKey
		if ollamaURL == "" {
			ollamaURL = f.config.OllamaHost // Fall back to config default
		}
		if model == "" {
			model = f.config.OllamaModel // Fall back to config default
		}

		client, err := ollama.NewClient(ollamaURL, model, f.logger)
		if err != nil {
			return err
		}

		adapter = &providerAdapter{
			ollama: client,
			pType:  ProviderOllama,
			logger: f.logger,
		}
	default:
		return fmt.Errorf("cannot dynamically add provider: %s", providerType)
	}

	// Add provider to map first (allows configuration even if currently unreachable)
	f.providers[providerType] = adapter

	// Validate connection (non-blocking - just for logging)
	if err := adapter.ValidateConnection(context.Background()); err != nil {
		f.logger.Warn("Provider added but validation failed - may not be reachable",
			zap.String("provider", string(providerType)),
			zap.Error(err))
		return &ValidationError{Provider: providerType, Message: err.Error()}
	}

	f.logger.Info("Added AI provider successfully", zap.String("provider", string(providerType)))

	return nil
}

// ListAvailableProviders returns information about all available providers
func (f *Factory) ListAvailableProviders(ctx context.Context) []ProviderInfo {
	f.mu.RLock()
	defer f.mu.RUnlock()

	providers := make([]ProviderInfo, 0, len(f.providers))

	for pType, provider := range f.providers {
		info := ProviderInfo{
			Type:      string(pType),
			Name:      provider.GetProviderName(),
			Available: true,
		}

		// Test connection
		if err := provider.ValidateConnection(ctx); err != nil {
			info.Available = false
			info.Error = err.Error()
		}

		providers = append(providers, info)
	}

	return providers
}

// ProviderInfo contains information about a provider's availability
type ProviderInfo struct {
	Type      string `json:"type"`
	Name      string `json:"name"`
	Available bool   `json:"available"`
	Error     string `json:"error,omitempty"`
}

// IsEnabled returns whether AI is enabled
func (f *Factory) IsEnabled() bool {
	return f.config.Enabled
}

// GetCurrentProviderType returns the current provider type
func (f *Factory) GetCurrentProviderType() ProviderType {
	f.mu.RLock()
	defer f.mu.RUnlock()
	return f.config.Provider
}
