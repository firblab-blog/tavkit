package services

import (
	"context"
	"encoding/json"
	"math/rand"
	"strings"

	"go.uber.org/zap"
)

// MonsterGenerateRequest represents monster generation request
type MonsterGenerateRequest struct {
	MonsterType      string  `json:"monster_type"`
	Size             string  `json:"size"`
	ChallengeRating  float64 `json:"challenge_rating"`
	Environment      string  `json:"environment"`
	SpecialRequests  string  `json:"special_requests,omitempty"`
	CampaignID       *string `json:"campaign_id,omitempty"`      // Campaign ID for Python proxy
	CampaignContext  *string `json:"campaign_context,omitempty"` // Full context for direct providers
	GameSystem       string  `json:"game_system,omitempty"`
	OllamaCapability string  `json:"ollama_capability,omitempty"` // "standard" or "low_power"
	MaxTokens        *int    `json:"max_tokens,omitempty"`
	Timeout          *int    `json:"timeout,omitempty"`
}

// GenerateMonster calls AI service to generate a monster
// Returns map[string]interface{} for flexible frontend handling
func (c *AIClient) GenerateMonster(ctx context.Context, req MonsterGenerateRequest) (map[string]interface{}, error) {
	// Generate a random seed to encourage unique responses each time
	randomSeed := rand.Intn(1000000)

	params := map[string]interface{}{
		"monster_type":      req.MonsterType,
		"size":              req.Size,
		"cr":                req.ChallengeRating,
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

	content, provider, err := c.generateWithProvider(ctx, "monster", params)
	if err != nil {
		return nil, err
	}

	var monster map[string]interface{}
	if err := json.Unmarshal([]byte(content), &monster); err != nil {
		// Check if the response looks truncated (incomplete JSON)
		isTruncated := !strings.HasSuffix(strings.TrimSpace(content), "}")

		// JSON parse failed - log details
		c.logger.Warn("Failed to parse AI response as JSON, creating fallback structure",
			zap.Error(err),
			zap.Int("content_length", len(content)),
			zap.Bool("appears_truncated", isTruncated))

		// Try to salvage truncated JSON
		if isTruncated {
			salvaged := salvageTruncatedMonsterJSON(content)
			if salvaged != nil {
				c.logger.Info("Successfully salvaged truncated Monster JSON")
				salvaged["provider"] = provider
				salvaged["_parse_warning"] = "Response was truncated but partially recovered"
				return validateMonsterResponse(salvaged), nil
			}
		}

		monster = map[string]interface{}{
			"name":             "Generated Monster",
			"type":             req.MonsterType,
			"size":             req.Size,
			"alignment":        "unaligned",
			"armor_class":      10,
			"hit_points":       map[string]interface{}{"average": 10, "dice": "2d8"},
			"speed":            map[string]interface{}{"walk": 30},
			"abilities":        map[string]interface{}{"STR": 10, "DEX": 10, "CON": 10, "INT": 10, "WIS": 10, "CHA": 10},
			"senses":           map[string]interface{}{},
			"languages":        []interface{}{},
			"challenge_rating": req.ChallengeRating,
			"xp":               200,
			"traits":           []interface{}{},
			"actions":          []interface{}{},
			"lore":             content, // Preserve raw response
			"description":      content,
			"provider":         provider,
			"_parse_warning":   "AI response was not valid JSON. Raw text preserved in 'lore' field.",
		}
	} else {
		// Some models (like Ollama) wrap the response in an extra key
		monster = unwrapNestedResponse(monster, "monster", "creature", "generated_monster")

		// CRITICAL: Check if name is empty or contains provider/model names
		if name, ok := monster["name"].(string); !ok || name == "" ||
			strings.ToLower(name) == "ollama" ||
			strings.Contains(strings.ToLower(name), "mistral") ||
			strings.Contains(strings.ToLower(name), "llama") {
			// Name is invalid, generate a placeholder
			monster["name"] = "Unknown Monster"
		}

		monster["provider"] = provider
		// Validate and normalize the response structure
		monster = validateMonsterResponse(monster)
		// Strip any HTML tags that some Ollama models include in responses
		monster = stripHTMLFromMap(monster)
	}

	return monster, nil
}

// salvageTruncatedMonsterJSON attempts to recover a valid JSON object from truncated content
func salvageTruncatedMonsterJSON(content string) map[string]interface{} {
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

// validateMonsterResponse ensures the AI response has required monster structure
// If missing fields or wrong types, it provides defaults to prevent frontend crashes
// This validator is flexible and handles alternative field names that different models might use
func validateMonsterResponse(data map[string]interface{}) map[string]interface{} {
	// Expected fields for tracking unexpected ones
	expectedFields := map[string]bool{
		"name": true, "type": true, "size": true, "alignment": true, "lore": true,
		"description": true, "armor_class": true, "hit_points": true, "speed": true,
		"abilities": true, "stats": true, "ability_scores": true, "attributes": true,
		"senses": true, "languages": true, "challenge_rating": true, "cr": true, "xp": true,
		"traits": true, "actions": true, "legendary_actions": true, "lair_actions": true,
		"reactions": true, "special_abilities": true, "attacks": true,
		"damage_resistances": true, "damage_immunities": true, "condition_immunities": true,
		"damage_vulnerabilities": true, "saving_throws": true, "skills": true,
		"proficiency_bonus": true, "environment": true, "habitat": true,
		"provider": true, "_parse_warning": true, "_raw": true,
		// Alternative field names that get normalized
		"hp": true, "ac": true, "str": true, "dex": true, "con": true, "int": true, "wis": true, "cha": true,
		"strength": true, "dexterity": true, "constitution": true, "intelligence": true, "wisdom": true, "charisma": true,
		"hit_dice": true, "movement": true, "walk": true, "fly": true, "swim": true, "climb": true, "burrow": true,
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
		data["name"] = "Unknown Monster"
	}

	// Ensure basic string fields exist
	for _, field := range []string{"type", "size", "alignment", "lore"} {
		if _, ok := data[field]; !ok {
			data[field] = ""
		}
	}

	// Ensure numeric fields exist with defaults
	if _, ok := data["armor_class"]; !ok {
		data["armor_class"] = 10
	}
	if _, ok := data["challenge_rating"]; !ok {
		data["challenge_rating"] = 1
	}
	if _, ok := data["xp"]; !ok {
		data["xp"] = 200
	}

	// Ensure hit_points is proper structure
	if hp, ok := data["hit_points"]; !ok {
		data["hit_points"] = map[string]interface{}{"average": 10, "dice": "2d8"}
	} else if _, isMap := hp.(map[string]interface{}); !isMap {
		// If it's just a number, convert to proper structure
		if hpNum, isNum := hp.(float64); isNum {
			data["hit_points"] = map[string]interface{}{"average": int(hpNum), "dice": ""}
		} else {
			data["hit_points"] = map[string]interface{}{"average": 10, "dice": "2d8"}
		}
	}

	// Ensure speed is a map
	if speed, ok := data["speed"]; !ok {
		data["speed"] = map[string]interface{}{"walk": 30}
	} else if _, isMap := speed.(map[string]interface{}); !isMap {
		// If it's just a number, convert to proper structure
		if speedNum, isNum := speed.(float64); isNum {
			data["speed"] = map[string]interface{}{"walk": int(speedNum)}
		} else {
			data["speed"] = map[string]interface{}{"walk": 30}
		}
	}

	// ==========================================================================
	// ABILITIES/STATS HANDLING - Check multiple possible field names and formats
	// ==========================================================================
	data["abilities"] = normalizeMonsterAbilities(data)

	// Normalize senses - Ollama may return various formats
	data["senses"] = normalizeSenses(data["senses"])

	// CRITICAL: Ensure array fields are actually arrays (this caused the crash!)
	// Uses ensureArray from ai_client.go
	arrayFields := []string{"languages", "damage_resistances", "damage_immunities", "condition_immunities", "damage_vulnerabilities", "traits", "actions", "legendary_actions", "lair_actions", "reactions", "special_abilities", "attacks", "skills"}
	for _, field := range arrayFields {
		data[field] = ensureArray(data[field])
	}

	// Track unexpected fields for debugging
	if len(unexpectedFields) > 0 {
		data["_raw"] = unexpectedFields
	}

	return data
}

// normalizeMonsterAbilities handles various ability score formats from different models
func normalizeMonsterAbilities(data map[string]interface{}) map[string]interface{} {
	defaultAbilities := map[string]interface{}{
		"STR": 10, "DEX": 10, "CON": 10, "INT": 10, "WIS": 10, "CHA": 10,
	}

	// Try to find abilities in various possible field names
	var rawAbilities interface{}
	possibleNames := []string{"abilities", "stats", "ability_scores", "attributes"}

	for _, name := range possibleNames {
		if val, ok := data[name]; ok {
			rawAbilities = val
			if name != "abilities" {
				delete(data, name) // Clean up alternative field name
			}
			break
		}
	}

	if rawAbilities == nil {
		// No abilities found - check for flat stat fields at root level
		return extractMonsterFlatAbilities(data, defaultAbilities)
	}

	// Handle abilities as a map
	if abilitiesMap, isMap := rawAbilities.(map[string]interface{}); isMap {
		return normalizeMonsterAbilityMap(abilitiesMap, defaultAbilities)
	}

	return defaultAbilities
}

// normalizeMonsterAbilityMap normalizes an ability score map, handling case variations
func normalizeMonsterAbilityMap(input map[string]interface{}, defaults map[string]interface{}) map[string]interface{} {
	result := make(map[string]interface{})

	// Copy defaults first
	for k, v := range defaults {
		result[k] = v
	}

	// Map of lowercase -> uppercase stat names
	statMap := map[string]string{
		"str": "STR", "strength": "STR",
		"dex": "DEX", "dexterity": "DEX",
		"con": "CON", "constitution": "CON",
		"int": "INT", "intelligence": "INT",
		"wis": "WIS", "wisdom": "WIS",
		"cha": "CHA", "charisma": "CHA",
	}

	// Process input, normalizing keys
	for key, value := range input {
		normalizedKey := strings.ToUpper(key)
		if mappedKey, ok := statMap[strings.ToLower(key)]; ok {
			normalizedKey = mappedKey
		}

		// Only set if it's a valid stat
		if _, isValidStat := defaults[normalizedKey]; isValidStat {
			// Handle verbose format: {"strength": {"value": 10, "modifier": -2}}
			if valueMap, isMap := value.(map[string]interface{}); isMap {
				if val, hasValue := valueMap["value"]; hasValue {
					result[normalizedKey] = val
				} else if score, hasScore := valueMap["score"]; hasScore {
					result[normalizedKey] = score
				}
			} else {
				result[normalizedKey] = value
			}
		}
	}

	return result
}

// extractMonsterFlatAbilities looks for ability scores as flat fields at the root level
func extractMonsterFlatAbilities(data map[string]interface{}, defaults map[string]interface{}) map[string]interface{} {
	result := make(map[string]interface{})
	for k, v := range defaults {
		result[k] = v
	}

	// Map of possible flat field names to stat keys
	flatFieldMap := map[string]string{
		"str": "STR", "strength": "STR",
		"dex": "DEX", "dexterity": "DEX",
		"con": "CON", "constitution": "CON",
		"int": "INT", "intelligence": "INT",
		"wis": "WIS", "wisdom": "WIS",
		"cha": "CHA", "charisma": "CHA",
	}

	for fieldName, statKey := range flatFieldMap {
		if val, ok := data[fieldName]; ok {
			result[statKey] = val
			delete(data, fieldName) // Clean up the flat field
		}
		// Also check uppercase
		if val, ok := data[strings.ToUpper(fieldName)]; ok {
			result[statKey] = val
			delete(data, strings.ToUpper(fieldName))
		}
	}

	return result
}

// normalizeSenses handles various Ollama output formats for senses
// Expected output: {"darkvision": 60, "blindsight": 30}
// Ollama may return: {"darkvision": {"distance": 60}}, "darkvision 60 ft.", etc.
func normalizeSenses(value interface{}) map[string]interface{} {
	result := make(map[string]interface{})

	switch v := value.(type) {
	case map[string]interface{}:
		for key, val := range v {
			switch sensVal := val.(type) {
			case float64:
				result[key] = int(sensVal)
			case int:
				result[key] = sensVal
			case string:
				// Try to extract number from string like "60 feet" or "60 ft."
				result[key] = sensVal
			case map[string]interface{}:
				// Handle nested format like {"distance": 60, "range": 60}
				if dist, ok := sensVal["distance"]; ok {
					if num, ok := dist.(float64); ok {
						result[key] = int(num)
					} else {
						result[key] = dist
					}
				} else if rng, ok := sensVal["range"]; ok {
					if num, ok := rng.(float64); ok {
						result[key] = int(num)
					} else {
						result[key] = rng
					}
				} else if ft, ok := sensVal["feet"]; ok {
					if num, ok := ft.(float64); ok {
						result[key] = int(num)
					} else {
						result[key] = ft
					}
				}
			}
		}
	case string:
		// Handle string format like "darkvision 60 ft., blindsight 30 ft."
		result["description"] = v
	case []interface{}:
		// Handle array format
		for _, item := range v {
			if str, ok := item.(string); ok {
				result["description"] = str
				break
			}
		}
	}

	return result
}
