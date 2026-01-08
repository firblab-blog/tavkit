package services

import (
	"context"
	"encoding/json"
	"math/rand"
	"strings"

	"go.uber.org/zap"
)

// TavernGenerateRequest represents tavern generation request
type TavernGenerateRequest struct {
	Type            string  `json:"type"`
	Quality         string  `json:"quality"`
	Size            string  `json:"size"`
	SpecialRequests string  `json:"special_requests,omitempty"`
	CampaignContext *string `json:"campaign_context,omitempty"`
	GameSystem      string  `json:"game_system,omitempty"`
	MaxTokens       *int    `json:"max_tokens,omitempty"`
	Timeout         *int    `json:"timeout,omitempty"`
}

// GenerateTavern calls AI service to generate a tavern
// Returns map[string]interface{} for flexible frontend handling (matching Dialogue pattern)
func (c *AIClient) GenerateTavern(ctx context.Context, req TavernGenerateRequest) (map[string]interface{}, error) {
	// Generate a random seed to encourage unique responses each time
	randomSeed := rand.Intn(1000000)

	params := map[string]interface{}{
		"type":             req.Type,
		"quality":          req.Quality,
		"size":             req.Size,
		"special_requests": req.SpecialRequests,
		"game_system":      req.GameSystem,
		"variation_seed":   randomSeed,
	}
	if req.CampaignContext != nil {
		params["campaign_context"] = *req.CampaignContext
	}
	if req.MaxTokens != nil {
		params["max_tokens"] = *req.MaxTokens
	}

	content, provider, err := c.generateWithProvider(ctx, "tavern", params)
	if err != nil {
		return nil, err
	}

	var tavern map[string]interface{}
	if err := json.Unmarshal([]byte(content), &tavern); err != nil {
		// Check if the response looks truncated (incomplete JSON)
		isTruncated := !strings.HasSuffix(strings.TrimSpace(content), "}")

		// JSON parse failed - log details
		c.logger.Warn("Failed to parse AI response as JSON, creating fallback structure",
			zap.Error(err),
			zap.Int("content_length", len(content)),
			zap.Bool("appears_truncated", isTruncated))

		// Try to salvage truncated JSON
		if isTruncated {
			salvaged := salvageTruncatedTavernJSON(content)
			if salvaged != nil {
				c.logger.Info("Successfully salvaged truncated tavern JSON")
				salvaged["provider"] = provider
				salvaged["_parse_warning"] = "Response was truncated but partially recovered"
				return validateTavernResponse(salvaged), nil
			}
		}

		tavern = map[string]interface{}{
			"name":               "The Unknown Tavern",
			"type":               req.Type,
			"atmosphere":         "",
			"description":        content, // Preserve raw response
			"keeper_name":        "Unknown",
			"keeper_personality": "",
			"keeper_description": "",
			"menu_food":          []interface{}{},
			"menu_drinks":        []interface{}{},
			"rooms":              []interface{}{},
			"patrons":            []interface{}{},
			"events":             []interface{}{},
			"rumors":             []interface{}{},
			"special_notes":      "",
			"provider":           provider,
			"_parse_warning":     "AI response was not valid JSON. Raw text preserved in 'description' field.",
		}
	} else {
		// Some models (like Ollama) wrap the response in an extra key
		tavern = unwrapNestedResponse(tavern, "tavern", "inn", "establishment", "generated_tavern")
		tavern["provider"] = provider
		// Validate and normalize the response structure
		tavern = validateTavernResponse(tavern)
		// Strip any HTML tags that some Ollama models include in responses
		tavern = stripHTMLFromMap(tavern)
	}

	return tavern, nil
}

