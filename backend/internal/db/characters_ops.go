package db

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"
)

// CharactersOperations provides unified character operations.
type CharactersOperations struct {
	exec Executor
	qb   *QueryBuilder
}

// NewCharactersOperations creates a new CharactersOperations.
func NewCharactersOperations(exec Executor, qb *QueryBuilder) *CharactersOperations {
	return &CharactersOperations{exec: exec, qb: qb}
}

// ============================================================================
// HELPER TYPES AND FUNCTIONS
// ============================================================================

// CharacterScanFields holds all nullable fields for full character scanning.
type CharacterScanFields struct {
	CampaignID, Subrace, Subclass, Background, Alignment, HitDice, SpellcastingAbility, Avatar sql.NullString
	SpeedWalking, SpeedFlying, SpeedSwimming, SpeedClimbing, SpeedBurrowing                    sql.NullInt64
	Size, DnDBeyondID                                                                          sql.NullString
	PassiveInsight, PassiveInvestigation                                                       sql.NullInt64
	SpellSaveDC, SpellAttackBonus                                                              sql.NullInt64
	Conditions, Skills, SavingThrows, Proficiencies, Languages, Senses                         sql.NullString
	Actions, BonusActions, Reactions                                                           sql.NullString
	SpellSlots, PreparedSpells, KnownSpells, Cantrips                                          sql.NullString
	Currency, Weapons, Armor, Equipment, Treasure                                              sql.NullString
	Features, RacialTraits, Feats                                                              sql.NullString
	PersonalityTraits, Ideals, Bonds, Flaws, Appearance, Backstory, AlliesOrgs, Enemies, Notes sql.NullString
	Age, Height, Weight, Eyes, Skin, Hair, Gender, Faith, Lifestyle                            sql.NullString
}

// ListCharacterScanFields holds nullable fields for list queries.
type ListCharacterScanFields struct {
	CampaignID, Background, Alignment, HitDice, SpellcastingAbility, Avatar sql.NullString
	SpellSaveDC, SpellAttackBonus                                           sql.NullInt64
	Skills, SavingThrows, Proficiencies, Languages, Senses                  sql.NullString
	SpellSlots, PreparedSpells                                              sql.NullString
	Currency, Weapons, Armor, Equipment                                     sql.NullString
	Features, RacialTraits                                                  sql.NullString
	PersonalityTraits, Ideals, Bonds, Flaws, Appearance, Backstory, Notes   sql.NullString
}

// CampaignCharacterScanFields holds fields for campaign-based character queries.
type CampaignCharacterScanFields struct {
	CampaignID, Background, Alignment, HitDice, SpellcastingAbility, Avatar sql.NullString
	SpellSaveDC, SpellAttackBonus                                           sql.NullInt64
	Skills, SavingThrows, Proficiencies                                     sql.NullString
	SpellSlots, PreparedSpells                                              sql.NullString
	Currency, Weapons, Armor, Equipment                                     sql.NullString
	Features, RacialTraits                                                  sql.NullString
	PersonalityTraits, Ideals, Bonds, Flaws, Appearance, Backstory, Notes   sql.NullString
}

// AssignNullString assigns a sql.NullString to a *string if valid.
func AssignNullString(dest **string, src sql.NullString) {
	if src.Valid {
		*dest = &src.String
	}
}

// AssignNullInt assigns a sql.NullInt64 to a *int if valid.
func AssignNullInt(dest **int, src sql.NullInt64) {
	if src.Valid {
		intVal := int(src.Int64)
		*dest = &intVal
	}
}

// AssignNullStringToBytes assigns a sql.NullString to a json.RawMessage if valid and non-empty.
func AssignNullStringToBytes(dest *json.RawMessage, src sql.NullString) {
	if src.Valid && src.String != "" {
		*dest = json.RawMessage(src.String)
	}
}

