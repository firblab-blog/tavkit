package services

import (
	"context"
	"encoding/json"
	"math/rand"
	"strings"

	"go.uber.org/zap"
)

// LocationGenerateRequest represents location generation request
type LocationGenerateRequest struct {
	Type             string  `json:"type"`
	Size             string  `json:"size"`
	DangerLevel      string  `json:"danger_level"`
	Theme            string  `json:"theme"`
	SpecialRequests  string  `json:"special_requests,omitempty"`
	CampaignID       *string `json:"campaign_id,omitempty"`      // Campaign ID for Python proxy
	CampaignContext  *string `json:"campaign_context,omitempty"` // Full context for direct providers
	GameSystem       string  `json:"game_system,omitempty"`
	OllamaCapability string  `json:"ollama_capability,omitempty"` // "standard" or "low_power"
	MaxTokens        *int    `json:"max_tokens,omitempty"`
	Timeout          *int    `json:"timeout,omitempty"`
}

// GenerateLocation calls AI service to generate a location
// Returns map[string]interface{} for flexible frontend handling
func (c *AIClient) GenerateLocation(ctx context.Context, req LocationGenerateRequest) (map[string]interface{}, error) {
	// Generate a random seed to encourage unique responses each time
	randomSeed := rand.Intn(1000000)

	params := map[string]interface{}{
		"type":              req.Type,
		"size":              req.Size,
		"danger_level":      req.DangerLevel,
		"theme":             req.Theme,
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

	content, provider, err := c.generateWithProvider(ctx, "location", params)
	if err != nil {
		return nil, err
	}

	var location map[string]interface{}
	if err := json.Unmarshal([]byte(content), &location); err != nil {
		// Check if the response looks truncated (incomplete JSON)
		isTruncated := !strings.HasSuffix(strings.TrimSpace(content), "}")

		// JSON parse failed - log details
		c.logger.Warn("Failed to parse AI response as JSON, creating fallback structure",
			zap.Error(err),
			zap.Int("content_length", len(content)),
			zap.Bool("appears_truncated", isTruncated))

		// Try to salvage truncated JSON
		if isTruncated {
			salvaged := salvageTruncatedLocationJSON(content)
			if salvaged != nil {
				c.logger.Info("Successfully salvaged truncated Location JSON")
				salvaged["provider"] = provider
				salvaged["_parse_warning"] = "Response was truncated but partially recovered"
				return validateLocationResponse(salvaged), nil
			}
		}

		location = map[string]interface{}{
			"name":           "Generated Location",
			"type":           req.Type,
			"size":           req.Size,
			"theme":          req.Theme,
			"danger_level":   req.DangerLevel,
			"description":    content, // Preserve raw response
			"features":       []interface{}{},
			"secrets":        []interface{}{},
			"factions":       []interface{}{},
			"npcs":           []interface{}{},
			"encounters":     []interface{}{},
			"map":            "",
			"provider":       provider,
			"_parse_warning": "AI response was not valid JSON. Raw text preserved in 'description' field.",
		}
	} else {
		// Some models (like Ollama) wrap the response in an extra key
		location = unwrapNestedResponse(location, "location", "place", "generated_location")

		// CRITICAL: Check if name is empty or contains provider/model names
		if name, ok := location["name"].(string); !ok || name == "" ||
			strings.ToLower(name) == "ollama" ||
			strings.Contains(strings.ToLower(name), "mistral") ||
			strings.Contains(strings.ToLower(name), "llama") {
			// Name is invalid, generate a placeholder
			location["name"] = "Unknown Location"
		}

		location["provider"] = provider
		// Validate and normalize the response structure
		location = validateLocationResponse(location)
		// Strip any HTML tags that some Ollama models include in responses
		location = stripHTMLFromMap(location)
	}

	return location, nil
}

// salvageTruncatedLocationJSON attempts to recover a valid JSON object from truncated content
func salvageTruncatedLocationJSON(content string) map[string]interface{} {
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

// normalizeLocationType ensures type matches DB CHECK constraint:
// 'settlement', 'dungeon', 'tavern', 'shop', 'temple', 'wilderness', 'ruins', 'lair', 'other'
func normalizeLocationType(value interface{}) string {
	validTypes := map[string]bool{
		"settlement": true,
		"dungeon":    true,
		"tavern":     true,
		"shop":       true,
		"temple":     true,
		"wilderness": true,
		"ruins":      true,
		"lair":       true,
		"other":      true,
	}

	if s, ok := value.(string); ok {
		lower := strings.ToLower(strings.TrimSpace(s))
		// Direct match
		if validTypes[lower] {
			return lower
		}
		// Map common variations
		switch lower {
		case "town", "city", "village", "hamlet", "outpost", "camp", "fort", "fortress", "castle", "keep", "stronghold", "encampment", "colony":
			return "settlement"
		case "cave", "cavern", "crypt", "tomb", "catacomb", "mine", "underground", "labyrinth", "maze", "sewer":
			return "dungeon"
		case "inn", "pub", "bar", "alehouse", "brewhouse", "drinking hall", "roadhouse":
			return "tavern"
		case "store", "market", "merchant", "bazaar", "trading post", "emporium", "boutique", "stall":
			return "shop"
		case "shrine", "church", "cathedral", "monastery", "abbey", "chapel", "sanctuary", "holy site", "sacred grove":
			return "temple"
		case "forest", "woods", "jungle", "swamp", "marsh", "desert", "mountain", "plains", "grassland", "tundra", "coast", "beach", "island", "hills", "valley", "river", "lake", "natural", "outdoors":
			return "wilderness"
		case "ruin", "ancient", "abandoned", "desolate", "crumbling", "fallen", "destroyed", "ruined":
			return "ruins"
		case "den", "nest", "hideout", "hideaway", "creature lair", "dragon lair", "monster den", "burrow", "warren":
			return "lair"
		}
		// If empty, return other
		if lower == "" {
			return "other"
		}
	}

	return "other"
}

// validateLocationResponse ensures the AI response has required location structure
// If missing fields or wrong types, it provides defaults to prevent frontend crashes
// This validator is flexible and handles alternative field names that different models might use
func validateLocationResponse(data map[string]interface{}) map[string]interface{} {
	// Expected fields for tracking unexpected ones
	expectedFields := map[string]bool{
		"name": true, "type": true, "size": true, "theme": true, "description": true,
		"danger_level": true, "map": true, "summary": true, "region": true,
		"features": true, "notable_features": true, "landmarks": true,
		"secrets": true, "hidden_areas": true, "mysteries": true,
		"factions": true, "groups": true, "organizations": true,
		"npcs": true, "notable_npcs": true, "inhabitants": true, "residents": true,
		"encounters": true, "encounter_hooks": true, "adventure_hooks": true, "plot_hooks": true,
		"population": true, "government": true, "established": true, "atmosphere": true,
		"history": true, "lore": true, "background": true,
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
		data["name"] = "Unknown Location"
	}

	// Ensure basic string fields exist and normalize type to valid DB enum
	data["type"] = normalizeLocationType(data["type"])

	for _, field := range []string{"theme", "description", "map"} {
		if _, ok := data[field]; !ok {
			data[field] = ""
		}
	}

	// Handle alternative field names for description
	if data["description"] == "" {
		if summary, ok := data["summary"].(string); ok && summary != "" {
			data["description"] = summary
		}
	}

	// CRITICAL: Ensure array fields are actually arrays (same pattern as Monster)
	// Uses ensureArray from ai_client.go
	// Also handle alternative field names
	if data["features"] == nil || len(ensureArray(data["features"])) == 0 {
		if alt := data["notable_features"]; alt != nil {
			data["features"] = alt
		} else if alt := data["landmarks"]; alt != nil {
			data["features"] = alt
		}
	}
	if data["npcs"] == nil || len(ensureArray(data["npcs"])) == 0 {
		if alt := data["notable_npcs"]; alt != nil {
			data["npcs"] = alt
		} else if alt := data["inhabitants"]; alt != nil {
			data["npcs"] = alt
		} else if alt := data["residents"]; alt != nil {
			data["npcs"] = alt
		}
	}
	if data["encounters"] == nil || len(ensureArray(data["encounters"])) == 0 {
		if alt := data["encounter_hooks"]; alt != nil {
			data["encounters"] = alt
		} else if alt := data["adventure_hooks"]; alt != nil {
			data["encounters"] = alt
		} else if alt := data["plot_hooks"]; alt != nil {
			data["encounters"] = alt
		}
	}
	if data["factions"] == nil || len(ensureArray(data["factions"])) == 0 {
		if alt := data["groups"]; alt != nil {
			data["factions"] = alt
		} else if alt := data["organizations"]; alt != nil {
			data["factions"] = alt
		}
	}
	if data["secrets"] == nil || len(ensureArray(data["secrets"])) == 0 {
		if alt := data["hidden_areas"]; alt != nil {
			data["secrets"] = alt
		} else if alt := data["mysteries"]; alt != nil {
			data["secrets"] = alt
		}
	}

	arrayFields := []string{"features", "secrets", "factions", "npcs", "encounters"}
	for _, field := range arrayFields {
		data[field] = ensureArray(data[field])
	}

	// Track unexpected fields for debugging
	if len(unexpectedFields) > 0 {
		data["_raw"] = unexpectedFields
	}

	return data
}
