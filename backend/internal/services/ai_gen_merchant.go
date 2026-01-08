package services

import (
	"context"
	"encoding/json"
	"math/rand"
	"strings"

	"go.uber.org/zap"
)

// MerchantGenerationRequest represents merchant generation parameters
type MerchantGenerationRequest struct {
	ShopType         string `json:"shop_type"`
	Quality          string `json:"quality"`
	Size             string `json:"size"`
	PartyLevel       string `json:"party_level,omitempty"`
	SpecialRequests  string `json:"special_requests,omitempty"`
	CampaignContext  string `json:"campaign_context,omitempty"`
	GameSystem       string `json:"game_system,omitempty"`
	OllamaCapability string `json:"ollama_capability,omitempty"`
	MaxTokens        *int   `json:"max_tokens,omitempty"`
	Timeout          *int   `json:"timeout,omitempty"`
}

// GenerateMerchant calls AI service to generate a merchant
// Returns map[string]interface{} for flexible frontend handling (matching Dialogue pattern)
func (c *AIClient) GenerateMerchant(ctx context.Context, req MerchantGenerationRequest) (map[string]interface{}, error) {
	// Generate a random seed to encourage unique responses each time
	randomSeed := rand.Intn(1000000)

	params := map[string]interface{}{
		"shop_type":         req.ShopType,
		"quality":           req.Quality,
		"size":              req.Size,
		"party_level":       req.PartyLevel,
		"special_requests":  req.SpecialRequests,
		"campaign_context":  req.CampaignContext,
		"game_system":       req.GameSystem,
		"ollama_capability": req.OllamaCapability,
		"variation_seed":    randomSeed,
	}
	if req.MaxTokens != nil {
		params["max_tokens"] = *req.MaxTokens
	}

	content, provider, err := c.generateWithProvider(ctx, "merchant", params)
	if err != nil {
		return nil, err
	}

	var merchant map[string]interface{}
	if err := json.Unmarshal([]byte(content), &merchant); err != nil {
		// Check if the response looks truncated (incomplete JSON)
		isTruncated := !strings.HasSuffix(strings.TrimSpace(content), "}")

		// JSON parse failed - log details
		c.logger.Warn("Failed to parse AI response as JSON, creating fallback structure",
			zap.Error(err),
			zap.Int("content_length", len(content)),
			zap.Bool("appears_truncated", isTruncated))

		// Try to salvage truncated JSON
		if isTruncated {
			salvaged := salvageTruncatedMerchantJSON(content)
			if salvaged != nil {
				c.logger.Info("Successfully salvaged truncated merchant JSON")
				salvaged["provider"] = provider
				salvaged["_parse_warning"] = "Response was truncated but partially recovered"
				return validateMerchantResponse(salvaged), nil
			}
		}

		merchant = map[string]interface{}{
			"name":               "Unknown Shop",
			"shop_type":          req.ShopType,
			"atmosphere":         "",
			"description":        content, // Preserve raw response
			"location":           "",
			"owner_name":         "Unknown",
			"owner_personality":  "",
			"owner_description":  "",
			"inventory":          []interface{}{},
			"services":           []interface{}{},
			"special_items":      []interface{}{},
			"rumors":             []interface{}{},
			"recently_sold":      []interface{}{},
			"special_notes":      "",
			"haggle_willingness": "",
			"provider":           provider,
			"_parse_warning":     "AI response was not valid JSON. Raw text preserved in 'description' field.",
		}
	} else {
		// Some models (like Ollama) wrap the response in an extra key
		merchant = unwrapNestedResponse(merchant, "merchant", "shop", "store", "generated_merchant")
		merchant["provider"] = provider
		// Validate and normalize the response structure
		merchant = validateMerchantResponse(merchant)
		// Strip any HTML tags that some Ollama models include in responses
		merchant = stripHTMLFromMap(merchant)
	}

	return merchant, nil
}

