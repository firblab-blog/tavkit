package services

import (
	"context"
	"encoding/json"
	"math/rand"
	"strings"

	"go.uber.org/zap"
)

// CritterGenerationRequest represents critter generation parameters
type CritterGenerationRequest struct {
	CritterType      string  `json:"critter_type"`
	Size             string  `json:"size"`
	Temperament      string  `json:"temperament"`
	Habitat          string  `json:"habitat"`
	SpecialRequests  string  `json:"special_requests,omitempty"`
	CampaignID       *string `json:"campaign_id,omitempty"`      // Campaign ID for Python to fetch context
	CampaignContext  *string `json:"campaign_context,omitempty"` // Kept for backward compatibility with direct providers
	GameSystem       string  `json:"game_system,omitempty"`
	OllamaCapability string  `json:"ollama_capability,omitempty"`
	MaxTokens        *int    `json:"max_tokens,omitempty"`
	Timeout          *int    `json:"timeout,omitempty"`
}

// GenerateCritter calls AI service to generate a critter
// Returns map[string]interface{} for flexible frontend handling (matching Dialogue pattern)
func (c *AIClient) GenerateCritter(ctx context.Context, req CritterGenerationRequest) (map[string]interface{}, error) {
	// Generate a random seed to encourage unique responses each time
	randomSeed := rand.Intn(1000000)

	params := map[string]interface{}{
		"critter_type":      req.CritterType,
		"size":              req.Size,
		"temperament":       req.Temperament,
		"habitat":           req.Habitat,
		"special_requests":  req.SpecialRequests,
		"campaign_id":       req.CampaignID,      // Send campaign ID for Python proxy
		"campaign_context":  req.CampaignContext, // Send full context for direct providers (Anthropic/OpenAI)
		"game_system":       req.GameSystem,
		"variation_seed":    randomSeed,
		"ollama_capability": req.OllamaCapability,
	}
	if req.MaxTokens != nil {
		params["max_tokens"] = *req.MaxTokens
	}

	content, provider, err := c.generateWithProvider(ctx, "critter", params)
	if err != nil {
		return nil, err
	}

	var critter map[string]interface{}
	if err := json.Unmarshal([]byte(content), &critter); err != nil {
		// Check if the response looks truncated (incomplete JSON)
		isTruncated := !strings.HasSuffix(strings.TrimSpace(content), "}")

		// JSON parse failed - log details
		c.logger.Warn("Failed to parse AI response as JSON, creating fallback structure",
			zap.Error(err),
			zap.Int("content_length", len(content)),
			zap.Bool("appears_truncated", isTruncated))

		// Try to salvage truncated JSON
		if isTruncated {
			salvaged := salvageTruncatedCritterJSON(content)
			if salvaged != nil {
				c.logger.Info("Successfully salvaged truncated critter JSON")
				salvaged["provider"] = provider
				salvaged["_parse_warning"] = "Response was truncated but partially recovered"
				return validateCritterResponse(salvaged), nil
			}
		}

		critter = map[string]interface{}{
			"name":                "Unknown Critter",
			"species":             "",
			"critter_type":        req.CritterType,
			"size":                req.Size,
			"temperament":         req.Temperament,
			"habitat":             req.Habitat,
			"description":         content, // Preserve raw response
			"behavior":            "",
			"stats":               map[string]interface{}{},
			"special_abilities":   []interface{}{},
			"uses":                []interface{}{},
			"training_difficulty": "",
			"diet":                "",
			"lifespan":            "",
			"interesting_facts":   []interface{}{},
			"encounter_notes":     "",
			"provider":            provider,
			"_parse_warning":      "AI response was not valid JSON. Raw text preserved in 'description' field.",
		}
	} else {
		// Some models (like Ollama) wrap the response in an extra key
		critter = unwrapNestedResponse(critter, "critter", "creature", "beast", "generated_critter")

		// CRITICAL: Check if name is empty or contains provider/model names
		if name, ok := critter["name"].(string); !ok || name == "" ||
			strings.ToLower(name) == "ollama" ||
			strings.Contains(strings.ToLower(name), "mistral") ||
			strings.Contains(strings.ToLower(name), "llama") {
			// Name is invalid, try to extract from species or generate one
			if species, ok := critter["species"].(string); ok && species != "" {
				critter["name"] = species
			} else {
				critter["name"] = "Unknown Critter"
			}
		}

		critter["provider"] = provider
		// Validate and normalize the response structure
		critter = validateCritterResponse(critter)
		// Strip any HTML tags that some Ollama models include in responses
		critter = stripHTMLFromMap(critter)
	}

	return critter, nil
}

