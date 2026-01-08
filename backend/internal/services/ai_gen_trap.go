package services

import (
	"context"
	"encoding/json"
	"math/rand"
	"strings"

	"go.uber.org/zap"
)

// TrapGenerationRequest represents trap generation parameters
type TrapGenerationRequest struct {
	TrapType         string `json:"trap_type"`
	Difficulty       string `json:"difficulty"`
	PartyLevel       string `json:"party_level,omitempty"`
	Environment      string `json:"environment,omitempty"`
	SpecialRequests  string `json:"special_requests,omitempty"`
	CampaignContext  string `json:"campaign_context,omitempty"`
	GameSystem       string `json:"game_system,omitempty"`
	OllamaCapability string `json:"ollama_capability,omitempty"`
	MaxTokens        *int   `json:"max_tokens,omitempty"`
	Timeout          *int   `json:"timeout,omitempty"`
}

// GenerateTrap calls AI service to generate a trap
// Returns map[string]interface{} for flexible frontend handling (matching Dialogue pattern)
func (c *AIClient) GenerateTrap(ctx context.Context, req TrapGenerationRequest) (map[string]interface{}, error) {
	// Generate a random seed to encourage unique responses each time
	randomSeed := rand.Intn(1000000)

	params := map[string]interface{}{
		"trap_type":         req.TrapType,
		"difficulty":        req.Difficulty,
		"party_level":       req.PartyLevel,
		"environment":       req.Environment,
		"special_requests":  req.SpecialRequests,
		"campaign_context":  req.CampaignContext,
		"game_system":       req.GameSystem,
		"ollama_capability": req.OllamaCapability,
		"variation_seed":    randomSeed,
	}
	if req.MaxTokens != nil {
		params["max_tokens"] = *req.MaxTokens
	}

	content, provider, err := c.generateWithProvider(ctx, "trap", params)
	if err != nil {
		return nil, err
	}

	var trap map[string]interface{}
	if err := json.Unmarshal([]byte(content), &trap); err != nil {
		// Check if the response looks truncated (incomplete JSON)
		isTruncated := !strings.HasSuffix(strings.TrimSpace(content), "}")

		// JSON parse failed - log details
		c.logger.Warn("Failed to parse AI response as JSON, creating fallback structure",
			zap.Error(err),
			zap.Int("content_length", len(content)),
			zap.Bool("appears_truncated", isTruncated))

		// Try to salvage truncated JSON
		if isTruncated {
			salvaged := salvageTruncatedTrapJSON(content)
			if salvaged != nil {
				c.logger.Info("Successfully salvaged truncated trap JSON")
				salvaged["provider"] = provider
				salvaged["_parse_warning"] = "Response was truncated but partially recovered"
				return validateTrapResponse(salvaged), nil
			}
		}

		trap = map[string]interface{}{
			"name":           "Unknown Trap",
			"trap_type":      req.TrapType,
			"difficulty":     req.Difficulty,
			"description":    content, // Preserve raw response
			"environment":    req.Environment,
			"trigger":        "",
			"effect":         "",
			"damage":         "",
			"detection":      map[string]interface{}{},
			"solution_paths": []interface{}{},
			"complications":  []interface{}{},
			"rewards":        []interface{}{},
			"scaling":        map[string]interface{}{},
			"dm_notes":       "",
			"provider":       provider,
			"_parse_warning": "AI response was not valid JSON. Raw text preserved in 'description' field.",
		}
	} else {
		// Some models (like Ollama) wrap the response in an extra key
		trap = unwrapNestedResponse(trap, "trap", "hazard", "generated_trap")
		trap["provider"] = provider
		// Validate and normalize the response structure
		trap = validateTrapResponse(trap)
		// Strip any HTML tags that some Ollama models include in responses
		trap = stripHTMLFromMap(trap)
	}

	return trap, nil
}

