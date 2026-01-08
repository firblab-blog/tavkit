package db

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5"
)

// =============================================================================
// Character Operations (PostgreSQL)
// =============================================================================

func (db *PostgresDB) CreateCharacter(ctx context.Context, character *Character) error {
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
	) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62, $63, $64, $65, $66, $67, $68, $69, $70, $71, $72, $73, $74, $75, $76, $77, $78, $79, $80, $81, $82, $83, $84, $85, $86, $87, $88)`

	_, err := db.pool.Exec(ctx, query,
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

// pgFullCharacterScanFields holds all nullable fields for GetCharacterByID scanning
type pgFullCharacterScanFields struct {
	campaignID, subrace, subclass, background, alignment, hitDice, spellcastingAbility, avatar sql.NullString
	speedWalking, speedFlying, speedSwimming, speedClimbing, speedBurrowing                    sql.NullInt64
	size, dndbeyondID                                                                          sql.NullString
	passiveInsight, passiveInvestigation                                                       sql.NullInt64
	spellSaveDC, spellAttackBonus                                                              sql.NullInt64
	conditions, skills, savingThrows, proficiencies, languages, senses                         sql.NullString
	actions, bonusActions, reactions                                                           sql.NullString
	spellSlots, preparedSpells, knownSpells, cantrips                                          sql.NullString
	currency, weapons, armor, equipment, treasure                                              sql.NullString
	features, racialTraits, feats                                                              sql.NullString
	personalityTraits, ideals, bonds, flaws, appearance, backstory, alliesOrgs, enemies, notes sql.NullString
	age, height, weight, eyes, skin, hair, gender, faith, lifestyle                            sql.NullString
}

func (db *PostgresDB) GetCharacterByID(ctx context.Context, id string) (*Character, error) {
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
	FROM characters WHERE id = $1`

	fields := &pgFullCharacterScanFields{}
	err := db.pool.QueryRow(ctx, query, id).Scan(
		&character.ID, &character.UserID, &fields.campaignID, &character.Name, &character.Level,
		&character.Race, &fields.subrace, &character.ClassInfo, &fields.subclass, &fields.background, &fields.alignment,
		&character.ExperiencePoints, &character.Inspiration,
		&character.Strength, &character.Dexterity, &character.Constitution, &character.Intelligence,
		&character.Wisdom, &character.Charisma,
		&character.ArmorClass, &character.Initiative, &character.Speed, &fields.speedWalking, &fields.speedFlying,
		&fields.speedSwimming, &fields.speedClimbing, &fields.speedBurrowing, &fields.size, &fields.dndbeyondID,
		&character.MaxHitPoints, &character.CurrentHitPoints, &character.TempHitPoints,
		&fields.hitDice, &character.HitDiceTotal, &character.HitDiceUsed,
		&character.ProficiencyBonus, &character.PassivePerception, &fields.passiveInsight, &fields.passiveInvestigation,
		&character.DeathSaveSuccesses, &character.DeathSaveFailures, &character.ExhaustionLevel, &fields.conditions,
		&fields.skills, &fields.savingThrows, &fields.proficiencies, &fields.languages, &fields.senses,
		&fields.actions, &fields.bonusActions, &fields.reactions,
		&fields.spellcastingAbility, &fields.spellSaveDC, &fields.spellAttackBonus, &fields.spellSlots, &fields.preparedSpells, &fields.knownSpells, &fields.cantrips,
		&fields.currency, &fields.weapons, &fields.armor, &fields.equipment, &fields.treasure,
		&fields.features, &fields.racialTraits, &fields.feats,
		&fields.personalityTraits, &fields.ideals, &fields.bonds, &fields.flaws, &fields.appearance, &fields.backstory, &fields.alliesOrgs, &fields.enemies, &fields.notes,
		&fields.age, &fields.height, &fields.weight, &fields.eyes, &fields.skin, &fields.hair, &fields.gender, &fields.faith, &fields.lifestyle,
		&fields.avatar, &character.AIGenerated, &character.CreatedAt, &character.UpdatedAt,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, sql.ErrNoRows
		}
		return nil, err
	}

	// Convert all nullable fields to character fields
	pgPopulateFullCharacterFromScanFields(character, fields)

	return character, nil
}

