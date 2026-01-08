package services

import (
	"context"
	"encoding/json"
	"math/rand"
	"strings"

	"go.uber.org/zap"
)

// EncounterGenerateRequest represents encounter generation request
type EncounterGenerateRequest struct {
	PartyLevel       int     `json:"party_level"`
	PartySize        int     `json:"party_size"`
	Difficulty       string  `json:"difficulty"`
	Environment      string  `json:"environment,omitempty"`
	SpecialRequests  string  `json:"special_requests,omitempty"`
	CampaignID       *string `json:"campaign_id,omitempty"`      // Campaign ID for Python proxy
	CampaignContext  *string `json:"campaign_context,omitempty"` // Full context for direct providers
	GameSystem       string  `json:"game_system,omitempty"`
	OllamaCapability string  `json:"ollama_capability,omitempty"` // "standard" or "low_power"
	MaxTokens        *int    `json:"max_tokens,omitempty"`
	Timeout          *int    `json:"timeout,omitempty"`
}

// GenerateEncounter calls AI service to generate an encounter
// Returns map[string]interface{} for flexible frontend handling (matching Critter pattern)
func (c *AIClient) GenerateEncounter(ctx context.Context, req EncounterGenerateRequest) (map[string]interface{}, error) {
	randomSeed := rand.Intn(1000000)

	params := map[string]interface{}{
		"party_level":       req.PartyLevel,
		"party_size":        req.PartySize,
		"difficulty":        req.Difficulty,
		"environment":       req.Environment,
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

	content, provider, err := c.generateWithProvider(ctx, "encounter", params)
	if err != nil {
		return nil, err
	}

	var encounter map[string]interface{}
	if err := json.Unmarshal([]byte(content), &encounter); err != nil {
		// Check if the response looks truncated (incomplete JSON)
		isTruncated := !strings.HasSuffix(strings.TrimSpace(content), "}")

		// JSON parse failed - log details
		c.logger.Warn("Failed to parse AI response as JSON, creating fallback structure",
			zap.Error(err),
			zap.Int("content_length", len(content)),
			zap.Bool("appears_truncated", isTruncated))

		// Try to salvage truncated JSON
		if isTruncated {
			salvaged := salvageTruncatedEncounterJSON(content)
			if salvaged != nil {
				c.logger.Info("Successfully salvaged truncated Encounter JSON")
				salvaged["provider"] = provider
				salvaged["_parse_warning"] = "Response was truncated but partially recovered"
				return validateEncounterResponse(salvaged), nil
			}
		}

		encounter = map[string]interface{}{
			"name":        "Generated Encounter",
			"description": content, // Preserve raw response
			"difficulty":  req.Difficulty,
			"environment": map[string]interface{}{
				"setting":  req.Environment,
				"features": []interface{}{},
				"lighting": "",
			},
			"creatures":         []interface{}{},
			"treasure":          map[string]interface{}{"coins": map[string]interface{}{}, "items": []interface{}{}},
			"xp_total":          0,
			"xp_per_player":     0,
			"expected_duration": "",
			"provider":          provider,
			"_parse_warning":    "AI response was not valid JSON. Raw text preserved in 'description' field.",
		}
	} else {
		// Some models (like Ollama) wrap the response in an extra key
		encounter = unwrapNestedResponse(encounter, "encounter", "combat", "battle", "generated_encounter")

		// CRITICAL: Check if name is empty or contains provider/model names
		if name, ok := encounter["name"].(string); !ok || name == "" ||
			strings.ToLower(name) == "ollama" ||
			strings.Contains(strings.ToLower(name), "mistral") ||
			strings.Contains(strings.ToLower(name), "llama") {
			// Name is invalid, generate a placeholder
			encounter["name"] = "Unknown Encounter"
		}

		encounter["provider"] = provider
		// Validate and normalize the response structure
		encounter = validateEncounterResponse(encounter)
		// Strip any HTML tags that some Ollama models include in responses
		encounter = stripHTMLFromMap(encounter)
	}

	return encounter, nil
}

// salvageTruncatedEncounterJSON attempts to recover a valid JSON object from truncated content
func salvageTruncatedEncounterJSON(content string) map[string]interface{} {
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

// validateEncounterResponse ensures the AI response has required encounter structure
// If missing fields or wrong types, it provides defaults to prevent frontend crashes
// This validator is flexible and handles alternative field names that different models might use
func validateEncounterResponse(data map[string]interface{}) map[string]interface{} {
	// Expected fields for tracking unexpected ones
	expectedFields := map[string]bool{
		"name": true, "title": true, "description": true, "difficulty": true,
		"environment": true, "setting": true, "terrain": true, "location": true,
		"creatures": true, "monsters": true, "enemies": true, "combatants": true,
		"treasure": true, "loot": true, "rewards": true,
		"xp_total": true, "xp_per_player": true, "experience": true, "xp": true,
		"expected_duration": true, "duration": true, "time": true,
		"tactics": true, "strategy": true, "notes": true,
		"provider": true, "_parse_warning": true, "_raw": true,
	}

	// Collect unexpected fields
	unexpectedFields := make(map[string]interface{})
	for key, value := range data {
		if !expectedFields[key] && !expectedFields[strings.ToLower(key)] {
			unexpectedFields[key] = value
		}
	}

	// Ensure name exists - check alternative field names
	if _, ok := data["name"]; !ok {
		if title, ok := data["title"]; ok {
			data["name"] = title
		} else {
			data["name"] = "Unknown Encounter"
		}
	}

	// Ensure basic string fields exist
	for _, field := range []string{"description", "difficulty", "expected_duration"} {
		if _, ok := data[field]; !ok {
			data[field] = ""
		}
	}

	// Ensure environment is a proper structure
	if env, ok := data["environment"]; !ok {
		data["environment"] = createEmptyEnvironment()
	} else if envMap, isMap := env.(map[string]interface{}); isMap {
		// Ensure environment has all required fields
		if _, ok := envMap["setting"]; !ok {
			envMap["setting"] = ""
		}
		if _, ok := envMap["lighting"]; !ok {
			envMap["lighting"] = ""
		}
		envMap["features"] = ensureArray(envMap["features"])
	} else if envStr, isString := env.(string); isString {
		// AI returned environment as a string - convert to structure
		data["environment"] = map[string]interface{}{
			"setting":  envStr,
			"features": []interface{}{},
			"lighting": "",
		}
	} else {
		data["environment"] = createEmptyEnvironment()
	}

	// Ensure creatures is an array
	data["creatures"] = ensureArray(data["creatures"])

	// Validate each creature has required fields
	if creatures, ok := data["creatures"].([]interface{}); ok {
		for i, c := range creatures {
			if creature, isMap := c.(map[string]interface{}); isMap {
				// Ensure creature has required fields
				if _, ok := creature["name"]; !ok {
					creature["name"] = "Unknown Creature"
				}
				if _, ok := creature["count"]; !ok {
					creature["count"] = 1
				}
				if _, ok := creature["cr"]; !ok {
					creature["cr"] = 1
				}
				if _, ok := creature["role"]; !ok {
					creature["role"] = ""
				}
				if _, ok := creature["tactics"]; !ok {
					creature["tactics"] = ""
				}
				creatures[i] = creature
			}
		}
	}

	// Ensure treasure is a proper structure
	if treasure, ok := data["treasure"]; !ok {
		data["treasure"] = createEmptyTreasure()
	} else if treasureMap, isMap := treasure.(map[string]interface{}); isMap {
		// Ensure treasure has coins and items
		if _, ok := treasureMap["coins"]; !ok {
			treasureMap["coins"] = map[string]interface{}{}
		}
		treasureMap["items"] = ensureArray(treasureMap["items"])
	} else {
		data["treasure"] = createEmptyTreasure()
	}

	// Ensure numeric fields exist
	if _, ok := data["xp_total"]; !ok {
		data["xp_total"] = 0
	}
	if _, ok := data["xp_per_player"]; !ok {
		data["xp_per_player"] = 0
	}

	// Track unexpected fields for debugging
	if len(unexpectedFields) > 0 {
		data["_raw"] = unexpectedFields
	}

	return data
}

// createEmptyEnvironment returns a properly structured empty environment
func createEmptyEnvironment() map[string]interface{} {
	return map[string]interface{}{
		"setting":  "",
		"features": []interface{}{},
		"lighting": "",
	}
}

// createEmptyTreasure returns a properly structured empty treasure
func createEmptyTreasure() map[string]interface{} {
	return map[string]interface{}{
		"coins": map[string]interface{}{},
		"items": []interface{}{},
	}
}