// PopulateFullCharacter populates all character fields from scanned nullable fields.
func PopulateFullCharacter(character *Character, fields *CharacterScanFields) {
	// Basic fields
	AssignNullString(&character.CampaignID, fields.CampaignID)
	AssignNullString(&character.Subrace, fields.Subrace)
	AssignNullString(&character.Subclass, fields.Subclass)
	AssignNullString(&character.Background, fields.Background)
	AssignNullString(&character.Alignment, fields.Alignment)
	AssignNullString(&character.HitDice, fields.HitDice)

	// Speed fields
	AssignNullInt(&character.SpeedWalking, fields.SpeedWalking)
	AssignNullInt(&character.SpeedFlying, fields.SpeedFlying)
	AssignNullInt(&character.SpeedSwimming, fields.SpeedSwimming)
	AssignNullInt(&character.SpeedClimbing, fields.SpeedClimbing)
	AssignNullInt(&character.SpeedBurrowing, fields.SpeedBurrowing)
	AssignNullString(&character.Size, fields.Size)
	AssignNullString(&character.DnDBeyondID, fields.DnDBeyondID)

	// Combat fields
	AssignNullInt(&character.PassiveInsight, fields.PassiveInsight)
	AssignNullInt(&character.PassiveInvestigation, fields.PassiveInvestigation)
	AssignNullStringToBytes(&character.Conditions, fields.Conditions)

	// Spell fields
	AssignNullString(&character.SpellcastingAbility, fields.SpellcastingAbility)
	AssignNullInt(&character.SpellSaveDC, fields.SpellSaveDC)
	AssignNullInt(&character.SpellAttackBonus, fields.SpellAttackBonus)
	AssignNullStringToBytes(&character.SpellSlots, fields.SpellSlots)
	AssignNullStringToBytes(&character.PreparedSpells, fields.PreparedSpells)
	AssignNullStringToBytes(&character.KnownSpells, fields.KnownSpells)
	AssignNullStringToBytes(&character.Cantrips, fields.Cantrips)

	// JSON fields (skills, proficiencies, etc.)
	AssignNullStringToBytes(&character.Skills, fields.Skills)
	AssignNullStringToBytes(&character.SavingThrows, fields.SavingThrows)
	AssignNullStringToBytes(&character.Proficiencies, fields.Proficiencies)
	AssignNullStringToBytes(&character.Languages, fields.Languages)
	AssignNullStringToBytes(&character.Senses, fields.Senses)
	AssignNullStringToBytes(&character.Actions, fields.Actions)
	AssignNullStringToBytes(&character.BonusActions, fields.BonusActions)
	AssignNullStringToBytes(&character.Reactions, fields.Reactions)

	// Inventory fields
	AssignNullStringToBytes(&character.Currency, fields.Currency)
	AssignNullStringToBytes(&character.Weapons, fields.Weapons)
	AssignNullStringToBytes(&character.Armor, fields.Armor)
	AssignNullStringToBytes(&character.Equipment, fields.Equipment)
	AssignNullString(&character.Treasure, fields.Treasure)

	// Traits and features fields
	AssignNullStringToBytes(&character.Features, fields.Features)
	AssignNullStringToBytes(&character.RacialTraits, fields.RacialTraits)
	AssignNullStringToBytes(&character.Feats, fields.Feats)

	// Personality and background fields
	AssignNullString(&character.PersonalityTraits, fields.PersonalityTraits)
	AssignNullString(&character.Ideals, fields.Ideals)
	AssignNullString(&character.Bonds, fields.Bonds)
	AssignNullString(&character.Flaws, fields.Flaws)
	AssignNullString(&character.Appearance, fields.Appearance)
	AssignNullString(&character.Backstory, fields.Backstory)
	AssignNullString(&character.AlliesOrganizations, fields.AlliesOrgs)
	AssignNullString(&character.Enemies, fields.Enemies)
	AssignNullString(&character.Notes, fields.Notes)

	// Physical fields
	AssignNullString(&character.Age, fields.Age)
	AssignNullString(&character.Height, fields.Height)
	AssignNullString(&character.Weight, fields.Weight)
	AssignNullString(&character.Eyes, fields.Eyes)
	AssignNullString(&character.Skin, fields.Skin)
	AssignNullString(&character.Hair, fields.Hair)
	AssignNullString(&character.Gender, fields.Gender)
	AssignNullString(&character.Faith, fields.Faith)
	AssignNullString(&character.Lifestyle, fields.Lifestyle)
	AssignNullString(&character.Avatar, fields.Avatar)
}