// salvageTruncatedTrapJSON attempts to recover a valid JSON object from truncated content
func salvageTruncatedTrapJSON(content string) map[string]interface{} {
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

// validateTrapResponse ensures the AI response has required trap structure
// If missing fields or wrong types, it provides defaults to prevent frontend crashes
func validateTrapResponse(data map[string]interface{}) map[string]interface{} {
	// Ensure name exists
	if _, ok := data["name"]; !ok {
		if title, ok := data["title"]; ok {
			data["name"] = title
		} else {
			data["name"] = "Unknown Trap"
		}
	}

	// Ensure basic string fields exist
	for _, field := range []string{"trap_type", "difficulty", "description", "environment", "trigger", "effect", "damage", "dm_notes"} {
		if _, ok := data[field]; !ok {
			data[field] = ""
		}
	}

	// Handle alternative field name for trap_type
	if data["trap_type"] == "" {
		if trapType, ok := data["type"]; ok {
			data["trap_type"] = trapType
		}
	}

	// Handle alternative field names for dm_notes
	if data["dm_notes"] == "" {
		if notes, ok := data["notes"]; ok {
			data["dm_notes"] = notes
		} else if gmNotes, ok := data["gm_notes"]; ok {
			data["dm_notes"] = gmNotes
		}
	}

	// Validate detection object
	data["detection"] = validateDetection(data["detection"])

	// Validate solution_paths array
	data["solution_paths"] = validateSolutionPaths(ensureArray(data["solution_paths"]))

	// Handle alternative field names for solution_paths
	if len(ensureArray(data["solution_paths"])) == 0 {
		if solutions, ok := data["solutions"]; ok {
			data["solution_paths"] = validateSolutionPaths(ensureArray(solutions))
		} else if disarm, ok := data["disarm"]; ok {
			// Convert single disarm to solution path
			if disarmMap, ok := disarm.(map[string]interface{}); ok {
				data["solution_paths"] = []interface{}{
					map[string]interface{}{
						"approach":    "Disarm",
						"skill":       disarmMap["method"],
						"dc":          disarmMap["dc"],
						"description": disarmMap["description"],
						"time":        "1 action",
						"failure":     "Triggers the trap",
					},
				}
			}
		}
	}

	// Ensure array fields exist and are arrays
	data["complications"] = normalizeToStringArrayTrap(ensureArray(data["complications"]))
	data["rewards"] = normalizeToStringArrayTrap(ensureArray(data["rewards"]))

	// Handle alternative field names for arrays
	if len(ensureArray(data["rewards"])) == 0 {
		if loot, ok := data["loot"]; ok {
			data["rewards"] = normalizeToStringArrayTrap(ensureArray(loot))
		} else if treasure, ok := data["treasure"]; ok {
			data["rewards"] = normalizeToStringArrayTrap(ensureArray(treasure))
		}
	}

	// Validate scaling object
	data["scaling"] = validateScaling(data["scaling"])

	return data
}

// validateDetection ensures detection has proper structure
func validateDetection(value interface{}) map[string]interface{} {
	result := map[string]interface{}{
		"passive_perception_dc": nil,
		"investigation_dc":      nil,
		"clues":                 []interface{}{},
	}

	if value == nil {
		return result
	}

	if detection, ok := value.(map[string]interface{}); ok {
		// Handle passive perception DC
		if pp, ok := detection["passive_perception_dc"]; ok {
			result["passive_perception_dc"] = pp
		} else if pp, ok := detection["passive_dc"]; ok {
			result["passive_perception_dc"] = pp
		} else if pp, ok := detection["perception_dc"]; ok {
			result["passive_perception_dc"] = pp
		}

		// Handle investigation DC
		if inv, ok := detection["investigation_dc"]; ok {
			result["investigation_dc"] = inv
		} else if inv, ok := detection["search_dc"]; ok {
			result["investigation_dc"] = inv
		}

		// Handle clues
		if clues, ok := detection["clues"]; ok {
			result["clues"] = normalizeToStringArrayTrap(ensureArray(clues))
		} else if hints, ok := detection["hints"]; ok {
			result["clues"] = normalizeToStringArrayTrap(ensureArray(hints))
		}

		// Handle DC as generic field
		if dc, ok := detection["dc"]; ok && result["passive_perception_dc"] == nil {
			result["passive_perception_dc"] = dc
		}
	}

	return result
}

// validateSolutionPaths ensures each solution path has required fields
func validateSolutionPaths(paths []interface{}) []interface{} {
	validated := make([]interface{}, 0, len(paths))
	for _, path := range paths {
		if pathMap, ok := path.(map[string]interface{}); ok {
			// Ensure approach exists
			if _, ok := pathMap["approach"]; !ok {
				if method, ok := pathMap["method"]; ok {
					pathMap["approach"] = method
				} else if name, ok := pathMap["name"]; ok {
					pathMap["approach"] = name
				} else {
					pathMap["approach"] = "Unknown Approach"
				}
			}

			// Ensure skill exists
			if _, ok := pathMap["skill"]; !ok {
				if ability, ok := pathMap["ability"]; ok {
					pathMap["skill"] = ability
				} else if check, ok := pathMap["check"]; ok {
					pathMap["skill"] = check
				} else {
					pathMap["skill"] = ""
				}
			}

			// Ensure dc exists (can be null)
			if _, ok := pathMap["dc"]; !ok {
				pathMap["dc"] = nil
			}

			// Ensure other string fields exist
			for _, field := range []string{"description", "time", "failure"} {
				if _, ok := pathMap[field]; !ok {
					pathMap[field] = ""
				}
			}

			// Handle alternative field names
			if pathMap["failure"] == "" {
				if fail, ok := pathMap["on_failure"]; ok {
					pathMap["failure"] = fail
				} else if fail, ok := pathMap["failure_effect"]; ok {
					pathMap["failure"] = fail
				}
			}

			validated = append(validated, pathMap)
		} else if pathStr, ok := path.(string); ok {
			// String path - wrap it
			validated = append(validated, map[string]interface{}{
				"approach":    pathStr,
				"skill":       "",
				"dc":          nil,
				"description": "",
				"time":        "",
				"failure":     "",
			})
		}
	}
	return validated
}

// validateScaling ensures scaling has proper structure
func validateScaling(value interface{}) map[string]interface{} {
	result := map[string]interface{}{
		"easier": "",
		"harder": "",
	}

	if value == nil {
		return result
	}

	if scaling, ok := value.(map[string]interface{}); ok {
		if easier, ok := scaling["easier"]; ok {
			result["easier"] = easier
		} else if lower, ok := scaling["lower_level"]; ok {
			result["easier"] = lower
		} else if easy, ok := scaling["easy"]; ok {
			result["easier"] = easy
		}

		if harder, ok := scaling["harder"]; ok {
			result["harder"] = harder
		} else if higher, ok := scaling["higher_level"]; ok {
			result["harder"] = higher
		} else if hard, ok := scaling["hard"]; ok {
			result["harder"] = hard
		}
	}

	return result
}

// normalizeToStringArrayTrap converts an array of mixed types to string array
// Named differently to avoid collision with other packages
func normalizeToStringArrayTrap(items []interface{}) []interface{} {
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
			} else if detail, ok := v["detail"]; ok {
				normalized = append(normalized, detail)
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