// pgPopulateFullCharacterFromScanFields populates all character fields from scanned nullable fields
func pgPopulateFullCharacterFromScanFields(character *Character, fields *pgFullCharacterScanFields) {
	// Basic fields
	pgAssignNullString(&character.CampaignID, fields.campaignID)
	pgAssignNullString(&character.Subrace, fields.subrace)
	pgAssignNullString(&character.Subclass, fields.subclass)
	pgAssignNullString(&character.Background, fields.background)
	pgAssignNullString(&character.Alignment, fields.alignment)
	pgAssignNullString(&character.HitDice, fields.hitDice)

	// Speed fields
	pgAssignNullInt(&character.SpeedWalking, fields.speedWalking)
	pgAssignNullInt(&character.SpeedFlying, fields.speedFlying)
	pgAssignNullInt(&character.SpeedSwimming, fields.speedSwimming)
	pgAssignNullInt(&character.SpeedClimbing, fields.speedClimbing)
	pgAssignNullInt(&character.SpeedBurrowing, fields.speedBurrowing)
	pgAssignNullString(&character.Size, fields.size)
	pgAssignNullString(&character.DnDBeyondID, fields.dndbeyondID)

	// Combat fields
	pgAssignNullInt(&character.PassiveInsight, fields.passiveInsight)
	pgAssignNullInt(&character.PassiveInvestigation, fields.passiveInvestigation)
	pgAssignNullStringToBytes(&character.Conditions, fields.conditions)

	// Spell fields
	pgAssignNullString(&character.SpellcastingAbility, fields.spellcastingAbility)
	pgAssignNullInt(&character.SpellSaveDC, fields.spellSaveDC)
	pgAssignNullInt(&character.SpellAttackBonus, fields.spellAttackBonus)
	pgAssignNullStringToBytes(&character.SpellSlots, fields.spellSlots)
	pgAssignNullStringToBytes(&character.PreparedSpells, fields.preparedSpells)
	pgAssignNullStringToBytes(&character.KnownSpells, fields.knownSpells)
	pgAssignNullStringToBytes(&character.Cantrips, fields.cantrips)

	// JSON fields (skills, proficiencies, etc.)
	pgAssignNullStringToBytes(&character.Skills, fields.skills)
	pgAssignNullStringToBytes(&character.SavingThrows, fields.savingThrows)
	pgAssignNullStringToBytes(&character.Proficiencies, fields.proficiencies)
	pgAssignNullStringToBytes(&character.Languages, fields.languages)
	pgAssignNullStringToBytes(&character.Senses, fields.senses)
	pgAssignNullStringToBytes(&character.Actions, fields.actions)
	pgAssignNullStringToBytes(&character.BonusActions, fields.bonusActions)
	pgAssignNullStringToBytes(&character.Reactions, fields.reactions)

	// Inventory fields
	pgAssignNullStringToBytes(&character.Currency, fields.currency)
	pgAssignNullStringToBytes(&character.Weapons, fields.weapons)
	pgAssignNullStringToBytes(&character.Armor, fields.armor)
	pgAssignNullStringToBytes(&character.Equipment, fields.equipment)
	pgAssignNullString(&character.Treasure, fields.treasure)

	// Traits and features fields
	pgAssignNullStringToBytes(&character.Features, fields.features)
	pgAssignNullStringToBytes(&character.RacialTraits, fields.racialTraits)
	pgAssignNullStringToBytes(&character.Feats, fields.feats)

	// Personality and background fields
	pgAssignNullString(&character.PersonalityTraits, fields.personalityTraits)
	pgAssignNullString(&character.Ideals, fields.ideals)
	pgAssignNullString(&character.Bonds, fields.bonds)
	pgAssignNullString(&character.Flaws, fields.flaws)
	pgAssignNullString(&character.Appearance, fields.appearance)
	pgAssignNullString(&character.Backstory, fields.backstory)
	pgAssignNullString(&character.AlliesOrganizations, fields.alliesOrgs)
	pgAssignNullString(&character.Enemies, fields.enemies)
	pgAssignNullString(&character.Notes, fields.notes)

	// Physical fields
	pgAssignNullString(&character.Age, fields.age)
	pgAssignNullString(&character.Height, fields.height)
	pgAssignNullString(&character.Weight, fields.weight)
	pgAssignNullString(&character.Eyes, fields.eyes)
	pgAssignNullString(&character.Skin, fields.skin)
	pgAssignNullString(&character.Hair, fields.hair)
	pgAssignNullString(&character.Gender, fields.gender)
	pgAssignNullString(&character.Faith, fields.faith)
	pgAssignNullString(&character.Lifestyle, fields.lifestyle)
	pgAssignNullString(&character.Avatar, fields.avatar)
}

