package services

import (
	"context"
	"encoding/json"
	"math/rand"
	"strings"

	"go.uber.org/zap"
)

// ChaseGenerationRequest represents chase generation parameters
type ChaseGenerationRequest struct {
	ChaseType        string `json:"chase_type"`
	Terrain          string `json:"terrain"`
	Difficulty       string `json:"difficulty"`
	PartyLevel       string `json:"party_level,omitempty"`
	SpecialRequests  string `json:"special_requests,omitempty"`
	CampaignContext  string `json:"campaign_context,omitempty"`
	GameSystem       string `json:"game_system,omitempty"`
	OllamaCapability string `json:"ollama_capability,omitempty"`
	MaxTokens        *int   `json:"max_tokens,omitempty"`
	Timeout          *int   `json:"timeout,omitempty"`
}

// GenerateChase calls AI service to generate a chase scene
// Returns map[string]interface{} for flexible frontend handling (matching Dialogue pattern)
func (c *AIClient) GenerateChase(ctx context.Context, req ChaseGenerationRequest) (map[string]interface{}, error) {
	// Generate a random seed to encourage unique responses each time
	randomSeed := rand.Intn(1000000)

	params := map[string]interface{}{
		"chase_type":        req.ChaseType,
		"terrain":           req.Terrain,
		"difficulty":        req.Difficulty,
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

	content, provider, err := c.generateWithProvider(ctx, "chase", params)
	if err != nil {
		return nil, err
	}

	var chase map[string]interface{}
	if err := json.Unmarshal([]byte(content), &chase); err != nil {
		// Check if the response looks truncated (incomplete JSON)
		isTruncated := !strings.HasSuffix(strings.TrimSpace(content), "}")

		// JSON parse failed - log details
		c.logger.Warn("Failed to parse AI response as JSON, creating fallback structure",
			zap.Error(err),
			zap.Int("content_length", len(content)),
			zap.Bool("appears_truncated", isTruncated))

		// Try to salvage truncated JSON
		if isTruncated {
			salvaged := salvageTruncatedChaseJSON(content)
			if salvaged != nil {
				c.logger.Info("Successfully salvaged truncated chase JSON")
				salvaged["provider"] = provider
				salvaged["_parse_warning"] = "Response was truncated but partially recovered"
				return validateChaseResponse(salvaged, req), nil
			}
		}

		chase = map[string]interface{}{
			"name":                  "Unknown Chase",
			"chase_type":            req.ChaseType,
			"terrain":               req.Terrain,
			"difficulty":            req.Difficulty,
			"description":           content, // Preserve raw response
			"setting":               "",
			"participants":          map[string]interface{}{"quarry": "", "pursuers": ""},
			"starting_conditions":   "",
			"obstacles":             []interface{}{},
			"complications":         []interface{}{},
			"shortcuts":             []interface{}{},
			"chase_phases":          []interface{}{},
			"ending_conditions":     map[string]interface{}{"success": "", "failure": ""},
			"rewards":               map[string]interface{}{"success": ""},
			"special_rules":         "",
			"environmental_factors": []interface{}{},
			"provider":              provider,
			"_parse_warning":        "AI response was not valid JSON. Raw text preserved in 'description' field.",
		}
	} else {
		// Some models (like Ollama) wrap the response in an extra key
		chase = unwrapNestedResponse(chase, "chase", "chase_scene", "pursuit", "generated_chase")
		chase["provider"] = provider
		// Validate and normalize the response structure
		chase = validateChaseResponse(chase, req)
		// Strip any HTML tags that some Ollama models include in responses
		chase = stripHTMLFromMap(chase)
	}

	return chase, nil
}

// salvageTruncatedChaseJSON attempts to recover a valid JSON object from truncated content
func salvageTruncatedChaseJSON(content string) map[string]interface{} {
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

// normalizeChaseType ensures chase_type matches DB CHECK constraint:
// 'foot_chase', 'mounted_chase', 'vehicle_chase', 'aerial_chase', 'aquatic_chase', 'other'
func normalizeChaseType(value interface{}, fallback string) string {
	validTypes := map[string]bool{
		"foot_chase":    true,
		"mounted_chase": true,
		"vehicle_chase": true,
		"aerial_chase":  true,
		"aquatic_chase": true,
		"other":         true,
	}

	if s, ok := value.(string); ok {
		lower := strings.ToLower(strings.TrimSpace(s))
		// Direct match
		if validTypes[lower] {
			return lower
		}
		// Map common variations
		switch lower {
		case "foot", "on foot", "running", "walking", "sprint", "run":
			return "foot_chase"
		case "mounted", "horse", "horseback", "cavalry", "riding", "mount":
			return "mounted_chase"
		case "vehicle", "cart", "carriage", "wagon", "chariot", "car":
			return "vehicle_chase"
		case "aerial", "flying", "air", "flight", "airborne", "sky":
			return "aerial_chase"
		case "aquatic", "water", "swimming", "boat", "ship", "sea", "underwater", "naval":
			return "aquatic_chase"
		}
	}

	// Try fallback
	if fallback != "" {
		lower := strings.ToLower(strings.TrimSpace(fallback))
		if validTypes[lower] {
			return lower
		}
	}

	return "other"
}

// normalizeChaseDifficulty ensures difficulty matches DB CHECK constraint:
// 'easy', 'medium', 'challenging', 'hard', 'extreme'
func normalizeChaseDifficulty(value interface{}, fallback string) string {
	validDifficulties := map[string]bool{
		"easy":        true,
		"medium":      true,
		"challenging": true,
		"hard":        true,
		"extreme":     true,
	}

	if s, ok := value.(string); ok {
		lower := strings.ToLower(strings.TrimSpace(s))
		// Direct match
		if validDifficulties[lower] {
			return lower
		}
		// Map common variations
		switch lower {
		case "trivial", "simple", "basic", "beginner", "very easy":
			return "easy"
		case "normal", "moderate", "average", "standard":
			return "medium"
		case "difficult", "tough", "tricky":
			return "challenging"
		case "very hard", "brutal", "punishing", "severe":
			return "hard"
		case "deadly", "impossible", "nightmare", "insane", "lethal":
			return "extreme"
		}
	}

	// Try fallback
	if fallback != "" {
		lower := strings.ToLower(strings.TrimSpace(fallback))
		if validDifficulties[lower] {
			return lower
		}
	}

	return "medium"
}

// validateChaseResponse ensures the AI response has required chase structure
// If missing fields or wrong types, it provides defaults to prevent frontend crashes
func validateChaseResponse(data map[string]interface{}, req ChaseGenerationRequest) map[string]interface{} {
	// Ensure name exists
	if _, ok := data["name"]; !ok {
		if title, ok := data["title"]; ok {
			data["name"] = title
		} else if scene, ok := data["scene_name"]; ok {
			data["name"] = scene
		} else {
			data["name"] = "Unknown Chase"
		}
	}

	// Ensure basic string fields exist with fallbacks from request and normalize to valid DB enums
	var rawChaseType interface{}
	if ct, ok := data["chase_type"]; ok {
		rawChaseType = ct
	} else if ct, ok := data["type"]; ok {
		rawChaseType = ct
	}
	data["chase_type"] = normalizeChaseType(rawChaseType, req.ChaseType)

	if _, ok := data["terrain"]; !ok {
		if env, ok := data["environment"]; ok {
			data["terrain"] = env
		} else {
			data["terrain"] = req.Terrain
		}
	}

	var rawDifficulty interface{}
	if d, ok := data["difficulty"]; ok {
		rawDifficulty = d
	}
	data["difficulty"] = normalizeChaseDifficulty(rawDifficulty, req.Difficulty)

	// Ensure other string fields exist
	for _, field := range []string{"description", "setting", "starting_conditions", "special_rules"} {
		if _, ok := data[field]; !ok {
			data[field] = ""
		}
	}

	// Handle alternative field names for special_rules
	if data["special_rules"] == "" {
		if rules, ok := data["rules"]; ok {
			data["special_rules"] = rules
		} else if mechanics, ok := data["mechanics"]; ok {
			data["special_rules"] = mechanics
		}
	}

	// Validate participants object
	data["participants"] = validateParticipants(data["participants"])

	// Handle alternative field names for participants
	if p, ok := data["participants"].(map[string]interface{}); ok {
		if p["quarry"] == "" {
			if target, ok := data["target"]; ok {
				p["quarry"] = target
			} else if prey, ok := data["prey"]; ok {
				p["quarry"] = prey
			}
		}
		if p["pursuers"] == "" {
			if chasers, ok := data["chasers"]; ok {
				p["pursuers"] = chasers
			} else if hunters, ok := data["hunters"]; ok {
				p["pursuers"] = hunters
			}
		}
	}

	// Validate array fields
	data["obstacles"] = validateObstacles(ensureArrayChase(data["obstacles"]))
	data["complications"] = normalizeToStringArrayChase(ensureArrayChase(data["complications"]))
	data["shortcuts"] = validateShortcuts(ensureArrayChase(data["shortcuts"]))
	data["chase_phases"] = validateChasePhases(ensureArrayChase(data["chase_phases"]))
	data["environmental_factors"] = normalizeToStringArrayChase(ensureArrayChase(data["environmental_factors"]))

	// Handle alternative field names for arrays
	if len(ensureArrayChase(data["obstacles"])) == 0 {
		if challenges, ok := data["challenges"]; ok {
			data["obstacles"] = validateObstacles(ensureArrayChase(challenges))
		} else if hazards, ok := data["hazards"]; ok {
			data["obstacles"] = validateObstacles(ensureArrayChase(hazards))
		}
	}

	if len(ensureArrayChase(data["chase_phases"])) == 0 {
		if phases, ok := data["phases"]; ok {
			data["chase_phases"] = validateChasePhases(ensureArrayChase(phases))
		} else if rounds, ok := data["rounds"]; ok {
			data["chase_phases"] = validateChasePhases(ensureArrayChase(rounds))
		}
	}

	if len(ensureArrayChase(data["environmental_factors"])) == 0 {
		if env, ok := data["environment_effects"]; ok {
			data["environmental_factors"] = normalizeToStringArrayChase(ensureArrayChase(env))
		} else if weather, ok := data["weather"]; ok {
			data["environmental_factors"] = normalizeToStringArrayChase(ensureArrayChase(weather))
		}
	}

	// Validate ending_conditions object
	data["ending_conditions"] = validateEndingConditions(data["ending_conditions"])

	// Handle alternative field names for ending conditions
	if ec, ok := data["ending_conditions"].(map[string]interface{}); ok {
		if ec["success"] == "" {
			if win, ok := data["victory"]; ok {
				ec["success"] = win
			} else if escape, ok := data["escape"]; ok {
				ec["success"] = escape
			}
		}
		if ec["failure"] == "" {
			if lose, ok := data["defeat"]; ok {
				ec["failure"] = lose
			} else if caught, ok := data["caught"]; ok {
				ec["failure"] = caught
			}
		}
	}

	// Validate rewards object
	data["rewards"] = validateRewards(data["rewards"])

	return data
}

// ensureArrayChase converts value to array if needed
func ensureArrayChase(value interface{}) []interface{} {
	if value == nil {
		return []interface{}{}
	}
	if arr, ok := value.([]interface{}); ok {
		return arr
	}
	// Single item - wrap in array
	return []interface{}{value}
}

// validateParticipants ensures participants has proper structure
func validateParticipants(value interface{}) map[string]interface{} {
	result := map[string]interface{}{
		"quarry":   "",
		"pursuers": "",
	}

	if value == nil {
		return result
	}

	if participants, ok := value.(map[string]interface{}); ok {
		if quarry, ok := participants["quarry"]; ok {
			result["quarry"] = quarry
		} else if target, ok := participants["target"]; ok {
			result["quarry"] = target
		}

		if pursuers, ok := participants["pursuers"]; ok {
			result["pursuers"] = pursuers
		} else if chasers, ok := participants["chasers"]; ok {
			result["pursuers"] = chasers
		}
	}

	return result
}

// validateObstacles ensures each obstacle has required fields
func validateObstacles(obstacles []interface{}) []interface{} {
	validated := make([]interface{}, 0, len(obstacles))
	for _, obstacle := range obstacles {
		if obstacleMap, ok := obstacle.(map[string]interface{}); ok {
			// Ensure name exists
			if _, ok := obstacleMap["name"]; !ok {
				if title, ok := obstacleMap["title"]; ok {
					obstacleMap["name"] = title
				} else if obs, ok := obstacleMap["obstacle"]; ok {
					obstacleMap["name"] = obs
				} else {
					obstacleMap["name"] = "Unknown Obstacle"
				}
			}

			// Ensure description exists
			if _, ok := obstacleMap["description"]; !ok {
				if desc, ok := obstacleMap["desc"]; ok {
					obstacleMap["description"] = desc
				} else {
					obstacleMap["description"] = ""
				}
			}

			// Ensure check exists
			if _, ok := obstacleMap["check"]; !ok {
				if skill, ok := obstacleMap["skill_check"]; ok {
					obstacleMap["check"] = skill
				} else if dc, ok := obstacleMap["dc"]; ok {
					obstacleMap["check"] = dc
				} else {
					obstacleMap["check"] = ""
				}
			}

			// Ensure failure exists
			if _, ok := obstacleMap["failure"]; !ok {
				if fail, ok := obstacleMap["on_failure"]; ok {
					obstacleMap["failure"] = fail
				} else if consequence, ok := obstacleMap["consequence"]; ok {
					obstacleMap["failure"] = consequence
				} else {
					obstacleMap["failure"] = ""
				}
			}

			validated = append(validated, obstacleMap)
		} else if obstacleStr, ok := obstacle.(string); ok {
			// String obstacle - wrap it
			validated = append(validated, map[string]interface{}{
				"name":        obstacleStr,
				"description": "",
				"check":       "",
				"failure":     "",
			})
		}
	}
	return validated
}

// validateShortcuts ensures each shortcut has required fields
func validateShortcuts(shortcuts []interface{}) []interface{} {
	validated := make([]interface{}, 0, len(shortcuts))
	for _, shortcut := range shortcuts {
		if shortcutMap, ok := shortcut.(map[string]interface{}); ok {
			// Ensure name exists
			if _, ok := shortcutMap["name"]; !ok {
				if title, ok := shortcutMap["title"]; ok {
					shortcutMap["name"] = title
				} else if route, ok := shortcutMap["route"]; ok {
					shortcutMap["name"] = route
				} else {
					shortcutMap["name"] = "Unknown Shortcut"
				}
			}

			// Ensure description exists
			if _, ok := shortcutMap["description"]; !ok {
				if desc, ok := shortcutMap["desc"]; ok {
					shortcutMap["description"] = desc
				} else {
					shortcutMap["description"] = ""
				}
			}

			// Ensure benefit exists
			if _, ok := shortcutMap["benefit"]; !ok {
				if advantage, ok := shortcutMap["advantage"]; ok {
					shortcutMap["benefit"] = advantage
				} else if effect, ok := shortcutMap["effect"]; ok {
					shortcutMap["benefit"] = effect
				} else {
					shortcutMap["benefit"] = ""
				}
			}

			validated = append(validated, shortcutMap)
		} else if shortcutStr, ok := shortcut.(string); ok {
			// String shortcut - wrap it
			validated = append(validated, map[string]interface{}{
				"name":        shortcutStr,
				"description": "",
				"benefit":     "",
			})
		}
	}
	return validated
}

// validateChasePhases ensures each phase has required fields
func validateChasePhases(phases []interface{}) []interface{} {
	validated := make([]interface{}, 0, len(phases))
	for i, phase := range phases {
		if phaseMap, ok := phase.(map[string]interface{}); ok {
			// Ensure round exists
			if _, ok := phaseMap["round"]; !ok {
				if num, ok := phaseMap["number"]; ok {
					phaseMap["round"] = num
				} else if turn, ok := phaseMap["turn"]; ok {
					phaseMap["round"] = turn
				} else {
					phaseMap["round"] = i + 1
				}
			}

			// Ensure description exists
			if _, ok := phaseMap["description"]; !ok {
				if desc, ok := phaseMap["desc"]; ok {
					phaseMap["description"] = desc
				} else if event, ok := phaseMap["event"]; ok {
					phaseMap["description"] = event
				} else {
					phaseMap["description"] = ""
				}
			}

			// Ensure difficulty exists
			if _, ok := phaseMap["difficulty"]; !ok {
				if diff, ok := phaseMap["dc"]; ok {
					phaseMap["difficulty"] = diff
				} else if level, ok := phaseMap["level"]; ok {
					phaseMap["difficulty"] = level
				} else {
					phaseMap["difficulty"] = "Medium"
				}
			}

			validated = append(validated, phaseMap)
		} else if phaseStr, ok := phase.(string); ok {
			// String phase - wrap it
			validated = append(validated, map[string]interface{}{
				"round":       i + 1,
				"description": phaseStr,
				"difficulty":  "Medium",
			})
		}
	}
	return validated
}

// validateEndingConditions ensures ending_conditions has proper structure
func validateEndingConditions(value interface{}) map[string]interface{} {
	result := map[string]interface{}{
		"success":     "",
		"failure":     "",
		"alternative": "",
	}

	if value == nil {
		return result
	}

	if conditions, ok := value.(map[string]interface{}); ok {
		if success, ok := conditions["success"]; ok {
			result["success"] = success
		} else if win, ok := conditions["win"]; ok {
			result["success"] = win
		} else if escape, ok := conditions["escape"]; ok {
			result["success"] = escape
		}

		if failure, ok := conditions["failure"]; ok {
			result["failure"] = failure
		} else if lose, ok := conditions["lose"]; ok {
			result["failure"] = lose
		} else if caught, ok := conditions["caught"]; ok {
			result["failure"] = caught
		}

		if alt, ok := conditions["alternative"]; ok {
			result["alternative"] = alt
		} else if other, ok := conditions["other"]; ok {
			result["alternative"] = other
		} else if partial, ok := conditions["partial"]; ok {
			result["alternative"] = partial
		}
	}

	return result
}

// validateRewards ensures rewards has proper structure
func validateRewards(value interface{}) map[string]interface{} {
	result := map[string]interface{}{
		"success": "",
		"partial": "",
		"failure": "",
	}

	if value == nil {
		return result
	}

	if rewards, ok := value.(map[string]interface{}); ok {
		if success, ok := rewards["success"]; ok {
			result["success"] = success
		} else if win, ok := rewards["win"]; ok {
			result["success"] = win
		}

		if partial, ok := rewards["partial"]; ok {
			result["partial"] = partial
		} else if some, ok := rewards["some"]; ok {
			result["partial"] = some
		}

		if failure, ok := rewards["failure"]; ok {
			result["failure"] = failure
		} else if lose, ok := rewards["lose"]; ok {
			result["failure"] = lose
		}
	}

	return result
}

// normalizeToStringArrayChase converts an array of mixed types to string array
func normalizeToStringArrayChase(items []interface{}) []interface{} {
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