// PopulateListCharacter populates character fields from list scan fields.
func PopulateListCharacter(character *Character, fields *ListCharacterScanFields) {
	AssignNullString(&character.CampaignID, fields.CampaignID)
	AssignNullString(&character.Background, fields.Background)
	AssignNullString(&character.Alignment, fields.Alignment)
	AssignNullString(&character.HitDice, fields.HitDice)
	AssignNullString(&character.Avatar, fields.Avatar)
	AssignNullString(&character.SpellcastingAbility, fields.SpellcastingAbility)
	AssignNullInt(&character.SpellSaveDC, fields.SpellSaveDC)
	AssignNullInt(&character.SpellAttackBonus, fields.SpellAttackBonus)
	AssignNullStringToBytes(&character.SpellSlots, fields.SpellSlots)
	AssignNullStringToBytes(&character.PreparedSpells, fields.PreparedSpells)
	AssignNullStringToBytes(&character.Skills, fields.Skills)
	AssignNullStringToBytes(&character.SavingThrows, fields.SavingThrows)
	AssignNullStringToBytes(&character.Proficiencies, fields.Proficiencies)
	AssignNullStringToBytes(&character.Languages, fields.Languages)
	AssignNullStringToBytes(&character.Senses, fields.Senses)
	AssignNullStringToBytes(&character.Features, fields.Features)
	AssignNullStringToBytes(&character.RacialTraits, fields.RacialTraits)
	AssignNullStringToBytes(&character.Currency, fields.Currency)
	AssignNullStringToBytes(&character.Weapons, fields.Weapons)
	AssignNullStringToBytes(&character.Armor, fields.Armor)
	AssignNullStringToBytes(&character.Equipment, fields.Equipment)
	AssignNullString(&character.PersonalityTraits, fields.PersonalityTraits)
	AssignNullString(&character.Ideals, fields.Ideals)
	AssignNullString(&character.Bonds, fields.Bonds)
	AssignNullString(&character.Flaws, fields.Flaws)
	AssignNullString(&character.Appearance, fields.Appearance)
	AssignNullString(&character.Backstory, fields.Backstory)
	AssignNullString(&character.Notes, fields.Notes)
}

// PopulateCampaignCharacter populates character fields from campaign scan fields.
func PopulateCampaignCharacter(character *Character, fields *CampaignCharacterScanFields) {
	AssignNullString(&character.CampaignID, fields.CampaignID)
	AssignNullString(&character.Background, fields.Background)
	AssignNullString(&character.Alignment, fields.Alignment)
	AssignNullString(&character.HitDice, fields.HitDice)
	AssignNullString(&character.Avatar, fields.Avatar)
	AssignNullString(&character.SpellcastingAbility, fields.SpellcastingAbility)
	AssignNullInt(&character.SpellSaveDC, fields.SpellSaveDC)
	AssignNullInt(&character.SpellAttackBonus, fields.SpellAttackBonus)
	AssignNullStringToBytes(&character.SpellSlots, fields.SpellSlots)
	AssignNullStringToBytes(&character.PreparedSpells, fields.PreparedSpells)
	AssignNullStringToBytes(&character.Skills, fields.Skills)
	AssignNullStringToBytes(&character.SavingThrows, fields.SavingThrows)
	AssignNullStringToBytes(&character.Proficiencies, fields.Proficiencies)
	AssignNullStringToBytes(&character.Features, fields.Features)
	AssignNullStringToBytes(&character.RacialTraits, fields.RacialTraits)
	AssignNullStringToBytes(&character.Currency, fields.Currency)
	AssignNullStringToBytes(&character.Weapons, fields.Weapons)
	AssignNullStringToBytes(&character.Armor, fields.Armor)
	AssignNullStringToBytes(&character.Equipment, fields.Equipment)
	AssignNullString(&character.PersonalityTraits, fields.PersonalityTraits)
	AssignNullString(&character.Ideals, fields.Ideals)
	AssignNullString(&character.Bonds, fields.Bonds)
	AssignNullString(&character.Flaws, fields.Flaws)
	AssignNullString(&character.Appearance, fields.Appearance)
	AssignNullString(&character.Backstory, fields.Backstory)
	AssignNullString(&character.Notes, fields.Notes)
}

// ============================================================================
// CHARACTER CRUD OPERATIONS
// ============================================================================