// salvageTruncatedTavernJSON attempts to recover a valid JSON object from truncated content
func salvageTruncatedTavernJSON(content string) map[string]interface{} {
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

// validateTavernResponse ensures the AI response has required tavern structure
// If missing fields or wrong types, it provides defaults to prevent frontend crashes
func validateTavernResponse(data map[string]interface{}) map[string]interface{} {
	// Ensure name exists
	if _, ok := data["name"]; !ok {
		if title, ok := data["title"]; ok {
			data["name"] = title
		} else if establishment, ok := data["establishment_name"]; ok {
			data["name"] = establishment
		} else {
			data["name"] = "The Unknown Tavern"
		}
	}

	// Ensure basic string fields exist
	for _, field := range []string{"type", "atmosphere", "description", "special_notes"} {
		if _, ok := data[field]; !ok {
			data[field] = ""
		}
	}

	// Handle keeper fields - can be nested object or flat fields
	if keeper, ok := data["keeper"].(map[string]interface{}); ok {
		// Extract from nested keeper object
		if name, ok := keeper["name"]; ok {
			data["keeper_name"] = name
		}
		if personality, ok := keeper["personality"]; ok {
			data["keeper_personality"] = personality
		}
		if desc, ok := keeper["description"]; ok {
			data["keeper_description"] = desc
		}
	} else if owner, ok := data["owner"].(map[string]interface{}); ok {
		// Alternative: "owner" field
		if name, ok := owner["name"]; ok {
			data["keeper_name"] = name
		}
		if personality, ok := owner["personality"]; ok {
			data["keeper_personality"] = personality
		}
		if desc, ok := owner["description"]; ok {
			data["keeper_description"] = desc
		}
	}

	// Ensure keeper fields exist at top level
	for _, field := range []string{"keeper_name", "keeper_personality", "keeper_description"} {
		if _, ok := data[field]; !ok {
			data[field] = ""
		}
	}

	// Handle menu - can be nested or separate fields
	if menu, ok := data["menu"].(map[string]interface{}); ok {
		if food, ok := menu["food"]; ok {
			data["menu_food"] = ensureArray(food)
		}
		if drinks, ok := menu["drinks"]; ok {
			data["menu_drinks"] = ensureArray(drinks)
		}
	}

	// Ensure array fields exist and are arrays
	data["menu_food"] = ensureArray(data["menu_food"])
	data["menu_drinks"] = ensureArray(data["menu_drinks"])
	data["rooms"] = ensureArray(data["rooms"])
	data["patrons"] = ensureArray(data["patrons"])
	data["events"] = ensureArray(data["events"])
	data["rumors"] = ensureArray(data["rumors"])

	// Handle alternative field names for arrays
	if accommodations, ok := data["accommodations"]; ok && len(ensureArray(data["rooms"])) == 0 {
		data["rooms"] = ensureArray(accommodations)
	}
	if currentPatrons, ok := data["current_patrons"]; ok && len(ensureArray(data["patrons"])) == 0 {
		data["patrons"] = ensureArray(currentPatrons)
	}
	if gossip, ok := data["gossip"]; ok && len(ensureArray(data["rumors"])) == 0 {
		data["rumors"] = ensureArray(gossip)
	}

	// Validate menu items have required fields
	data["menu_food"] = validateMenuItems(ensureArray(data["menu_food"]))
	data["menu_drinks"] = validateMenuItems(ensureArray(data["menu_drinks"]))

	// Validate rooms have required fields
	data["rooms"] = validateRooms(ensureArray(data["rooms"]))

	// Validate patrons have required fields
	data["patrons"] = validatePatrons(ensureArray(data["patrons"]))

	return data
}

// validateMenuItems ensures each menu item has name, description, price
func validateMenuItems(items []interface{}) []interface{} {
	validated := make([]interface{}, 0, len(items))
	for _, item := range items {
		if itemMap, ok := item.(map[string]interface{}); ok {
			if _, ok := itemMap["name"]; !ok {
				itemMap["name"] = "Unknown Item"
			}
			if _, ok := itemMap["description"]; !ok {
				itemMap["description"] = ""
			}
			if _, ok := itemMap["price"]; !ok {
				if cost, ok := itemMap["cost"]; ok {
					itemMap["price"] = cost
				} else {
					itemMap["price"] = "1 cp"
				}
			}
			validated = append(validated, itemMap)
		} else if itemStr, ok := item.(string); ok {
			// String item - wrap it
			validated = append(validated, map[string]interface{}{
				"name":        itemStr,
				"description": "",
				"price":       "1 cp",
			})
		}
	}
	return validated
}

// validateRooms ensures each room has type, description, price, available
func validateRooms(rooms []interface{}) []interface{} {
	validated := make([]interface{}, 0, len(rooms))
	for _, room := range rooms {
		if roomMap, ok := room.(map[string]interface{}); ok {
			if _, ok := roomMap["type"]; !ok {
				if name, ok := roomMap["name"]; ok {
					roomMap["type"] = name
				} else {
					roomMap["type"] = "Room"
				}
			}
			if _, ok := roomMap["description"]; !ok {
				roomMap["description"] = ""
			}
			if _, ok := roomMap["price"]; !ok {
				if cost, ok := roomMap["cost"]; ok {
					roomMap["price"] = cost
				} else {
					roomMap["price"] = "5 sp"
				}
			}
			if _, ok := roomMap["available"]; !ok {
				if count, ok := roomMap["count"]; ok {
					roomMap["available"] = count
				} else {
					roomMap["available"] = 1
				}
			}
			validated = append(validated, roomMap)
		}
	}
	return validated
}

// validatePatrons ensures each patron has name, race, description
func validatePatrons(patrons []interface{}) []interface{} {
	validated := make([]interface{}, 0, len(patrons))
	for _, patron := range patrons {
		if patronMap, ok := patron.(map[string]interface{}); ok {
			if _, ok := patronMap["name"]; !ok {
				patronMap["name"] = "Unknown Patron"
			}
			if _, ok := patronMap["race"]; !ok {
				if species, ok := patronMap["species"]; ok {
					patronMap["race"] = species
				} else {
					patronMap["race"] = "Human"
				}
			}
			if _, ok := patronMap["description"]; !ok {
				patronMap["description"] = ""
			}
			// hook is optional, leave as-is
			validated = append(validated, patronMap)
		} else if patronStr, ok := patron.(string); ok {
			// String patron - wrap it
			validated = append(validated, map[string]interface{}{
				"name":        patronStr,
				"race":        "Human",
				"description": "",
			})
		}
	}
	return validated
}
