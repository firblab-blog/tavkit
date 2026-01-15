package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"

	"tavkit/internal/api/middleware"
	"tavkit/internal/db"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// Constants for D&D Beyond parsing
const (
	equipmentTypeArmor       = "Armor"
	proficiencyTypeExpertise = "expertise"
)

// DnDBeyondHandler handles D&D Beyond import requests
type DnDBeyondHandler struct {
	db     db.Database
	logger *zap.Logger
}

// NewDnDBeyondHandler creates a new D&D Beyond handler
func NewDnDBeyondHandler(database db.Database, logger *zap.Logger) *DnDBeyondHandler {
	return &DnDBeyondHandler{
		db:     database,
		logger: logger,
	}
}

// isSkill checks if a subType corresponds to a D&D 5e skill
func isSkill(subType string) bool {
	skills := []string{
		"acrobatics", "animal-handling", "arcana", "athletics", "deception",
		"history", "insight", "intimidation", "investigation", "medicine",
		"nature", "perception", "performance", "persuasion", "religion",
		"sleight-of-hand", "stealth", "survival",
	}
	for _, skill := range skills {
		if subType == skill {
			return true
		}
	}
	return false
}

// stripHTML removes HTML tags and converts common HTML entities to plain text
func stripHTML(html string) string {
	// Remove HTML tags
	re := regexp.MustCompile(`<[^>]*>`)
	text := re.ReplaceAllString(html, "")

	// Convert common HTML entities
	text = strings.ReplaceAll(text, "&mdash;", "-")
	text = strings.ReplaceAll(text, "&ndash;", "-")
	text = strings.ReplaceAll(text, "&ldquo;", "\"")
	text = strings.ReplaceAll(text, "&rdquo;", "\"")
	text = strings.ReplaceAll(text, "&lsquo;", "'")
	text = strings.ReplaceAll(text, "&rsquo;", "'")
	text = strings.ReplaceAll(text, "&amp;", "&")
	text = strings.ReplaceAll(text, "&lt;", "<")
	text = strings.ReplaceAll(text, "&gt;", ">")
	text = strings.ReplaceAll(text, "&nbsp;", " ")
	text = strings.ReplaceAll(text, "&quot;", "\"")

	// Clean up excessive whitespace and newlines
	text = regexp.MustCompile(`\r\n|\r|\n`).ReplaceAllString(text, "\n")
	text = regexp.MustCompile(`\n{3,}`).ReplaceAllString(text, "\n\n")
	text = regexp.MustCompile(`[ \t]+`).ReplaceAllString(text, " ")
	text = strings.TrimSpace(text)

	return text
}

// ImportCharacterRequest represents the request to import from D&D Beyond
type ImportCharacterRequest struct {
	URL        string  `json:"url" binding:"required"`
	CampaignID *string `json:"campaign_id,omitempty"`
}