// CreateCharacter creates a new character.
func (ops *CharactersOperations) CreateCharacter(ctx context.Context, character *Character) error {
	if character.ID == "" {
		character.ID = generateUUID()
	}
	character.CreatedAt = time.Now()
	character.UpdatedAt = time.Now()

	query := `INSERT INTO characters (
		id, user_id, campaign_id, name, level, race, subrace, class_info, subclass, background, alignment, experience_points, inspiration,
		strength, dexterity, constitution, intelligence, wisdom, charisma,
		armor_class, initiative, speed, speed_walking, speed_flying, speed_swimming, speed_climbing, speed_burrowing, size, dndbeyond_id,
		max_hit_points, current_hit_points, temp_hit_points,
		hit_dice, hit_dice_total, hit_dice_used,
		proficiency_bonus, passive_perception, passive_insight, passive_investigation,
		death_save_successes, death_save_failures, exhaustion_level, conditions,
		skills, saving_throws, proficiencies, languages, senses,
		actions, bonus_actions, reactions,
		spellcasting_ability, spell_save_dc, spell_attack_bonus, spell_slots, prepared_spells, known_spells, cantrips,
		currency, weapons, armor, equipment, treasure,
		features, racial_traits, feats,
		personality_traits, ideals, bonds, flaws, appearance, backstory, allies_organizations, enemies, notes,
		age, height, weight, eyes, skin, hair, gender, faith, lifestyle,
		avatar, ai_generated, created_at, updated_at
	) VALUES (` + ops.qb.Placeholders(88) + `)`

	_, err := ops.exec.Exec(ctx, query,
		character.ID, character.UserID, character.CampaignID, character.Name, character.Level,
		character.Race, character.Subrace, character.ClassInfo, character.Subclass, character.Background, character.Alignment,
		character.ExperiencePoints, character.Inspiration,
		character.Strength, character.Dexterity, character.Constitution, character.Intelligence,
		character.Wisdom, character.Charisma,
		character.ArmorClass, character.Initiative, character.Speed, character.SpeedWalking, character.SpeedFlying,
		character.SpeedSwimming, character.SpeedClimbing, character.SpeedBurrowing, character.Size, character.DnDBeyondID,
		character.MaxHitPoints, character.CurrentHitPoints, character.TempHitPoints,
		character.HitDice, character.HitDiceTotal, character.HitDiceUsed,
		character.ProficiencyBonus, character.PassivePerception, character.PassiveInsight, character.PassiveInvestigation,
		character.DeathSaveSuccesses, character.DeathSaveFailures, character.ExhaustionLevel, character.Conditions,
		character.Skills, character.SavingThrows, character.Proficiencies, character.Languages, character.Senses,
		character.Actions, character.BonusActions, character.Reactions,
		character.SpellcastingAbility, character.SpellSaveDC, character.SpellAttackBonus,
		character.SpellSlots, character.PreparedSpells, character.KnownSpells, character.Cantrips,
		character.Currency, character.Weapons, character.Armor, character.Equipment, character.Treasure,
		character.Features, character.RacialTraits, character.Feats,
		character.PersonalityTraits, character.Ideals, character.Bonds, character.Flaws,
		character.Appearance, character.Backstory, character.AlliesOrganizations, character.Enemies, character.Notes,
		character.Age, character.Height, character.Weight, character.Eyes, character.Skin, character.Hair, character.Gender,
		character.Faith, character.Lifestyle,
		character.Avatar, character.AIGenerated, character.CreatedAt, character.UpdatedAt,
	)
	return err
}

