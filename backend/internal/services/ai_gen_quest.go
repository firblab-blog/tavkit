package services

import (
	"context"
	"encoding/json"
	"math/rand"
	"strings"

	"go.uber.org/zap"
)

// QuestGenerateRequest represents quest generation request
type QuestGenerateRequest struct {
	Type             string   `json:"type"`
	Category         string   `json:"category,omitempty"`
	PartyLevel       int      `json:"party_level"`
	PartySize        int      `json:"party_size,omitempty"`
	MoralAmbiguity   bool     `json:"moral_ambiguity,omitempty"`
	CombatIntensity  string   `json:"combat_intensity"`
	QuestLength      string   `json:"quest_length,omitempty"`
	IncludeFactions  []string `json:"include_factions,omitempty"`
	IncludeLocations []string `json:"include_locations,omitempty"`
	IncludeNPCs      []string `json:"include_npcs,omitempty"`
	SpecialRequests  string   `json:"special_requests,omitempty"`
	CampaignID       *string  `json:"campaign_id,omitempty"`      // Campaign ID for Python proxy
	CampaignContext  *string  `json:"campaign_context,omitempty"` // Full context for direct providers
	GameSystem       string   `json:"game_system,omitempty"`
	OllamaCapability string   `json:"ollama_capability,omitempty"` // "standard" or "low_power"
	MaxTokens        *int     `json:"max_tokens,omitempty"`
	Timeout          *int     `json:"timeout,omitempty"`
}

