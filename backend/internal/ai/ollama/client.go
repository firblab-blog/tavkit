package ollama

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

// Client implements the Provider interface for Ollama
type Client struct {
	host         string
	defaultModel string
	httpClient   *http.Client
	logger       *zap.Logger
}

// NewClient creates a new Ollama client
func NewClient(host, defaultModel string, logger *zap.Logger) (*Client, error) {
	if host == "" {
		return nil, fmt.Errorf("ollama host is required")
	}

	return &Client{
		host:         host,
		defaultModel: defaultModel,
		httpClient: &http.Client{
			Timeout: 300 * time.Second, // 5 minutes for slow CPU inference
		},
		logger: logger,
	}, nil
}

// GenerateContent generates content using Ollama
func (c *Client) GenerateContent(ctx context.Context, req GenerateRequest) (*GenerateResponse, error) {
	model := req.Model
	if model == "" {
		model = c.defaultModel
	}

	// Build Ollama request
	ollamaReq := map[string]interface{}{
		"model":  model,
		"prompt": req.Prompt,
		"stream": false,
	}

	// Use strict JSON mode for reliable output parsing
	ollamaReq["format"] = "json"

	if req.SystemMsg != "" {
		ollamaReq["system"] = req.SystemMsg
	}

	// Build options to control output length and context
	options := make(map[string]interface{})

	// Set num_ctx (context window size) - 8192 for detailed prompts
	options["num_ctx"] = 8192

	// Set num_predict (Ollama's equivalent of max_tokens)
	if req.MaxTokens > 0 {
		options["num_predict"] = req.MaxTokens
	} else {
		options["num_predict"] = 4096 // Default for comprehensive generation
	}

	// Set temperature if provided
	if req.Temperature > 0 {
		options["temperature"] = req.Temperature
	}

	// Add repetition penalty to prevent output loops
	// repeat_penalty > 1.0 discourages repetition, 1.1 is a moderate penalty
	options["repeat_penalty"] = 1.15
	// repeat_last_n controls how many tokens to consider for repetition check
	options["repeat_last_n"] = 128

	// Always include options in the request
	ollamaReq["options"] = options

	body, err := json.Marshal(ollamaReq)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", c.host+"/api/generate", bytes.NewBuffer(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	c.logger.Info("Sending request to Ollama",
		zap.String("model", model),
		zap.String("host", c.host),
		zap.Int("num_ctx", options["num_ctx"].(int)),
		zap.Int("num_predict", options["num_predict"].(int)),
		zap.Int("prompt_length", len(req.Prompt)),
		zap.Int("system_msg_length", len(req.SystemMsg)),
		zap.Int("requested_max_tokens", req.MaxTokens))

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		// Read error body for better debugging
		errBody, _ := io.ReadAll(resp.Body)
		c.logger.Error("Ollama returned error status",
			zap.Int("status_code", resp.StatusCode),
			zap.String("error_body", string(errBody)))
		return nil, fmt.Errorf("ollama returned status %d: %s", resp.StatusCode, string(errBody))
	}

	var ollamaResp struct {
		Response string `json:"response"`
		Model    string `json:"model"`
		Done     bool   `json:"done"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&ollamaResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	// Warn if response was truncated (done=false shouldn't happen with stream=false, but check anyway)
	if !ollamaResp.Done {
		c.logger.Warn("Ollama response may be incomplete",
			zap.Bool("done", ollamaResp.Done),
			zap.Int("content_length", len(ollamaResp.Response)))
	}

	previewLen := len(ollamaResp.Response)
	if previewLen > 200 {
		previewLen = 200
	}
	c.logger.Info("Received response from Ollama",
		zap.String("model", ollamaResp.Model),
		zap.Int("content_length", len(ollamaResp.Response)),
		zap.Bool("done", ollamaResp.Done),
		zap.String("response_preview", ollamaResp.Response[:previewLen]))

	return &GenerateResponse{
		Content:  ollamaResp.Response,
		Model:    ollamaResp.Model,
		Provider: "ollama",
	}, nil
}

// GetModels returns available Ollama models
func (c *Client) GetModels(ctx context.Context) ([]string, error) {
	httpReq, err := http.NewRequestWithContext(ctx, "GET", c.host+"/api/tags", nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to get models: %w", err)
	}
	defer resp.Body.Close()

	var result struct {
		Models []struct {
			Name string `json:"name"`
		} `json:"models"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	models := make([]string, len(result.Models))
	for i, m := range result.Models {
		models[i] = m.Name
	}

	return models, nil
}

// ValidateConnection checks if Ollama is accessible
func (c *Client) ValidateConnection(ctx context.Context) error {
	httpReq, err := http.NewRequestWithContext(ctx, "GET", c.host+"/api/tags", nil)
	if err != nil {
		return err
	}

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("ollama connection failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("ollama returned status %d", resp.StatusCode)
	}

	return nil
}

// GetProviderName returns the provider name
func (c *Client) GetProviderName() string {
	return "Ollama (Local)"
}

// EnsureModel checks if the model exists locally and pulls it if not
func (c *Client) EnsureModel(ctx context.Context, model string) error {
	if model == "" {
		model = c.defaultModel
	}

	// Check if model already exists
	models, err := c.GetModels(ctx)
	if err != nil {
		c.logger.Warn("Failed to list models, will attempt pull anyway", zap.Error(err))
	} else {
		for _, m := range models {
			if m == model {
				c.logger.Info("Model already available", zap.String("model", model))
				return nil
			}
		}
	}

	// Model not found, attempt to pull it
	c.logger.Info("Model not found locally, pulling from Ollama registry",
		zap.String("model", model))

	pullReq := map[string]interface{}{
		"name":   model,
		"stream": false,
	}

	body, err := json.Marshal(pullReq)
	if err != nil {
		return fmt.Errorf("failed to marshal pull request: %w", err)
	}

	// Create a context with a longer timeout for model pulls (can take several minutes)
	pullCtx, cancel := context.WithTimeout(ctx, 30*time.Minute)
	defer cancel()

	httpReq, err := http.NewRequestWithContext(pullCtx, "POST", c.host+"/api/pull", bytes.NewBuffer(body))
	if err != nil {
		return fmt.Errorf("failed to create pull request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	c.logger.Info("Starting model pull (this may take several minutes)...",
		zap.String("model", model))

	// Use a client with longer timeout for pulls
	pullClient := &http.Client{
		Timeout: 30 * time.Minute,
	}

	resp, err := pullClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("model pull request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		errBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("model pull failed with status %d: %s", resp.StatusCode, string(errBody))
	}

	// Read the response (Ollama streams progress even with stream=false for pulls)
	// We just need to consume it to completion
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read pull response: %w", err)
	}

	c.logger.Info("Model pull completed successfully",
		zap.String("model", model),
		zap.Int("response_size", len(respBody)))

	return nil
}
