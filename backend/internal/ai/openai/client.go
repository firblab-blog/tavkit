package openai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"go.uber.org/zap"
)

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

// Client implements the Provider interface for OpenAI
type Client struct {
	apiKey       string
	defaultModel string
	httpClient   *http.Client
	logger       *zap.Logger
}

// NewClient creates a new OpenAI client
func NewClient(apiKey, defaultModel string, logger *zap.Logger) (*Client, error) {
	if apiKey == "" {
		return nil, fmt.Errorf("openai API key is required")
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

// GenerateContent generates content using OpenAI
func (c *Client) GenerateContent(ctx context.Context, req GenerateRequest) (*GenerateResponse, error) {
	model := req.Model
	if model == "" {
		model = c.defaultModel
	}

	// Build messages
	messages := []map[string]string{}

	if req.SystemMsg != "" {
		messages = append(messages, map[string]string{
			"role":    "system",
			"content": req.SystemMsg,
		})
	}

	messages = append(messages, map[string]string{
		"role":    "user",
		"content": req.Prompt,
	})

	// Build request
	openaiReq := map[string]interface{}{
		"model":    model,
		"messages": messages,
	}

	if req.Temperature > 0 {
		openaiReq["temperature"] = req.Temperature
	}

	if req.MaxTokens > 0 {
		openaiReq["max_tokens"] = req.MaxTokens
	}

	body, err := json.Marshal(openaiReq)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", "https://api.openai.com/v1/chat/completions", bytes.NewBuffer(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)

	c.logger.Debug("Sending request to OpenAI",
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
		c.logger.Error("OpenAI API error",
			zap.Int("status_code", resp.StatusCode),
			zap.String("error_message", errResp.Error.Message))
		return nil, fmt.Errorf("openai API error (%d): %s", resp.StatusCode, errResp.Error.Message)
	}

	var openaiResp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
		Model string `json:"model"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&openaiResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	content := ""
	if len(openaiResp.Choices) > 0 {
		content = openaiResp.Choices[0].Message.Content
	}

	c.logger.Debug("Received response from OpenAI",
		zap.String("model", openaiResp.Model),
		zap.Int("content_length", len(content)))

	return &GenerateResponse{
		Content:  content,
		Model:    openaiResp.Model,
		Provider: "openai",
	}, nil
}

// GetModels returns available OpenAI models
func (c *Client) GetModels(ctx context.Context) ([]string, error) {
	httpReq, err := http.NewRequestWithContext(ctx, "GET", "https://api.openai.com/v1/models", nil)
	if err != nil {
		return nil, err
	}

	httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to get models: %w", err)
	}
	defer resp.Body.Close()

	var result struct {
		Data []struct {
			ID string `json:"id"`
		} `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	// Filter for chat models (GPT and O1 series)
	var models []string
	for _, m := range result.Data {
		if strings.HasPrefix(m.ID, "gpt-") || strings.HasPrefix(m.ID, "o1-") {
			models = append(models, m.ID)
		}
	}

	return models, nil
}

// ValidateConnection validates the OpenAI API key
func (c *Client) ValidateConnection(ctx context.Context) error {
	httpReq, err := http.NewRequestWithContext(ctx, "GET", "https://api.openai.com/v1/models", nil)
	if err != nil {
		return err
	}

	httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("connection failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized {
		return fmt.Errorf("invalid API key")
	}

	if resp.StatusCode >= 400 {
		return fmt.Errorf("API returned status %d", resp.StatusCode)
	}

	return nil
}

// GetProviderName returns the provider name
func (c *Client) GetProviderName() string {
	return "OpenAI"
}