// Helper functions for PostgreSQL assignment

// pgAssignNullString assigns a sql.NullString to a *string if valid
func pgAssignNullString(dest **string, src sql.NullString) {
	if src.Valid {
		*dest = &src.String
	}
}

// pgAssignNullInt assigns a sql.NullInt64 to a *int if valid
func pgAssignNullInt(dest **int, src sql.NullInt64) {
	if src.Valid {
		intVal := int(src.Int64)
		*dest = &intVal
	}
}

// pgAssignNullStringToBytes assigns a sql.NullString to a json.RawMessage if valid and non-empty
func pgAssignNullStringToBytes(dest *json.RawMessage, src sql.NullString) {
	if src.Valid && src.String != "" {
		*dest = json.RawMessage(src.String)
	}
}

// pgListCharacterScanFields holds nullable fields for list queries
type pgListCharacterScanFields struct {
	campaignIDNull, background, alignment, hitDice, spellcastingAbility, avatar sql.NullString
	spellSaveDC, spellAttackBonus                                               sql.NullInt64
	skills, savingThrows, proficiencies, languages, senses                      sql.NullString
	spellSlots, preparedSpells                                                  sql.NullString
	currency, weapons, armorJSON, equipment                                     sql.NullString
	features, racialTraits                                                      sql.NullString
	personalityTraits, ideals, bonds, flaws, appearance, backstory, notes       sql.NullString
}

