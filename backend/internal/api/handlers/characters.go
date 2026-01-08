package handlers

import (
	"encoding/json"
	"net/http"

	"tavkit/internal/api/middleware"
	"tavkit/internal/db"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// CharacterHandler handles character-related requests
type CharacterHandler struct {
	db     db.Database
	logger *zap.Logger
}

// NewCharacterHandler creates a new character handler
func NewCharacterHandler(database db.Database, logger *zap.Logger) *CharacterHandler {
	return &CharacterHandler{
		db:     database,
		logger: logger,
	}
}

// Text field size limits (in characters)
const (
	maxNameLength       = 100
	maxShortTextLength  = 200
	maxMediumTextLength = 2000
	maxLongTextLength   = 10000
)

// CreateCharacterRequest represents the request to create a character
// Only Name is required - all other fields are optional for manual character creation
type CreateCharacterRequest struct {
	CampaignID           *string                `json:"campaign_id,omitempty"`
	Name                 string                 `json:"name" binding:"required,max=100"`
	Level                int                    `json:"level" binding:"omitempty,min=1,max=20"`
	Race                 string                 `json:"race" binding:"omitempty,max=100"`
	Subrace              *string                `json:"subrace,omitempty"`
	ClassInfo            string                 `json:"class_info" binding:"omitempty,max=200"`
	Subclass             *string                `json:"subclass,omitempty"`
	Background           *string                `json:"background,omitempty"`
	Alignment            *string                `json:"alignment,omitempty"`
	ExperiencePoints     int                    `json:"experience_points"`
	Inspiration          bool                   `json:"inspiration"`
	Strength             int                    `json:"strength" binding:"omitempty,min=0,max=30"`
	Dexterity            int                    `json:"dexterity" binding:"omitempty,min=0,max=30"`
	Constitution         int                    `json:"constitution" binding:"omitempty,min=0,max=30"`
	Intelligence         int                    `json:"intelligence" binding:"omitempty,min=0,max=30"`
	Wisdom               int                    `json:"wisdom" binding:"omitempty,min=0,max=30"`
	Charisma             int                    `json:"charisma" binding:"omitempty,min=0,max=30"`
	ArmorClass           int                    `json:"armor_class"`
	Initiative           int                    `json:"initiative"`
	Speed                int                    `json:"speed"`
	SpeedWalking         *int                   `json:"speed_walking,omitempty"`
	SpeedFlying          *int                   `json:"speed_flying,omitempty"`
	SpeedSwimming        *int                   `json:"speed_swimming,omitempty"`
	SpeedClimbing        *int                   `json:"speed_climbing,omitempty"`
	MaxHitPoints         int                    `json:"max_hit_points" binding:"omitempty,min=0"`
	CurrentHitPoints     int                    `json:"current_hit_points"`
	TempHitPoints        int                    `json:"temp_hit_points"`
	HitDice              *string                `json:"hit_dice,omitempty"`
	HitDiceTotal         int                    `json:"hit_dice_total"`
	HitDiceUsed          int                    `json:"hit_dice_used"`
	ProficiencyBonus     int                    `json:"proficiency_bonus"`
	PassivePerception    int                    `json:"passive_perception"`
	PassiveInsight       *int                   `json:"passive_insight,omitempty"`
	PassiveInvestigation *int                   `json:"passive_investigation,omitempty"`
	DeathSaveSuccesses   int                    `json:"death_save_successes" binding:"min=0,max=3"`
	DeathSaveFailures    int                    `json:"death_save_failures" binding:"min=0,max=3"`
	ExhaustionLevel      int                    `json:"exhaustion_level" binding:"min=0,max=6"`
	Conditions           []interface{}          `json:"conditions,omitempty"`
	Skills               map[string]interface{} `json:"skills,omitempty"`
	SavingThrows         map[string]interface{} `json:"saving_throws,omitempty"`
	Proficiencies        map[string]interface{} `json:"proficiencies,omitempty"`
	Languages            []interface{}          `json:"languages,omitempty"`
	Senses               []interface{}          `json:"senses,omitempty"`
	Actions              []interface{}          `json:"actions,omitempty"`
	BonusActions         []interface{}          `json:"bonus_actions,omitempty"`
	Reactions            []interface{}          `json:"reactions,omitempty"`
	SpellcastingAbility  *string                `json:"spellcasting_ability,omitempty"`
	SpellSaveDC          *int                   `json:"spell_save_dc,omitempty"`
	SpellAttackBonus     *int                   `json:"spell_attack_bonus,omitempty"`
	SpellSlots           []interface{}          `json:"spell_slots,omitempty"`
	PreparedSpells       []interface{}          `json:"prepared_spells,omitempty"`
	KnownSpells          []interface{}          `json:"known_spells,omitempty"`
	Cantrips             []interface{}          `json:"cantrips,omitempty"`
	Currency             map[string]interface{} `json:"currency,omitempty"`
	Weapons              []interface{}          `json:"weapons,omitempty"`
	Armor                []interface{}          `json:"armor,omitempty"`
	Equipment            []interface{}          `json:"equipment,omitempty"`
	Treasure             *string                `json:"treasure,omitempty" binding:"omitempty,max=2000"`
	Features             []interface{}          `json:"features,omitempty"`
	RacialTraits         []interface{}          `json:"racial_traits,omitempty"`
	Feats                []interface{}          `json:"feats,omitempty"`
	PersonalityTraits    *string                `json:"personality_traits,omitempty" binding:"omitempty,max=2000"`
	Ideals               *string                `json:"ideals,omitempty" binding:"omitempty,max=2000"`
	Bonds                *string                `json:"bonds,omitempty" binding:"omitempty,max=2000"`
	Flaws                *string                `json:"flaws,omitempty" binding:"omitempty,max=2000"`
	Appearance           *string                `json:"appearance,omitempty" binding:"omitempty,max=5000"`
	Backstory            *string                `json:"backstory,omitempty" binding:"omitempty,max=10000"`
	AlliesOrganizations  *string                `json:"allies_organizations,omitempty" binding:"omitempty,max=5000"`
	Notes                *string                `json:"notes,omitempty" binding:"omitempty,max=10000"`
	Age                  *string                `json:"age,omitempty" binding:"omitempty,max=50"`
	Height               *string                `json:"height,omitempty" binding:"omitempty,max=50"`
	Weight               *string                `json:"weight,omitempty" binding:"omitempty,max=50"`
	Eyes                 *string                `json:"eyes,omitempty" binding:"omitempty,max=50"`
	Skin                 *string                `json:"skin,omitempty" binding:"omitempty,max=50"`
	Hair                 *string                `json:"hair,omitempty" binding:"omitempty,max=50"`
	Faith                *string                `json:"faith,omitempty" binding:"omitempty,max=100"`
	Lifestyle            *string                `json:"lifestyle,omitempty" binding:"omitempty,max=50"`
	Avatar               *string                `json:"avatar,omitempty" binding:"omitempty,max=500"`
	AIGenerated          bool                   `json:"ai_generated"`
}

// UpdateCharacterRequest represents the request to update a character
type UpdateCharacterRequest struct {
	CampaignID           *string                `json:"campaign_id,omitempty"`
	Name                 string                 `json:"name" binding:"max=100"`
	Level                int                    `json:"level" binding:"min=1,max=20"`
	Race                 string                 `json:"race" binding:"max=100"`
	Subrace              *string                `json:"subrace,omitempty"`
	ClassInfo            string                 `json:"class_info" binding:"max=200"`
	Subclass             *string                `json:"subclass,omitempty"`
	Background           *string                `json:"background,omitempty"`
	Alignment            *string                `json:"alignment,omitempty"`
	ExperiencePoints     int                    `json:"experience_points"`
	Inspiration          bool                   `json:"inspiration"`
	Strength             int                    `json:"strength" binding:"min=1,max=30"`
	Dexterity            int                    `json:"dexterity" binding:"min=1,max=30"`
	Constitution         int                    `json:"constitution" binding:"min=1,max=30"`
	Intelligence         int                    `json:"intelligence" binding:"min=1,max=30"`
	Wisdom               int                    `json:"wisdom" binding:"min=1,max=30"`
	Charisma             int                    `json:"charisma" binding:"min=1,max=30"`
	ArmorClass           int                    `json:"armor_class"`
	Initiative           int                    `json:"initiative"`
	Speed                int                    `json:"speed"`
	SpeedWalking         *int                   `json:"speed_walking,omitempty"`
	SpeedFlying          *int                   `json:"speed_flying,omitempty"`
	SpeedSwimming        *int                   `json:"speed_swimming,omitempty"`
	SpeedClimbing        *int                   `json:"speed_climbing,omitempty"`
	MaxHitPoints         int                    `json:"max_hit_points" binding:"min=1"`
	CurrentHitPoints     int                    `json:"current_hit_points"`
	TempHitPoints        int                    `json:"temp_hit_points"`
	HitDice              *string                `json:"hit_dice,omitempty"`
	HitDiceTotal         int                    `json:"hit_dice_total"`
	HitDiceUsed          int                    `json:"hit_dice_used"`
	ProficiencyBonus     int                    `json:"proficiency_bonus"`
	PassivePerception    int                    `json:"passive_perception"`
	PassiveInsight       *int                   `json:"passive_insight,omitempty"`
	PassiveInvestigation *int                   `json:"passive_investigation,omitempty"`
	DeathSaveSuccesses   int                    `json:"death_save_successes" binding:"min=0,max=3"`
	DeathSaveFailures    int                    `json:"death_save_failures" binding:"min=0,max=3"`
	ExhaustionLevel      int                    `json:"exhaustion_level" binding:"min=0,max=6"`
	Conditions           []interface{}          `json:"conditions,omitempty"`
	Skills               map[string]interface{} `json:"skills,omitempty"`
	SavingThrows         map[string]interface{} `json:"saving_throws,omitempty"`
	Proficiencies        map[string]interface{} `json:"proficiencies,omitempty"`
	Languages            []interface{}          `json:"languages,omitempty"`
	Senses               []interface{}          `json:"senses,omitempty"`
	Actions              []interface{}          `json:"actions,omitempty"`
	BonusActions         []interface{}          `json:"bonus_actions,omitempty"`
	Reactions            []interface{}          `json:"reactions,omitempty"`
	SpellcastingAbility  *string                `json:"spellcasting_ability,omitempty"`
	SpellSaveDC          *int                   `json:"spell_save_dc,omitempty"`
	SpellAttackBonus     *int                   `json:"spell_attack_bonus,omitempty"`
	SpellSlots           []interface{}          `json:"spell_slots,omitempty"`
	PreparedSpells       []interface{}          `json:"prepared_spells,omitempty"`
	KnownSpells          []interface{}          `json:"known_spells,omitempty"`
	Cantrips             []interface{}          `json:"cantrips,omitempty"`
	Currency             map[string]interface{} `json:"currency,omitempty"`
	Weapons              []interface{}          `json:"weapons,omitempty"`
	Armor                []interface{}          `json:"armor,omitempty"`
	Equipment            []interface{}          `json:"equipment,omitempty"`
	Treasure             *string                `json:"treasure,omitempty" binding:"omitempty,max=2000"`
	Features             []interface{}          `json:"features,omitempty"`
	RacialTraits         []interface{}          `json:"racial_traits,omitempty"`
	Feats                []interface{}          `json:"feats,omitempty"`
	PersonalityTraits    *string                `json:"personality_traits,omitempty" binding:"omitempty,max=2000"`
	Ideals               *string                `json:"ideals,omitempty" binding:"omitempty,max=2000"`
	Bonds                *string                `json:"bonds,omitempty" binding:"omitempty,max=2000"`
	Flaws                *string                `json:"flaws,omitempty" binding:"omitempty,max=2000"`
	Appearance           *string                `json:"appearance,omitempty" binding:"omitempty,max=5000"`
	Backstory            *string                `json:"backstory,omitempty" binding:"omitempty,max=10000"`
	AlliesOrganizations  *string                `json:"allies_organizations,omitempty" binding:"omitempty,max=5000"`
	Notes                *string                `json:"notes,omitempty" binding:"omitempty,max=10000"`
	Age                  *string                `json:"age,omitempty" binding:"omitempty,max=50"`
	Height               *string                `json:"height,omitempty" binding:"omitempty,max=50"`
	Weight               *string                `json:"weight,omitempty" binding:"omitempty,max=50"`
	Eyes                 *string                `json:"eyes,omitempty" binding:"omitempty,max=50"`
	Skin                 *string                `json:"skin,omitempty" binding:"omitempty,max=50"`
	Hair                 *string                `json:"hair,omitempty" binding:"omitempty,max=50"`
	Faith                *string                `json:"faith,omitempty" binding:"omitempty,max=100"`
	Lifestyle            *string                `json:"lifestyle,omitempty" binding:"omitempty,max=50"`
	Avatar               *string                `json:"avatar,omitempty" binding:"omitempty,max=500"`
}

// CreateCharacter creates a new character
func (h *CharacterHandler) CreateCharacter(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req CreateCharacterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Convert JSON fields
	// Note: Ignoring JSON marshal errors here as they're from user input and will fail validation if malformed
	skillsJSON, _ := json.Marshal(req.Skills)                 //nolint:errcheck
	savingThrowsJSON, _ := json.Marshal(req.SavingThrows)     //nolint:errcheck
	proficienciesJSON, _ := json.Marshal(req.Proficiencies)   //nolint:errcheck
	languagesJSON, _ := json.Marshal(req.Languages)           //nolint:errcheck
	sensesJSON, _ := json.Marshal(req.Senses)                 //nolint:errcheck
	conditionsJSON, _ := json.Marshal(req.Conditions)         //nolint:errcheck
	actionsJSON, _ := json.Marshal(req.Actions)               //nolint:errcheck
	bonusActionsJSON, _ := json.Marshal(req.BonusActions)     //nolint:errcheck
	reactionsJSON, _ := json.Marshal(req.Reactions)           //nolint:errcheck
	spellSlotsJSON, _ := json.Marshal(req.SpellSlots)         //nolint:errcheck
	preparedSpellsJSON, _ := json.Marshal(req.PreparedSpells) //nolint:errcheck
	knownSpellsJSON, _ := json.Marshal(req.KnownSpells)       //nolint:errcheck
	cantripsJSON, _ := json.Marshal(req.Cantrips)             //nolint:errcheck
	currencyJSON, _ := json.Marshal(req.Currency)             //nolint:errcheck
	weaponsJSON, _ := json.Marshal(req.Weapons)               //nolint:errcheck
	armorJSON, _ := json.Marshal(req.Armor)                   //nolint:errcheck
	equipmentJSON, _ := json.Marshal(req.Equipment)           //nolint:errcheck
	featuresJSON, _ := json.Marshal(req.Features)             //nolint:errcheck
	racialTraitsJSON, _ := json.Marshal(req.RacialTraits)     //nolint:errcheck
	featsJSON, _ := json.Marshal(req.Feats)                   //nolint:errcheck

	character := &db.Character{
		UserID:               userID,
		CampaignID:           req.CampaignID,
		Name:                 req.Name,
		Level:                req.Level,
		Race:                 req.Race,
		Subrace:              req.Subrace,
		ClassInfo:            req.ClassInfo,
		Subclass:             req.Subclass,
		Background:           req.Background,
		Alignment:            req.Alignment,
		ExperiencePoints:     req.ExperiencePoints,
		Inspiration:          req.Inspiration,
		Strength:             req.Strength,
		Dexterity:            req.Dexterity,
		Constitution:         req.Constitution,
		Intelligence:         req.Intelligence,
		Wisdom:               req.Wisdom,
		Charisma:             req.Charisma,
		ArmorClass:           req.ArmorClass,
		Initiative:           req.Initiative,
		Speed:                req.Speed,
		SpeedWalking:         req.SpeedWalking,
		SpeedFlying:          req.SpeedFlying,
		SpeedSwimming:        req.SpeedSwimming,
		SpeedClimbing:        req.SpeedClimbing,
		MaxHitPoints:         req.MaxHitPoints,
		CurrentHitPoints:     req.CurrentHitPoints,
		TempHitPoints:        req.TempHitPoints,
		HitDice:              req.HitDice,
		HitDiceTotal:         req.HitDiceTotal,
		HitDiceUsed:          req.HitDiceUsed,
		ProficiencyBonus:     req.ProficiencyBonus,
		PassivePerception:    req.PassivePerception,
		PassiveInsight:       req.PassiveInsight,
		PassiveInvestigation: req.PassiveInvestigation,
		DeathSaveSuccesses:   req.DeathSaveSuccesses,
		DeathSaveFailures:    req.DeathSaveFailures,
		ExhaustionLevel:      req.ExhaustionLevel,
		Conditions:           conditionsJSON,
		Skills:               skillsJSON,
		SavingThrows:         savingThrowsJSON,
		Proficiencies:        proficienciesJSON,
		Languages:            languagesJSON,
		Senses:               sensesJSON,
		Actions:              actionsJSON,
		BonusActions:         bonusActionsJSON,
		Reactions:            reactionsJSON,
		SpellcastingAbility:  req.SpellcastingAbility,
		SpellSaveDC:          req.SpellSaveDC,
		SpellAttackBonus:     req.SpellAttackBonus,
		SpellSlots:           spellSlotsJSON,
		PreparedSpells:       preparedSpellsJSON,
		KnownSpells:          knownSpellsJSON,
		Cantrips:             cantripsJSON,
		Currency:             currencyJSON,
		Weapons:              weaponsJSON,
		Armor:                armorJSON,
		Equipment:            equipmentJSON,
		Treasure:             req.Treasure,
		Features:             featuresJSON,
		RacialTraits:         racialTraitsJSON,
		Feats:                featsJSON,
		PersonalityTraits:    req.PersonalityTraits,
		Ideals:               req.Ideals,
		Bonds:                req.Bonds,
		Flaws:                req.Flaws,
		Appearance:           req.Appearance,
		Backstory:            req.Backstory,
		AlliesOrganizations:  req.AlliesOrganizations,
		Notes:                req.Notes,
		Age:                  req.Age,
		Height:               req.Height,
		Weight:               req.Weight,
		Eyes:                 req.Eyes,
		Skin:                 req.Skin,
		Hair:                 req.Hair,
		Faith:                req.Faith,
		Lifestyle:            req.Lifestyle,
		Avatar:               req.Avatar,
		AIGenerated:          req.AIGenerated,
	}

	if err := h.db.CreateCharacter(c.Request.Context(), character); err != nil {
		h.logger.Error("Failed to create character", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create character"})
		return
	}

	c.JSON(http.StatusCreated, character)
}

// GetCharacter retrieves a character by ID
func (h *CharacterHandler) GetCharacter(c *gin.Context) {
	characterID := c.Param("id")

	character, err := h.db.GetCharacterByID(c.Request.Context(), characterID)
	if err != nil {
		h.logger.Error("Failed to get character", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "character not found"})
		return
	}

	c.JSON(http.StatusOK, character)
}

// ListCharacters retrieves all characters for the authenticated user
//
//	@Summary		List characters
//	@Description	Get all characters for the authenticated user
//	@Tags			characters
//	@Accept			json
//	@Produce		json
//	@Param			campaign_id	query		string	false	"Filter by campaign ID"
//	@Success		200			{array}		db.Character
//	@Failure		401			{object}	map[string]string
//	@Failure		500			{object}	map[string]string
//	@Security		BearerAuth
//	@Router			/characters [get]
func (h *CharacterHandler) ListCharacters(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	// Check for campaign_id filter
	var campaignID *string
	if cid := c.Query("campaign_id"); cid != "" {
		campaignID = &cid
	}

	characters, err := h.db.ListCharactersByUserID(c.Request.Context(), userID, campaignID)
	if err != nil {
		h.logger.Error("Failed to list characters", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list characters"})
		return
	}

	if characters == nil {
		characters = []*db.Character{}
	}

	// Debug: Log what we're returning
	if len(characters) > 0 {
		h.logger.Info("Returning characters",
			zap.Int("count", len(characters)),
			zap.String("first_character_languages", string(characters[0].Languages)),
			zap.String("first_character_senses", string(characters[0].Senses)))
	}

	c.JSON(http.StatusOK, characters)
}

// UpdateCharacter updates an existing character
func (h *CharacterHandler) UpdateCharacter(c *gin.Context) {
	characterID := c.Param("id")

	// Verify character exists and get current data
	character, err := h.db.GetCharacterByID(c.Request.Context(), characterID)
	if err != nil {
		h.logger.Error("Failed to get character for update", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "character not found"})
		return
	}

	var req UpdateCharacterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields
	character.CampaignID = req.CampaignID
	character.Name = req.Name
	character.Level = req.Level
	character.Race = req.Race
	character.Subrace = req.Subrace
	character.ClassInfo = req.ClassInfo
	character.Subclass = req.Subclass
	character.Background = req.Background
	character.Alignment = req.Alignment
	character.ExperiencePoints = req.ExperiencePoints
	character.Inspiration = req.Inspiration
	character.Strength = req.Strength
	character.Dexterity = req.Dexterity
	character.Constitution = req.Constitution
	character.Intelligence = req.Intelligence
	character.Wisdom = req.Wisdom
	character.Charisma = req.Charisma
	character.ArmorClass = req.ArmorClass
	character.Initiative = req.Initiative
	character.Speed = req.Speed
	character.SpeedWalking = req.SpeedWalking
	character.SpeedFlying = req.SpeedFlying
	character.SpeedSwimming = req.SpeedSwimming
	character.SpeedClimbing = req.SpeedClimbing
	character.MaxHitPoints = req.MaxHitPoints
	character.CurrentHitPoints = req.CurrentHitPoints
	character.TempHitPoints = req.TempHitPoints
	character.HitDice = req.HitDice
	character.HitDiceTotal = req.HitDiceTotal
	character.HitDiceUsed = req.HitDiceUsed
	character.ProficiencyBonus = req.ProficiencyBonus
	character.PassivePerception = req.PassivePerception
	character.PassiveInsight = req.PassiveInsight
	character.PassiveInvestigation = req.PassiveInvestigation
	character.DeathSaveSuccesses = req.DeathSaveSuccesses
	character.DeathSaveFailures = req.DeathSaveFailures
	character.ExhaustionLevel = req.ExhaustionLevel
	character.SpellcastingAbility = req.SpellcastingAbility
	character.SpellSaveDC = req.SpellSaveDC
	character.SpellAttackBonus = req.SpellAttackBonus
	character.Treasure = req.Treasure
	character.PersonalityTraits = req.PersonalityTraits
	character.Ideals = req.Ideals
	character.Bonds = req.Bonds
	character.Flaws = req.Flaws
	character.Appearance = req.Appearance
	character.Backstory = req.Backstory
	character.AlliesOrganizations = req.AlliesOrganizations
	character.Notes = req.Notes
	character.Age = req.Age
	character.Height = req.Height
	character.Weight = req.Weight
	character.Eyes = req.Eyes
	character.Skin = req.Skin
	character.Hair = req.Hair
	character.Faith = req.Faith
	character.Lifestyle = req.Lifestyle
	character.Avatar = req.Avatar

	// Convert JSON fields
	// Note: Ignoring JSON marshal errors here as they're from user input and will fail validation if malformed
	if req.Conditions != nil {
		character.Conditions, _ = json.Marshal(req.Conditions) //nolint:errcheck
	}
	if req.Skills != nil {
		character.Skills, _ = json.Marshal(req.Skills) //nolint:errcheck
	}
	if req.SavingThrows != nil {
		character.SavingThrows, _ = json.Marshal(req.SavingThrows) //nolint:errcheck
	}
	if req.Proficiencies != nil {
		character.Proficiencies, _ = json.Marshal(req.Proficiencies) //nolint:errcheck
	}
	if req.Languages != nil {
		character.Languages, _ = json.Marshal(req.Languages) //nolint:errcheck
	}
	if req.Senses != nil {
		character.Senses, _ = json.Marshal(req.Senses) //nolint:errcheck
	}
	if req.Actions != nil {
		character.Actions, _ = json.Marshal(req.Actions) //nolint:errcheck
	}
	if req.BonusActions != nil {
		character.BonusActions, _ = json.Marshal(req.BonusActions) //nolint:errcheck
	}
	if req.Reactions != nil {
		character.Reactions, _ = json.Marshal(req.Reactions) //nolint:errcheck
	}
	if req.SpellSlots != nil {
		character.SpellSlots, _ = json.Marshal(req.SpellSlots) //nolint:errcheck
	}
	if req.PreparedSpells != nil {
		character.PreparedSpells, _ = json.Marshal(req.PreparedSpells) //nolint:errcheck
	}
	if req.KnownSpells != nil {
		character.KnownSpells, _ = json.Marshal(req.KnownSpells) //nolint:errcheck
	}
	if req.Cantrips != nil {
		character.Cantrips, _ = json.Marshal(req.Cantrips) //nolint:errcheck
	}
	if req.Currency != nil {
		character.Currency, _ = json.Marshal(req.Currency) //nolint:errcheck
	}
	if req.Weapons != nil {
		character.Weapons, _ = json.Marshal(req.Weapons) //nolint:errcheck
	}
	if req.Armor != nil {
		character.Armor, _ = json.Marshal(req.Armor) //nolint:errcheck
	}
	if req.Equipment != nil {
		character.Equipment, _ = json.Marshal(req.Equipment) //nolint:errcheck
	}
	if req.Features != nil {
		character.Features, _ = json.Marshal(req.Features) //nolint:errcheck
	}
	if req.RacialTraits != nil {
		character.RacialTraits, _ = json.Marshal(req.RacialTraits) //nolint:errcheck
	}
	if req.Feats != nil {
		character.Feats, _ = json.Marshal(req.Feats) //nolint:errcheck
	}

	if err := h.db.UpdateCharacter(c.Request.Context(), character); err != nil {
		h.logger.Error("Failed to update character", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update character"})
		return
	}

	c.JSON(http.StatusOK, character)
}

// DeleteCharacter deletes a character
func (h *CharacterHandler) DeleteCharacter(c *gin.Context) {
	characterID := c.Param("id")

	// Verify character exists
	_, err := h.db.GetCharacterByID(c.Request.Context(), characterID)
	if err != nil {
		h.logger.Error("Failed to get character for deletion", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "character not found"})
		return
	}

	if err := h.db.DeleteCharacter(c.Request.Context(), characterID); err != nil {
		h.logger.Error("Failed to delete character", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete character"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "character deleted successfully"})
}