// ImportCharacter imports a character from D&D Beyond
func (h *DnDBeyondHandler) ImportCharacter(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req ImportCharacterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Extract character ID from URL
	characterID, err := extractCharacterID(req.URL)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid D&D Beyond URL"})
		return
	}

	// Fetch character data from D&D Beyond API
	characterData, err := h.fetchDnDBeyondCharacter(characterID)
	if err != nil {
		h.logger.Error("Failed to fetch D&D Beyond character", zap.Error(err), zap.String("characterID", characterID))
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to fetch character from D&D Beyond: " + err.Error()})
		return
	}

	// Convert D&D Beyond data to our Character model
	character, err := h.convertDnDBeyondToCharacter(characterData, userID)
	if err != nil {
		h.logger.Error("Failed to convert D&D Beyond character", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to convert character data"})
		return
	}

	// Associate with campaign if provided
	if req.CampaignID != nil && *req.CampaignID != "" {
		character.CampaignID = req.CampaignID
	}

	// Create character in database
	if err := h.db.CreateCharacter(c.Request.Context(), character); err != nil {
		h.logger.Error("Failed to create imported character", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create character"})
		return
	}

	// Debug: Log what we're about to return
	h.logger.Info("Character created, about to return",
		zap.String("languages", string(character.Languages)),
		zap.String("senses", string(character.Senses)))

	c.JSON(http.StatusCreated, character)
}

// extractCharacterID extracts the character ID from a D&D Beyond URL
func extractCharacterID(url string) (string, error) {
	re := regexp.MustCompile(`/characters/(\d+)`)
	matches := re.FindStringSubmatch(url)
	if len(matches) < 2 {
		return "", fmt.Errorf("invalid URL format")
	}
	return matches[1], nil
}

// fetchDnDBeyondCharacter fetches character data from D&D Beyond
func (h *DnDBeyondHandler) fetchDnDBeyondCharacter(characterID string) (map[string]interface{}, error) {
	// D&D Beyond API endpoint
	url := fmt.Sprintf("https://character-service.dndbeyond.com/character/v5/character/%s", characterID)

	resp, err := http.Get(url) //nolint:gosec // URL is safe - hardcoded domain with validated ID
	if err != nil {
		return nil, fmt.Errorf("failed to fetch character: %w", err)
	}
	defer func() {
		if closeErr := resp.Body.Close(); closeErr != nil {
			h.logger.Warn("Failed to close response body", zap.Error(closeErr))
		}
	}()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("D&D Beyond returned status %d - character may be private or not exist", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var data map[string]interface{}
	if err := json.Unmarshal(body, &data); err != nil {
		return nil, fmt.Errorf("failed to parse character data: %w", err)
	}

	// Extract the data object if it exists
	if dataObj, ok := data["data"].(map[string]interface{}); ok {
		return dataObj, nil
	}

	return data, nil
}

// convertDnDBeyondToCharacter converts D&D Beyond JSON to our Character model
func (h *DnDBeyondHandler) convertDnDBeyondToCharacter(data map[string]interface{}, userID string) (*db.Character, error) {
	character := &db.Character{
		UserID:      userID,
		AIGenerated: false,
	}

	h.extractBasicInfo(data, character)
	h.extractDnDBeyondID(data, character)
	h.extractRaceInfo(data, character)
	h.extractSize(data, character)
	h.extractClassInfo(data, character)
	h.extractBackgroundAndAlignment(data, character)
	h.extractPhysicalAppearance(data, character)
	h.extractAbilityScores(data, character)
	h.extractCombatStats(data, character)
	h.extractSpeed(data, character)
	h.extractHitPoints(data, character)
	h.extractHitDice(data, character)
	h.extractProficiencyBonus(data, character)
	h.extractPassiveScores(data, character)
	h.extractDeathSaves(data, character)
	h.extractConditions(data, character)
	h.extractEquipment(data, character)
	h.extractSpells(data, character)
	h.extractFeatures(data, character)
	h.extractSkills(data, character)
	h.extractSavingThrows(data, character)
	h.extractPersonality(data, character)
	h.extractLifestyle(data, character)
	h.extractAvatar(data, character)

	return character, nil
}

func (h *DnDBeyondHandler) extractBasicInfo(data map[string]interface{}, character *db.Character) {
	if name, ok := data["name"].(string); ok {
		character.Name = name
	}
	if xp, ok := data["currentXp"].(float64); ok {
		character.ExperiencePoints = int(xp)
	}
	if insp, ok := data["inspiration"].(bool); ok {
		character.Inspiration = insp
	}
}

func (h *DnDBeyondHandler) extractDnDBeyondID(data map[string]interface{}, character *db.Character) {
	if id, ok := data["id"].(float64); ok {
		idStr := fmt.Sprintf("%.0f", id)
		character.DnDBeyondID = &idStr
	}
}

func (h *DnDBeyondHandler) extractSize(data map[string]interface{}, character *db.Character) {
	race, ok := data["race"].(map[string]interface{})
	if !ok {
		return
	}

	sizeID, ok := race["sizeId"].(float64)
	if !ok {
		return
	}

	sizeNames := map[int]string{
		2: "Tiny",
		3: "Small",
		4: "Medium",
		5: "Large",
		6: "Huge",
		7: "Gargantuan",
	}

	if size, exists := sizeNames[int(sizeID)]; exists {
		character.Size = &size
	}
}

func (h *DnDBeyondHandler) extractRaceInfo(data map[string]interface{}, character *db.Character) {
	race, ok := data["race"].(map[string]interface{})
	if !ok {
		return
	}
	if raceName, ok := race["fullName"].(string); ok {
		character.Race = raceName
	} else if baseName, ok := race["baseName"].(string); ok {
		character.Race = baseName
	}
	if subrace, ok := race["subRaceShortName"].(string); ok && subrace != "" {
		character.Subrace = &subrace
	}
}

func (h *DnDBeyondHandler) extractClassInfo(data map[string]interface{}, character *db.Character) {
	classes, ok := data["classes"].([]interface{})
	if !ok || len(classes) == 0 {
		return
	}

	var classNames []string
	totalLevel := 0

	for _, cls := range classes {
		classMap, ok := cls.(map[string]interface{})
		if !ok {
			continue
		}

		def, ok := classMap["definition"].(map[string]interface{})
		if !ok {
			continue
		}

		className, ok := def["name"].(string)
		if !ok {
			continue
		}

		level := 0
		if lvl, ok := classMap["level"].(float64); ok {
			level = int(lvl)
		}
		classNames = append(classNames, fmt.Sprintf("%s %d", className, level))
		totalLevel += level

		// Extract subclass
		if subclass, ok := classMap["subclassDefinition"].(map[string]interface{}); ok {
			if subclassName, ok := subclass["name"].(string); ok {
				character.Subclass = &subclassName
			}
		}
	}

	character.ClassInfo = strings.Join(classNames, " / ")
	character.Level = totalLevel
}

func (h *DnDBeyondHandler) extractBackgroundAndAlignment(data map[string]interface{}, character *db.Character) {
	if bg, ok := data["background"].(map[string]interface{}); ok {
		if def, ok := bg["definition"].(map[string]interface{}); ok {
			if bgName, ok := def["name"].(string); ok {
				character.Background = &bgName
			}
		}
	}
	if alignment, ok := data["alignmentId"].(float64); ok {
		alignmentName := getAlignmentName(int(alignment))
		character.Alignment = &alignmentName
	}
}

func (h *DnDBeyondHandler) extractPhysicalAppearance(data map[string]interface{}, character *db.Character) {
	if hair, ok := data["hair"].(string); ok && hair != "" {
		character.Hair = &hair
	}
	if eyes, ok := data["eyes"].(string); ok && eyes != "" {
		character.Eyes = &eyes
	}
	if skin, ok := data["skin"].(string); ok && skin != "" {
		character.Skin = &skin
	}
	if height, ok := data["height"].(string); ok && height != "" {
		character.Height = &height
	}
	if weight, ok := data["weight"].(string); ok && weight != "" {
		character.Weight = &weight
	}
	if gender, ok := data["gender"].(string); ok && gender != "" {
		character.Gender = &gender
	}
	if age, ok := data["age"].(string); ok && age != "" {
		character.Age = &age
	}
	if faith, ok := data["faith"].(string); ok && faith != "" {
		character.Faith = &faith
	}
}

func (h *DnDBeyondHandler) extractAbilityScores(data map[string]interface{}, character *db.Character) {
	// Extract base stats
	stats, ok := data["stats"].([]interface{})
	if !ok {
		return
	}

	// Create a map to hold ability scores by ID for easier manipulation
	abilityScores := make(map[int]int)

	for _, stat := range stats {
		statMap, ok := stat.(map[string]interface{})
		if !ok {
			continue
		}
		id, _ := statMap["id"].(float64)
		value, _ := statMap["value"].(float64)
		abilityScores[int(id)] = int(value)
	}

	// Apply bonus stats (additive modifiers)
	if bonusStats, ok := data["bonusStats"].([]interface{}); ok {
		for _, stat := range bonusStats {
			statMap, ok := stat.(map[string]interface{})
			if !ok {
				continue
			}
			id, _ := statMap["id"].(float64)
			if value, ok := statMap["value"].(float64); ok {
				abilityScores[int(id)] += int(value)
			}
		}
	}

	// Apply override stats (complete replacements)
	if overrideStats, ok := data["overrideStats"].([]interface{}); ok {
		for _, stat := range overrideStats {
			statMap, ok := stat.(map[string]interface{})
			if !ok {
				continue
			}
			id, _ := statMap["id"].(float64)
			if value, ok := statMap["value"].(float64); ok {
				abilityScores[int(id)] = int(value)
			}
		}
	}

	// Apply racial and other modifiers from the modifiers object
	h.applyAbilityModifiers(data, abilityScores)

	// Set final values on character
	character.Strength = abilityScores[1]
	character.Dexterity = abilityScores[2]
	character.Constitution = abilityScores[3]
	character.Intelligence = abilityScores[4]
	character.Wisdom = abilityScores[5]
	character.Charisma = abilityScores[6]
}

func (h *DnDBeyondHandler) applyAbilityModifiers(data map[string]interface{}, abilityScores map[int]int) {
	modifiers, ok := data["modifiers"].(map[string]interface{})
	if !ok {
		return
	}

	sources := []string{"race", "class", "background", "feat", "item"}
	for _, source := range sources {
		sourceModifiers, ok := modifiers[source].([]interface{})
		if !ok {
			continue
		}

		for _, mod := range sourceModifiers {
			modMap, ok := mod.(map[string]interface{})
			if !ok {
				continue
			}

			modType, _ := modMap["type"].(string)
			if modType != "bonus" {
				continue
			}

			subType, _ := modMap["subType"].(string)
			statID := h.getAbilityIDFromSubType(subType)
			if statID == 0 {
				continue
			}

			if value, ok := modMap["value"].(float64); ok {
				abilityScores[statID] += int(value)
			} else if fixedValue, ok := modMap["fixedValue"].(float64); ok {
				abilityScores[statID] += int(fixedValue)
			}
		}
	}
}

func (h *DnDBeyondHandler) getAbilityIDFromSubType(subType string) int {
	switch subType {
	case "strength-score":
		return 1
	case "dexterity-score":
		return 2
	case "constitution-score":
		return 3
	case "intelligence-score":
		return 4
	case "wisdom-score":
		return 5
	case "charisma-score":
		return 6
	default:
		return 0
	}
}

func (h *DnDBeyondHandler) extractCombatStats(data map[string]interface{}, character *db.Character) {
	// Calculate Armor Class - D&D Beyond doesn't provide pre-calculated AC
	character.ArmorClass = h.calculateArmorClass(data, character)

	// Calculate Initiative - DEX modifier + any bonuses
	character.Initiative = h.calculateInitiative(data, character)
}

func (h *DnDBeyondHandler) calculateArmorClass(data map[string]interface{}, character *db.Character) int {
	dexMod := (character.Dexterity - 10) / 2
	baseAC := 10 + dexMod // Unarmored default

	// Check inventory for equipped armor
	inventory, ok := data["inventory"].([]interface{})
	if !ok {
		return baseAC + h.getACBonuses(data)
	}

	hasArmor := false
	hasShield := false
	armorAC := 0
	armorType := 0 // 1=Light, 2=Medium, 3=Heavy, 4=Shield

	for _, item := range inventory {
		itemMap, ok := item.(map[string]interface{})
		if !ok {
			continue
		}

		equipped, _ := itemMap["equipped"].(bool)
		if !equipped {
			continue
		}

		def, ok := itemMap["definition"].(map[string]interface{})
		if !ok {
			continue
		}

		filterType, _ := def["filterType"].(string)
		if filterType != equipmentTypeArmor {
			continue
		}

		itemArmorType := 0
		if at, ok := def["armorTypeId"].(float64); ok {
			itemArmorType = int(at)
		}

		if itemArmorType == 4 { // Shield
			hasShield = true
		} else if itemArmorType >= 1 && itemArmorType <= 3 { // Armor
			hasArmor = true
			armorType = itemArmorType
			if ac, ok := def["armorClass"].(float64); ok {
				armorAC = int(ac)
			}
		}
	}

	if hasArmor {
		switch armorType {
		case 1: // Light armor - full DEX
			baseAC = armorAC + dexMod
		case 2: // Medium armor - DEX capped at +2
			cappedDex := dexMod
			if cappedDex > 2 {
				cappedDex = 2
			}
			baseAC = armorAC + cappedDex
		case 3: // Heavy armor - no DEX
			baseAC = armorAC
		}
	}

	if hasShield {
		baseAC += 2
	}

	// Add any AC bonuses from feats, items, etc.
	baseAC += h.getACBonuses(data)

	return baseAC
}

func (h *DnDBeyondHandler) getACBonuses(data map[string]interface{}) int {
	bonus := 0

	modifiers, ok := data["modifiers"].(map[string]interface{})
	if !ok {
		return bonus
	}

	sources := []string{"race", "class", "background", "feat", "item"}
	for _, source := range sources {
		sourceModifiers, ok := modifiers[source].([]interface{})
		if !ok {
			continue
		}

		for _, mod := range sourceModifiers {
			modMap, ok := mod.(map[string]interface{})
			if !ok {
				continue
			}

			modType, _ := modMap["type"].(string)
			subType, _ := modMap["subType"].(string)

			if modType == "bonus" && subType == "armor-class" {
				if value, ok := modMap["value"].(float64); ok {
					bonus += int(value)
				} else if fixedValue, ok := modMap["fixedValue"].(float64); ok {
					bonus += int(fixedValue)
				}
			}
		}
	}

	return bonus
}

func (h *DnDBeyondHandler) calculateInitiative(data map[string]interface{}, character *db.Character) int {
	dexMod := (character.Dexterity - 10) / 2
	initiative := dexMod

	// Check for initiative bonuses from feats, items, etc.
	modifiers, ok := data["modifiers"].(map[string]interface{})
	if !ok {
		return initiative
	}

	sources := []string{"race", "class", "background", "feat", "item"}
	for _, source := range sources {
		sourceModifiers, ok := modifiers[source].([]interface{})
		if !ok {
			continue
		}

		for _, mod := range sourceModifiers {
			modMap, ok := mod.(map[string]interface{})
			if !ok {
				continue
			}

			modType, _ := modMap["type"].(string)
			subType, _ := modMap["subType"].(string)

			if modType == "bonus" && subType == "initiative" {
				if value, ok := modMap["value"].(float64); ok {
					initiative += int(value)
				} else if fixedValue, ok := modMap["fixedValue"].(float64); ok {
					initiative += int(fixedValue)
				}
			}
		}
	}

	return initiative
}

func (h *DnDBeyondHandler) extractSpeed(data map[string]interface{}, character *db.Character) {
	baseSpeed := 30 // default

	// D&D Beyond stores speed in race.weightSpeeds.normal
	race, ok := data["race"].(map[string]interface{})
	if !ok {
		character.Speed = baseSpeed
		return
	}

	weightSpeeds, ok := race["weightSpeeds"].(map[string]interface{})
	if !ok {
		character.Speed = baseSpeed
		return
	}

	normalSpeeds, ok := weightSpeeds["normal"].(map[string]interface{})
	if !ok {
		character.Speed = baseSpeed
		return
	}

	// Extract walking speed
	if walk, ok := normalSpeeds["walk"].(float64); ok {
		baseSpeed = int(walk)
	}
	character.Speed = baseSpeed
	walkInt := baseSpeed
	character.SpeedWalking = &walkInt

	// Extract other movement speeds
	if fly, ok := normalSpeeds["fly"].(float64); ok && fly > 0 {
		flyInt := int(fly)
		character.SpeedFlying = &flyInt
	}
	if swim, ok := normalSpeeds["swim"].(float64); ok && swim > 0 {
		swimInt := int(swim)
		character.SpeedSwimming = &swimInt
	}
	if climb, ok := normalSpeeds["climb"].(float64); ok && climb > 0 {
		climbInt := int(climb)
		character.SpeedClimbing = &climbInt
	}
	if burrow, ok := normalSpeeds["burrow"].(float64); ok && burrow > 0 {
		burrowInt := int(burrow)
		character.SpeedBurrowing = &burrowInt
	}

	// Also check for custom speeds that override racial speeds
	if customSpeeds, ok := data["customSpeeds"].([]interface{}); ok && len(customSpeeds) > 0 {
		for _, cs := range customSpeeds {
			customSpeed, ok := cs.(map[string]interface{})
			if !ok {
				continue
			}
			movementId, _ := customSpeed["movementId"].(float64)
			distance, _ := customSpeed["distance"].(float64)
			if distance <= 0 {
				continue
			}
			distInt := int(distance)
			switch int(movementId) {
			case 1: // Walk
				character.Speed = distInt
				character.SpeedWalking = &distInt
			case 2: // Fly
				character.SpeedFlying = &distInt
			case 3: // Burrow
				character.SpeedBurrowing = &distInt
			case 4: // Swim
				character.SpeedSwimming = &distInt
			case 5: // Climb
				character.SpeedClimbing = &distInt
			}
		}
	}

	// Apply speed modifiers from feats/items/etc.
	h.applySpeedModifiers(data, character)
}

func (h *DnDBeyondHandler) applySpeedModifiers(data map[string]interface{}, character *db.Character) {
	modifiers, ok := data["modifiers"].(map[string]interface{})
	if !ok {
		return
	}

	sources := []string{"race", "class", "background", "feat", "item"}
	for _, source := range sources {
		sourceModifiers, ok := modifiers[source].([]interface{})
		if !ok {
			continue
		}

		for _, mod := range sourceModifiers {
			modMap, ok := mod.(map[string]interface{})
			if !ok {
				continue
			}

			modType, _ := modMap["type"].(string)
			subType, _ := modMap["subType"].(string)

			// Look for speed bonuses
			if modType == "bonus" && subType == "speed" {
				if value, ok := modMap["value"].(float64); ok && value != 0 {
					character.Speed += int(value)
					newWalk := character.Speed
					character.SpeedWalking = &newWalk
				}
			}
		}
	}
}

func (h *DnDBeyondHandler) extractHitPoints(data map[string]interface{}, character *db.Character) {
	maxHP := h.getMaxHitPoints(data)

	if maxHP > 0 {
		character.MaxHitPoints = maxHP
		if bonusHP := h.getBonusHitPoints(data); bonusHP > 0 {
			character.MaxHitPoints += bonusHP
		}
		h.logger.Info("Set MaxHitPoints", zap.Int("maxHP", character.MaxHitPoints))
	} else {
		h.logger.Warn("maxHP is 0, not setting MaxHitPoints")
	}

	removedHP := h.getRemovedHitPoints(data)
	character.CurrentHitPoints = character.MaxHitPoints - removedHP
	h.logger.Info("Set CurrentHitPoints", zap.Int("maxHP", character.MaxHitPoints), zap.Int("removedHP", removedHP), zap.Int("currentHP", character.CurrentHitPoints))

	if tempHP := h.getTempHitPoints(data); tempHP > 0 {
		character.TempHitPoints = tempHP
	}
}

func (h *DnDBeyondHandler) getMaxHitPoints(data map[string]interface{}) int {
	if hp, ok := data["baseHitPoints"].(float64); ok {
		maxHP := int(hp)
		h.logger.Info("Found baseHitPoints as float64", zap.Float64("value", hp), zap.Int("maxHP", maxHP))
		return maxHP
	}
	if hp, ok := data["baseHitPoints"].(int); ok {
		h.logger.Info("Found baseHitPoints as int", zap.Int("value", hp), zap.Int("maxHP", hp))
		return hp
	}
	h.logger.Warn("baseHitPoints not found or wrong type", zap.Any("baseHitPoints", data["baseHitPoints"]))
	return 0
}

func (h *DnDBeyondHandler) getBonusHitPoints(data map[string]interface{}) int {
	if bonusHP, ok := data["bonusHitPoints"].(float64); ok {
		return int(bonusHP)
	}
	if bonusHP, ok := data["bonusHitPoints"].(int); ok {
		return bonusHP
	}
	return 0
}

func (h *DnDBeyondHandler) getRemovedHitPoints(data map[string]interface{}) int {
	if hp, ok := data["removedHitPoints"].(float64); ok {
		return int(hp)
	}
	if hp, ok := data["removedHitPoints"].(int); ok {
		return hp
	}
	return 0
}

func (h *DnDBeyondHandler) getTempHitPoints(data map[string]interface{}) int {
	if tempHP, ok := data["temporaryHitPoints"].(float64); ok {
		return int(tempHP)
	}
	if tempHP, ok := data["temporaryHitPoints"].(int); ok {
		return tempHP
	}
	return 0
}

func (h *DnDBeyondHandler) extractHitDice(data map[string]interface{}, character *db.Character) {
	classes, ok := data["classes"].([]interface{})
	if !ok || len(classes) == 0 {
		return
	}

	totalDice := 0
	usedDice := 0
	var diceType string

	for _, cls := range classes {
		classMap, ok := cls.(map[string]interface{})
		if !ok {
			continue
		}

		if lvl, ok := classMap["level"].(float64); ok {
			totalDice += int(lvl)
		}
		if used, ok := classMap["hitDiceUsed"].(float64); ok {
			usedDice += int(used)
		}

		if def, ok := classMap["definition"].(map[string]interface{}); ok {
			if hd, ok := def["hitDice"].(float64); ok && diceType == "" {
				diceType = fmt.Sprintf("d%d", int(hd))
			}
		}
	}

	character.HitDiceTotal = totalDice
	character.HitDiceUsed = usedDice
	if diceType != "" {
		character.HitDice = &diceType
	}
}

func (h *DnDBeyondHandler) extractProficiencyBonus(data map[string]interface{}, character *db.Character) {
	if bonus, ok := data["proficiencyBonus"].(float64); ok {
		character.ProficiencyBonus = int(bonus)
	} else {
		// Calculate from level
		character.ProficiencyBonus = 2 + ((character.Level - 1) / 4)
	}
}

func (h *DnDBeyondHandler) extractPassiveScores(data map[string]interface{}, character *db.Character) {
	if perception, ok := data["passivePerception"].(float64); ok {
		character.PassivePerception = int(perception)
	}
	if insight, ok := data["passiveInsight"].(float64); ok {
		insightInt := int(insight)
		character.PassiveInsight = &insightInt
	}
	if investigation, ok := data["passiveInvestigation"].(float64); ok {
		investigationInt := int(investigation)
		character.PassiveInvestigation = &investigationInt
	}
}

func (h *DnDBeyondHandler) extractDeathSaves(data map[string]interface{}, character *db.Character) {
	deathSaves, ok := data["deathSaves"].(map[string]interface{})
	if !ok {
		return
	}
	if successes, ok := deathSaves["successCount"].(float64); ok {
		character.DeathSaveSuccesses = int(successes)
	}
	if failures, ok := deathSaves["failCount"].(float64); ok {
		character.DeathSaveFailures = int(failures)
	}
}

func (h *DnDBeyondHandler) extractConditions(data map[string]interface{}, character *db.Character) {
	conditions, ok := data["conditions"].([]interface{})
	if !ok || len(conditions) == 0 {
		return
	}
	conditionsJSON, err := json.Marshal(conditions)
	if err != nil {
		h.logger.Warn("Failed to marshal conditions", zap.Error(err))
		return
	}
	character.Conditions = conditionsJSON
}

func (h *DnDBeyondHandler) extractAvatar(data map[string]interface{}, character *db.Character) {
	// Try decorations.avatarUrl first
	if decorations, ok := data["decorations"].(map[string]interface{}); ok {
		if avatarURL, ok := decorations["avatarUrl"].(string); ok && avatarURL != "" {
			h.logger.Info("Found avatarUrl in decorations", zap.String("url", avatarURL))
			character.Avatar = &avatarURL
			return
		}
		// Try frameAvatarUrl as a fallback
		if frameAvatarURL, ok := decorations["frameAvatarUrl"].(string); ok && frameAvatarURL != "" {
			h.logger.Info("Found frameAvatarUrl in decorations", zap.String("url", frameAvatarURL))
			character.Avatar = &frameAvatarURL
			return
		}
	}

	// Fallback to top-level avatarUrl
	if avatarURL, ok := data["avatarUrl"].(string); ok && avatarURL != "" {
		h.logger.Info("Found avatarUrl in top-level data", zap.String("url", avatarURL))
		character.Avatar = &avatarURL
		return
	}

	h.logger.Warn("No avatar found for character")
}

func (h *DnDBeyondHandler) extractEquipment(data map[string]interface{}, character *db.Character) {
	// Extract currency in the expected format {cp, sp, ep, gp, pp}
	if currencies, ok := data["currencies"].(map[string]interface{}); ok {
		if currencyJSON, err := json.Marshal(currencies); err != nil {
			h.logger.Warn("Failed to marshal currency", zap.Error(err))
		} else {
			character.Currency = currencyJSON
		}
	}

	// Extract inventory items and categorize them
	if inventory, ok := data["inventory"].([]interface{}); ok && len(inventory) > 0 {
		var weapons []map[string]interface{}
		var armor []map[string]interface{}
		var equipment []map[string]interface{}

		for _, item := range inventory {
			if itemMap, ok := item.(map[string]interface{}); ok {
				equipped := false
				if eq, ok := itemMap["equipped"].(bool); ok {
					equipped = eq
				}

				var def map[string]interface{}
				if definition, ok := itemMap["definition"].(map[string]interface{}); ok {
					def = definition
				} else {
					continue
				}

				itemName := ""
				if name, ok := def["name"].(string); ok {
					itemName = name
				}

				quantity := 1
				if qty, ok := itemMap["quantity"].(float64); ok {
					quantity = int(qty)
				}

				// Categorize by filter type
				filterType := ""
				if ft, ok := def["filterType"].(string); ok {
					filterType = ft
				}

				baseItem := map[string]interface{}{
					"name":     itemName,
					"equipped": equipped,
					"quantity": quantity,
				}

				// Use tagged switch for filterType
				switch filterType {
				case "Weapon":
					weapons = append(weapons, baseItem)
				case equipmentTypeArmor:
					if armorClass, ok := def["armorClass"].(float64); ok {
						baseItem["ac"] = int(armorClass)
					}
					if armorType, ok := def["armorTypeId"].(float64); ok {
						baseItem["type"] = getArmorTypeName(int(armorType))
					}
					armor = append(armor, baseItem)
				default:
					// Regular equipment
					if desc, ok := def["description"].(string); ok {
						baseItem["description"] = stripHTML(desc)
					}
					equipment = append(equipment, baseItem)
				}
			}
		}

		if len(weapons) > 0 {
			if weaponsJSON, err := json.Marshal(weapons); err != nil {
				h.logger.Warn("Failed to marshal weapons", zap.Error(err))
			} else {
				character.Weapons = weaponsJSON
			}
		}
		if len(armor) > 0 {
			if armorJSON, err := json.Marshal(armor); err != nil {
				h.logger.Warn("Failed to marshal armor", zap.Error(err))
			} else {
				character.Armor = armorJSON
			}
		}
		if len(equipment) > 0 {
			if equipmentJSON, err := json.Marshal(equipment); err != nil {
				h.logger.Warn("Failed to marshal equipment", zap.Error(err))
			} else {
				character.Equipment = equipmentJSON
			}
		}
	}
}

func (h *DnDBeyondHandler) extractSpells(data map[string]interface{}, character *db.Character) {
	allSpells := []map[string]interface{}{}
	preparedSpells := []map[string]interface{}{}
	cantrips := []map[string]interface{}{}
	seenSpellIDs := make(map[int]bool)

	// Extract spells from all sources
	h.extractClassSpells(data, &allSpells, &preparedSpells, &cantrips, seenSpellIDs)
	h.extractSpellsFromSpellsObject(data, &allSpells, &preparedSpells, &cantrips, seenSpellIDs)

	// Store spell data on character
	h.storeSpellLists(character, allSpells, preparedSpells, cantrips)
	h.extractSpellSlots(data, character)
	h.extractSpellcastingAbility(data, character)
}

func (h *DnDBeyondHandler) extractSpellDetails(spellData map[string]interface{}) map[string]interface{} {
	spell := make(map[string]interface{})

	if id, ok := spellData["id"].(float64); ok {
		spell["id"] = int(id)
	}

	def, ok := spellData["definition"].(map[string]interface{})
	if !ok {
		return spell
	}

	if name, ok := def["name"].(string); ok {
		spell["name"] = name
	}
	if level, ok := def["level"].(float64); ok {
		spell["level"] = int(level)
	}
	if desc, ok := def["description"].(string); ok {
		spell["description"] = stripHTML(desc)
	}
	if school, ok := def["school"].(string); ok {
		spell["school"] = school
	}
	if castingTime, ok := def["activation"].(map[string]interface{}); ok {
		if activationType, ok := castingTime["activationType"].(float64); ok {
			spell["casting_time"] = int(activationType)
		}
	}
	if range_, ok := def["range"].(map[string]interface{}); ok {
		if rangeValue, ok := range_["rangeValue"].(float64); ok {
			spell["range"] = int(rangeValue)
		}
	}

	return spell
}

func (h *DnDBeyondHandler) extractClassSpells(data map[string]interface{}, allSpells, preparedSpells, cantrips *[]map[string]interface{}, seenSpellIDs map[int]bool) {
	classSpells, ok := data["classSpells"].([]interface{})
	if !ok {
		return
	}

	h.logger.Info("Processing classSpells array", zap.Int("count", len(classSpells)))
	for _, classSpellGroup := range classSpells {
		groupMap, ok := classSpellGroup.(map[string]interface{})
		if !ok {
			continue
		}

		nestedSpells, ok := groupMap["spells"].([]interface{})
		if !ok {
			continue
		}

		h.logger.Info("Found nested spells in classSpells", zap.Int("count", len(nestedSpells)))
		for _, spellItem := range nestedSpells {
			spellMap, ok := spellItem.(map[string]interface{})
			if !ok {
				continue
			}

			spell := h.extractSpellDetails(spellMap)
			if len(spell) == 0 {
				continue
			}

			h.logger.Info("Extracted spell from classSpells", zap.Any("spell", spell))

			// Check for duplicates
			if !h.addSpellIfUnique(spell, seenSpellIDs) {
				continue
			}

			// Determine if prepared
			isPrepared := h.isClassSpellPrepared(spellMap)
			spell["prepared"] = isPrepared

			// Categorize spell
			h.categorizeSpell(spell, isPrepared, allSpells, preparedSpells, cantrips)
		}
	}
}

func (h *DnDBeyondHandler) extractSpellsFromSpellsObject(data map[string]interface{}, allSpells, preparedSpells, cantrips *[]map[string]interface{}, seenSpellIDs map[int]bool) {
	spells, ok := data["spells"].(map[string]interface{})
	if !ok {
		return
	}

	// Process spells from different sources
	h.processSpellSource(spells, "class", false, allSpells, preparedSpells, cantrips, seenSpellIDs)
	h.processSpellSource(spells, "feat", true, allSpells, preparedSpells, cantrips, seenSpellIDs)
	h.processSpellSource(spells, "item", true, allSpells, preparedSpells, cantrips, seenSpellIDs)
	h.processSpellSource(spells, "race", true, allSpells, preparedSpells, cantrips, seenSpellIDs)
}

func (h *DnDBeyondHandler) processSpellSource(spells map[string]interface{}, source string, alwaysPrepared bool, allSpells, preparedSpells, cantrips *[]map[string]interface{}, seenSpellIDs map[int]bool) {
	spellsList, ok := spells[source].([]interface{})
	if !ok {
		return
	}

	h.logger.Info(fmt.Sprintf("Processing spells.%s array", source), zap.Int("count", len(spellsList)))
	for _, spellItem := range spellsList {
		spellMap, ok := spellItem.(map[string]interface{})
		if !ok {
			continue
		}

		spell := h.extractSpellDetails(spellMap)
		if len(spell) == 0 {
			continue
		}

		h.logger.Info(fmt.Sprintf("Extracted spell from spells.%s", source), zap.Any("spell", spell))

		// Check for duplicates
		if !h.addSpellIfUnique(spell, seenSpellIDs) {
			continue
		}

		// Determine prepared status
		isPrepared := alwaysPrepared
		if !alwaysPrepared {
			isPrepared = h.isSpellPrepared(spellMap)
		}
		spell["prepared"] = isPrepared

		// Categorize spell
		h.categorizeSpell(spell, isPrepared, allSpells, preparedSpells, cantrips)
	}
}

func (h *DnDBeyondHandler) addSpellIfUnique(spell map[string]interface{}, seenSpellIDs map[int]bool) bool {
	spellID, ok := spell["id"].(int)
	if !ok {
		return true
	}
	if seenSpellIDs[spellID] {
		h.logger.Info("Skipping duplicate spell", zap.Int("id", spellID))
		return false
	}
	seenSpellIDs[spellID] = true
	return true
}

func (h *DnDBeyondHandler) isClassSpellPrepared(spellMap map[string]interface{}) bool {
	if prep, ok := spellMap["prepared"].(bool); ok && prep {
		return true
	}
	if counts, ok := spellMap["countsAsKnownSpell"].(bool); ok && counts {
		return true
	}
	return false
}

func (h *DnDBeyondHandler) isSpellPrepared(spellMap map[string]interface{}) bool {
	if prep, ok := spellMap["prepared"].(bool); ok && prep {
		return true
	}
	if alwaysPrep, ok := spellMap["alwaysPrepared"].(bool); ok && alwaysPrep {
		return true
	}
	return false
}

func (h *DnDBeyondHandler) categorizeSpell(spell map[string]interface{}, isPrepared bool, allSpells, preparedSpells, cantrips *[]map[string]interface{}) {
	level, ok := spell["level"].(int)
	if !ok {
		return
	}

	if level == 0 {
		*cantrips = append(*cantrips, spell)
	} else {
		*allSpells = append(*allSpells, spell)
		if isPrepared {
			*preparedSpells = append(*preparedSpells, spell)
		}
	}
}

func (h *DnDBeyondHandler) storeSpellLists(character *db.Character, allSpells, preparedSpells, cantrips []map[string]interface{}) {
	if len(allSpells) > 0 {
		if spellsJSON, err := json.Marshal(allSpells); err != nil {
			h.logger.Warn("Failed to marshal known spells", zap.Error(err))
		} else {
			character.KnownSpells = spellsJSON
		}
	}

	allPrepared := append([]map[string]interface{}{}, cantrips...)
	allPrepared = append(allPrepared, preparedSpells...)
	if len(allPrepared) > 0 {
		if preparedJSON, err := json.Marshal(allPrepared); err != nil {
			h.logger.Warn("Failed to marshal prepared spells", zap.Error(err))
		} else {
			character.PreparedSpells = preparedJSON
		}
	}

	if len(cantrips) > 0 {
		if cantripsJSON, err := json.Marshal(cantrips); err != nil {
			h.logger.Warn("Failed to marshal cantrips", zap.Error(err))
		} else {
			character.Cantrips = cantripsJSON
		}
	}
}

func (h *DnDBeyondHandler) extractSpellSlots(data map[string]interface{}, character *db.Character) {
	spellSlots, ok := data["spellSlots"].([]interface{})
	if !ok || len(spellSlots) == 0 {
		return
	}

	slotsMap := make(map[string]interface{})
	for _, slot := range spellSlots {
		slotMap, ok := slot.(map[string]interface{})
		if !ok {
			continue
		}

		level := 0
		if lvl, ok := slotMap["level"].(float64); ok {
			level = int(lvl)
		}
		if level == 0 {
			continue
		}

		available := 0
		if avail, ok := slotMap["available"].(float64); ok {
			available = int(avail)
		}
		used := 0
		if u, ok := slotMap["used"].(float64); ok {
			used = int(u)
		}

		slotsMap[fmt.Sprintf("level_%d", level)] = map[string]int{
			"total": available,
			"used":  used,
		}
	}

	if len(slotsMap) > 0 {
		if slotsJSON, err := json.Marshal(slotsMap); err != nil {
			h.logger.Warn("Failed to marshal spell slots", zap.Error(err))
		} else {
			character.SpellSlots = slotsJSON
		}
	}
}

func (h *DnDBeyondHandler) extractSpellcastingAbility(data map[string]interface{}, character *db.Character) {
	spellcastingAbilityId := h.getSpellcastingAbilityID(data)
	if spellcastingAbilityId == 0 {
		return
	}

	abilityName := getAbilityName(spellcastingAbilityId)
	character.SpellcastingAbility = &abilityName

	abilityScore := h.getAbilityScore(character, spellcastingAbilityId)
	abilityMod := (abilityScore - 10) / 2
	saveDC := 8 + character.ProficiencyBonus + abilityMod
	attackBonus := character.ProficiencyBonus + abilityMod

	character.SpellSaveDC = &saveDC
	character.SpellAttackBonus = &attackBonus
}

func (h *DnDBeyondHandler) getSpellcastingAbilityID(data map[string]interface{}) int {
	// Try top-level field first
	if spellcastingAbility, ok := data["spellCastingAbilityId"].(float64); ok {
		return int(spellcastingAbility)
	}

	// Try to infer from class
	classes, ok := data["classes"].([]interface{})
	if !ok || len(classes) == 0 {
		return 0
	}

	classMap, ok := classes[0].(map[string]interface{})
	if !ok {
		return 0
	}

	def, ok := classMap["definition"].(map[string]interface{})
	if !ok {
		return 0
	}

	if scAbility, ok := def["spellCastingAbilityId"].(float64); ok {
		return int(scAbility)
	}

	return 0
}

func (h *DnDBeyondHandler) getAbilityScore(character *db.Character, abilityID int) int {
	switch abilityID {
	case 1:
		return character.Strength
	case 2:
		return character.Dexterity
	case 3:
		return character.Constitution
	case 4:
		return character.Intelligence
	case 5:
		return character.Wisdom
	case 6:
		return character.Charisma
	default:
		return 0
	}
}

func (h *DnDBeyondHandler) extractFeatures(data map[string]interface{}, character *db.Character) {
	h.extractFeats(data, character)
	h.extractClassFeatures(data, character)
	h.extractRacialTraits(data, character)
	h.extractActions(data, character)
	h.extractProficiencies(data, character)
	h.extractLanguages(data, character)
	h.extractSenses(data, character)
}

func (h *DnDBeyondHandler) extractFeats(data map[string]interface{}, character *db.Character) {
	feats, ok := data["feats"].([]interface{})
	if !ok || len(feats) == 0 {
		return
	}

	var formalizedFeats []map[string]interface{}
	for _, feat := range feats {
		if formalizedFeat := h.extractNameAndDescription(feat); formalizedFeat != nil {
			formalizedFeats = append(formalizedFeats, formalizedFeat)
		}
	}

	if len(formalizedFeats) > 0 {
		if featsJSON, err := json.Marshal(formalizedFeats); err != nil {
			h.logger.Warn("Failed to marshal feats", zap.Error(err))
		} else {
			character.Feats = featsJSON
		}
	}
}

func (h *DnDBeyondHandler) extractClassFeatures(data map[string]interface{}, character *db.Character) {
	classes, ok := data["classes"].([]interface{})
	if !ok {
		return
	}

	var allClassFeatures []map[string]interface{}
	for _, cls := range classes {
		classMap, ok := cls.(map[string]interface{})
		if !ok {
			continue
		}

		classFeatures, ok := classMap["classFeatures"].([]interface{})
		if !ok {
			continue
		}

		for _, feature := range classFeatures {
			if formalizedFeature := h.extractClassFeature(feature); formalizedFeature != nil {
				allClassFeatures = append(allClassFeatures, formalizedFeature)
			}
		}
	}

	if len(allClassFeatures) > 0 {
		if featuresJSON, err := json.Marshal(allClassFeatures); err != nil {
			h.logger.Warn("Failed to marshal features", zap.Error(err))
		} else {
			character.Features = featuresJSON
		}
	}
}

func (h *DnDBeyondHandler) extractClassFeature(feature interface{}) map[string]interface{} {
	featureMap, ok := feature.(map[string]interface{})
	if !ok {
		return nil
	}

	formalizedFeature := h.extractNameAndDescription(feature)
	if formalizedFeature == nil {
		return nil
	}

	// Check for limited uses
	if limitedUse, ok := featureMap["limitedUse"].(map[string]interface{}); ok {
		if uses := h.extractLimitedUses(limitedUse); uses != nil {
			formalizedFeature["uses"] = uses
		}
	}

	return formalizedFeature
}

func (h *DnDBeyondHandler) extractLimitedUses(limitedUse map[string]interface{}) map[string]interface{} {
	uses := make(map[string]interface{})
	maxUsesVal := 0

	if maxUses, ok := limitedUse["maxUses"].(float64); ok {
		maxUsesVal = int(maxUses)
		uses["max"] = maxUsesVal
	}
	if usedUses, ok := limitedUse["numberUsed"].(float64); ok {
		uses["current"] = maxUsesVal - int(usedUses)
	}

	if len(uses) > 0 {
		return uses
	}
	return nil
}

func (h *DnDBeyondHandler) extractNameAndDescription(item interface{}) map[string]interface{} {
	itemMap, ok := item.(map[string]interface{})
	if !ok {
		return nil
	}

	def, ok := itemMap["definition"].(map[string]interface{})
	if !ok {
		return nil
	}

	formalized := make(map[string]interface{})
	if name, ok := def["name"].(string); ok {
		formalized["name"] = name
	}
	if desc, ok := def["description"].(string); ok {
		formalized["description"] = stripHTML(desc)
	}

	if len(formalized) > 0 {
		return formalized
	}
	return nil
}

func (h *DnDBeyondHandler) extractRacialTraits(data map[string]interface{}, character *db.Character) {
	race, ok := data["race"].(map[string]interface{})
	if !ok {
		return
	}

	racialTraits, ok := race["racialTraits"].([]interface{})
	if !ok {
		return
	}

	var formalizedTraits []map[string]interface{}
	for _, trait := range racialTraits {
		if formalizedTrait := h.extractNameAndDescription(trait); formalizedTrait != nil {
			formalizedTraits = append(formalizedTraits, formalizedTrait)
		}
	}

	if len(formalizedTraits) > 0 {
		if traitsJSON, err := json.Marshal(formalizedTraits); err != nil {
			h.logger.Warn("Failed to marshal racial traits", zap.Error(err))
		} else {
			character.RacialTraits = traitsJSON
		}
	}
}

func (h *DnDBeyondHandler) extractActions(data map[string]interface{}, character *db.Character) {
	actionsData, ok := data["actions"].(map[string]interface{})
	if !ok {
		return
	}

	// Collect actions by activation type
	var standardActions []map[string]interface{}
	var bonusActions []map[string]interface{}
	var reactions []map[string]interface{}

	// Process actions from all sources (race, class, feat, item, background)
	sources := []string{"race", "class", "feat", "item", "background"}
	for _, source := range sources {
		sourceActions, ok := actionsData[source].([]interface{})
		if !ok {
			continue
		}

		for _, action := range sourceActions {
			actionMap, ok := action.(map[string]interface{})
			if !ok {
				continue
			}

			// Extract the action details
			actionInfo := h.extractActionDetails(actionMap)
			if actionInfo == nil {
				continue
			}

			// Determine activation type
			activationType := h.getActionActivationType(actionMap)
			switch activationType {
			case 3: // Bonus Action
				bonusActions = append(bonusActions, actionInfo)
			case 4: // Reaction
				reactions = append(reactions, actionInfo)
			default: // Standard Action (1) or other
				standardActions = append(standardActions, actionInfo)
			}
		}
	}

	// Store categorized actions
	if len(standardActions) > 0 {
		if actionsJSON, err := json.Marshal(standardActions); err != nil {
			h.logger.Warn("Failed to marshal actions", zap.Error(err))
		} else {
			character.Actions = actionsJSON
		}
	}

	if len(bonusActions) > 0 {
		if bonusJSON, err := json.Marshal(bonusActions); err != nil {
			h.logger.Warn("Failed to marshal bonus actions", zap.Error(err))
		} else {
			character.BonusActions = bonusJSON
		}
	}

	if len(reactions) > 0 {
		if reactionsJSON, err := json.Marshal(reactions); err != nil {
			h.logger.Warn("Failed to marshal reactions", zap.Error(err))
		} else {
			character.Reactions = reactionsJSON
		}
	}
}

func (h *DnDBeyondHandler) extractActionDetails(actionMap map[string]interface{}) map[string]interface{} {
	result := make(map[string]interface{})

	if name, ok := actionMap["name"].(string); ok {
		result["name"] = name
	} else {
		return nil // Actions need a name
	}

	if desc, ok := actionMap["description"].(string); ok {
		result["description"] = stripHTML(desc)
	}
	if snippet, ok := actionMap["snippet"].(string); ok {
		result["snippet"] = stripHTML(snippet)
	}

	// Extract limited use information if present
	if limitedUse, ok := actionMap["limitedUse"].(map[string]interface{}); ok {
		uses := make(map[string]interface{})
		if maxUses, ok := limitedUse["maxUses"].(float64); ok {
			uses["max"] = int(maxUses)
		}
		if numberUsed, ok := limitedUse["numberUsed"].(float64); ok {
			uses["used"] = int(numberUsed)
		}
		if resetType, ok := limitedUse["resetType"].(float64); ok {
			// 1=Short Rest, 2=Long Rest, 3=Dawn, etc.
			resetNames := map[int]string{1: "Short Rest", 2: "Long Rest", 3: "Dawn"}
			if name, exists := resetNames[int(resetType)]; exists {
				uses["resets"] = name
			}
		}
		if len(uses) > 0 {
			result["uses"] = uses
		}
	}

	return result
}

func (h *DnDBeyondHandler) getActionActivationType(actionMap map[string]interface{}) int {
	// Check for activation in action itself
	if activation, ok := actionMap["activation"].(map[string]interface{}); ok {
		if activationType, ok := activation["activationType"].(float64); ok {
			return int(activationType)
		}
	}

	// Check in actionType
	if actionType, ok := actionMap["actionType"].(float64); ok {
		return int(actionType)
	}

	return 1 // Default to standard action
}

func (h *DnDBeyondHandler) extractProficiencies(data map[string]interface{}, character *db.Character) {
	modifiers, ok := data["modifiers"].(map[string]interface{})
	if !ok {
		return
	}

	proficiencies := make(map[string][]string)
	h.logger.Info("Processing proficiencies from modifiers")

	sources := []string{"race", "class", "background", "feat", "item"}
	for _, source := range sources {
		h.processProficiencySource(modifiers, source, proficiencies)
	}

	if len(proficiencies) > 0 {
		if proficienciesJSON, err := json.Marshal(proficiencies); err != nil {
			h.logger.Warn("Failed to marshal proficiencies", zap.Error(err))
		} else {
			character.Proficiencies = proficienciesJSON
		}
	}
}

func (h *DnDBeyondHandler) processProficiencySource(modifiers map[string]interface{}, source string, proficiencies map[string][]string) {
	sourceModifiers, ok := modifiers[source].([]interface{})
	if !ok {
		return
	}

	h.logger.Info("Processing modifiers", zap.String("source", source), zap.Int("count", len(sourceModifiers)))
	for _, mod := range sourceModifiers {
		modMap, ok := mod.(map[string]interface{})
		if !ok {
			continue
		}

		modType, _ := modMap["type"].(string)
		friendlyName := h.getFriendlyName(modMap)

		if friendlyName == "" {
			continue
		}

		h.categorizeProficiency(modMap, modType, friendlyName, proficiencies)
	}
}

func (h *DnDBeyondHandler) getFriendlyName(modMap map[string]interface{}) string {
	if fn, ok := modMap["friendlySubtypeName"].(string); ok {
		return fn
	}
	if fn, ok := modMap["friendlyTypeName"].(string); ok {
		return fn
	}
	return ""
}

func (h *DnDBeyondHandler) categorizeProficiency(modMap map[string]interface{}, modType, friendlyName string, proficiencies map[string][]string) {
	switch modType {
	case "proficiency":
		subType, _ := modMap["subType"].(string)
		h.logger.Info("Processing proficiency", zap.String("friendlyName", friendlyName), zap.String("subType", subType), zap.String("modType", modType))
		category := h.getProficiencyCategory(subType)
		proficiencies[category] = append(proficiencies[category], friendlyName)
	case proficiencyTypeExpertise:
		proficiencies["Expertise"] = append(proficiencies["Expertise"], friendlyName)
	case "language":
		// Languages handled separately
	default:
		h.logger.Info("Unhandled modifier type", zap.String("modType", modType), zap.String("friendlyName", friendlyName))
	}
}

func (h *DnDBeyondHandler) getProficiencyCategory(subType string) string {
	if strings.HasSuffix(subType, "-saving-throws") {
		return "Saving Throws"
	}
	if strings.HasSuffix(subType, "-armor") || subType == "shields" {
		return "Armor"
	}
	if strings.HasSuffix(subType, "-weapons") {
		return "Weapons"
	}
	if strings.Contains(subType, "-supplies") || strings.Contains(subType, "-kit") || strings.Contains(subType, "-tools") {
		return "Tools"
	}
	if isSkill(subType) {
		return "Skills"
	}
	h.logger.Info("Unhandled proficiency subType", zap.String("subType", subType))
	return "Other"
}

func (h *DnDBeyondHandler) extractLanguages(data map[string]interface{}, character *db.Character) {
	modifiers, ok := data["modifiers"].(map[string]interface{})
	if !ok {
		return
	}

	var languages []string
	sources := []string{"race", "background", "class", "feat"}

	for _, source := range sources {
		sourceModifiers, ok := modifiers[source].([]interface{})
		if !ok {
			continue
		}

		h.logger.Info("Processing language modifiers", zap.String("source", source), zap.Int("count", len(sourceModifiers)))
		for _, mod := range sourceModifiers {
			modMap, ok := mod.(map[string]interface{})
			if !ok {
				continue
			}

			modType, ok := modMap["type"].(string)
			if !ok || modType != "language" {
				continue
			}

			if friendlySubtypeName, ok := modMap["friendlySubtypeName"].(string); ok {
				h.logger.Info("Found language", zap.String("language", friendlySubtypeName))
				languages = append(languages, friendlySubtypeName)
			}
		}
	}

	h.logger.Info("Total languages extracted", zap.Int("count", len(languages)), zap.Any("languages", languages))
	if len(languages) > 0 {
		if languagesJSON, err := json.Marshal(languages); err != nil {
			h.logger.Warn("Failed to marshal languages", zap.Error(err))
		} else {
			character.Languages = languagesJSON
		}
	}
}

func (h *DnDBeyondHandler) extractSenses(data map[string]interface{}, character *db.Character) {
	senses := make(map[string]interface{})
	h.logger.Info("Processing senses from modifiers")

	h.extractSpecialSenses(data, senses)
	h.calculatePassiveSenses(data, character, senses)

	if len(senses) > 0 {
		if sensesJSON, err := json.Marshal(senses); err != nil {
			h.logger.Warn("Failed to marshal senses", zap.Error(err))
		} else {
			character.Senses = sensesJSON
			h.logger.Info("Senses extracted", zap.Any("senses", senses))
		}
	}
}

func (h *DnDBeyondHandler) extractSpecialSenses(data map[string]interface{}, senses map[string]interface{}) {
	modifiers, ok := data["modifiers"].(map[string]interface{})
	if !ok {
		return
	}

	sources := []string{"race", "class", "background", "feat", "item"}
	for _, source := range sources {
		sourceModifiers, ok := modifiers[source].([]interface{})
		if !ok {
			continue
		}

		h.logger.Info("Processing modifiers for senses", zap.String("source", source), zap.Int("count", len(sourceModifiers)))
		for _, mod := range sourceModifiers {
			modMap, ok := mod.(map[string]interface{})
			if !ok {
				continue
			}

			modType, ok := modMap["type"].(string)
			if !ok || modType != "sense" {
				continue
			}

			friendlyName := h.getFriendlyName(modMap)
			if friendlyName == "" {
				continue
			}

			h.logger.Info("Found sense", zap.String("friendlyName", friendlyName), zap.Any("modMap", modMap))

			value := h.getSenseValue(modMap, friendlyName)
			senses[friendlyName] = value
			h.logger.Info("Added sense", zap.String("name", friendlyName), zap.Any("value", value))
		}
	}
}

func (h *DnDBeyondHandler) getSenseValue(modMap map[string]interface{}, friendlyName string) string {
	if fixedValue, ok := modMap["fixedValue"].(float64); ok && fixedValue > 0 {
		return fmt.Sprintf("%s %d ft.", friendlyName, int(fixedValue))
	}
	if snippetValue, ok := modMap["snippet"].(string); ok && snippetValue != "" {
		return snippetValue
	}
	return friendlyName
}

func (h *DnDBeyondHandler) calculatePassiveSenses(data map[string]interface{}, character *db.Character, senses map[string]interface{}) {
	wisModifier := (character.Wisdom - 10) / 2
	intModifier := (character.Intelligence - 10) / 2
	profBonus := character.ProficiencyBonus

	skillBonuses := h.getSkillBonuses(data, profBonus)

	senses["Passive Perception"] = 10 + wisModifier + skillBonuses["perception"]
	senses["Passive Investigation"] = 10 + intModifier + skillBonuses["investigation"]
	senses["Passive Insight"] = 10 + wisModifier + skillBonuses["insight"]

	h.logger.Info("Calculated passive scores",
		zap.Int("perception", 10+wisModifier+skillBonuses["perception"]),
		zap.Int("investigation", 10+intModifier+skillBonuses["investigation"]),
		zap.Int("insight", 10+wisModifier+skillBonuses["insight"]))
}

func (h *DnDBeyondHandler) getSkillBonuses(data map[string]interface{}, profBonus int) map[string]int {
	bonuses := map[string]int{
		"perception":    0,
		"investigation": 0,
		"insight":       0,
	}

	modifiers, ok := data["modifiers"].(map[string]interface{})
	if !ok {
		return bonuses
	}

	sources := []string{"race", "class", "background", "feat"}
	for _, source := range sources {
		sourceModifiers, ok := modifiers[source].([]interface{})
		if !ok {
			continue
		}

		for _, mod := range sourceModifiers {
			modMap, ok := mod.(map[string]interface{})
			if !ok {
				continue
			}

			modType, _ := modMap["type"].(string)
			if modType != "proficiency" && modType != "expertise" {
				continue
			}

			subType, ok := modMap["subType"].(string)
			if !ok {
				continue
			}

			bonus := profBonus
			if modType == "expertise" {
				bonus = profBonus * 2
			}

			if _, exists := bonuses[subType]; exists {
				if bonus > bonuses[subType] {
					bonuses[subType] = bonus
				}
			}
		}
	}

	return bonuses
}

// skillAbilityMap maps skill names to their governing ability score ID
var skillAbilityMap = map[string]int{
	"acrobatics":      2, // DEX
	"animal-handling": 5, // WIS
	"arcana":          4, // INT
	"athletics":       1, // STR
	"deception":       6, // CHA
	"history":         4, // INT
	"insight":         5, // WIS
	"intimidation":    6, // CHA
	"investigation":   4, // INT
	"medicine":        5, // WIS
	"nature":          4, // INT
	"perception":      5, // WIS
	"performance":     6, // CHA
	"persuasion":      6, // CHA
	"religion":        4, // INT
	"sleight-of-hand": 2, // DEX
	"stealth":         2, // DEX
	"survival":        5, // WIS
}

func (h *DnDBeyondHandler) extractSkills(data map[string]interface{}, character *db.Character) {
	skills := make(map[string]map[string]interface{})

	// Get ability modifiers
	abilityMods := map[int]int{
		1: (character.Strength - 10) / 2,
		2: (character.Dexterity - 10) / 2,
		3: (character.Constitution - 10) / 2,
		4: (character.Intelligence - 10) / 2,
		5: (character.Wisdom - 10) / 2,
		6: (character.Charisma - 10) / 2,
	}

	// Initialize all skills with base ability modifier
	for skillName, abilityID := range skillAbilityMap {
		displayName := h.formatSkillName(skillName)
		skills[displayName] = map[string]interface{}{
			"bonus":      abilityMods[abilityID],
			"proficient": false,
			"expertise":  false,
		}
	}

	// Check modifiers for proficiencies and expertise
	modifiers, ok := data["modifiers"].(map[string]interface{})
	if !ok {
		h.storeSkills(character, skills)
		return
	}

	sources := []string{"race", "class", "background", "feat", "item"}
	for _, source := range sources {
		sourceModifiers, ok := modifiers[source].([]interface{})
		if !ok {
			continue
		}

		for _, mod := range sourceModifiers {
			modMap, ok := mod.(map[string]interface{})
			if !ok {
				continue
			}

			modType, _ := modMap["type"].(string)
			subType, _ := modMap["subType"].(string)

			if modType != "proficiency" && modType != proficiencyTypeExpertise {
				continue
			}

			if _, exists := skillAbilityMap[subType]; !exists {
				continue
			}

			displayName := h.formatSkillName(subType)
			abilityID := skillAbilityMap[subType]
			abilityMod := abilityMods[abilityID]

			if modType == proficiencyTypeExpertise {
				skills[displayName] = map[string]interface{}{
					"bonus":      abilityMod + (character.ProficiencyBonus * 2),
					"proficient": true,
					"expertise":  true,
				}
			} else if modType == "proficiency" {
				// Only upgrade if not already expertise
				if existing, ok := skills[displayName]; ok {
					if exp, ok := existing["expertise"].(bool); ok && exp {
						continue
					}
				}
				skills[displayName] = map[string]interface{}{
					"bonus":      abilityMod + character.ProficiencyBonus,
					"proficient": true,
					"expertise":  false,
				}
			}
		}
	}

	h.storeSkills(character, skills)
}

func (h *DnDBeyondHandler) formatSkillName(skillName string) string {
	// Convert "animal-handling" to "Animal Handling"
	words := strings.Split(skillName, "-")
	for i, word := range words {
		if len(word) > 0 {
			words[i] = strings.ToUpper(string(word[0])) + word[1:]
		}
	}
	return strings.Join(words, " ")
}

func (h *DnDBeyondHandler) storeSkills(character *db.Character, skills map[string]map[string]interface{}) {
	if len(skills) > 0 {
		if skillsJSON, err := json.Marshal(skills); err != nil {
			h.logger.Warn("Failed to marshal skills", zap.Error(err))
		} else {
			character.Skills = skillsJSON
		}
	}
}

func (h *DnDBeyondHandler) extractSavingThrows(data map[string]interface{}, character *db.Character) {
	savingThrows := make(map[string]map[string]interface{})

	// Get ability modifiers and names
	abilities := []struct {
		id   int
		name string
		mod  int
	}{
		{1, "STR", (character.Strength - 10) / 2},
		{2, "DEX", (character.Dexterity - 10) / 2},
		{3, "CON", (character.Constitution - 10) / 2},
		{4, "INT", (character.Intelligence - 10) / 2},
		{5, "WIS", (character.Wisdom - 10) / 2},
		{6, "CHA", (character.Charisma - 10) / 2},
	}

	// Initialize all saving throws with base ability modifier
	for _, ability := range abilities {
		savingThrows[ability.name] = map[string]interface{}{
			"bonus":      ability.mod,
			"proficient": false,
		}
	}

	// Check modifiers for saving throw proficiencies
	modifiers, ok := data["modifiers"].(map[string]interface{})
	if !ok {
		h.storeSavingThrows(character, savingThrows)
		return
	}

	// Map subType to ability name
	saveTypeMap := map[string]string{
		"strength-saving-throws":     "STR",
		"dexterity-saving-throws":    "DEX",
		"constitution-saving-throws": "CON",
		"intelligence-saving-throws": "INT",
		"wisdom-saving-throws":       "WIS",
		"charisma-saving-throws":     "CHA",
	}

	sources := []string{"race", "class", "background", "feat", "item"}
	for _, source := range sources {
		sourceModifiers, ok := modifiers[source].([]interface{})
		if !ok {
			continue
		}

		for _, mod := range sourceModifiers {
			modMap, ok := mod.(map[string]interface{})
			if !ok {
				continue
			}

			modType, _ := modMap["type"].(string)
			subType, _ := modMap["subType"].(string)

			if modType != "proficiency" {
				continue
			}

			abilityName, exists := saveTypeMap[subType]
			if !exists {
				continue
			}

			// Find the base modifier for this ability
			var baseMod int
			for _, ability := range abilities {
				if ability.name == abilityName {
					baseMod = ability.mod
					break
				}
			}

			savingThrows[abilityName] = map[string]interface{}{
				"bonus":      baseMod + character.ProficiencyBonus,
				"proficient": true,
			}
		}
	}

	h.storeSavingThrows(character, savingThrows)
}

func (h *DnDBeyondHandler) storeSavingThrows(character *db.Character, savingThrows map[string]map[string]interface{}) {
	if len(savingThrows) > 0 {
		if savesJSON, err := json.Marshal(savingThrows); err != nil {
			h.logger.Warn("Failed to marshal saving throws", zap.Error(err))
		} else {
			character.SavingThrows = savesJSON
		}
	}
}

func (h *DnDBeyondHandler) extractLifestyle(data map[string]interface{}, character *db.Character) {
	lifestyleID, ok := data["lifestyleId"].(float64)
	if !ok {
		return
	}

	lifestyles := map[int]string{
		1:  "Wretched",
		2:  "Squalid",
		3:  "Poor",
		4:  "Modest",
		5:  "Comfortable",
		6:  "Wealthy",
		7:  "Aristocratic",
		8:  "Self-Sufficient",
		9:  "Communal",
		10: "Other",
	}

	if lifestyle, exists := lifestyles[int(lifestyleID)]; exists {
		character.Lifestyle = &lifestyle
	}
}

func (h *DnDBeyondHandler) extractPersonality(data map[string]interface{}, character *db.Character) {
	if traits, ok := data["traits"].(map[string]interface{}); ok {
		if personalityTraits, ok := traits["personalityTraits"].(string); ok {
			character.PersonalityTraits = &personalityTraits
		}
		if ideals, ok := traits["ideals"].(string); ok {
			character.Ideals = &ideals
		}
		if bonds, ok := traits["bonds"].(string); ok {
			character.Bonds = &bonds
		}
		if flaws, ok := traits["flaws"].(string); ok {
			character.Flaws = &flaws
		}
		if appearance, ok := traits["appearance"].(string); ok {
			character.Appearance = &appearance
		}
		if backstory, ok := traits["backstory"].(string); ok {
			character.Backstory = &backstory
		}
	}

	if notes, ok := data["notes"].(map[string]interface{}); ok {
		// Combine allies and organizations into one field
		alliesText := ""
		if allies, ok := notes["allies"].(string); ok && allies != "" {
			alliesText = allies
		}
		if orgs, ok := notes["organizations"].(string); ok && orgs != "" {
			if alliesText != "" {
				alliesText += "\n\n" + orgs
			} else {
				alliesText = orgs
			}
		}
		if alliesText != "" {
			character.AlliesOrganizations = &alliesText
		}

		// Enemies
		if enemies, ok := notes["enemies"].(string); ok && enemies != "" {
			character.Enemies = &enemies
		}

		if personalPossessions, ok := notes["personalPossessions"].(string); ok && personalPossessions != "" {
			character.Treasure = &personalPossessions
		}

		// Other notes
		if otherNotes, ok := notes["otherNotes"].(string); ok && otherNotes != "" {
			character.Notes = &otherNotes
		}
	}
}

func getAlignmentName(id int) string {
	alignments := map[int]string{
		1: "Lawful Good",
		2: "Neutral Good",
		3: "Chaotic Good",
		4: "Lawful Neutral",
		5: "True Neutral",
		6: "Chaotic Neutral",
		7: "Lawful Evil",
		8: "Neutral Evil",
		9: "Chaotic Evil",
	}
	if name, ok := alignments[id]; ok {
		return name
	}
	return "Unaligned"
}

func getAbilityName(id int) string {
	abilities := map[int]string{
		1: "STR",
		2: "DEX",
		3: "CON",
		4: "INT",
		5: "WIS",
		6: "CHA",
	}
	if name, ok := abilities[id]; ok {
		return name
	}
	return ""
}

func getArmorTypeName(id int) string {
	armorTypes := map[int]string{
		1: "Light Armor",
		2: "Medium Armor",
		3: "Heavy Armor",
		4: "Shield",
	}
	if name, ok := armorTypes[id]; ok {
		return name
	}
	return "Armor"
}