// salvageTruncatedCritterJSON attempts to recover a valid JSON object from truncated content
func salvageTruncatedCritterJSON(content string) map[string]interface{} {
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

// validateCritterResponse ensures the AI response has required critter structure
// If missing fields or wrong types, it provides defaults to prevent frontend crashes
func validateCritterResponse(data map[string]interface{}) map[string]interface{} {
	// Ensure name exists
	if _, ok := data["name"]; !ok {
		if title, ok := data["title"]; ok {
			data["name"] = title
		} else if creature, ok := data["creature_name"]; ok {
			data["name"] = creature
		} else {
			data["name"] = "Unknown Critter"
		}
	}

	// Ensure basic string fields exist
	for _, field := range []string{"species", "critter_type", "size", "temperament", "habitat", "description", "behavior", "training_difficulty", "diet", "lifespan", "encounter_notes"} {
		if _, ok := data[field]; !ok {
			data[field] = ""
		}
	}

	// Handle alternative field names
	if data["critter_type"] == "" {
		if ct, ok := data["type"]; ok {
			data["critter_type"] = ct
		} else if ct, ok := data["creature_type"]; ok {
			data["critter_type"] = ct
		}
	}

	if data["encounter_notes"] == "" {
		if notes, ok := data["notes"]; ok {
			data["encounter_notes"] = notes
		} else if notes, ok := data["dm_notes"]; ok {
			data["encounter_notes"] = notes
		}
	}

	// Validate stats object
	data["stats"] = validateCritterStats(data["stats"])

	// Validate special_abilities array
	data["special_abilities"] = validateSpecialAbilities(ensureArray(data["special_abilities"]))

	// Handle alternative field names for special_abilities
	if len(ensureArray(data["special_abilities"])) == 0 {
		if abilities, ok := data["abilities"]; ok {
			data["special_abilities"] = validateSpecialAbilities(ensureArray(abilities))
		} else if traits, ok := data["traits"]; ok {
			data["special_abilities"] = validateSpecialAbilities(ensureArray(traits))
		}
	}

	// Ensure array fields exist and are arrays
	data["uses"] = normalizeToStringArrayCritter(ensureArray(data["uses"]))
	data["interesting_facts"] = normalizeToStringArrayCritter(ensureArray(data["interesting_facts"]))

	// Handle alternative field names for arrays
	if len(ensureArray(data["uses"])) == 0 {
		if purposes, ok := data["purposes"]; ok {
			data["uses"] = normalizeToStringArrayCritter(ensureArray(purposes))
		} else if utility, ok := data["utility"]; ok {
			data["uses"] = normalizeToStringArrayCritter(ensureArray(utility))
		}
	}

	if len(ensureArray(data["interesting_facts"])) == 0 {
		if facts, ok := data["facts"]; ok {
			data["interesting_facts"] = normalizeToStringArrayCritter(ensureArray(facts))
		} else if trivia, ok := data["trivia"]; ok {
			data["interesting_facts"] = normalizeToStringArrayCritter(ensureArray(trivia))
		}
	}

	return data
}

// validateCritterStats ensures stats has proper structure
func validateCritterStats(value interface{}) map[string]interface{} {
	result := map[string]interface{}{
		"ac":    nil,
		"hp":    nil,
		"speed": "",
		"str":   nil,
		"dex":   nil,
		"con":   nil,
		"int":   nil,
		"wis":   nil,
		"cha":   nil,
	}

	if value == nil {
		return result
	}

	if stats, ok := value.(map[string]interface{}); ok {
		// Copy numeric fields
		for _, field := range []string{"ac", "hp", "str", "dex", "con", "int", "wis", "cha"} {
			if v, ok := stats[field]; ok {
				// Handle various numeric formats
				switch val := v.(type) {
				case float64:
					result[field] = int(val)
				case int:
					result[field] = val
				case string:
					// Try to parse string as number
					if val != "" {
						result[field] = val // Keep as string if not parseable
					}
				default:
					result[field] = val
				}
			}
		}

		// Copy speed (can be string or number)
		if speed, ok := stats["speed"]; ok {
			result["speed"] = speed
		}

		// Handle alternative field names
		if result["ac"] == nil {
			if ac, ok := stats["armor_class"]; ok {
				result["ac"] = ac
			}
		}
		if result["hp"] == nil {
			if hp, ok := stats["hit_points"]; ok {
				result["hp"] = hp
			}
		}
	}

	return result
}

// validateSpecialAbilities ensures each ability has name and description
func validateSpecialAbilities(abilities []interface{}) []interface{} {
	validated := make([]interface{}, 0, len(abilities))
	for _, ability := range abilities {
		if abilityMap, ok := ability.(map[string]interface{}); ok {
			// Ensure name exists
			if _, ok := abilityMap["name"]; !ok {
				if title, ok := abilityMap["title"]; ok {
					abilityMap["name"] = title
				} else if ability, ok := abilityMap["ability"]; ok {
					abilityMap["name"] = ability
				} else {
					abilityMap["name"] = "Unknown Ability"
				}
			}

			// Ensure description exists
			if _, ok := abilityMap["description"]; !ok {
				if desc, ok := abilityMap["desc"]; ok {
					abilityMap["description"] = desc
				} else if effect, ok := abilityMap["effect"]; ok {
					abilityMap["description"] = effect
				} else {
					abilityMap["description"] = ""
				}
			}

			validated = append(validated, abilityMap)
		} else if abilityStr, ok := ability.(string); ok {
			// String ability - wrap it
			validated = append(validated, map[string]interface{}{
				"name":        abilityStr,
				"description": "",
			})
		}
	}
	return validated
}

// normalizeToStringArrayCritter converts an array of mixed types to string array
func normalizeToStringArrayCritter(items []interface{}) []interface{} {
	normalized := make([]interface{}, 0, len(items))
	for _, item := range items {
		switch v := item.(type) {
		case string:
			normalized = append(normalized, v)
		case map[string]interface{}:
			// Extract text from object
			if text, ok := v["text"]; ok {
				normalized = append(normalized, text)
			} else if desc, ok := v["description"]; ok {
				normalized = append(normalized, desc)
			} else if name, ok := v["name"]; ok {
				normalized = append(normalized, name)
			} else {
				// Fallback to JSON representation
				if jsonBytes, err := json.Marshal(v); err == nil {
					normalized = append(normalized, string(jsonBytes))
				}
			}
		default:
			normalized = append(normalized, item)
		}
	}
	return normalized
}
