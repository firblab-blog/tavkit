// Package ai provides AI provider abstraction and implementations
package ai

import (
	"context"
	"fmt"
)

// Provider defines the interface all AI providers must implement
type Provider interface {
	// GenerateContent generates AI content based on prompt and parameters
	GenerateContent(ctx context.Context, req GenerateRequest) (*GenerateResponse, error)

	// GetModels returns available models for this provider
	GetModels(ctx context.Context) ([]string, error)

	// ValidateConnection checks if provider is accessible
	ValidateConnection(ctx context.Context) error

	// GetProviderName returns the human-readable provider name
	GetProviderName() string
}

// GenerateRequest contains parameters for content generation
type GenerateRequest struct {
	Prompt          string                 `json:"prompt"`
	Model           string                 `json:"model,omitempty"`
	Temperature     float64                `json:"temperature,omitempty"`
	MaxTokens       int                    `json:"max_tokens,omitempty"`
	SystemMsg       string                 `json:"system_message,omitempty"`
	Context         map[string]interface{} `json:"context,omitempty"`          // For campaign context (direct providers)
	CampaignID      *string                `json:"campaign_id,omitempty"`      // Campaign ID for context fetching
	CampaignContext *string                `json:"campaign_context,omitempty"` // Full context for direct providers
	GeneratorType   string                 `json:"generator_type,omitempty"`   // Type of generator (npc, monster, location, etc.) for routing
}

// GenerateResponse contains the generated content
type GenerateResponse struct {
	Content  string                 `json:"content"`
	Model    string                 `json:"model"`
	Provider string                 `json:"provider"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

// ProviderType represents available AI providers
type ProviderType string

const (
	ProviderOllama    ProviderType = "ollama"
	ProviderAnthropic ProviderType = "anthropic"
	ProviderOpenAI    ProviderType = "openai"
	ProviderNone      ProviderType = "none"
)

// ValidationError represents a provider validation error
type ValidationError struct {
	Provider ProviderType
	Message  string
}

func (e *ValidationError) Error() string {
	return fmt.Sprintf("%s provider validation failed: %s", e.Provider, e.Message)
}
