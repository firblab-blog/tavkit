package services

import (
	"context"
	"encoding/json"
	"math/rand"
	"strings"

	"go.uber.org/zap"
)

// NPCGenerateRequest represents NPC generation request
type NPCGenerateRequest struct {
	Race             string  `json:"race"`
	Class            string  `json:"class"`
	Level            int     `json:"level"`
	Role             string  `json:"role"`
	Personality      string  `json:"personality"`
	SpecialRequests  string  `json:"special_requests,omitempty"`
	CampaignID       *string `json:"campaign_id,omitempty"`      // Campaign ID for Python proxy
	CampaignContext  *string `json:"campaign_context,omitempty"` // Full context for direct providers
	GameSystem       string  `json:"game_system,omitempty"`
	OllamaCapability string  `json:"ollama_capability,omitempty"` // "standard" or "low_power"
	MaxTokens        *int    `json:"max_tokens,omitempty"`
	Timeout          *int    `json:"timeout,omitempty"`
}

// GenerateNPC calls AI service to generate an NPC
// Returns map[string]interface{} for flexible frontend handling
func (c *AIClient) GenerateNPC(ctx context.Context, req NPCGenerateRequest) (map[string]interface{}, error) {
	// Generate a random seed to encourage unique responses each time
	randomSeed := rand.Intn(1000000)

	params := map[string]interface{}{
		"race":              req.Race,
		"class":             req.Class,
		"level":             req.Level,
		"role":              req.Role,
		"personality":       req.Personality,
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

	content, provider, err := c.generateWithProvider(ctx, "npc", params)
	if err != nil {
		return nil, err
	}

	var npc map[string]interface{}
	if err := json.Unmarshal([]byte(content), &npc); err != nil {
		// Check if the response looks truncated (incomplete JSON)
		isTruncated := !strings.HasSuffix(strings.TrimSpace(content), "}")

		// JSON parse failed - log details
		c.logger.Warn("Failed to parse AI response as JSON, creating fallback structure",
			zap.Error(err),
			zap.Int("content_length", len(content)),
			zap.Bool("appears_truncated", isTruncated))

		// Try to salvage truncated JSON
		if isTruncated {
			salvaged := salvageTruncatedNPCJSON(content)
			if salvaged != nil {
				c.logger.Info("Successfully salvaged truncated NPC JSON")
				salvaged["provider"] = provider
				salvaged["_parse_warning"] = "Response was truncated but partially recovered"
				return validateNPCResponse(salvaged), nil
			}
		}

		npc = map[string]interface{}{
			"name":       "Generated NPC",
			"race":       req.Race,
			"class":      req.Class,
			"level":      req.Level,
			"alignment":  "",
			"appearance": "",
			"personality": map[string]interface{}{
				"traits": []interface{}{},
				"ideals": "",
				"bonds":  "",
				"flaws":  "",
			},
			"background":     content, // Preserve raw response
			"motivation":     "",
			"abilities":      map[string]interface{}{"STR": 10, "DEX": 10, "CON": 10, "INT": 10, "WIS": 10, "CHA": 10},
			"skills":         []interface{}{},
			"equipment":      []interface{}{},
			"role":           req.Role,
			"plot_hooks":     []interface{}{},
			"provider":       provider,
			"_parse_warning": "AI response was not valid JSON. Raw text preserved in 'background' field.",
		}
	} else {
		// Some models (like Ollama) wrap the response in an extra key
		npc = unwrapNestedResponse(npc, "npc", "character", "generated_npc")

		// CRITICAL: Check if name is empty or contains provider/model names
		if name, ok := npc["name"].(string); !ok || name == "" ||
			strings.ToLower(name) == "ollama" ||
			strings.Contains(strings.ToLower(name), "mistral") ||
			strings.Contains(strings.ToLower(name), "llama") {
			// Name is invalid, generate a placeholder
			npc["name"] = "Unknown NPC"
		}

		npc["provider"] = provider
		// Validate and normalize the response structure
		npc = validateNPCResponse(npc)
		// Strip any HTML tags that some Ollama models include in responses
		npc = stripHTMLFromMap(npc)
	}

	return npc, nil
}

// salvageTruncatedNPCJSON attempts to recover a valid JSON object from truncated content
func salvageTruncatedNPCJSON(content string) map[string]interface{} {
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

// validateNPCResponse ensures the AI response has required NPC structure
// If missing fields or wrong types, it provides defaults to prevent frontend crashes
// This validator is flexible and handles alternative field names that different models might use
func validateNPCResponse(data map[string]interface{}) map[string]interface{} {
	// Expected fields for tracking unexpected ones
	expectedFields := map[string]bool{
		"name": true, "race": true, "class": true, "level": true, "alignment": true,
		"appearance": true, "personality": true, "background": true, "motivation": true,
		"abilities": true, "stats": true, "ability_scores": true, "attributes": true,
		"skills": true, "equipment": true, "role": true, "plot_hooks": true,
		"combat": true, "hp": true, "ac": true, "speed": true, "hit_points": true,
		"armor_class": true, "initiative": true, "saving_throws": true,
		"damage_resistances": true, "damage_immunities": true, "condition_immunities": true,
		"provider": true, "_parse_warning": true, "_raw": true,
		// Alternative field names that get normalized
		"personality_traits": true, "traits": true, "character_traits": true,
		"ability_modifiers": true, "strength": true, "dexterity": true,
		"constitution": true, "intelligence": true, "wisdom": true, "charisma": true,
		"str": true, "dex": true, "con": true, "int": true, "wis": true, "cha": true,
		"health": true, "movement": true, "xp": true, "experience": true,
		"proficiency": true, "proficiency_bonus": true, "hit_dice": true,
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
		data["name"] = "Unknown NPC"
	}

	// Ensure basic string fields exist
	for _, field := range []string{"race", "class", "alignment", "appearance", "background", "motivation", "role"} {
		if _, ok := data[field]; !ok {
			data[field] = ""
		}
	}

	// Ensure level exists as a number
	if _, ok := data["level"]; !ok {
		data["level"] = 1
	}

	// ==========================================================================
	// PERSONALITY HANDLING - Be flexible with different structures
	// ==========================================================================
	data["personality"] = normalizePersonality(data)

	// ==========================================================================
	// ABILITIES/STATS HANDLING - Check multiple possible field names and formats
	// ==========================================================================
	data["abilities"] = normalizeAbilities(data)

	// ==========================================================================
	// COMBAT STATS - Preserve hp, ac, etc. in a separate section if provided
	// ==========================================================================
	data["combat"] = extractCombatStats(data)

	// ==========================================================================
	// ARRAY FIELDS - Ensure they're actually arrays
	// ==========================================================================
	// Skills and plot_hooks are simple arrays
	data["skills"] = ensureArray(data["skills"])
	data["plot_hooks"] = ensureArray(data["plot_hooks"])

	// Equipment may come as categorized object like {Accessories: [...], Armor: [...], Weapons: [...]}
	data["equipment"] = flattenCategorizedEquipment(data["equipment"])

	// Track unexpected fields for debugging
	if len(unexpectedFields) > 0 {
		data["_raw"] = unexpectedFields
	}

	return data
}

// flattenCategorizedEquipment handles Ollama's tendency to return equipment as categorized objects
// e.g., {"Accessories": [...], "Armor": [...], "Weapons": [...]} instead of a flat array
func flattenCategorizedEquipment(value interface{}) []interface{} {
	// Already an array - just ensure it's valid
	if arr, ok := value.([]interface{}); ok {
		return arr
	}

	// Handle nil
	if value == nil {
		return []interface{}{}
	}

	// Handle categorized map (e.g., {Accessories: [...], Armor: [...], Weapons: [...]})
	if catMap, ok := value.(map[string]interface{}); ok {
		result := make([]interface{}, 0)
		for _, categoryItems := range catMap {
			if items, isArray := categoryItems.([]interface{}); isArray {
				result = append(result, items...)
			} else if itemStr, isString := categoryItems.(string); isString {
				// Category contains a single string item
				result = append(result, itemStr)
			}
		}
		return result
	}

	// Single string value - wrap in array
	if str, ok := value.(string); ok {
		return []interface{}{str}
	}

	return []interface{}{}
}

// normalizePersonality handles various personality formats from different models
func normalizePersonality(data map[string]interface{}) map[string]interface{} {
	// Check for personality in different possible locations/formats
	personality, hasPersonality := data["personality"]

	if !hasPersonality {
		// Try alternative field names
		for _, altName := range []string{"personality_traits", "traits", "character_traits"} {
			if val, ok := data[altName]; ok {
				personality = val
				hasPersonality = true
				delete(data, altName) // Clean up alternative field
				break
			}
		}
	}

	if !hasPersonality {
		return createEmptyPersonality()
	}

	// Handle personality as a map (expected format)
	if personalityMap, isMap := personality.(map[string]interface{}); isMap {
		// Ensure personality has all required fields
		if _, ok := personalityMap["traits"]; !ok {
			personalityMap["traits"] = []interface{}{}
		} else {
			personalityMap["traits"] = ensureArray(personalityMap["traits"])
		}
		for _, field := range []string{"ideals", "bonds", "flaws"} {
			if _, ok := personalityMap[field]; !ok {
				personalityMap[field] = ""
			}
		}
		return personalityMap
	}

	// Handle personality as a string
	if personalityStr, isString := personality.(string); isString && personalityStr != "" {
		return map[string]interface{}{
			"traits": []interface{}{personalityStr},
			"ideals": "",
			"bonds":  "",
			"flaws":  "",
		}
	}

	// Handle personality as an array of traits
	if personalityArr, isArray := personality.([]interface{}); isArray {
		return map[string]interface{}{
			"traits": personalityArr,
			"ideals": "",
			"bonds":  "",
			"flaws":  "",
		}
	}

	return createEmptyPersonality()
}

// normalizeAbilities handles various ability score formats from different models
func normalizeAbilities(data map[string]interface{}) map[string]interface{} {
	defaultAbilities := map[string]interface{}{
		"STR": 10, "DEX": 10, "CON": 10, "INT": 10, "WIS": 10, "CHA": 10,
	}

	// Try to find abilities in various possible field names
	var rawAbilities interface{}
	possibleNames := []string{"abilities", "stats", "ability_scores", "attributes", "ability_modifiers"}

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
		return extractFlatAbilities(data, defaultAbilities)
	}

	// Handle abilities as a map
	if abilitiesMap, isMap := rawAbilities.(map[string]interface{}); isMap {
		return normalizeAbilityMap(abilitiesMap, defaultAbilities)
	}

	return defaultAbilities
}

// normalizeAbilityMap normalizes an ability score map, handling case variations
// and verbose formats like {"strength": {"value": 10, "modifier": -2}}
func normalizeAbilityMap(input map[string]interface{}, defaults map[string]interface{}) map[string]interface{} {
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
			// Extract just the value
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

// extractFlatAbilities looks for ability scores as flat fields at the root level
func extractFlatAbilities(data map[string]interface{}, defaults map[string]interface{}) map[string]interface{} {
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

// extractCombatStats pulls out combat-related stats that some models return
// These are preserved separately so the frontend can display them if desired
func extractCombatStats(data map[string]interface{}) map[string]interface{} {
	combat := make(map[string]interface{})

	// List of combat-related fields that models might return
	combatFields := []string{
		"hp", "hit_points", "health",
		"ac", "armor_class",
		"initiative",
		"speed", "movement",
		"xp", "experience",
		"proficiency", "proficiency_bonus",
		"hit_dice",
		"saving_throws",
		"damage_resistances",
		"damage_immunities",
		"condition_immunities",
	}

	for _, field := range combatFields {
		if val, ok := data[field]; ok {
			combat[field] = val
			// Don't delete - let the data stay in root too for backward compatibility
		}
	}

	// Only return if we found any combat stats
	if len(combat) > 0 {
		return combat
	}
	return nil
}

// createEmptyPersonality returns a properly structured empty personality object
func createEmptyPersonality() map[string]interface{} {
	return map[string]interface{}{
		"traits": []interface{}{},
		"ideals": "",
		"bonds":  "",
		"flaws":  "",
	}
}
