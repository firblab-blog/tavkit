package services

import (
	"context"
	"encoding/json"
	"math/rand"
	"strings"

	"go.uber.org/zap"
)

// RumorGenerateRequest represents rumor generation request
type RumorGenerateRequest struct {
	Count            int     `json:"count"`
	Veracity         string  `json:"veracity"`
	RumorType        string  `json:"rumor_type"`
	Urgency          string  `json:"urgency"`
	Scope            string  `json:"scope"`
	SpecialRequests  string  `json:"special_requests,omitempty"`
	CampaignID       *string `json:"campaign_id,omitempty"`      // Campaign ID for Python proxy
	CampaignContext  *string `json:"campaign_context,omitempty"` // Full context for direct providers
	GameSystem       string  `json:"game_system,omitempty"`
	OllamaCapability string  `json:"ollama_capability,omitempty"` // "standard" or "low_power"
	MaxTokens        *int    `json:"max_tokens,omitempty"`
	Timeout          *int    `json:"timeout,omitempty"`
}

// GenerateRumors calls AI service to generate rumors
// Returns map[string]interface{} for flexible frontend handling (matching Critter pattern)
func (c *AIClient) GenerateRumors(ctx context.Context, req RumorGenerateRequest) (map[string]interface{}, error) {
	// Generate a random seed to encourage unique responses each time
	randomSeed := rand.Intn(1000000)

	// Default count to 3 if not specified
	count := req.Count
	if count <= 0 {
		count = 3
	}

	params := map[string]interface{}{
		"count":             count,
		"veracity":          req.Veracity,
		"rumor_type":        req.RumorType,
		"urgency":           req.Urgency,
		"scope":             req.Scope,
		"special_requests":  req.SpecialRequests,
		"campaign_id":       req.CampaignID,      // For Python proxy
		"campaign_context":  req.CampaignContext, // For direct providers
		"game_system":       req.GameSystem,
		"variation_seed":    randomSeed,
		"ollama_capability": req.OllamaCapability,
	}
	if req.MaxTokens != nil {
		params["max_tokens"] = *req.MaxTokens
	}

	content, provider, err := c.generateWithProvider(ctx, "rumors", params)
	if err != nil {
		return nil, err
	}

	var result map[string]interface{}
	if err := json.Unmarshal([]byte(content), &result); err != nil {
		// Check if the response looks truncated (incomplete JSON)
		isTruncated := !strings.HasSuffix(strings.TrimSpace(content), "}")

		// JSON parse failed - log details
		c.logger.Warn("Failed to parse AI response as JSON, creating fallback structure",
			zap.Error(err),
			zap.Int("content_length", len(content)),
			zap.Bool("appears_truncated", isTruncated))

		// Try to salvage truncated JSON
		if isTruncated {
			salvaged := salvageTruncatedRumorJSON(content)
			if salvaged != nil {
				c.logger.Info("Successfully salvaged truncated Rumor JSON")
				salvaged["provider"] = provider
				salvaged["_parse_warning"] = "Response was truncated but partially recovered"
				return validateRumorResponse(salvaged), nil
			}
		}

		// Fallback: wrap raw content as a single rumor
		result = map[string]interface{}{
			"rumors": []interface{}{
				map[string]interface{}{
					"text":          content,
					"source":        "Unknown",
					"veracity":      "unknown",
					"leads_to":      "",
					"context":       "",
					"foreshadowing": false,
					"tags":          []interface{}{},
				},
			},
			"provider":       provider,
			"_parse_warning": "AI response was not valid JSON. Raw text preserved as single rumor.",
		}
	} else {
		// Some models (like Ollama) wrap the response in an extra key
		// For rumors, check for both single-rumor wrapper and the expected "rumors" array
		result = unwrapNestedResponse(result, "rumor", "generated_rumors")
		result["provider"] = provider
		// Validate and normalize the response structure
		result = validateRumorResponse(result)
		// Strip any HTML tags that some Ollama models include in responses
		result = stripHTMLFromMap(result)
	}

	return result, nil
}

// salvageTruncatedRumorJSON attempts to recover a valid JSON object from truncated content
func salvageTruncatedRumorJSON(content string) map[string]interface{} {
	content = strings.TrimSpace(content)

	// Try progressively shorter substrings until we find valid JSON
	for i := len(content) - 1; i >= 0; i-- {
		if content[i] == '}' {
			attempt := content[:i+1]
			var result map[string]interface{}
			if err := json.Unmarshal([]byte(attempt), &result); err == nil {
				return result
			}
		}
	}

	return nil
}

