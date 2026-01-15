// Package services provides external service integrations.
package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"strings"
	"time"

	"tavkit/internal/ai"

	"go.uber.org/zap"
)

// AIClient handles communication with AI service
// This is the legacy interface that now uses the provider factory underneath
type AIClient struct {
	baseURL    string
	httpClient *http.Client
	factory    *ai.Factory
	logger     *zap.Logger
}

// NewAIClient creates a new AI client with provider factory
// pythonServiceURL is the URL for the Python AI service (used for campaign summaries)
func NewAIClient(factory *ai.Factory, pythonServiceURL string, logger *zap.Logger) *AIClient {
	// Configure transport for large payloads and long-running AI requests (for fallback HTTP calls)
	transport := &http.Transport{
		// Connection settings
		DialContext: (&net.Dialer{
			Timeout:   30 * time.Second, // Timeout for establishing TCP connection
			KeepAlive: 30 * time.Second,
		}).DialContext,
		// Force HTTP/1.1 for better compatibility
		ForceAttemptHTTP2:     false,
		MaxIdleConns:          10,
		MaxIdleConnsPerHost:   5,
		IdleConnTimeout:       90 * time.Second,
		TLSHandshakeTimeout:   10 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
		DisableKeepAlives:     false,
		// Increase buffer sizes for large payloads
		WriteBufferSize: 64 * 1024, // 64KB write buffer
		ReadBufferSize:  64 * 1024, // 64KB read buffer
	}

	return &AIClient{
		baseURL: pythonServiceURL, // Python AI service URL for campaign summaries
		httpClient: &http.Client{
			Timeout:   0, // No timeout - rely on context deadlines for per-request control
			Transport: transport,
		},
		factory: factory,
		logger:  logger,
	}
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

// buildPrompt creates a prompt from a structured request
func buildPrompt(promptType string, params map[string]interface{}) string {
	// Build a natural language prompt from the parameters
	prompt := ""

	// Keys to exclude from the user prompt - these are internal configuration, not generation parameters
	// CRITICAL: ollama_capability was being sent to the model causing "Low Power Ollama" in output!
	excludeKeys := map[string]bool{
		"max_tokens":        true,
		"campaign_context":  true, // Handled separately in system prompt
		"ollama_capability": true, // Internal setting - DO NOT send to model
		"variation_seed":    true, // Internal randomization seed
		// NOTE: game_system IS included in user prompt (e.g., "game system: D&D 5e")
	}

	// Extract and format parameters
	for key, value := range params {
		if value != nil && value != "" && !excludeKeys[key] {
			// Convert snake_case to human readable
			readableKey := strings.ReplaceAll(key, "_", " ")
			prompt += fmt.Sprintf("%s: %v\n", readableKey, value)
		}
	}

	return strings.TrimSpace(prompt)
}

// cleanJSONResponse removes markdown code blocks and extra content from AI responses
// It extracts just the JSON object, handling cases where AI adds commentary after
func cleanJSONResponse(content string) string {
	content = strings.TrimSpace(content)

	// Remove any leading text before JSON - some models add explanations
	// Look for common phrases that precede JSON
	prefixes := []string{
		"Here is the JSON:",
		"Here's the JSON:",
		"Here is a JSON:",
		"Here's a JSON:",
		"JSON:",
		"Here is the",
		"Here's the",
		"The JSON object:",
		"Here you go:",
		"Sure, here",
	}
	for _, prefix := range prefixes {
		if idx := strings.Index(strings.ToLower(content), strings.ToLower(prefix)); idx != -1 {
			// Find the end of this line
			lineEnd := strings.Index(content[idx:], "\n")
			if lineEnd != -1 {
				content = content[idx+lineEnd+1:]
			}
		}
	}

	content = strings.TrimSpace(content)

	// Handle markdown code blocks - need to find the closing ``` not just trim suffix
	if strings.HasPrefix(content, "```json") {
		content = strings.TrimPrefix(content, "```json")
		// Find the closing ``` (not just at the end - AI might add content after)
		if idx := strings.Index(content, "```"); idx != -1 {
			content = content[:idx]
		}
	} else if strings.HasPrefix(content, "```") {
		content = strings.TrimPrefix(content, "```")
		// Check if next word is "json" and skip it
		content = strings.TrimSpace(content)
		if strings.HasPrefix(strings.ToLower(content), "json") {
			content = strings.TrimPrefix(strings.ToLower(content), "json")
			content = strings.TrimSpace(content)
		}
		if idx := strings.Index(content, "```"); idx != -1 {
			content = content[:idx]
		}
	}

	content = strings.TrimSpace(content)

	// If still not valid JSON, try to extract JSON object by finding { and }
	if !strings.HasPrefix(content, "{") && !strings.HasPrefix(content, "[") {
		// Look for the start of a JSON object or array
		if startIdx := strings.Index(content, "{"); startIdx != -1 {
			content = content[startIdx:]
		} else if startIdx := strings.Index(content, "["); startIdx != -1 {
			content = content[startIdx:]
		}
	}

	// Find the matching closing brace/bracket
	if strings.HasPrefix(content, "{") {
		if endIdx := findMatchingBrace(content, '{', '}'); endIdx != -1 {
			content = content[:endIdx+1]
		}
	} else if strings.HasPrefix(content, "[") {
		if endIdx := findMatchingBrace(content, '[', ']'); endIdx != -1 {
			content = content[:endIdx+1]
		}
	}

	return strings.TrimSpace(content)
}

// findMatchingBrace finds the index of the closing brace that matches the opening one
// Returns -1 if not found
func findMatchingBrace(content string, open, close rune) int {
	depth := 0
	inString := false
	escaped := false

	for i, char := range content {
		if escaped {
			escaped = false
			continue
		}

		if char == '\\' && inString {
			escaped = true
			continue
		}

		if char == '"' {
			inString = !inString
			continue
		}

		if inString {
			continue
		}

		switch char {
		case open:
			depth++
		case close:
			depth--
			if depth == 0 {
				return i
			}
		}
	}

	return -1
}

// unwrapNestedResponse handles the case where Ollama models wrap their response
// in an extra key like {"npc": {...}} or {"monster": {...}}
// Pass the expected wrapper key(s) to check for
func unwrapNestedResponse(data map[string]interface{}, wrapperKeys ...string) map[string]interface{} {
	for _, key := range wrapperKeys {
		if nested, ok := data[key].(map[string]interface{}); ok {
			return nested
		}
	}
	return data
}

// ensureArray converts various types to a slice of interfaces
// Handles: nil, string (comma-separated), existing slice, or any other type
// This is a shared helper used by all generator validators
func ensureArray(value interface{}) []interface{} {
	if value == nil {
		return []interface{}{}
	}

	// Already a slice
	if arr, ok := value.([]interface{}); ok {
		return arr
	}

	// String - might be comma-separated
	if str, ok := value.(string); ok {
		if str == "" {
			return []interface{}{}
		}
		// Split by comma and trim whitespace
		parts := strings.Split(str, ",")
		result := make([]interface{}, 0, len(parts))
		for _, part := range parts {
			trimmed := strings.TrimSpace(part)
			if trimmed != "" {
				result = append(result, trimmed)
			}
		}
		return result
	}

	// Single non-string value - wrap in array
	return []interface{}{value}
}

// stripHTMLTags removes HTML tags from a string
// Some Ollama models return HTML-formatted responses instead of plain text
func stripHTMLTags(s string) string {
	// Common HTML tags that models might return
	htmlPatterns := []struct {
		open  string
		close string
	}{
		{"<ul>", "</ul>"},
		{"<ol>", "</ol>"},
		{"<li>", "</li>"},
		{"<p>", "</p>"},
		{"<br>", ""},
		{"<br/>", ""},
		{"<br />", ""},
		{"<strong>", "</strong>"},
		{"<b>", "</b>"},
		{"<em>", "</em>"},
		{"<i>", "</i>"},
		{"<div>", "</div>"},
		{"<span>", "</span>"},
		{"<h1>", "</h1>"},
		{"<h2>", "</h2>"},
		{"<h3>", "</h3>"},
		{"<h4>", "</h4>"},
		{"<h5>", "</h5>"},
		{"<h6>", "</h6>"},
	}

	result := s
	for _, pattern := range htmlPatterns {
		result = strings.ReplaceAll(result, pattern.open, "")
		if pattern.close != "" {
			result = strings.ReplaceAll(result, pattern.close, "")
		}
	}

	// Clean up extra whitespace that may result from tag removal
	// Replace multiple spaces with single space
	for strings.Contains(result, "  ") {
		result = strings.ReplaceAll(result, "  ", " ")
	}
	// Replace multiple newlines with single newline
	for strings.Contains(result, "\n\n\n") {
		result = strings.ReplaceAll(result, "\n\n\n", "\n\n")
	}

	return strings.TrimSpace(result)
}

// stripHTMLFromMap recursively strips HTML tags from all string values in a map
func stripHTMLFromMap(data map[string]interface{}) map[string]interface{} {
	for key, value := range data {
		switch v := value.(type) {
		case string:
			data[key] = stripHTMLTags(v)
		case map[string]interface{}:
			data[key] = stripHTMLFromMap(v)
		case []interface{}:
			data[key] = stripHTMLFromSlice(v)
		}
	}
	return data
}

// stripHTMLFromSlice recursively strips HTML tags from all string values in a slice
func stripHTMLFromSlice(data []interface{}) []interface{} {
	for i, value := range data {
		switch v := value.(type) {
		case string:
			data[i] = stripHTMLTags(v)
		case map[string]interface{}:
			data[i] = stripHTMLFromMap(v)
		case []interface{}:
			data[i] = stripHTMLFromSlice(v)
		}
	}
	return data
}

// =============================================================================
// SYSTEM PROMPTS
// =============================================================================

// getExistingNamesToAvoid extracts existing names from campaign context for a specific content type
// Returns a formatted instruction string to avoid these names, or empty string if none
func getExistingNamesToAvoid(campaignContext *string, promptType string) string {
	if campaignContext == nil || *campaignContext == "" {
		return ""
	}

	// Parse the campaign context JSON
	var contextData map[string]interface{}
	if err := json.Unmarshal([]byte(*campaignContext), &contextData); err != nil {
		return ""
	}

	// Get existing_names from the context
	existingNamesRaw, ok := contextData["existing_names"]
	if !ok {
		return ""
	}

	existingNames, ok := existingNamesRaw.(map[string]interface{})
	if !ok {
		return ""
	}

	// Map prompt type to the corresponding existing names field
	typeToField := map[string]string{
		"npc":       "npcs",
		"dialogue":  "dialogues",
		"location":  "locations",
		"quest":     "quests",
		"monster":   "monsters",
		"item":      "items",
		"encounter": "encounters",
		"tavern":    "taverns",
		"merchant":  "merchants",
		"trap":      "traps",
		"critter":   "critters",
		"chase":     "chases",
		"rumors":    "npcs", // rumors don't have names, but avoid NPC names for sources
	}

	field, ok := typeToField[strings.ToLower(promptType)]
	if !ok {
		return ""
	}

	namesRaw, ok := existingNames[field]
	if !ok {
		return ""
	}

	namesArr, ok := namesRaw.([]interface{})
	if !ok || len(namesArr) == 0 {
		return ""
	}

	// Convert to string slice
	var names []string
	for _, n := range namesArr {
		if name, ok := n.(string); ok && name != "" {
			names = append(names, name)
		}
	}

	if len(names) == 0 {
		return ""
	}

	// Build the avoid instruction
	return fmt.Sprintf("\n\nAVOID THESE EXISTING NAMES (already used in this campaign):\n%s\nGenerate a DIFFERENT name that is NOT in this list.", strings.Join(names, ", "))
}

// getSimplifiedAvoidNames returns a brief avoid names instruction for low-power Ollama
// Only includes the first few names to keep token count low
func getSimplifiedAvoidNames(campaignContext *string, promptType string) string {
	if campaignContext == nil || *campaignContext == "" {
		return ""
	}

	// Parse the campaign context JSON
	var contextData map[string]interface{}
	if err := json.Unmarshal([]byte(*campaignContext), &contextData); err != nil {
		return ""
	}

	// Get existing_names from the context
	existingNamesRaw, ok := contextData["existing_names"]
	if !ok {
		return ""
	}

	existingNames, ok := existingNamesRaw.(map[string]interface{})
	if !ok {
		return ""
	}

	// Map prompt type to the corresponding existing names field
	typeToField := map[string]string{
		"npc":       "npcs",
		"dialogue":  "dialogues",
		"location":  "locations",
		"quest":     "quests",
		"monster":   "monsters",
		"item":      "items",
		"encounter": "encounters",
		"tavern":    "taverns",
		"merchant":  "merchants",
		"trap":      "traps",
		"critter":   "critters",
		"chase":     "chases",
	}

	field, ok := typeToField[strings.ToLower(promptType)]
	if !ok {
		return ""
	}

	namesRaw, ok := existingNames[field]
	if !ok {
		return ""
	}

	namesArr, ok := namesRaw.([]interface{})
	if !ok || len(namesArr) == 0 {
		return ""
	}

	// Only take first 5 names for low-power mode
	maxNames := 5
	if len(namesArr) < maxNames {
		maxNames = len(namesArr)
	}

	var names []string
	for i := 0; i < maxNames; i++ {
		if name, ok := namesArr[i].(string); ok && name != "" {
			names = append(names, name)
		}
	}

	if len(names) == 0 {
		return ""
	}

	// Brief instruction for low-power
	return fmt.Sprintf("\nAVOID names: %s", strings.Join(names, ", "))
}

// getSystemPromptForType returns the appropriate system prompt based on content type
// This matches the Python implementation's per-generator prompts
// Use isLowPowerOllama = true for simplified prompts on underpowered devices
func getSystemPromptForType(promptType string, campaignContext *string, isLowPowerOllama bool) string {
	// For low-power Ollama, use simplified prompts
	if isLowPowerOllama {
		return getSimplifiedSystemPrompt(promptType, campaignContext)
	}

	// Build campaign context section if provided
	campaignSection := ""
	avoidNamesSection := ""
	if campaignContext != nil && *campaignContext != "" {
		campaignSection = "\n\nCAMPAIGN CONTEXT:\n" + *campaignContext + "\n\nWrite content that references the campaign world, plot, and characters. Match the overall tone and include information relevant to ongoing story threads."
		avoidNamesSection = getExistingNamesToAvoid(campaignContext, promptType)
	}

	// Normalize prompt type to lowercase for matching
	normalizedType := strings.ToLower(promptType)

	switch normalizedType {
	case "dialogue":
		return `You are a D&D 5e dialogue writer. Create NPC dialogue scenes.` + campaignSection + `

CRITICAL RULES:
- Create a UNIQUE character name appropriate for the setting
- NEVER use placeholder text like "NPC name" or "Unknown"
- Keep content CONCISE. All responses should be 1-2 sentences.
- Limit skill checks to 1-2, information revealed to 2-3 facts, quest hooks to 1-2.
` + avoidNamesSection + `
Return ONLY a valid JSON object with this structure:
{
  "character_name": "Creative NPC name",
  "scene_setting": "Brief scene description",
  "mood": "Emotional state",
  "opening_line": "NPC's first words",
  "dialogue_tree": {
    "friendly": {
      "player_option": "Friendly approach",
      "npc_response": "1-2 sentence response",
      "outcome": "Brief result"
    },
    "neutral": {
      "player_option": "Neutral approach",
      "npc_response": "1-2 sentence response",
      "outcome": "Brief result"
    },
    "hostile": {
      "player_option": "Hostile approach",
      "npc_response": "1-2 sentence response",
      "outcome": "Brief result"
    }
  },
  "skill_checks": [
    {"skill": "Persuasion", "dc": 15, "success": "Brief success", "failure": "Brief failure"}
  ],
  "body_language": "Brief physical description",
  "information_revealed": ["fact1", "fact2"],
  "potential_quests": ["quest hook"]
}`

	case "npc":
		return `You are a D&D 5e NPC generator. Create memorable NPCs.` + campaignSection + `

CRITICAL RULES:
- Create a UNIQUE, CREATIVE character name appropriate for the race/setting
- NEVER use placeholder text like "NPC name", "Unknown", or model names
- Keep content CONCISE. Limit traits to 2-3, skills to 2-4, equipment to 3-5 items, plot hooks to 2-3.
- All text fields should be 1-3 sentences maximum
` + avoidNamesSection + `
Return ONLY a valid JSON object with this structure:
{
  "name": "Creative character name",
  "race": "Race",
  "class": "Class or occupation",
  "level": 5,
  "alignment": "Alignment",
  "appearance": "1-2 sentence physical description",
  "personality": {
    "traits": ["trait1", "trait2"],
    "ideals": "One sentence",
    "bonds": "One sentence",
    "flaws": "One sentence"
  },
  "background": "2-3 sentence history",
  "motivation": "One sentence drive",
  "abilities": {"STR": 10, "DEX": 10, "CON": 10, "INT": 10, "WIS": 10, "CHA": 10},
  "skills": ["skill1", "skill2"],
  "equipment": ["item1", "item2", "item3"],
  "role": "Brief role description",
  "plot_hooks": ["hook1", "hook2"]
}`

	case "item":
		return `You are a D&D 5e magic item creator. Create unique, balanced magical items.` + campaignSection + `

IMPORTANT: Generate UNIQUE items each time. Vary names, properties, origins, and aesthetics.
IMPORTANT: Keep content CONCISE to avoid truncation.
` + avoidNamesSection + `
Return ONLY a valid JSON object with this structure:
{
  "name": "Item Name",
  "type": "weapon/armor/ring/wand/potion/wondrous",
  "rarity": "common/uncommon/rare/very_rare/legendary",
  "description": "2-3 sentence description of the item's appearance and feel",
  "properties": {"bonus": "+1", "damage_type": "fire", "special": "brief special ability"},
  "origin": "Brief origin story (1-2 sentences)",
  "value": 500,
  "weight": 3,
  "attunement": false
}`

	case "location":
		return `You are a D&D 5e location designer. Create immersive locations.` + campaignSection + `

IMPORTANT: Generate UNIQUE locations each time. Vary names, atmospheres, inhabitants, and secrets.
IMPORTANT: Keep descriptions CONCISE. Each array should have 3-5 items maximum.
` + avoidNamesSection + `
Return ONLY a valid JSON object with this structure:
{
  "name": "Location name",
  "type": "city/dungeon/wilderness/etc",
  "theme": "Brief theme",
  "description": "2-3 paragraph description",
  "atmosphere": "One sentence mood/feeling",
  "features": ["feature1", "feature2", "feature3"],
  "secrets": ["secret1", "secret2"],
  "npcs": ["NPC Name - brief role"],
  "encounters": ["encounter hook 1", "encounter hook 2"],
  "factions": ["faction1", "faction2"]
}`

	case "quest":
		return `You are a D&D 5e quest designer. Create engaging quests.` + campaignSection + `

IMPORTANT: Generate UNIQUE quests each time. Vary titles, objectives, complications.
IMPORTANT: Keep content CONCISE. Each array should have 3-5 items maximum.
` + avoidNamesSection + `
Return ONLY a valid JSON object with this structure:
{
  "title": "Quest Title",
  "type": "main/side/faction/personal",
  "category": "easy/medium/hard/deadly",
  "description": "2-3 paragraph quest description",
  "objectives": ["objective 1", "objective 2", "objective 3"],
  "rewards": ["reward 1", "reward 2"],
  "complications": ["complication 1", "complication 2"],
  "npcs_involved": ["NPC Name - role"],
  "locations_involved": ["Location - relevance"],
  "party_level": 5,
  "time_limit": "optional time constraint"
}`
	case "rumors":
		return `You are a D&D 5e rumor creator. Create intriguing rumors that drive adventure.` + campaignSection + `

IMPORTANT: Generate UNIQUE rumors each time. Vary sources, subjects, and veracity levels.
IMPORTANT: Keep each rumor CONCISE - 1-2 sentences for the text.
` + avoidNamesSection + `
Return ONLY a valid JSON object with this structure:
{
  "rumors": [
    {
      "text": "The rumor text that NPCs would actually say",
      "source": "Who spreads this rumor (tavern keeper, merchant, etc)",
      "veracity": "true/partially true/false",
      "leads_to": "What adventure or location this could lead to",
      "context": "Brief background on why this rumor exists"
    }
  ]
}`

	case "tavern":
		return `You are a D&D 5e tavern designer. Create memorable taverns and inns.` + campaignSection + `

IMPORTANT: Generate UNIQUE establishments each time. Vary names, owners, atmospheres, and specialties.
IMPORTANT: Keep content CONCISE. Limit menu items to 3-4 each, patrons to 3-4, rooms to 2-3.
` + avoidNamesSection + `
Return ONLY a valid JSON object with this structure:
{
  "name": "The Tavern Name",
  "type": "tavern/inn/pub",
  "atmosphere": "Brief atmospheric description",
  "description": "2-3 sentence description of the establishment",
  "keeper_name": "Keeper's Name",
  "keeper_personality": "Brief personality description",
  "keeper_description": "Physical description",
  "menu_food": [{"name": "Dish", "description": "Brief desc", "price": "2 sp"}],
  "menu_drinks": [{"name": "Drink", "description": "Brief desc", "price": "4 cp"}],
  "rooms": [{"type": "Room Type", "description": "Brief desc", "price": "5 sp", "available": 2}],
  "patrons": [{"name": "Name", "race": "Race", "description": "Brief desc", "hook": "Optional adventure hook"}],
  "events": ["Current event 1"],
  "rumors": ["Rumor 1"],
  "special_notes": "Any special features or secrets"
}`

	case "merchant":
		return `You are a D&D 5e merchant creator. Create interesting shops and merchants.` + campaignSection + `

IMPORTANT: Generate UNIQUE merchants each time. Vary shop names, owner personalities, inventories, and secrets.
IMPORTANT: Keep content CONCISE. Limit inventory to 5-8 items, services to 2-3, special items to 1-2.
` + avoidNamesSection + `
Return ONLY a valid JSON object with this structure:
{
  "name": "Shop Name",
  "shop_type": "weapon_shop/magic_shop/etc",
  "atmosphere": "Brief atmospheric description",
  "description": "2-3 sentence description of the shop",
  "location": "Where the shop is located",
  "owner_name": "Owner's Name",
  "owner_personality": "Brief personality description",
  "owner_description": "Physical description",
  "haggle_willingness": "eager/willing/reluctant/refuses",
  "inventory": [{"name": "Item", "description": "Brief desc", "price": "10 gp", "quantity": "3"}],
  "special_items": [{"name": "Rare Item", "description": "What makes it special", "price": "100 gp"}],
  "services": [{"name": "Service", "description": "What they offer", "price": "5 gp"}],
  "rumors": ["Rumor about the shop or owner"],
  "recently_sold": ["Notable item sold recently"],
  "special_notes": "Any secrets or adventure hooks"
}`

	case "trap":
		return `You are a D&D 5e trap designer. Create dangerous, clever traps.` + campaignSection + `

IMPORTANT: Generate UNIQUE traps each time. Vary mechanisms, triggers, and clever twists.
IMPORTANT: Keep content CONCISE. Limit solution paths to 2-3, complications to 2-3, clues to 2-3.
` + avoidNamesSection + `
Return ONLY a valid JSON object with this structure:
{
  "name": "Trap Name",
  "trap_type": "mechanical/magical/puzzle/environmental",
  "difficulty": "easy/medium/hard/deadly",
  "description": "2-3 sentence description of the trap",
  "environment": "Where trap is found",
  "trigger": "What activates the trap",
  "effect": "What happens when triggered",
  "damage": "2d10 piercing damage",
  "detection": {
    "passive_perception_dc": 15,
    "investigation_dc": 12,
    "clues": ["Clue for observant players"]
  },
  "solution_paths": [
    {"approach": "Disarm", "skill": "Thieves' Tools", "dc": 14, "description": "How to disarm", "time": "1 action", "failure": "What happens on failure"}
  ],
  "complications": ["Optional complication"],
  "rewards": ["What players get for bypassing"],
  "scaling": {"easier": "How to reduce difficulty", "harder": "How to increase difficulty"},
  "dm_notes": "Tips for running this trap"
}`

	case "critter":
		return `You are an expert tabletop RPG creature designer. Generate unique fantasy creatures.` + campaignSection + `

CRITICAL RULES:
- Create a UNIQUE, CREATIVE creature name (e.g., "Shimmerscale Fox", "Thornback Hedgehog", "Gloomwing Bat")
- NEVER use "Ollama", "Unknown", "Creature Name", "Low Power", or any placeholder text
- All ability names must be creative fantasy names, not technical terms
- Keep content CONCISE. Limit special abilities to 2-3, uses to 2-3, interesting facts to 2-3.
` + avoidNamesSection + `
Return ONLY a valid JSON object with this structure:
{
  "name": "YOUR UNIQUE CREATURE NAME",
  "species": "Species type",
  "critter_type": "mammal/bird/reptile/magical/etc",
  "size": "tiny/small/medium/large/huge",
  "temperament": "docile/neutral/aggressive/etc",
  "habitat": "Where it lives",
  "description": "2-3 sentence physical description",
  "behavior": "Brief behavioral description",
  "stats": {"ac": 12, "hp": 8, "speed": "30 ft", "str": 10, "dex": 14, "con": 12, "int": 4, "wis": 12, "cha": 6},
  "special_abilities": [{"name": "Creative Ability Name", "description": "What it does"}],
  "uses": ["Potential use for adventurers"],
  "training_difficulty": "Easy/Moderate/Difficult/Nearly Impossible",
  "diet": "What it eats",
  "lifespan": "How long it lives",
  "interesting_facts": ["Unique fact about this creature"],
  "encounter_notes": "Tips for DMs running encounters"
}`

	case "encounter":
		return `You are a D&D 5e encounter designer. Create balanced, exciting encounters.` + campaignSection + `

IMPORTANT: Generate UNIQUE encounters each time. Vary enemies, tactics, terrain features.
IMPORTANT: Keep content CONCISE. Limit creatures to 3-4 types, features to 3-4 items.
` + avoidNamesSection + `
Return ONLY a valid JSON object with this structure:
{
  "name": "Encounter Name",
  "description": "2-3 sentence description of the encounter setup",
  "difficulty": "easy/medium/hard/deadly",
  "expected_duration": "15-30 minutes",
  "environment": {
    "setting": "Brief terrain description",
    "features": ["feature1", "feature2", "feature3"],
    "lighting": "bright/dim/dark"
  },
  "creatures": [
    {"name": "Creature Name", "count": 2, "cr": 1, "role": "role", "tactics": "brief tactics"}
  ],
  "treasure": {
    "coins": {"gp": 50, "sp": 100},
    "items": ["item1", "item2"]
  },
  "xp_total": 450,
  "xp_per_player": 112
}`

	case "monster":
		return `You are a D&D 5e monster creator. Create unique, balanced monsters.` + campaignSection + `

CRITICAL RULES:
- Generate a UNIQUE, CREATIVE monster name every time (e.g., "Thornback Stalker", "Void Crawler", "Ashen Wraith")
- NEVER use generic placeholder names like "Monster Name", "Ollama", or "Generated Monster"
- Vary abilities, tactics, and origins based on the monster type and environment
- Keep content CONCISE. Limit traits to 2-3, actions to 2-3.
` + avoidNamesSection + `
Return ONLY a valid JSON object with this exact structure:
{
  "name": "YOUR UNIQUE MONSTER NAME HERE",
  "size": "Medium",
  "type": "monstrosity",
  "alignment": "neutral evil",
  "armor_class": 15,
  "hit_points": {"average": 45, "dice": "6d8+18"},
  "speed": {"walk": 30, "fly": 0, "swim": 0},
  "abilities": {"STR": 16, "DEX": 14, "CON": 16, "INT": 8, "WIS": 12, "CHA": 8},
  "skills": ["Perception +3", "Stealth +4"],
  "senses": {"darkvision": 60, "passive_perception": 13},
  "languages": ["Common"],
  "challenge_rating": 3,
  "xp": 700,
  "traits": [
    {"name": "Trait Name", "description": "What the trait does"}
  ],
  "actions": [
    {"name": "Action Name", "description": "Attack or ability description", "attack_bonus": 5, "damage": "2d6+3 slashing"}
  ],
  "lore": "Brief background and origin story",
  "description": "Physical appearance description",
  "tactics": "How it fights in combat",
  "habitat": "Where it lives"
}`

	case "chase", "chase scene":
		return `You are a D&D 5e chase scene designer. Create exciting chase sequences.` + campaignSection + `

IMPORTANT: Generate UNIQUE chases each time. Vary settings, obstacles, and dramatic twists.
IMPORTANT: Keep content CONCISE. Limit obstacles to 3-4, complications to 2-3, shortcuts to 2, phases to 3-4.
` + avoidNamesSection + `
Return ONLY a valid JSON object with this structure:
{
  "name": "Chase Name",
  "chase_type": "foot_chase/mounted_chase/vehicle_chase/flying_chase",
  "terrain": "urban/forest/mountain/etc",
  "difficulty": "easy/medium/hard/deadly",
  "description": "2-3 sentence description of the chase",
  "setting": "Specific location details",
  "participants": {"quarry": "Who is being chased", "pursuers": "Who is chasing"},
  "starting_conditions": "How the chase begins",
  "obstacles": [{"name": "Obstacle Name", "description": "What it is", "check": "DC 15 Athletics or Acrobatics", "failure": "Consequence of failure"}],
  "complications": ["Random complication that can occur"],
  "shortcuts": [{"name": "Shortcut Name", "description": "How to use it", "benefit": "What advantage it gives"}],
  "chase_phases": [{"round": "1-2", "description": "What happens", "difficulty": "Easy/Medium/Hard"}],
  "ending_conditions": {"success": "How pursuers win", "failure": "How quarry escapes", "alternative": "Other outcome"},
  "rewards": {"success": "What winners get", "partial": "Partial success reward", "failure": "Consolation"},
  "special_rules": "Any special mechanics for this chase",
  "environmental_factors": ["Weather or terrain effect"]
}`

	default:
		// Generic fallback
		return `You are an expert tabletop RPG content generator. Generate comprehensive, creative content in JSON format.` + campaignSection + `

CRITICAL FORMATTING RULES:
1. Respond with ONLY a single JSON object - no markdown code blocks, no explanations
2. Return the object directly with all fields at the root level

Make the content creative, flavorful, and immediately usable at the game table.`
	}
}

// getSimplifiedSystemPrompt returns simplified, token-efficient prompts for low-power Ollama devices
// These prompts request less detail to avoid timeouts on slower local models
func getSimplifiedSystemPrompt(promptType string, campaignContext *string) string {
	// Simplified campaign context (much shorter)
	campaignSection := ""
	avoidNamesSection := ""
	if campaignContext != nil && *campaignContext != "" {
		campaignSection = "\n\nCAMPAIGN: Reference the campaign setting when relevant."
		// For low-power, only include a short avoid list if there are existing names
		avoidNamesSection = getSimplifiedAvoidNames(campaignContext, promptType)
	}

	normalizedType := strings.ToLower(promptType)

	switch normalizedType {
	case "npc":
		return `D&D NPC generator. Output JSON only, no prose.` + campaignSection + avoidNamesSection + `

{"name":"string","race":"string","class":"string","level":int,"alignment":"string","appearance":"brief","personality":{"traits":["1","2"],"ideals":"brief","bonds":"brief","flaws":"brief"},"background":"brief","motivation":"brief","abilities":{"STR":10,"DEX":10,"CON":10,"INT":10,"WIS":10,"CHA":10},"skills":["skill"],"equipment":["item"],"role":"brief","plot_hooks":["hook"]}`

	case "monster":
		return `Generate a D&D monster as JSON. Be concise.` + campaignSection + avoidNamesSection + `

IMPORTANT: Create a UNIQUE monster name. Never use "Ollama", "Monster Name", or placeholders.

Return ONLY valid JSON:
{
  "name": "UNIQUE CREATIVE NAME",
  "size": "Medium",
  "type": "beast/monstrosity/undead/etc",
  "alignment": "neutral",
  "armor_class": 13,
  "hit_points": {"average": 22, "dice": "4d8+4"},
  "speed": {"walk": 30},
  "abilities": {"STR": 14, "DEX": 12, "CON": 12, "INT": 6, "WIS": 10, "CHA": 6},
  "skills": ["Perception +2"],
  "senses": {"darkvision": 60},
  "languages": [],
  "challenge_rating": 1,
  "xp": 200,
  "traits": [{"name": "Trait", "description": "Brief"}],
  "actions": [{"name": "Attack", "description": "Brief", "damage": "1d8+2"}],
  "lore": "1-2 sentences",
  "description": "1-2 sentences",
  "tactics": "Brief",
  "habitat": "Where it lives"
}`

	case "location":
		return `Generate a D&D location as JSON. Be concise.` + campaignSection + avoidNamesSection + `

Return ONLY valid JSON:
{
  "name": "Name",
  "type": "Type",
  "theme": "Brief",
  "description": "1-2 paragraphs",
  "atmosphere": "1 sentence",
  "features": ["f1", "f2", "f3"],
  "secrets": ["s1", "s2"],
  "npcs": ["NPC - role"],
  "encounters": ["e1", "e2"],
  "factions": ["f1"]
}`

	case "quest":
		return `Generate a D&D quest as JSON. Be concise.` + campaignSection + avoidNamesSection + `

Return ONLY valid JSON:
{
  "title": "Title",
  "type": "Type",
  "category": "Difficulty",
  "description": "1-2 paragraphs",
  "objectives": ["o1", "o2", "o3"],
  "rewards": ["r1", "r2"],
  "complications": ["c1", "c2"],
  "npcs_involved": ["NPC - role"],
  "locations_involved": ["Location"],
  "party_level": 5,
  "time_limit": "Optional"
}`

	case "item":
		return `Generate a D&D magic item as JSON. Be concise.` + campaignSection + avoidNamesSection + `

Return ONLY valid JSON:
{
  "name": "Name",
  "type": "Type",
  "rarity": "Rarity",
  "description": "1-2 sentences",
  "properties": {"bonus": "+1", "special": "brief"},
  "origin": "1 sentence",
  "value": 500,
  "weight": 3,
  "attunement": false
}`

	case "merchant":
		return `Generate a D&D merchant/shop as JSON. Be concise.` + campaignSection + avoidNamesSection + `

Return ONLY valid JSON:
{
  "name": "Shop Name",
  "shop_type": "Type",
  "atmosphere": "Brief",
  "description": "1-2 sentences",
  "location": "Where",
  "owner_name": "Name",
  "owner_personality": "Brief",
  "owner_description": "Brief",
  "haggle_willingness": "willing",
  "inventory": [{"name": "Item", "description": "Brief", "price": "10 gp", "quantity": "3"}],
  "special_items": [{"name": "Item", "description": "Brief", "price": "100 gp"}],
  "services": [{"name": "Service", "description": "Brief", "price": "5 gp"}],
  "rumors": ["rumor"],
  "recently_sold": ["item"],
  "special_notes": "Brief"
}`

	case "tavern":
		return `Generate a D&D tavern as JSON. Be concise.` + campaignSection + avoidNamesSection + `

Return ONLY valid JSON with: name, type, atmosphere, description (brief), keeper_name, keeper_personality, keeper_description, menu_food (2-3 items), menu_drinks (2-3), rooms (2), patrons (2-3), events (1-2), rumors (1-2), special_notes.`

	case "encounter":
		return `Generate a D&D encounter as JSON. Be concise.` + campaignSection + avoidNamesSection + `

Return ONLY valid JSON with: name, description (brief), difficulty, expected_duration, environment (setting, 2-3 features, lighting), creatures (2-3 types with count/cr/role/tactics), treasure (coins, items), xp_total, xp_per_player.`

	case "trap":
		return `Generate a D&D trap as JSON. Be concise.` + campaignSection + avoidNamesSection + `

Return ONLY valid JSON with: name, trap_type, difficulty, description (brief), environment, trigger, effect, damage, detection (passive_perception_dc, investigation_dc, 1-2 clues), 1-2 solution_paths, 1-2 complications, rewards, scaling, dm_notes.`

	case "critter":
		return `Generate a fantasy creature as JSON. Be concise.` + campaignSection + avoidNamesSection + `

IMPORTANT: Create a UNIQUE creature name like "Ember Fox" or "Moss Turtle". Never use "Ollama", "Unknown", or placeholders.

Return ONLY valid JSON:
{
  "name": "UNIQUE FANTASY NAME",
  "species": "Species type",
  "critter_type": "mammal/bird/reptile/magical",
  "size": "tiny/small/medium/large",
  "temperament": "docile/neutral/aggressive",
  "habitat": "Where it lives",
  "description": "1-2 sentences",
  "behavior": "Brief",
  "stats": {"ac": 12, "hp": 8, "speed": "30 ft", "str": 10, "dex": 14, "con": 12, "int": 4, "wis": 12, "cha": 6},
  "special_abilities": [{"name": "Fantasy Ability", "description": "Brief"}],
  "uses": ["use1"],
  "training_difficulty": "Easy/Moderate/Difficult",
  "diet": "What it eats",
  "lifespan": "How long",
  "interesting_facts": ["fact1"],
  "encounter_notes": "Brief"
}`

	case "chase", "chase scene":
		return `Generate a D&D chase as JSON. Be concise.` + campaignSection + avoidNamesSection + `

Return ONLY valid JSON with: name, chase_type, terrain, difficulty, description (brief), setting, participants, starting_conditions, 2-3 obstacles, 1-2 complications, 1-2 shortcuts, 2-3 chase_phases, ending_conditions, rewards, special_rules, environmental_factors.`

	case "dialogue":
		return `Generate D&D NPC dialogue as JSON. Be concise.` + campaignSection + avoidNamesSection + `

Return ONLY valid JSON with: character_name, scene_setting, mood, opening_line, dialogue_tree (friendly/neutral/hostile options), 1-2 skill_checks, body_language, information_revealed, potential_quests.`

	case "rumors":
		return `Generate D&D rumors as JSON. Be concise.` + campaignSection + avoidNamesSection + `

Return ONLY valid JSON with: rumors array (2-3 items with text, source, veracity, leads_to, context - all brief).`

	default:
		return `Generate RPG content as JSON. Be concise and creative.` + campaignSection + `

Return ONLY valid JSON. No markdown, no explanations.`
	}
}

// =============================================================================
// CORE GENERATION
// =============================================================================

// generateWithProvider is a helper that calls the current AI provider
func (c *AIClient) generateWithProvider(ctx context.Context, promptType string, params map[string]interface{}) (string, string, error) {
	if !c.factory.IsEnabled() {
		return "", "", fmt.Errorf("AI is disabled")
	}

	provider, err := c.factory.GetCurrentProvider()
	if err != nil {
		return "", "", fmt.Errorf("failed to get AI provider: %w", err)
	}

	prompt := buildPrompt(promptType, params)

	// Get campaign context if provided (handles both *string and string types)
	var campaignContext *string
	if ctxPtr, ok := params["campaign_context"].(*string); ok && ctxPtr != nil {
		campaignContext = ctxPtr
	} else if ctxStr, ok := params["campaign_context"].(string); ok && ctxStr != "" {
		campaignContext = &ctxStr
	}

	// Determine if we should use simplified prompts for low token counts
	// Low token counts (<=1024) work better with shorter, more direct prompts
	useSimplifiedPrompt := false
	if maxTokens, ok := params["max_tokens"].(int); ok && maxTokens <= 1024 {
		useSimplifiedPrompt = true
		c.logger.Debug("Using simplified prompt for low token count",
			zap.Int("max_tokens", maxTokens),
			zap.String("generator_type", promptType))
	}

	// Get the appropriate system prompt for this content type
	systemMsg := getSystemPromptForType(promptType, campaignContext, useSimplifiedPrompt)

	// Extract campaign_id and campaign_context from params
	var campaignID *string
	var campaignContextStr *string
	if cid, ok := params["campaign_id"].(*string); ok {
		campaignID = cid
	}
	if cctx, ok := params["campaign_context"].(*string); ok {
		campaignContextStr = cctx
	}

	req := ai.GenerateRequest{
		Prompt:          prompt,
		SystemMsg:       systemMsg,
		Temperature:     0.7,
		MaxTokens:       4096,               // Default to "high" detail level - 2000 was causing truncation
		GeneratorType:   promptType,         // Pass generator type for routing
		Context:         params,             // Pass all params as context for generator-specific fields
		CampaignID:      campaignID,         // For campaign context
		CampaignContext: campaignContextStr, // For direct providers
	}

	// Override with specific max tokens if provided
	if maxTokens, ok := params["max_tokens"].(int); ok && maxTokens > 0 {
		req.MaxTokens = maxTokens
		c.logger.Info("Using custom max_tokens from params",
			zap.Int("max_tokens", maxTokens),
			zap.String("generator_type", promptType))
	} else {
		c.logger.Info("Using default max_tokens (param not found or invalid)",
			zap.Int("default_max_tokens", req.MaxTokens),
			zap.String("generator_type", promptType),
			zap.Any("raw_param", params["max_tokens"]))
	}

	resp, err := provider.GenerateContent(ctx, req)
	if err != nil {
		return "", "", fmt.Errorf("failed to generate content: %w", err)
	}

	// Log raw response for debugging (first 500 chars)
	c.logger.Debug("Raw AI response",
		zap.String("provider", resp.Provider),
		zap.Int("content_length", len(resp.Content)),
		zap.String("content_preview", resp.Content[:min(500, len(resp.Content))]))

	// Clean the response to remove markdown formatting
	cleanedContent := cleanJSONResponse(resp.Content)

	// Log cleaned response for debugging (first 500 chars)
	c.logger.Debug("Cleaned AI response",
		zap.String("provider", resp.Provider),
		zap.Int("cleaned_length", len(cleanedContent)),
		zap.String("cleaned_preview", cleanedContent[:min(500, len(cleanedContent))]))

	return cleanedContent, resp.Provider, nil
}

// min is a helper function to return the minimum of two integers
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// =============================================================================
// HEALTH CHECK & HTTP UTILITIES
// =============================================================================

// HealthCheck checks if AI service is healthy
func (c *AIClient) HealthCheck(ctx context.Context) error {
	if !c.factory.IsEnabled() {
		return fmt.Errorf("AI is disabled")
	}

	provider, err := c.factory.GetCurrentProvider()
	if err != nil {
		return fmt.Errorf("failed to get AI provider: %w", err)
	}

	if err := provider.ValidateConnection(ctx); err != nil {
		return fmt.Errorf("AI provider validation failed: %w", err)
	}

	return nil
}

// Post makes a generic POST request to the AI service
func (c *AIClient) Post(ctx context.Context, endpoint string, payload interface{}, result interface{}) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	fullURL := fmt.Sprintf("%s%s", c.baseURL, endpoint)
	c.logger.Info("AIClient making POST request",
		zap.String("url", fullURL),
		zap.Int("payload_size", len(body)),
	)

	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		fullURL,
		bytes.NewReader(body),
	)
	if err != nil {
		c.logger.Error("Failed to create HTTP request", zap.Error(err))
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Content-Length", fmt.Sprintf("%d", len(body)))
	req.ContentLength = int64(len(body))

	// Check context before sending
	select {
	case <-ctx.Done():
		c.logger.Error("Context already cancelled before sending request", zap.Error(ctx.Err()))
		return fmt.Errorf("context cancelled: %w", ctx.Err())
	default:
		// Context is still active
	}

	c.logger.Debug("Sending HTTP request to AI service", zap.String("url", fullURL))

	// Use a channel to detect if Do() is blocking
	type httpResult struct {
		resp *http.Response
		err  error
	}
	resultChan := make(chan httpResult, 1)

	go func() {
		c.logger.Debug("Goroutine started, about to call httpClient.Do()")
		startTime := time.Now()
		resp, err := c.httpClient.Do(req)
		elapsed := time.Since(startTime)
		c.logger.Debug("httpClient.Do() returned",
			zap.Duration("elapsed", elapsed),
			zap.Bool("has_response", resp != nil),
			zap.Bool("has_error", err != nil))
		resultChan <- httpResult{resp: resp, err: err}
		c.logger.Debug("Result sent to channel")
	}()

	// Wait for either response or context cancellation
	var resp *http.Response
	select {
	case res := <-resultChan:
		resp = res.resp
		err = res.err
		c.logger.Info("HTTP request completed", zap.String("url", fullURL))
	case <-ctx.Done():
		c.logger.Error("Context cancelled while waiting for HTTP response",
			zap.Error(ctx.Err()),
			zap.String("url", fullURL))
		return fmt.Errorf("context cancelled: %w", ctx.Err())
	}

	if err != nil {
		c.logger.Error("HTTP request failed", zap.Error(err), zap.String("url", fullURL))
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer func() { _ = resp.Body.Close() }() //nolint:errcheck // Best effort close

	c.logger.Info("Received response from AI service",
		zap.Int("status_code", resp.StatusCode),
		zap.String("url", fullURL),
	)

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		c.logger.Error("AI service returned error",
			zap.Int("status_code", resp.StatusCode),
			zap.String("endpoint", endpoint),
			zap.String("body", string(bodyBytes)),
		)
		return fmt.Errorf("AI service returned status %d", resp.StatusCode)
	}

	if err := json.NewDecoder(resp.Body).Decode(result); err != nil {
		c.logger.Error("Failed to decode AI service response", zap.Error(err))
		return fmt.Errorf("failed to decode response: %w", err)
	}

	c.logger.Debug("Successfully decoded AI service response")
	return nil
}
