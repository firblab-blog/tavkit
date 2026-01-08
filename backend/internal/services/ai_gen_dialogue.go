package services

import (
	"context"
	"encoding/json"
	"math/rand"
	"strings"

	"go.uber.org/zap"
)

// DialogueGenerateRequest represents dialogue generation request
type DialogueGenerateRequest struct {
	CharacterName    string  `json:"character_name,omitempty"`
	DialogueType     string  `json:"dialogue_type"`
	NPCPersonality   string  `json:"npc_personality"`
	Mood             string  `json:"mood"`
	Complexity       string  `json:"complexity,omitempty"`
	SceneSetting     string  `json:"scene_setting,omitempty"`
	SpecialRequests  string  `json:"special_requests,omitempty"`
	CampaignID       *string `json:"campaign_id,omitempty"`      // Campaign ID for Python proxy
	CampaignContext  *string `json:"campaign_context,omitempty"` // Full context for direct providers
	GameSystem       string  `json:"game_system,omitempty"`
	OllamaCapability string  `json:"ollama_capability,omitempty"` // "standard" or "low_power"
	MaxTokens        *int    `json:"max_tokens,omitempty"`
	Timeout          *int    `json:"timeout,omitempty"`
}

// GenerateDialogue calls AI service to generate dialogue
// Returns map[string]interface{} for flexible frontend handling
func (c *AIClient) GenerateDialogue(ctx context.Context, req DialogueGenerateRequest) (map[string]interface{}, error) {
	// Generate a random seed to encourage unique responses each time
	randomSeed := rand.Intn(1000000)

	params := map[string]interface{}{
		"character_name":    req.CharacterName,
		"dialogue_type":     req.DialogueType,
		"npc_personality":   req.NPCPersonality,
		"mood":              req.Mood,
		"complexity":        req.Complexity,
		"scene_setting":     req.SceneSetting,
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

	content, provider, err := c.generateWithProvider(ctx, "dialogue", params)
	if err != nil {
		return nil, err
	}

	var dialogue map[string]interface{}
	if err := json.Unmarshal([]byte(content), &dialogue); err != nil {
		// Check if the response looks truncated (incomplete JSON)
		isTruncated := !strings.HasSuffix(strings.TrimSpace(content), "}")

		// JSON parse failed - log details
		c.logger.Warn("Failed to parse AI response as JSON, creating fallback structure",
			zap.Error(err),
			zap.Int("content_length", len(content)),
			zap.Bool("appears_truncated", isTruncated))

		// Try to salvage truncated JSON
		if isTruncated {
			salvaged := salvageTruncatedDialogueJSON(content)
			if salvaged != nil {
				c.logger.Info("Successfully salvaged truncated Dialogue JSON")
				salvaged["provider"] = provider
				salvaged["_parse_warning"] = "Response was truncated but partially recovered"
				return validateDialogueResponse(salvaged), nil
			}
		}

		dialogue = map[string]interface{}{
			"character_name": "Unknown Character",
			"scene_setting":  "",
			"mood":           "",
			"opening_line":   "",
			"body_language":  "",
			"description":    content, // Preserve raw response
			"provider":       provider,
			"_parse_warning": "AI response was not valid JSON. Raw text preserved in 'description' field.",
			"dialogue_tree": map[string]interface{}{
				"friendly": map[string]interface{}{"player_option": "", "npc_response": "", "outcome": ""},
				"neutral":  map[string]interface{}{"player_option": "", "npc_response": "", "outcome": ""},
				"hostile":  map[string]interface{}{"player_option": "", "npc_response": "", "outcome": ""},
			},
		}
	} else {
		// Some models (like Ollama) wrap the response in an extra key
		dialogue = unwrapNestedResponse(dialogue, "dialogue", "conversation", "generated_dialogue")

		// CRITICAL: Check if character_name is empty or contains provider/model names
		if name, ok := dialogue["character_name"].(string); !ok || name == "" ||
			strings.ToLower(name) == "ollama" ||
			strings.Contains(strings.ToLower(name), "mistral") ||
			strings.Contains(strings.ToLower(name), "llama") {
			// Name is invalid, generate a placeholder
			dialogue["character_name"] = "Unknown Character"
		}

		dialogue["provider"] = provider
		// Validate and normalize the response structure
		dialogue = validateDialogueResponse(dialogue)
		// Strip any HTML tags that some Ollama models include in responses
		dialogue = stripHTMLFromMap(dialogue)
	}

	return dialogue, nil
}

// salvageTruncatedDialogueJSON attempts to recover a valid JSON object from truncated content
func salvageTruncatedDialogueJSON(content string) map[string]interface{} {
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

// validateDialogueResponse ensures the AI response has required dialogue structure
// If missing fields, it provides defaults to prevent frontend crashes
func validateDialogueResponse(data map[string]interface{}) map[string]interface{} {
	// Expected fields for tracking unexpected ones
	expectedFields := map[string]bool{
		"character_name": true, "name": true, "scene_setting": true, "setting": true,
		"mood": true, "tone": true, "opening_line": true, "greeting": true,
		"body_language": true, "dialogue_tree": true, "skill_checks": true,
		"information_revealed": true, "potential_quests": true, "description": true,
		"provider": true, "_parse_warning": true, "_raw": true,
	}

	// Collect unexpected fields
	unexpectedFields := make(map[string]interface{})
	for key, value := range data {
		if !expectedFields[key] && !expectedFields[strings.ToLower(key)] {
			unexpectedFields[key] = value
		}
	}

	// Ensure character_name exists
	if _, ok := data["character_name"]; !ok {
		if name, ok := data["name"]; ok {
			data["character_name"] = name
		} else {
			data["character_name"] = "Unknown Character"
		}
	}

	// Ensure basic string fields exist
	for _, field := range []string{"scene_setting", "mood", "opening_line", "body_language"} {
		if _, ok := data[field]; !ok {
			data[field] = ""
		}
	}

	// Ensure dialogue_tree exists with proper structure
	if _, ok := data["dialogue_tree"]; !ok {
		data["dialogue_tree"] = createEmptyDialogueTree()
		data["_parse_warning"] = "AI response missing dialogue_tree structure"
	} else {
		// Validate dialogue_tree is correct type
		dt, ok := data["dialogue_tree"].(map[string]interface{})
		if !ok {
			data["dialogue_tree"] = createEmptyDialogueTree()
			data["_parse_warning"] = "AI response dialogue_tree was not valid object"
		} else {
			// Ensure each branch exists with correct structure
			for _, branch := range []string{"friendly", "neutral", "hostile"} {
				if _, ok := dt[branch]; !ok {
					dt[branch] = map[string]interface{}{"player_option": "", "npc_response": "", "outcome": ""}
				} else if branchMap, ok := dt[branch].(map[string]interface{}); ok {
					// Ensure branch has required fields
					for _, field := range []string{"player_option", "npc_response", "outcome"} {
						if _, ok := branchMap[field]; !ok {
							branchMap[field] = ""
						}
					}
				} else {
					dt[branch] = map[string]interface{}{"player_option": "", "npc_response": "", "outcome": ""}
				}
			}
		}
	}

	// Track unexpected fields for debugging
	if len(unexpectedFields) > 0 {
		data["_raw"] = unexpectedFields
	}

	return data
}

// createEmptyDialogueTree returns a properly structured empty dialogue tree
func createEmptyDialogueTree() map[string]interface{} {
	return map[string]interface{}{
		"friendly": map[string]interface{}{"player_option": "", "npc_response": "", "outcome": ""},
		"neutral":  map[string]interface{}{"player_option": "", "npc_response": "", "outcome": ""},
		"hostile":  map[string]interface{}{"player_option": "", "npc_response": "", "outcome": ""},
	}
}