// validateRumorResponse ensures the AI response has required rumor structure
// If missing fields or wrong types, it provides defaults to prevent frontend crashes
func validateRumorResponse(data map[string]interface{}) map[string]interface{} {
	// Ensure rumors array exists
	rumors := ensureArray(data["rumors"])

	// Validate each rumor in the array
	validatedRumors := make([]interface{}, 0, len(rumors))
	for _, r := range rumors {
		if rumorMap, ok := r.(map[string]interface{}); ok {
			validatedRumors = append(validatedRumors, validateSingleRumor(rumorMap))
		} else if rumorStr, ok := r.(string); ok {
			// If AI returned just a string, wrap it as a rumor
			validatedRumors = append(validatedRumors, map[string]interface{}{
				"text":          rumorStr,
				"source":        "Unknown",
				"veracity":      "unknown",
				"leads_to":      "",
				"context":       "",
				"foreshadowing": false,
				"tags":          []interface{}{},
			})
		}
	}

	data["rumors"] = validatedRumors
	return data
}

// normalizeVeracity ensures veracity matches DB CHECK constraint: 'true', 'partially_true', 'false', 'unknown'
func normalizeVeracity(value interface{}) string {
	validVeracities := map[string]bool{
		"true":           true,
		"partially_true": true,
		"false":          true,
		"unknown":        true,
	}

	// Handle boolean
	if b, ok := value.(bool); ok {
		if b {
			return "true"
		}
		return "false"
	}

	// Handle string
	if s, ok := value.(string); ok {
		lower := strings.ToLower(strings.TrimSpace(s))
		// Direct match
		if validVeracities[lower] {
			return lower
		}
		// Map common variations
		switch lower {
		case "partial", "partially true", "partiallytrue", "mixed", "half-true", "halftrue", "half true", "mostly true", "mostly_true", "somewhat true", "somewhat_true":
			return "partially_true"
		case "yes", "correct", "accurate", "verified", "confirmed":
			return "true"
		case "no", "incorrect", "inaccurate", "lie", "lies", "wrong", "fabricated", "fake":
			return "false"
		case "unverified", "unconfirmed", "uncertain", "disputed", "unclear", "maybe", "":
			return "unknown"
		}
	}

	return "unknown"
}

// validateSingleRumor ensures a single rumor has all required fields
func validateSingleRumor(rumor map[string]interface{}) map[string]interface{} {
	// Ensure text exists
	if _, ok := rumor["text"]; !ok {
		// Try alternative field names
		if content, ok := rumor["content"]; ok {
			rumor["text"] = content
		} else if description, ok := rumor["description"]; ok {
			rumor["text"] = description
		} else if message, ok := rumor["message"]; ok {
			rumor["text"] = message
		} else {
			rumor["text"] = ""
		}
	}

	// Ensure source exists
	if _, ok := rumor["source"]; !ok {
		if speaker, ok := rumor["speaker"]; ok {
			rumor["source"] = speaker
		} else if origin, ok := rumor["origin"]; ok {
			rumor["source"] = origin
		} else if from, ok := rumor["from"]; ok {
			rumor["source"] = from
		} else {
			rumor["source"] = "Unknown"
		}
	}

	// Ensure veracity exists and normalize to valid DB enum value
	var rawVeracity interface{}
	if v, ok := rumor["veracity"]; ok {
		rawVeracity = v
	} else if truth, ok := rumor["truth"]; ok {
		rawVeracity = truth
	} else if accuracy, ok := rumor["accuracy"]; ok {
		rawVeracity = accuracy
	} else if isTrue, ok := rumor["is_true"]; ok {
		rawVeracity = isTrue
	}
	rumor["veracity"] = normalizeVeracity(rawVeracity)

	// Ensure other string fields exist
	for _, field := range []string{"leads_to", "context", "related_id"} {
		if _, ok := rumor[field]; !ok {
			rumor[field] = ""
		}
	}

	// Handle alternative field names for leads_to
	if rumor["leads_to"] == "" {
		if hook, ok := rumor["adventure_hook"]; ok {
			rumor["leads_to"] = hook
		} else if hooks, ok := rumor["hooks"]; ok {
			if hookArr, isArr := hooks.([]interface{}); isArr && len(hookArr) > 0 {
				rumor["leads_to"] = hookArr[0]
			}
		}
	}

	// Ensure foreshadowing is a boolean
	if foreshadow, ok := rumor["foreshadowing"]; !ok {
		rumor["foreshadowing"] = false
	} else {
		switch f := foreshadow.(type) {
		case bool:
			// Already boolean, good
		case string:
			rumor["foreshadowing"] = strings.ToLower(f) == "true" || strings.ToLower(f) == "yes"
		default:
			rumor["foreshadowing"] = false
		}
	}

	// Ensure tags is an array
	rumor["tags"] = ensureArray(rumor["tags"])

	return rumor
}