// GetCharacterByID retrieves a character by ID.
func (ops *CharactersOperations) GetCharacterByID(ctx context.Context, id string) (*Character, error) {
	character := &Character{}
	query := `SELECT
		id, user_id, campaign_id, name, level, race, subrace, class_info, subclass, background, alignment, experience_points, inspiration,
		strength, dexterity, constitution, intelligence, wisdom, charisma,
		armor_class, initiative, speed, speed_walking, speed_flying, speed_swimming, speed_climbing, speed_burrowing, size, dndbeyond_id,
		max_hit_points, current_hit_points, temp_hit_points,
		hit_dice, hit_dice_total, hit_dice_used,
		proficiency_bonus, passive_perception, passive_insight, passive_investigation,
		death_save_successes, death_save_failures, exhaustion_level, conditions,
		skills, saving_throws, proficiencies, languages, senses,
		actions, bonus_actions, reactions,
		spellcasting_ability, spell_save_dc, spell_attack_bonus, spell_slots, prepared_spells, known_spells, cantrips,
		currency, weapons, armor, equipment, treasure,
		features, racial_traits, feats,
		personality_traits, ideals, bonds, flaws, appearance, backstory, allies_organizations, enemies, notes,
		age, height, weight, eyes, skin, hair, gender, faith, lifestyle,
		avatar, ai_generated, created_at, updated_at
	FROM characters WHERE id = ` + ops.qb.Placeholder(1)

	fields := &CharacterScanFields{}
	err := ops.exec.QueryRow(ctx, query, id).Scan(
		&character.ID, &character.UserID, &fields.CampaignID, &character.Name, &character.Level,
		&character.Race, &fields.Subrace, &character.ClassInfo, &fields.Subclass, &fields.Background, &fields.Alignment,
		&character.ExperiencePoints, &character.Inspiration,
		&character.Strength, &character.Dexterity, &character.Constitution, &character.Intelligence,
		&character.Wisdom, &character.Charisma,
		&character.ArmorClass, &character.Initiative, &character.Speed, &fields.SpeedWalking, &fields.SpeedFlying,
		&fields.SpeedSwimming, &fields.SpeedClimbing, &fields.SpeedBurrowing, &fields.Size, &fields.DnDBeyondID,
		&character.MaxHitPoints, &character.CurrentHitPoints, &character.TempHitPoints,
		&fields.HitDice, &character.HitDiceTotal, &character.HitDiceUsed,
		&character.ProficiencyBonus, &character.PassivePerception, &fields.PassiveInsight, &fields.PassiveInvestigation,
		&character.DeathSaveSuccesses, &character.DeathSaveFailures, &character.ExhaustionLevel, &fields.Conditions,
		&fields.Skills, &fields.SavingThrows, &fields.Proficiencies, &fields.Languages, &fields.Senses,
		&fields.Actions, &fields.BonusActions, &fields.Reactions,
		&fields.SpellcastingAbility, &fields.SpellSaveDC, &fields.SpellAttackBonus, &fields.SpellSlots, &fields.PreparedSpells, &fields.KnownSpells, &fields.Cantrips,
		&fields.Currency, &fields.Weapons, &fields.Armor, &fields.Equipment, &fields.Treasure,
		&fields.Features, &fields.RacialTraits, &fields.Feats,
		&fields.PersonalityTraits, &fields.Ideals, &fields.Bonds, &fields.Flaws, &fields.Appearance, &fields.Backstory, &fields.AlliesOrgs, &fields.Enemies, &fields.Notes,
		&fields.Age, &fields.Height, &fields.Weight, &fields.Eyes, &fields.Skin, &fields.Hair, &fields.Gender, &fields.Faith, &fields.Lifestyle,
		&fields.Avatar, &character.AIGenerated, &character.CreatedAt, &character.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	PopulateFullCharacter(character, fields)
	return character, nil
}

// ListCharactersByUserID lists characters for a user, optionally filtered by campaign.
func (ops *CharactersOperations) ListCharactersByUserID(ctx context.Context, userID string, campaignID *string) ([]*Character, error) {
	query := `SELECT
		id, user_id, campaign_id, name, level, race, class_info, background, alignment, experience_points,
		strength, dexterity, constitution, intelligence, wisdom, charisma,
		armor_class, initiative, speed, max_hit_points, current_hit_points, temp_hit_points,
		hit_dice, proficiency_bonus, passive_perception,
		skills, saving_throws, proficiencies, languages, senses,
		spellcasting_ability, spell_save_dc, spell_attack_bonus, spell_slots, prepared_spells,
		currency, weapons, armor, equipment,
		features, racial_traits,
		personality_traits, ideals, bonds, flaws, appearance, backstory, notes,
		avatar, ai_generated, created_at, updated_at
	FROM characters WHERE user_id = ` + ops.qb.Placeholder(1)

	args := []interface{}{userID}
	if campaignID != nil {
		query += ` AND campaign_id = ` + ops.qb.Placeholder(2)
		args = append(args, *campaignID)
	}
	query += ` ORDER BY created_at DESC`

	rows, err := ops.exec.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var characters []*Character
	for rows.Next() {
		character := &Character{}
		fields := &ListCharacterScanFields{}

		err := rows.Scan(
			&character.ID, &character.UserID, &fields.CampaignID, &character.Name, &character.Level,
			&character.Race, &character.ClassInfo, &fields.Background, &fields.Alignment, &character.ExperiencePoints,
			&character.Strength, &character.Dexterity, &character.Constitution, &character.Intelligence,
			&character.Wisdom, &character.Charisma,
			&character.ArmorClass, &character.Initiative, &character.Speed, &character.MaxHitPoints,
			&character.CurrentHitPoints, &character.TempHitPoints,
			&fields.HitDice, &character.ProficiencyBonus, &character.PassivePerception,
			&fields.Skills, &fields.SavingThrows, &fields.Proficiencies, &fields.Languages, &fields.Senses,
			&fields.SpellcastingAbility, &fields.SpellSaveDC, &fields.SpellAttackBonus, &fields.SpellSlots, &fields.PreparedSpells,
			&fields.Currency, &fields.Weapons, &fields.Armor, &fields.Equipment,
			&fields.Features, &fields.RacialTraits,
			&fields.PersonalityTraits, &fields.Ideals, &fields.Bonds, &fields.Flaws, &fields.Appearance, &fields.Backstory, &fields.Notes,
			&fields.Avatar, &character.AIGenerated, &character.CreatedAt, &character.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		PopulateListCharacter(character, fields)
		characters = append(characters, character)
	}

	return characters, rows.Err()
}

// ListCharactersByCampaignID lists all characters directly assigned to a campaign.
func (ops *CharactersOperations) ListCharactersByCampaignID(ctx context.Context, campaignID string) ([]*Character, error) {
	query := `SELECT
		id, user_id, campaign_id, name, level, race, class_info, background, alignment, experience_points,
		strength, dexterity, constitution, intelligence, wisdom, charisma,
		armor_class, initiative, speed, max_hit_points, current_hit_points, temp_hit_points,
		hit_dice, proficiency_bonus, passive_perception,
		skills, saving_throws, proficiencies,
		spellcasting_ability, spell_save_dc, spell_attack_bonus, spell_slots, prepared_spells,
		currency, weapons, armor, equipment,
		features, racial_traits,
		personality_traits, ideals, bonds, flaws, appearance, backstory, notes,
		avatar, ai_generated, created_at, updated_at
	FROM characters WHERE campaign_id = ` + ops.qb.Placeholder(1) + ` ORDER BY created_at DESC`

	rows, err := ops.exec.Query(ctx, query, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var characters []*Character
	for rows.Next() {
		character := &Character{}
		fields := &CampaignCharacterScanFields{}

		err := rows.Scan(
			&character.ID, &character.UserID, &fields.CampaignID, &character.Name, &character.Level,
			&character.Race, &character.ClassInfo, &fields.Background, &fields.Alignment, &character.ExperiencePoints,
			&character.Strength, &character.Dexterity, &character.Constitution, &character.Intelligence,
			&character.Wisdom, &character.Charisma,
			&character.ArmorClass, &character.Initiative, &character.Speed, &character.MaxHitPoints,
			&character.CurrentHitPoints, &character.TempHitPoints,
			&fields.HitDice, &character.ProficiencyBonus, &character.PassivePerception,
			&fields.Skills, &fields.SavingThrows, &fields.Proficiencies,
			&fields.SpellcastingAbility, &fields.SpellSaveDC, &fields.SpellAttackBonus, &fields.SpellSlots, &fields.PreparedSpells,
			&fields.Currency, &fields.Weapons, &fields.Armor, &fields.Equipment,
			&fields.Features, &fields.RacialTraits,
			&fields.PersonalityTraits, &fields.Ideals, &fields.Bonds, &fields.Flaws, &fields.Appearance, &fields.Backstory, &fields.Notes,
			&fields.Avatar, &character.AIGenerated, &character.CreatedAt, &character.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		PopulateCampaignCharacter(character, fields)
		characters = append(characters, character)
	}

	return characters, rows.Err()
}

// UpdateCharacter updates an existing character.
func (ops *CharactersOperations) UpdateCharacter(ctx context.Context, character *Character) error {
	character.UpdatedAt = time.Now()

	query := `UPDATE characters SET
		campaign_id = ` + ops.qb.Placeholder(1) + `, name = ` + ops.qb.Placeholder(2) + `, level = ` + ops.qb.Placeholder(3) + `,
		race = ` + ops.qb.Placeholder(4) + `, subrace = ` + ops.qb.Placeholder(5) + `, class_info = ` + ops.qb.Placeholder(6) + `,
		subclass = ` + ops.qb.Placeholder(7) + `, background = ` + ops.qb.Placeholder(8) + `, alignment = ` + ops.qb.Placeholder(9) + `,
		experience_points = ` + ops.qb.Placeholder(10) + `, inspiration = ` + ops.qb.Placeholder(11) + `,
		strength = ` + ops.qb.Placeholder(12) + `, dexterity = ` + ops.qb.Placeholder(13) + `, constitution = ` + ops.qb.Placeholder(14) + `,
		intelligence = ` + ops.qb.Placeholder(15) + `, wisdom = ` + ops.qb.Placeholder(16) + `, charisma = ` + ops.qb.Placeholder(17) + `,
		armor_class = ` + ops.qb.Placeholder(18) + `, initiative = ` + ops.qb.Placeholder(19) + `, speed = ` + ops.qb.Placeholder(20) + `,
		speed_walking = ` + ops.qb.Placeholder(21) + `, speed_flying = ` + ops.qb.Placeholder(22) + `,
		speed_swimming = ` + ops.qb.Placeholder(23) + `, speed_climbing = ` + ops.qb.Placeholder(24) + `,
		max_hit_points = ` + ops.qb.Placeholder(25) + `, current_hit_points = ` + ops.qb.Placeholder(26) + `,
		temp_hit_points = ` + ops.qb.Placeholder(27) + `, hit_dice = ` + ops.qb.Placeholder(28) + `,
		hit_dice_total = ` + ops.qb.Placeholder(29) + `, hit_dice_used = ` + ops.qb.Placeholder(30) + `,
		proficiency_bonus = ` + ops.qb.Placeholder(31) + `, passive_perception = ` + ops.qb.Placeholder(32) + `,
		passive_insight = ` + ops.qb.Placeholder(33) + `, passive_investigation = ` + ops.qb.Placeholder(34) + `,
		death_save_successes = ` + ops.qb.Placeholder(35) + `, death_save_failures = ` + ops.qb.Placeholder(36) + `,
		exhaustion_level = ` + ops.qb.Placeholder(37) + `, conditions = ` + ops.qb.Placeholder(38) + `,
		skills = ` + ops.qb.Placeholder(39) + `, saving_throws = ` + ops.qb.Placeholder(40) + `,
		proficiencies = ` + ops.qb.Placeholder(41) + `, languages = ` + ops.qb.Placeholder(42) + `, senses = ` + ops.qb.Placeholder(43) + `,
		actions = ` + ops.qb.Placeholder(44) + `, bonus_actions = ` + ops.qb.Placeholder(45) + `, reactions = ` + ops.qb.Placeholder(46) + `,
		spellcasting_ability = ` + ops.qb.Placeholder(47) + `, spell_save_dc = ` + ops.qb.Placeholder(48) + `,
		spell_attack_bonus = ` + ops.qb.Placeholder(49) + `, spell_slots = ` + ops.qb.Placeholder(50) + `,
		prepared_spells = ` + ops.qb.Placeholder(51) + `, known_spells = ` + ops.qb.Placeholder(52) + `, cantrips = ` + ops.qb.Placeholder(53) + `,
		currency = ` + ops.qb.Placeholder(54) + `, weapons = ` + ops.qb.Placeholder(55) + `, armor = ` + ops.qb.Placeholder(56) + `,
		equipment = ` + ops.qb.Placeholder(57) + `, treasure = ` + ops.qb.Placeholder(58) + `,
		features = ` + ops.qb.Placeholder(59) + `, racial_traits = ` + ops.qb.Placeholder(60) + `, feats = ` + ops.qb.Placeholder(61) + `,
		personality_traits = ` + ops.qb.Placeholder(62) + `, ideals = ` + ops.qb.Placeholder(63) + `,
		bonds = ` + ops.qb.Placeholder(64) + `, flaws = ` + ops.qb.Placeholder(65) + `, appearance = ` + ops.qb.Placeholder(66) + `,
		backstory = ` + ops.qb.Placeholder(67) + `, allies_organizations = ` + ops.qb.Placeholder(68) + `, notes = ` + ops.qb.Placeholder(69) + `,
		age = ` + ops.qb.Placeholder(70) + `, height = ` + ops.qb.Placeholder(71) + `, weight = ` + ops.qb.Placeholder(72) + `,
		eyes = ` + ops.qb.Placeholder(73) + `, skin = ` + ops.qb.Placeholder(74) + `, hair = ` + ops.qb.Placeholder(75) + `,
		faith = ` + ops.qb.Placeholder(76) + `, lifestyle = ` + ops.qb.Placeholder(77) + `,
		avatar = ` + ops.qb.Placeholder(78) + `, updated_at = ` + ops.qb.Placeholder(79) + `
	WHERE id = ` + ops.qb.Placeholder(80)

	_, err := ops.exec.Exec(ctx, query,
		character.CampaignID, character.Name, character.Level, character.Race, character.Subrace,
		character.ClassInfo, character.Subclass,
		character.Background, character.Alignment, character.ExperiencePoints, character.Inspiration,
		character.Strength, character.Dexterity, character.Constitution, character.Intelligence,
		character.Wisdom, character.Charisma,
		character.ArmorClass, character.Initiative, character.Speed, character.SpeedWalking, character.SpeedFlying,
		character.SpeedSwimming, character.SpeedClimbing,
		character.MaxHitPoints, character.CurrentHitPoints, character.TempHitPoints,
		character.HitDice, character.HitDiceTotal, character.HitDiceUsed,
		character.ProficiencyBonus, character.PassivePerception, character.PassiveInsight, character.PassiveInvestigation,
		character.DeathSaveSuccesses, character.DeathSaveFailures, character.ExhaustionLevel, character.Conditions,
		character.Skills, character.SavingThrows, character.Proficiencies, character.Languages, character.Senses,
		character.Actions, character.BonusActions, character.Reactions,
		character.SpellcastingAbility, character.SpellSaveDC, character.SpellAttackBonus,
		character.SpellSlots, character.PreparedSpells, character.KnownSpells, character.Cantrips,
		character.Currency, character.Weapons, character.Armor, character.Equipment, character.Treasure,
		character.Features, character.RacialTraits, character.Feats,
		character.PersonalityTraits, character.Ideals, character.Bonds, character.Flaws,
		character.Appearance, character.Backstory, character.AlliesOrganizations, character.Notes,
		character.Age, character.Height, character.Weight, character.Eyes, character.Skin, character.Hair,
		character.Faith, character.Lifestyle,
		character.Avatar, character.UpdatedAt, character.ID,
	)
	return err
}

// DeleteCharacter deletes a character by ID.
func (ops *CharactersOperations) DeleteCharacter(ctx context.Context, id string) error {
	query := `DELETE FROM characters WHERE id = ` + ops.qb.Placeholder(1)
	_, err := ops.exec.Exec(ctx, query, id)
	return err
}

// ============================================================================
// CAMPAIGN CHARACTER LINKING OPERATIONS
// ============================================================================

// LinkCharacterToCampaign links a character to a campaign.
func (ops *CharactersOperations) LinkCharacterToCampaign(ctx context.Context, campaignID, characterID string) error {
	// Note: SQLite version uses an id column, PostgreSQL doesn't.
	// Using the PostgreSQL-compatible version since it works for both.
	query := `INSERT INTO campaign_characters (campaign_id, character_id, added_at)
		VALUES (` + ops.qb.Placeholder(1) + `, ` + ops.qb.Placeholder(2) + `, CURRENT_TIMESTAMP)
		ON CONFLICT(campaign_id, character_id) DO NOTHING`
	_, err := ops.exec.Exec(ctx, query, campaignID, characterID)
	return err
}

// UnlinkCharacterFromCampaign removes a character from a campaign.
func (ops *CharactersOperations) UnlinkCharacterFromCampaign(ctx context.Context, campaignID, characterID string) error {
	query := `DELETE FROM campaign_characters WHERE campaign_id = ` + ops.qb.Placeholder(1) + ` AND character_id = ` + ops.qb.Placeholder(2)
	_, err := ops.exec.Exec(ctx, query, campaignID, characterID)
	return err
}

// ListCampaignCharacters lists characters linked to a campaign via the many-to-many table.
func (ops *CharactersOperations) ListCampaignCharacters(ctx context.Context, campaignID string) ([]*Character, error) {
	query := `SELECT
		c.id, c.user_id, c.campaign_id, c.name, c.level, c.race, c.class_info, c.background, c.alignment, c.experience_points,
		c.strength, c.dexterity, c.constitution, c.intelligence, c.wisdom, c.charisma,
		c.armor_class, c.initiative, c.speed, c.max_hit_points, c.current_hit_points, c.temp_hit_points,
		c.hit_dice, c.proficiency_bonus, c.passive_perception,
		c.skills, c.saving_throws, c.proficiencies,
		c.spellcasting_ability, c.spell_save_dc, c.spell_attack_bonus, c.spell_slots, c.prepared_spells,
		c.currency, c.weapons, c.armor, c.equipment,
		c.features, c.racial_traits,
		c.personality_traits, c.ideals, c.bonds, c.flaws, c.appearance, c.backstory, c.notes,
		c.avatar, c.ai_generated, c.created_at, c.updated_at
	FROM characters c
	INNER JOIN campaign_characters cc ON c.id = cc.character_id
	WHERE cc.campaign_id = ` + ops.qb.Placeholder(1) + `
	ORDER BY cc.added_at DESC`

	rows, err := ops.exec.Query(ctx, query, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	var characters []*Character
	for rows.Next() {
		character := &Character{}
		fields := &CampaignCharacterScanFields{}

		err := rows.Scan(
			&character.ID, &character.UserID, &fields.CampaignID, &character.Name, &character.Level,
			&character.Race, &character.ClassInfo, &fields.Background, &fields.Alignment, &character.ExperiencePoints,
			&character.Strength, &character.Dexterity, &character.Constitution, &character.Intelligence,
			&character.Wisdom, &character.Charisma,
			&character.ArmorClass, &character.Initiative, &character.Speed, &character.MaxHitPoints,
			&character.CurrentHitPoints, &character.TempHitPoints,
			&fields.HitDice, &character.ProficiencyBonus, &character.PassivePerception,
			&fields.Skills, &fields.SavingThrows, &fields.Proficiencies,
			&fields.SpellcastingAbility, &fields.SpellSaveDC, &fields.SpellAttackBonus, &fields.SpellSlots, &fields.PreparedSpells,
			&fields.Currency, &fields.Weapons, &fields.Armor, &fields.Equipment,
			&fields.Features, &fields.RacialTraits,
			&fields.PersonalityTraits, &fields.Ideals, &fields.Bonds, &fields.Flaws, &fields.Appearance, &fields.Backstory, &fields.Notes,
			&fields.Avatar, &character.AIGenerated, &character.CreatedAt, &character.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		PopulateCampaignCharacter(character, fields)
		characters = append(characters, character)
	}

	return characters, rows.Err()
}
