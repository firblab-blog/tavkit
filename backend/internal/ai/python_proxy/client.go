package python_proxy

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"go.uber.org/zap"
)

// Client handles communication with Python AI service
type Client struct {
	baseURL    string
	httpClient *http.Client
	logger     *zap.Logger
}

// GenerateRequest matches the common AI provider request format
type GenerateRequest struct {
	Prompt          string
	SystemMsg       string
	Model           string
	Temperature     float64
	MaxTokens       int
	IsLowPower      bool
	CampaignID      *string // Campaign ID for Python to fetch context
	CampaignContext map[string]interface{}
}

// GenerateResponse matches the common AI provider response format
type GenerateResponse struct {
	Content  string
	Model    string
	Provider string
}

// NewClient creates a new Python proxy client
func NewClient(baseURL string, logger *zap.Logger) *Client {
	return &Client{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 5 * time.Minute, // Long timeout for AI generation
		},
		logger: logger,
	}
}

// GenerateContent sends a generation request to Python AI service
// generatorType should be: "npc", "monster", "location", etc.
// extraFields contains generator-specific parameters
func (c *Client) GenerateContent(ctx context.Context, generatorType string, req GenerateRequest, extraFields map[string]interface{}) (*GenerateResponse, error) {
	// Build the endpoint URL based on generator type
	endpoint := fmt.Sprintf("%s/api/v1/generate/%s", c.baseURL, generatorType)

	// Build request payload - Python service expects flat structure
	payload := map[string]interface{}{
		"prompt":     req.Prompt,
		"max_tokens": req.MaxTokens,
	}

	// Add campaign ID if present - Python will fetch context from Go API
	if req.CampaignID != nil {
		payload["campaign_id"] = req.CampaignID
	}

	// Add extra fields from the specific generator
	for k, v := range extraFields {
		payload[k] = v
	}

	// Marshal to JSON
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	c.logger.Info("[PROXY] Sending request to Python AI service",
		zap.String("endpoint", endpoint),
		zap.String("generator_type", generatorType),
		zap.Int("payload_size", len(body)),
		zap.String("payload_preview", string(body[:min(500, len(body))])))

	// Create HTTP request
	httpReq, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")

	// Send request
	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to send request to Python AI service: %w", err)
	}
	defer func() {
		if err := resp.Body.Close(); err != nil {
			c.logger.Warn("failed to close response body", zap.Error(err))
		}
	}()

	// Read response body
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// Check status code
	if resp.StatusCode != http.StatusOK {
		c.logger.Error("Python AI service returned error",
			zap.Int("status_code", resp.StatusCode),
			zap.String("response", string(respBody)))
		return nil, fmt.Errorf("python AI service error: %d - %s", resp.StatusCode, string(respBody))
	}

	// Parse response - Python service returns {generator_type: {...}}
	var result map[string]interface{}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	// Extract the generated content from the wrapper
	var generatedData interface{}
	if data, ok := result[generatorType]; ok {
		generatedData = data
	} else {
		// Fallback: use the entire result if no wrapper key
		generatedData = result
	}

	// Convert back to JSON string (Go backend expects JSON string)
	contentJSON, err := json.Marshal(generatedData)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal generated content: %w", err)
	}

	c.logger.Info("[PROXY] Received response from Python AI service",
		zap.Int("content_length", len(contentJSON)),
		zap.String("content_preview", string(contentJSON[:min(300, len(contentJSON))])))

	return &GenerateResponse{
		Content:  string(contentJSON),
		Model:    "ollama-via-python",
		Provider: "ollama (python proxy)",
	}, nil
}

// GetProviderName returns the provider name
func (c *Client) GetProviderName() string {
	return "Ollama (Python AI Service)"
}

// ValidateConnection checks if Python AI service is available
func (c *Client) ValidateConnection(ctx context.Context) error {
	endpoint := fmt.Sprintf("%s/health", c.baseURL)

	req, err := http.NewRequestWithContext(ctx, "GET", endpoint, nil)
	if err != nil {
		return fmt.Errorf("failed to create health check request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("python AI service is not reachable: %w", err)
	}
	defer func() {
		if err := resp.Body.Close(); err != nil {
			c.logger.Warn("failed to close response body", zap.Error(err))
		}
	}()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("python AI service health check failed: status %d", resp.StatusCode)
	}

	return nil
}

// GetModels returns available models (not applicable for proxy)
func (c *Client) GetModels(ctx context.Context) ([]string, error) {
	// Python service doesn't expose model listing, return placeholder
	return []string{"ollama (via python)"}, nil
}