func (db *PostgresDB) ListCharactersByUserID(ctx context.Context, userID string, campaignID *string) ([]*Character, error) {
	var query string
	var args []interface{}

	if campaignID != nil {
		query = `SELECT
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
		FROM characters WHERE user_id = $1 AND (campaign_id = $2 OR campaign_id IS NULL) ORDER BY created_at DESC`
		args = []interface{}{userID, *campaignID}
	} else {
		query = `SELECT
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
		FROM characters WHERE user_id = $1 ORDER BY created_at DESC`
		args = []interface{}{userID}
	}

	rows, err := db.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var characters []*Character
	for rows.Next() {
		character := &Character{}
		fields := &pgListCharacterScanFields{}

		err := rows.Scan(
			&character.ID, &character.UserID, &fields.campaignIDNull, &character.Name, &character.Level,
			&character.Race, &character.ClassInfo, &fields.background, &fields.alignment, &character.ExperiencePoints,
			&character.Strength, &character.Dexterity, &character.Constitution, &character.Intelligence,
			&character.Wisdom, &character.Charisma,
			&character.ArmorClass, &character.Initiative, &character.Speed, &character.MaxHitPoints,
			&character.CurrentHitPoints, &character.TempHitPoints,
			&fields.hitDice, &character.ProficiencyBonus, &character.PassivePerception,
			&fields.skills, &fields.savingThrows, &fields.proficiencies, &fields.languages, &fields.senses,
			&fields.spellcastingAbility, &fields.spellSaveDC, &fields.spellAttackBonus, &fields.spellSlots, &fields.preparedSpells,
			&fields.currency, &fields.weapons, &fields.armorJSON, &fields.equipment,
			&fields.features, &fields.racialTraits,
			&fields.personalityTraits, &fields.ideals, &fields.bonds, &fields.flaws, &fields.appearance, &fields.backstory, &fields.notes,
			&fields.avatar, &character.AIGenerated, &character.CreatedAt, &character.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		pgPopulateListCharacterFromScanFields(character, fields)
		characters = append(characters, character)
	}

	return characters, rows.Err()
}

// pgPopulateListCharacterFromScanFields populates character fields from list scan fields
func pgPopulateListCharacterFromScanFields(character *Character, fields *pgListCharacterScanFields) {
	pgAssignNullString(&character.CampaignID, fields.campaignIDNull)
	pgAssignNullString(&character.Background, fields.background)
	pgAssignNullString(&character.Alignment, fields.alignment)
	pgAssignNullString(&character.HitDice, fields.hitDice)
	pgAssignNullString(&character.Avatar, fields.avatar)
	pgAssignNullString(&character.SpellcastingAbility, fields.spellcastingAbility)
	pgAssignNullInt(&character.SpellSaveDC, fields.spellSaveDC)
	pgAssignNullInt(&character.SpellAttackBonus, fields.spellAttackBonus)
	pgAssignNullStringToBytes(&character.SpellSlots, fields.spellSlots)
	pgAssignNullStringToBytes(&character.PreparedSpells, fields.preparedSpells)
	pgAssignNullStringToBytes(&character.Skills, fields.skills)
	pgAssignNullStringToBytes(&character.SavingThrows, fields.savingThrows)
	pgAssignNullStringToBytes(&character.Proficiencies, fields.proficiencies)
	pgAssignNullStringToBytes(&character.Languages, fields.languages)
	pgAssignNullStringToBytes(&character.Senses, fields.senses)
	pgAssignNullStringToBytes(&character.Features, fields.features)
	pgAssignNullStringToBytes(&character.RacialTraits, fields.racialTraits)
	pgAssignNullStringToBytes(&character.Currency, fields.currency)
	pgAssignNullStringToBytes(&character.Weapons, fields.weapons)
	pgAssignNullStringToBytes(&character.Armor, fields.armorJSON)
	pgAssignNullStringToBytes(&character.Equipment, fields.equipment)
	pgAssignNullString(&character.PersonalityTraits, fields.personalityTraits)
	pgAssignNullString(&character.Ideals, fields.ideals)
	pgAssignNullString(&character.Bonds, fields.bonds)
	pgAssignNullString(&character.Flaws, fields.flaws)
	pgAssignNullString(&character.Appearance, fields.appearance)
	pgAssignNullString(&character.Backstory, fields.backstory)
	pgAssignNullString(&character.Notes, fields.notes)
}

func (db *PostgresDB) ListCharactersByCampaignID(ctx context.Context, campaignID string) ([]*Character, error) {
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
	FROM characters WHERE campaign_id = $1 ORDER BY created_at DESC`

	rows, err := db.pool.Query(ctx, query, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var characters []*Character
	for rows.Next() {
		character := &Character{}
		var campaignIDNull, background, alignment, hitDice, spellcastingAbility, avatar sql.NullString
		var spellSaveDC, spellAttackBonus sql.NullInt64
		var skills, savingThrows, proficiencies sql.NullString
		var spellSlots, preparedSpells sql.NullString
		var currency, weapons, armorJSON, equipment sql.NullString
		var features, racialTraits sql.NullString
		var personalityTraits, ideals, bonds, flaws, appearance, backstory, notes sql.NullString

		err := rows.Scan(
			&character.ID, &character.UserID, &campaignIDNull, &character.Name, &character.Level,
			&character.Race, &character.ClassInfo, &background, &alignment, &character.ExperiencePoints,
			&character.Strength, &character.Dexterity, &character.Constitution, &character.Intelligence,
			&character.Wisdom, &character.Charisma,
			&character.ArmorClass, &character.Initiative, &character.Speed, &character.MaxHitPoints,
			&character.CurrentHitPoints, &character.TempHitPoints,
			&hitDice, &character.ProficiencyBonus, &character.PassivePerception,
			&skills, &savingThrows, &proficiencies,
			&spellcastingAbility, &spellSaveDC, &spellAttackBonus, &spellSlots, &preparedSpells,
			&currency, &weapons, &armorJSON, &equipment,
			&features, &racialTraits,
			&personalityTraits, &ideals, &bonds, &flaws, &appearance, &backstory, &notes,
			&avatar, &character.AIGenerated, &character.CreatedAt, &character.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		pgAssignNullString(&character.CampaignID, campaignIDNull)
		pgAssignNullString(&character.Background, background)
		pgAssignNullString(&character.Alignment, alignment)
		pgAssignNullString(&character.HitDice, hitDice)
		pgAssignNullString(&character.Avatar, avatar)
		pgAssignNullString(&character.SpellcastingAbility, spellcastingAbility)
		pgAssignNullInt(&character.SpellSaveDC, spellSaveDC)
		pgAssignNullInt(&character.SpellAttackBonus, spellAttackBonus)
		pgAssignNullStringToBytes(&character.SpellSlots, spellSlots)
		pgAssignNullStringToBytes(&character.PreparedSpells, preparedSpells)
		pgAssignNullStringToBytes(&character.Skills, skills)
		pgAssignNullStringToBytes(&character.SavingThrows, savingThrows)
		pgAssignNullStringToBytes(&character.Proficiencies, proficiencies)
		pgAssignNullStringToBytes(&character.Features, features)
		pgAssignNullStringToBytes(&character.RacialTraits, racialTraits)
		pgAssignNullStringToBytes(&character.Currency, currency)
		pgAssignNullStringToBytes(&character.Weapons, weapons)
		pgAssignNullStringToBytes(&character.Armor, armorJSON)
		pgAssignNullStringToBytes(&character.Equipment, equipment)
		pgAssignNullString(&character.PersonalityTraits, personalityTraits)
		pgAssignNullString(&character.Ideals, ideals)
		pgAssignNullString(&character.Bonds, bonds)
		pgAssignNullString(&character.Flaws, flaws)
		pgAssignNullString(&character.Appearance, appearance)
		pgAssignNullString(&character.Backstory, backstory)
		pgAssignNullString(&character.Notes, notes)

		characters = append(characters, character)
	}

	return characters, rows.Err()
}

func (db *PostgresDB) UpdateCharacter(ctx context.Context, character *Character) error {
	character.UpdatedAt = time.Now()

	query := `UPDATE characters SET
		campaign_id = $1, name = $2, level = $3, race = $4, subrace = $5, class_info = $6, subclass = $7,
		background = $8, alignment = $9, experience_points = $10, inspiration = $11,
		strength = $12, dexterity = $13, constitution = $14, intelligence = $15, wisdom = $16, charisma = $17,
		armor_class = $18, initiative = $19, speed = $20, speed_walking = $21, speed_flying = $22,
		speed_swimming = $23, speed_climbing = $24,
		max_hit_points = $25, current_hit_points = $26, temp_hit_points = $27,
		hit_dice = $28, hit_dice_total = $29, hit_dice_used = $30,
		proficiency_bonus = $31, passive_perception = $32, passive_insight = $33, passive_investigation = $34,
		death_save_successes = $35, death_save_failures = $36, exhaustion_level = $37, conditions = $38,
		skills = $39, saving_throws = $40, proficiencies = $41, languages = $42, senses = $43,
		actions = $44, bonus_actions = $45, reactions = $46,
		spellcasting_ability = $47, spell_save_dc = $48, spell_attack_bonus = $49, spell_slots = $50,
		prepared_spells = $51, known_spells = $52, cantrips = $53,
		currency = $54, weapons = $55, armor = $56, equipment = $57, treasure = $58,
		features = $59, racial_traits = $60, feats = $61,
		personality_traits = $62, ideals = $63, bonds = $64, flaws = $65, appearance = $66, backstory = $67,
		allies_organizations = $68, notes = $69,
		age = $70, height = $71, weight = $72, eyes = $73, skin = $74, hair = $75, faith = $76, lifestyle = $77,
		avatar = $78, updated_at = $79
	WHERE id = $80`

	_, err := db.pool.Exec(ctx, query,
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

func (db *PostgresDB) DeleteCharacter(ctx context.Context, id string) error {
	query := `DELETE FROM characters WHERE id = $1`
	_, err := db.pool.Exec(ctx, query, id)
	return err
}

// =============================================================================
// Campaign Character Linking Operations (many-to-many)
// =============================================================================

func (db *PostgresDB) LinkCharacterToCampaign(ctx context.Context, campaignID, characterID string) error {
	query := `INSERT INTO campaign_characters (campaign_id, character_id, added_at)
		VALUES ($1, $2, CURRENT_TIMESTAMP)
		ON CONFLICT(campaign_id, character_id) DO NOTHING`
	_, err := db.pool.Exec(ctx, query, campaignID, characterID)
	return err
}

func (db *PostgresDB) UnlinkCharacterFromCampaign(ctx context.Context, campaignID, characterID string) error {
	query := `DELETE FROM campaign_characters WHERE campaign_id = $1 AND character_id = $2`
	_, err := db.pool.Exec(ctx, query, campaignID, characterID)
	return err
}

func (db *PostgresDB) ListCampaignCharacters(ctx context.Context, campaignID string) ([]*Character, error) {
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
	WHERE cc.campaign_id = $1
	ORDER BY cc.added_at DESC`

	rows, err := db.pool.Query(ctx, query, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var characters []*Character
	for rows.Next() {
		character := &Character{}
		var campaignIDNull, background, alignment, hitDice, spellcastingAbility, avatar sql.NullString
		var spellSaveDC, spellAttackBonus sql.NullInt64
		var skills, savingThrows, proficiencies sql.NullString
		var spellSlots, preparedSpells sql.NullString
		var currency, weapons, armorJSON, equipment sql.NullString
		var features, racialTraits sql.NullString
		var personalityTraits, ideals, bonds, flaws, appearance, backstory, notes sql.NullString

		err := rows.Scan(
			&character.ID, &character.UserID, &campaignIDNull, &character.Name, &character.Level,
			&character.Race, &character.ClassInfo, &background, &alignment, &character.ExperiencePoints,
			&character.Strength, &character.Dexterity, &character.Constitution, &character.Intelligence,
			&character.Wisdom, &character.Charisma,
			&character.ArmorClass, &character.Initiative, &character.Speed, &character.MaxHitPoints,
			&character.CurrentHitPoints, &character.TempHitPoints,
			&hitDice, &character.ProficiencyBonus, &character.PassivePerception,
			&skills, &savingThrows, &proficiencies,
			&spellcastingAbility, &spellSaveDC, &spellAttackBonus, &spellSlots, &preparedSpells,
			&currency, &weapons, &armorJSON, &equipment,
			&features, &racialTraits,
			&personalityTraits, &ideals, &bonds, &flaws, &appearance, &backstory, &notes,
			&avatar, &character.AIGenerated, &character.CreatedAt, &character.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		pgAssignNullString(&character.CampaignID, campaignIDNull)
		pgAssignNullString(&character.Background, background)
		pgAssignNullString(&character.Alignment, alignment)
		pgAssignNullString(&character.HitDice, hitDice)
		pgAssignNullString(&character.Avatar, avatar)
		pgAssignNullString(&character.SpellcastingAbility, spellcastingAbility)
		pgAssignNullInt(&character.SpellSaveDC, spellSaveDC)
		pgAssignNullInt(&character.SpellAttackBonus, spellAttackBonus)
		pgAssignNullStringToBytes(&character.SpellSlots, spellSlots)
		pgAssignNullStringToBytes(&character.PreparedSpells, preparedSpells)
		pgAssignNullStringToBytes(&character.Skills, skills)
		pgAssignNullStringToBytes(&character.SavingThrows, savingThrows)
		pgAssignNullStringToBytes(&character.Proficiencies, proficiencies)
		pgAssignNullStringToBytes(&character.Features, features)
		pgAssignNullStringToBytes(&character.RacialTraits, racialTraits)
		pgAssignNullStringToBytes(&character.Currency, currency)
		pgAssignNullStringToBytes(&character.Weapons, weapons)
		pgAssignNullStringToBytes(&character.Armor, armorJSON)
		pgAssignNullStringToBytes(&character.Equipment, equipment)
		pgAssignNullString(&character.PersonalityTraits, personalityTraits)
		pgAssignNullString(&character.Ideals, ideals)
		pgAssignNullString(&character.Bonds, bonds)
		pgAssignNullString(&character.Flaws, flaws)
		pgAssignNullString(&character.Appearance, appearance)
		pgAssignNullString(&character.Backstory, backstory)
		pgAssignNullString(&character.Notes, notes)

		characters = append(characters, character)
	}

	return characters, rows.Err()
}
