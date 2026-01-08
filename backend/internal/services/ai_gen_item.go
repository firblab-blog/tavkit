package services

import (
	"context"
	"encoding/json"
	"math/rand"
	"strings"

	"go.uber.org/zap"
)

// ItemGenerateRequest represents item generation request
type ItemGenerateRequest struct {
	Type             string  `json:"type"`
	Rarity           string  `json:"rarity"`
	Category         string  `json:"category"`
	Cursed           string  `json:"cursed,omitempty"`
	SpecialRequests  string  `json:"special_requests,omitempty"`
	CampaignID       *string `json:"campaign_id,omitempty"`      // Campaign ID for Python proxy
	CampaignContext  *string `json:"campaign_context,omitempty"` // Full context for direct providers
	GameSystem       string  `json:"game_system,omitempty"`
	OllamaCapability string  `json:"ollama_capability,omitempty"` // "standard" or "low_power"
	MaxTokens        *int    `json:"max_tokens,omitempty"`
	Timeout          *int    `json:"timeout,omitempty"`
}

// GenerateItem calls AI service to generate an item
// Returns map[string]interface{} for flexible frontend handling (matching Dialogue pattern)
func (c *AIClient) GenerateItem(ctx context.Context, req ItemGenerateRequest) (map[string]interface{}, error) {
	// Generate a random seed to encourage unique responses each time
	randomSeed := rand.Intn(1000000)

	params := map[string]interface{}{
		"type":              req.Type,
		"rarity":            req.Rarity,
		"category":          req.Category,
		"cursed":            req.Cursed,
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

	content, provider, err := c.generateWithProvider(ctx, "item", params)
	if err != nil {
		return nil, err
	}

	var item map[string]interface{}
	if err := json.Unmarshal([]byte(content), &item); err != nil {
		// Check if the response looks truncated (incomplete JSON)
		isTruncated := !strings.HasSuffix(strings.TrimSpace(content), "}")

		// JSON parse failed - log details
		c.logger.Warn("Failed to parse AI response as JSON, creating fallback structure",
			zap.Error(err),
			zap.Int("content_length", len(content)),
			zap.Bool("appears_truncated", isTruncated))

		// Try to salvage truncated JSON
		if isTruncated {
			salvaged := salvageTruncatedItemJSON(content)
			if salvaged != nil {
				c.logger.Info("Successfully salvaged truncated Item JSON")
				salvaged["provider"] = provider
				salvaged["_parse_warning"] = "Response was truncated but partially recovered"
				return validateItemResponse(salvaged), nil
			}
		}

		item = map[string]interface{}{
			"name":           "Generated Item",
			"type":           req.Type,
			"rarity":         req.Rarity,
			"category":       req.Category,
			"description":    content, // Preserve raw response
			"properties":     map[string]interface{}{},
			"origin":         "",
			"previous_owner": "",
			"complication":   "",
			"value":          0,
			"weight":         0,
			"attunement":     false,
			"provider":       provider,
			"_parse_warning": "AI response was not valid JSON. Raw text preserved in 'description' field.",
		}
	} else {
		// Some models (like Ollama) wrap the response in an extra key
		item = unwrapNestedResponse(item, "item", "magic_item", "generated_item")

		// CRITICAL: Check if name is empty or contains provider/model names
		if name, ok := item["name"].(string); !ok || name == "" ||
			strings.ToLower(name) == "ollama" ||
			strings.Contains(strings.ToLower(name), "mistral") ||
			strings.Contains(strings.ToLower(name), "llama") {
			// Name is invalid, generate a placeholder
			item["name"] = "Unknown Item"
		}

		item["provider"] = provider
		// Validate and normalize the response structure
		item = validateItemResponse(item)
		// Strip any HTML tags that some Ollama models include in responses
		item = stripHTMLFromMap(item)
	}

	return item, nil
}

// salvageTruncatedItemJSON attempts to recover a valid JSON object from truncated content
func salvageTruncatedItemJSON(content string) map[string]interface{} {
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

// validateItemResponse ensures the AI response has required item structure
// If missing fields or wrong types, it provides defaults to prevent frontend crashes
// This validator is flexible and handles alternative field names that different models might use
func validateItemResponse(data map[string]interface{}) map[string]interface{} {
	// Expected fields for tracking unexpected ones
	expectedFields := map[string]bool{
		"name": true, "type": true, "rarity": true, "category": true, "description": true,
		"properties": true, "origin": true, "previous_owner": true, "complication": true,
		"value": true, "weight": true, "attunement": true, "requires_attunement": true,
		"curse": true, "cursed": true, "magical": true, "magic": true,
		"damage": true, "damage_dice": true, "damage_type": true,
		"effects": true, "abilities": true, "powers": true,
		"history": true, "lore": true, "backstory": true,
		"creator": true, "creation_date": true, "location_created": true,
		"provider": true, "_parse_warning": true, "_raw": true,
	}

	// Collect unexpected fields
	unexpectedFields := make(map[string]interface{})
	for key, value := range data {
		if !expectedFields[key] && !expectedFields[strings.ToLower(key)] {
			unexpectedFields[key] = value
		}
	}

	// Ensure name exists
	if _, ok := data["name"]; !ok {
		data["name"] = "Unknown Item"
	}

	// Ensure basic string fields exist
	for _, field := range []string{"type", "rarity", "description"} {
		if _, ok := data[field]; !ok {
			data[field] = ""
		}
	}

	// Ensure properties is a map
	if props, ok := data["properties"]; !ok {
		data["properties"] = map[string]interface{}{}
	} else if _, isMap := props.(map[string]interface{}); !isMap {
		// If properties is not a map, wrap it or create empty
		if propsArr, isArr := props.([]interface{}); isArr {
			// Convert array to map with indexed keys
			propsMap := make(map[string]interface{})
			for i, v := range propsArr {
				if vs, ok := v.(string); ok {
					propsMap[vs] = true
				} else {
					propsMap[string(rune('a'+i))] = v
				}
			}
			data["properties"] = propsMap
		} else {
			data["properties"] = map[string]interface{}{}
		}
	}

	// Handle flexible fields that can be string or object
	// origin, previous_owner, complication - leave as-is, frontend handles both types
	for _, field := range []string{"origin", "previous_owner", "complication"} {
		if _, ok := data[field]; !ok {
			data[field] = ""
		}
	}

	// Handle value - can be number or object with amount/currency
	if val, ok := data["value"]; !ok {
		data["value"] = 0
	} else {
		// Ensure it's either a number or a valid object
		switch v := val.(type) {
		case float64, int, int64:
			// Already a number, good
		case map[string]interface{}:
			// Object with amount/currency, good
		case string:
			// Try to keep as-is for display
		default:
			_ = v // Suppress unused variable warning
			data["value"] = 0
		}
	}

	// Handle weight - can be number or object with amount/unit
	if wt, ok := data["weight"]; !ok {
		data["weight"] = 0
	} else {
		// Ensure it's either a number or a valid object
		switch w := wt.(type) {
		case float64, int, int64:
			// Already a number, good
		case map[string]interface{}:
			// Object with amount/unit, good
		case string:
			// Try to keep as-is for display
		default:
			_ = w // Suppress unused variable warning
			data["weight"] = 0
		}
	}

	// Ensure attunement is a boolean - also check alternative field name
	if att, ok := data["attunement"]; !ok {
		// Check for requires_attunement alternative
		if reqAtt, hasReqAtt := data["requires_attunement"]; hasReqAtt {
			switch a := reqAtt.(type) {
			case bool:
				data["attunement"] = a
			case string:
				data["attunement"] = strings.ToLower(a) == "true" || strings.ToLower(a) == "yes" || a == "required"
			default:
				data["attunement"] = false
			}
		} else {
			data["attunement"] = false
		}
	} else {
		switch a := att.(type) {
		case bool:
			// Already boolean, good
		case string:
			// Convert string to bool
			data["attunement"] = strings.ToLower(a) == "true" || strings.ToLower(a) == "yes" || a == "required"
		default:
			data["attunement"] = false
		}
	}

	// Track unexpected fields for debugging
	if len(unexpectedFields) > 0 {
		data["_raw"] = unexpectedFields
	}

	return data
}
