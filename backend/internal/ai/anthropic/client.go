package anthropic

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"go.uber.org/zap"
)

// Client implements the Provider interface for Anthropic Claude
type Client struct {
	apiKey       string
	defaultModel string
	httpClient   *http.Client
	logger       *zap.Logger
}

// NewClient creates a new Anthropic client
func NewClient(apiKey, defaultModel string, logger *zap.Logger) (*Client, error) {
	if apiKey == "" {
		return nil, fmt.Errorf("anthropic API key is required")
	}

	return &Client{
		apiKey:       apiKey,
		defaultModel: defaultModel,
		httpClient: &http.Client{
			Timeout: 60 * time.Second,
		},
		logger: logger,
	}, nil
}

// GenerateRequest contains parameters for content generation
type GenerateRequest struct {
	Prompt      string
	Model       string
	Temperature float64
	MaxTokens   int
	SystemMsg   string
}

// GenerateResponse contains the generated content
type GenerateResponse struct {
	Content  string
	Model    string
	Provider string
}

// GenerateContent generates content using Anthropic Claude
func (c *Client) GenerateContent(ctx context.Context, req GenerateRequest) (*GenerateResponse, error) {
	model := req.Model
	if model == "" {
		model = c.defaultModel
	}

	// Build messages
	messages := []map[string]string{
		{"role": "user", "content": req.Prompt},
	}

	// Build request
	anthropicReq := map[string]interface{}{
		"model":      model,
		"messages":   messages,
		"max_tokens": 4096,
	}

	if req.SystemMsg != "" {
		anthropicReq["system"] = req.SystemMsg
	}

	if req.MaxTokens > 0 {
		anthropicReq["max_tokens"] = req.MaxTokens
	}

	if req.Temperature > 0 {
		anthropicReq["temperature"] = req.Temperature
	}

	body, err := json.Marshal(anthropicReq)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", "https://api.anthropic.com/v1/messages", bytes.NewBuffer(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("x-api-key", c.apiKey)
	httpReq.Header.Set("anthropic-version", "2023-06-01")

	c.logger.Debug("Sending request to Anthropic",
		zap.String("model", model))

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		var errResp struct {
			Error struct {
				Message string `json:"message"`
			} `json:"error"`
		}
		if decodeErr := json.NewDecoder(resp.Body).Decode(&errResp); decodeErr != nil {
			c.logger.Debug("Failed to decode error response", zap.Error(decodeErr))
		}
		c.logger.Error("Anthropic API error",
			zap.Int("status_code", resp.StatusCode),
			zap.String("error_message", errResp.Error.Message))
		return nil, fmt.Errorf("anthropic API error (%d): %s", resp.StatusCode, errResp.Error.Message)
	}

	var anthropicResp struct {
		Content []struct {
			Text string `json:"text"`
		} `json:"content"`
		Model string `json:"model"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&anthropicResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	content := ""
	if len(anthropicResp.Content) > 0 {
		content = anthropicResp.Content[0].Text
	}

	c.logger.Debug("Received response from Anthropic",
		zap.String("model", anthropicResp.Model),
		zap.Int("content_length", len(content)))

	return &GenerateResponse{
		Content:  content,
		Model:    anthropicResp.Model,
		Provider: "anthropic",
	}, nil
}

// GetModels returns available Anthropic models
func (c *Client) GetModels(ctx context.Context) ([]string, error) {
	// Return known Claude models (Anthropic doesn't have a models endpoint)
	return []string{
		"claude-sonnet-4-20250514",
		"claude-opus-4-20250514",
		"claude-3-5-sonnet-20241022",
		"claude-3-5-haiku-20241022",
		"claude-3-opus-20240229",
		"claude-3-sonnet-20240229",
		"claude-3-haiku-20240307",
	}, nil
}

// ValidateConnection validates the Anthropic API key
func (c *Client) ValidateConnection(ctx context.Context) error {
	// Make a minimal API call to validate the key
	messages := []map[string]string{
		{"role": "user", "content": "test"},
	}

	reqBody := map[string]interface{}{
		"model":      c.defaultModel,
		"messages":   messages,
		"max_tokens": 1,
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		return err
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", "https://api.anthropic.com/v1/messages", bytes.NewBuffer(body))
	if err != nil {
		return err
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("x-api-key", c.apiKey)
	httpReq.Header.Set("anthropic-version", "2023-06-01")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("connection failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized {
		return fmt.Errorf("invalid API key")
	}

	if resp.StatusCode >= 400 && resp.StatusCode != http.StatusTooManyRequests {
		return fmt.Errorf("API returned status %d", resp.StatusCode)
	}

	return nil
}

// GetProviderName returns the provider name
func (c *Client) GetProviderName() string {
	return "Anthropic (Claude)"
}