// GenerateQuest calls AI service to generate a quest
// Returns map[string]interface{} for flexible frontend handling (matching Dialogue pattern)
func (c *AIClient) GenerateQuest(ctx context.Context, req QuestGenerateRequest) (map[string]interface{}, error) {
	// Generate a random seed to encourage unique responses each time
	randomSeed := rand.Intn(1000000)

	params := map[string]interface{}{
		"type":              req.Type,
		"category":          req.Category,
		"party_level":       req.PartyLevel,
		"party_size":        req.PartySize,
		"moral_ambiguity":   req.MoralAmbiguity,
		"combat_intensity":  req.CombatIntensity,
		"quest_length":      req.QuestLength,
		"include_factions":  req.IncludeFactions,
		"include_locations": req.IncludeLocations,
		"include_npcs":      req.IncludeNPCs,
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

	content, provider, err := c.generateWithProvider(ctx, "quest", params)
	if err != nil {
		return nil, err
	}

	var quest map[string]interface{}
	if err := json.Unmarshal([]byte(content), &quest); err != nil {
		// Check if the response looks truncated (incomplete JSON)
		isTruncated := !strings.HasSuffix(strings.TrimSpace(content), "}")

		// JSON parse failed - log details
		c.logger.Warn("Failed to parse AI response as JSON, creating fallback structure",
			zap.Error(err),
			zap.Int("content_length", len(content)),
			zap.Bool("appears_truncated", isTruncated))

		// Try to salvage truncated JSON by finding the last complete object
		if isTruncated {
			salvaged := salvageTruncatedQuestJSON(content)
			if salvaged != nil {
				c.logger.Info("Successfully salvaged truncated quest JSON")
				salvaged["provider"] = provider
				salvaged["_parse_warning"] = "Response was truncated but partially recovered"
				return validateQuestResponse(salvaged), nil
			}
		}

		quest = map[string]interface{}{
			"title":              "Generated Quest",
			"type":               req.Type,
			"category":           req.Category,
			"description":        content, // Preserve raw response
			"objectives":         []interface{}{},
			"rewards":            []interface{}{},
			"complications":      []interface{}{},
			"npcs_involved":      []interface{}{},
			"locations_involved": []interface{}{},
			"faction_alignment":  "",
			"party_level":        req.PartyLevel,
			"moral_ambiguity":    false,
			"combat_intensity":   "",
			"time_limit":         "",
			"provider":           provider,
			"_parse_warning":     "AI response was not valid JSON. Raw text preserved in 'description' field.",
		}
	} else {
		// Some models (like Ollama) wrap the response in an extra key
		quest = unwrapNestedResponse(quest, "quest", "adventure", "generated_quest")

		// CRITICAL: Check if title is empty or contains provider/model names
		if title, ok := quest["title"].(string); !ok || title == "" ||
			strings.ToLower(title) == "ollama" ||
			strings.Contains(strings.ToLower(title), "mistral") ||
			strings.Contains(strings.ToLower(title), "llama") {
			// Title is invalid, generate a placeholder
			quest["title"] = "Unknown Quest"
		}

		quest["provider"] = provider
		// Validate and normalize the response structure
		quest = validateQuestResponse(quest)
		// Strip any HTML tags that some Ollama models include in responses
		quest = stripHTMLFromMap(quest)
	}

	return quest, nil
}

// salvageTruncatedQuestJSON attempts to recover a valid JSON object from truncated content
func salvageTruncatedQuestJSON(content string) map[string]interface{} {
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

// validateQuestResponse ensures the AI response has required quest structure
// If missing fields or wrong types, it provides defaults to prevent frontend crashes
func validateQuestResponse(data map[string]interface{}) map[string]interface{} {
	// Expected fields for tracking unexpected ones
	expectedFields := map[string]bool{
		"title": true, "name": true, "type": true, "category": true,
		"description": true, "summary": true, "hook": true,
		"objectives": true, "goals": true, "rewards": true,
		"complications": true, "twists": true, "npcs_involved": true, "npcs": true,
		"locations_involved": true, "locations": true, "faction_alignment": true,
		"party_level": true, "moral_ambiguity": true, "combat_intensity": true,
		"time_limit": true, "quest_length": true,
		"provider": true, "_parse_warning": true, "_raw": true,
	}

	// Collect unexpected fields
	unexpectedFields := make(map[string]interface{})
	for key, value := range data {
		if !expectedFields[key] && !expectedFields[strings.ToLower(key)] {
			unexpectedFields[key] = value
		}
	}

	// Ensure title exists (AI might use "name" instead)
	if _, ok := data["title"]; !ok {
		if name, ok := data["name"]; ok {
			data["title"] = name
		} else {
			data["title"] = "Untitled Quest"
		}
	}

	// Ensure basic string fields exist
	stringFields := []string{"type", "category", "description", "faction_alignment", "combat_intensity", "time_limit"}
	for _, field := range stringFields {
		if _, ok := data[field]; !ok {
			data[field] = ""
		}
	}

	// Ensure party_level exists as a number
	if _, ok := data["party_level"]; !ok {
		data["party_level"] = 1
	}

	// Ensure moral_ambiguity exists as bool
	if _, ok := data["moral_ambiguity"]; !ok {
		data["moral_ambiguity"] = false
	}

	// CRITICAL: Ensure array fields are actually arrays using ensureArray from ai_client.go
	arrayFields := []string{"objectives", "rewards", "complications", "npcs_involved", "locations_involved"}
	for _, field := range arrayFields {
		data[field] = ensureArray(data[field])
	}

	// Handle alternative field names AI might use
	if arr, ok := data["objectives"].([]interface{}); ok && len(arr) == 0 {
		if goals, ok := data["goals"]; ok {
			data["objectives"] = ensureArray(goals)
		}
	}
	if arr, ok := data["npcs_involved"].([]interface{}); ok && len(arr) == 0 {
		if npcs, ok := data["npcs"]; ok {
			data["npcs_involved"] = ensureArray(npcs)
		}
	}
	if arr, ok := data["locations_involved"].([]interface{}); ok && len(arr) == 0 {
		if locs, ok := data["locations"]; ok {
			data["locations_involved"] = ensureArray(locs)
		}
	}

	// Track unexpected fields for debugging
	if len(unexpectedFields) > 0 {
		data["_raw"] = unexpectedFields
	}

	return data
}