// salvageTruncatedMerchantJSON attempts to recover a valid JSON object from truncated content
func salvageTruncatedMerchantJSON(content string) map[string]interface{} {
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

// normalizeHaggleWillingness ensures haggle_willingness matches DB CHECK constraint:
// 'never', 'rarely', 'sometimes', 'often', 'always' (or empty string)
func normalizeHaggleWillingness(value interface{}) string {
	if value == nil {
		return ""
	}

	validValues := map[string]bool{
		"never":     true,
		"rarely":    true,
		"sometimes": true,
		"often":     true,
		"always":    true,
	}

	if s, ok := value.(string); ok {
		lower := strings.ToLower(strings.TrimSpace(s))
		// Direct match
		if validValues[lower] {
			return lower
		}
		// Empty is allowed (nullable field)
		if lower == "" {
			return ""
		}
		// Map common variations
		switch lower {
		case "no", "none", "refuses", "fixed", "firm", "non-negotiable", "no haggling", "no bargaining":
			return "never"
		case "seldom", "reluctant", "hesitant", "unwilling", "resistant":
			return "rarely"
		case "moderate", "occasional", "depends", "maybe", "willing", "open", "negotiable", "open to negotiation", "flexible":
			return "sometimes"
		case "frequent", "eager", "enthusiastic", "loves to haggle", "enjoys":
			return "often"
		case "yes", "very", "extremely", "loves", "thrives", "every time", "happy to":
			return "always"
		case "low":
			return "rarely"
		case "medium", "mid":
			return "sometimes"
		case "high":
			return "often"
		}
		// Unknown value - default to sometimes
		return "sometimes"
	}

	return ""
}

// validateMerchantResponse ensures the AI response has required merchant structure
// If missing fields or wrong types, it provides defaults to prevent frontend crashes
func validateMerchantResponse(data map[string]interface{}) map[string]interface{} {
	// Ensure name exists
	if _, ok := data["name"]; !ok {
		if shopName, ok := data["shop_name"]; ok {
			data["name"] = shopName
		} else if title, ok := data["title"]; ok {
			data["name"] = title
		} else {
			data["name"] = "Unknown Shop"
		}
	}

	// Ensure basic string fields exist
	for _, field := range []string{"shop_type", "atmosphere", "description", "location", "special_notes", "haggle_willingness"} {
		if _, ok := data[field]; !ok {
			data[field] = ""
		}
	}

	// Handle alternative field name for shop_type
	if data["shop_type"] == "" {
		if shopType, ok := data["type"]; ok {
			data["shop_type"] = shopType
		}
	}

	// Handle owner fields - can be nested object or flat fields
	if owner, ok := data["owner"].(map[string]interface{}); ok {
		// Extract from nested owner object
		if name, ok := owner["name"]; ok {
			data["owner_name"] = name
		}
		if personality, ok := owner["personality"]; ok {
			data["owner_personality"] = personality
		}
		if desc, ok := owner["description"]; ok {
			data["owner_description"] = desc
		}
		if race, ok := owner["race"]; ok {
			data["owner_race"] = race
		}
	} else if keeper, ok := data["keeper"].(map[string]interface{}); ok {
		// Alternative: "keeper" field (from tavern pattern)
		if name, ok := keeper["name"]; ok {
			data["owner_name"] = name
		}
		if personality, ok := keeper["personality"]; ok {
			data["owner_personality"] = personality
		}
		if desc, ok := keeper["description"]; ok {
			data["owner_description"] = desc
		}
	}

	// Ensure owner fields exist at top level
	for _, field := range []string{"owner_name", "owner_personality", "owner_description"} {
		if _, ok := data[field]; !ok {
			data[field] = ""
		}
	}

	// Handle haggle_willingness alternative names and normalize to valid DB enum
	var rawHaggle interface{}
	if h, ok := data["haggle_willingness"]; ok && h != "" {
		rawHaggle = h
	} else if haggle, ok := data["haggling"]; ok {
		rawHaggle = haggle
	} else if bargain, ok := data["bargaining"]; ok {
		rawHaggle = bargain
	}
	data["haggle_willingness"] = normalizeHaggleWillingness(rawHaggle)

	// Ensure array fields exist and are arrays
	// Handle categorized inventory (e.g., {Accessories: [...], Armor: [...], Weapons: [...]})
	data["inventory"] = flattenCategorizedInventory(data["inventory"])
	data["services"] = ensureArray(data["services"])
	data["special_items"] = flattenCategorizedInventory(data["special_items"])
	data["rumors"] = ensureArray(data["rumors"])
	data["recently_sold"] = ensureArray(data["recently_sold"])

	// Handle alternative field names for arrays
	if items, ok := data["items"]; ok && len(ensureArray(data["inventory"])) == 0 {
		data["inventory"] = ensureArray(items)
	}
	if wares, ok := data["wares"]; ok && len(ensureArray(data["inventory"])) == 0 {
		data["inventory"] = ensureArray(wares)
	}
	if stock, ok := data["stock"]; ok && len(ensureArray(data["inventory"])) == 0 {
		data["inventory"] = ensureArray(stock)
	}
	if gossip, ok := data["gossip"]; ok && len(ensureArray(data["rumors"])) == 0 {
		data["rumors"] = ensureArray(gossip)
	}
	if magical, ok := data["magical_items"]; ok && len(ensureArray(data["special_items"])) == 0 {
		data["special_items"] = ensureArray(magical)
	}
	if rare, ok := data["rare_items"]; ok && len(ensureArray(data["special_items"])) == 0 {
		data["special_items"] = ensureArray(rare)
	}

	// Validate inventory items have required fields
	data["inventory"] = validateInventoryItems(ensureArray(data["inventory"]))
	data["special_items"] = validateInventoryItems(ensureArray(data["special_items"]))

	// Validate services have required fields
	data["services"] = validateServices(ensureArray(data["services"]))

	// Normalize rumors and recently_sold to strings
	data["rumors"] = normalizeToStringArray(ensureArray(data["rumors"]))
	data["recently_sold"] = normalizeToStringArray(ensureArray(data["recently_sold"]))

	return data
}

// validateInventoryItems ensures each inventory item has name, description, price
func validateInventoryItems(items []interface{}) []interface{} {
	validated := make([]interface{}, 0, len(items))
	for _, item := range items {
		if itemMap, ok := item.(map[string]interface{}); ok {
			if _, ok := itemMap["name"]; !ok {
				if itemName, ok := itemMap["item"]; ok {
					itemMap["name"] = itemName
				} else {
					itemMap["name"] = "Unknown Item"
				}
			}
			if _, ok := itemMap["description"]; !ok {
				itemMap["description"] = ""
			}
			if _, ok := itemMap["price"]; !ok {
				if cost, ok := itemMap["cost"]; ok {
					itemMap["price"] = cost
				} else {
					itemMap["price"] = "varies"
				}
			}
			// quantity is optional
			validated = append(validated, itemMap)
		} else if itemStr, ok := item.(string); ok {
			// String item - wrap it
			validated = append(validated, map[string]interface{}{
				"name":        itemStr,
				"description": "",
				"price":       "varies",
			})
		}
	}
	return validated
}

// validateServices ensures each service has name, description, price
func validateServices(services []interface{}) []interface{} {
	validated := make([]interface{}, 0, len(services))
	for _, service := range services {
		if serviceMap, ok := service.(map[string]interface{}); ok {
			if _, ok := serviceMap["name"]; !ok {
				if serviceName, ok := serviceMap["service"]; ok {
					serviceMap["name"] = serviceName
				} else {
					serviceMap["name"] = "Unknown Service"
				}
			}
			if _, ok := serviceMap["description"]; !ok {
				serviceMap["description"] = ""
			}
			if _, ok := serviceMap["price"]; !ok {
				if cost, ok := serviceMap["cost"]; ok {
					serviceMap["price"] = cost
				} else {
					serviceMap["price"] = "varies"
				}
			}
			validated = append(validated, serviceMap)
		} else if serviceStr, ok := service.(string); ok {
			// String service - wrap it
			validated = append(validated, map[string]interface{}{
				"name":        serviceStr,
				"description": "",
				"price":       "varies",
			})
		}
	}
	return validated
}

// flattenCategorizedInventory handles Ollama's tendency to return inventory as categorized objects
// e.g., {"Accessories": [...], "Armor": [...], "Weapons": [...]} instead of a flat array
func flattenCategorizedInventory(value interface{}) []interface{} {
	// Already an array - just ensure it's valid
	if arr, ok := value.([]interface{}); ok {
		return arr
	}

	// Handle nil
	if value == nil {
		return []interface{}{}
	}

	// Handle categorized map
	if catMap, ok := value.(map[string]interface{}); ok {
		result := make([]interface{}, 0)
		for _, categoryItems := range catMap {
			if items, isArray := categoryItems.([]interface{}); isArray {
				result = append(result, items...)
			}
		}
		return result
	}

	// Single item - wrap in array
	return []interface{}{value}
}

// normalizeToStringArray converts an array of mixed types to string array
func normalizeToStringArray(items []interface{}) []interface{} {
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
