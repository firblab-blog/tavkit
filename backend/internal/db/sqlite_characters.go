package db

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"
)

func (s *SQLiteDB) CreateCharacter(ctx context.Context, character *Character) error {
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
	) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	_, err := s.db.ExecContext(ctx, query,
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

// Helper type to hold all nullable fields for GetCharacterByID scanning
type fullCharacterScanFields struct {
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

func (s *SQLiteDB) GetCharacterByID(ctx context.Context, id string) (*Character, error) {
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
	FROM characters WHERE id = ?`

	fields := &fullCharacterScanFields{}
	err := s.scanFullCharacterRow(ctx, query, character, fields, id)
	if err != nil {
		return nil, err
	}

	// Convert all nullable fields to character fields
	populateFullCharacterFromScanFields(character, fields)

	return character, nil
}

// scanFullCharacterRow scans a full character row from the database
func (s *SQLiteDB) scanFullCharacterRow(ctx context.Context, query string, character *Character, fields *fullCharacterScanFields, id string) error {
	return s.db.QueryRowContext(ctx, query, id).Scan(
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
}

// populateFullCharacterFromScanFields populates all character fields from scanned nullable fields
func populateFullCharacterFromScanFields(character *Character, fields *fullCharacterScanFields) {
	populateCharacterBasicFields(character, fields)
	populateCharacterSpeedFields(character, fields)
	populateCharacterCombatFields(character, fields)
	populateCharacterSpellFields(character, fields)
	populateCharacterJSONFields(character, fields)
	populateCharacterInventoryFields(character, fields)
	populateCharacterTraitsFields(character, fields)
	populateCharacterPersonalityFields(character, fields)
	populateCharacterPhysicalFields(character, fields)
}

// populateCharacterBasicFields populates basic character fields
func populateCharacterBasicFields(character *Character, fields *fullCharacterScanFields) {
	assignNullString(&character.CampaignID, fields.campaignID)
	assignNullString(&character.Subrace, fields.subrace)
	assignNullString(&character.Subclass, fields.subclass)
	assignNullString(&character.Background, fields.background)
	assignNullString(&character.Alignment, fields.alignment)
	assignNullString(&character.HitDice, fields.hitDice)
}

// populateCharacterSpeedFields populates speed-related fields
func populateCharacterSpeedFields(character *Character, fields *fullCharacterScanFields) {
	assignNullInt(&character.SpeedWalking, fields.speedWalking)
	assignNullInt(&character.SpeedFlying, fields.speedFlying)
	assignNullInt(&character.SpeedSwimming, fields.speedSwimming)
	assignNullInt(&character.SpeedClimbing, fields.speedClimbing)
	assignNullInt(&character.SpeedBurrowing, fields.speedBurrowing)
	assignNullString(&character.Size, fields.size)
	assignNullString(&character.DnDBeyondID, fields.dndbeyondID)
}

// populateCharacterCombatFields populates combat-related fields
func populateCharacterCombatFields(character *Character, fields *fullCharacterScanFields) {
	assignNullInt(&character.PassiveInsight, fields.passiveInsight)
	assignNullInt(&character.PassiveInvestigation, fields.passiveInvestigation)
	assignNullStringToBytes(&character.Conditions, fields.conditions)
}

// populateCharacterSpellFields populates spell-related fields
func populateCharacterSpellFields(character *Character, fields *fullCharacterScanFields) {
	assignNullString(&character.SpellcastingAbility, fields.spellcastingAbility)
	assignNullInt(&character.SpellSaveDC, fields.spellSaveDC)
	assignNullInt(&character.SpellAttackBonus, fields.spellAttackBonus)
	assignNullStringToBytes(&character.SpellSlots, fields.spellSlots)
	assignNullStringToBytes(&character.PreparedSpells, fields.preparedSpells)
	assignNullStringToBytes(&character.KnownSpells, fields.knownSpells)
	assignNullStringToBytes(&character.Cantrips, fields.cantrips)
}

// populateCharacterJSONFields populates JSON fields (skills, proficiencies, etc.)
func populateCharacterJSONFields(character *Character, fields *fullCharacterScanFields) {
	assignNullStringToBytes(&character.Skills, fields.skills)
	assignNullStringToBytes(&character.SavingThrows, fields.savingThrows)
	assignNullStringToBytes(&character.Proficiencies, fields.proficiencies)
	assignNullStringToBytes(&character.Languages, fields.languages)
	assignNullStringToBytes(&character.Senses, fields.senses)
	assignNullStringToBytes(&character.Actions, fields.actions)
	assignNullStringToBytes(&character.BonusActions, fields.bonusActions)
	assignNullStringToBytes(&character.Reactions, fields.reactions)
}

// populateCharacterInventoryFields populates inventory-related fields
func populateCharacterInventoryFields(character *Character, fields *fullCharacterScanFields) {
	assignNullStringToBytes(&character.Currency, fields.currency)
	assignNullStringToBytes(&character.Weapons, fields.weapons)
	assignNullStringToBytes(&character.Armor, fields.armor)
	assignNullStringToBytes(&character.Equipment, fields.equipment)
	assignNullString(&character.Treasure, fields.treasure)
}

// populateCharacterTraitsFields populates traits and features fields
func populateCharacterTraitsFields(character *Character, fields *fullCharacterScanFields) {
	assignNullStringToBytes(&character.Features, fields.features)
	assignNullStringToBytes(&character.RacialTraits, fields.racialTraits)
	assignNullStringToBytes(&character.Feats, fields.feats)
}

// populateCharacterPersonalityFields populates personality and background fields
func populateCharacterPersonalityFields(character *Character, fields *fullCharacterScanFields) {
	assignNullString(&character.PersonalityTraits, fields.personalityTraits)
	assignNullString(&character.Ideals, fields.ideals)
	assignNullString(&character.Bonds, fields.bonds)
	assignNullString(&character.Flaws, fields.flaws)
	assignNullString(&character.Appearance, fields.appearance)
	assignNullString(&character.Backstory, fields.backstory)
	assignNullString(&character.AlliesOrganizations, fields.alliesOrgs)
	assignNullString(&character.Enemies, fields.enemies)
	assignNullString(&character.Notes, fields.notes)
}

// populateCharacterPhysicalFields populates physical appearance fields
func populateCharacterPhysicalFields(character *Character, fields *fullCharacterScanFields) {
	assignNullString(&character.Age, fields.age)
	assignNullString(&character.Height, fields.height)
	assignNullString(&character.Weight, fields.weight)
	assignNullString(&character.Eyes, fields.eyes)
	assignNullString(&character.Skin, fields.skin)
	assignNullString(&character.Hair, fields.hair)
	assignNullString(&character.Gender, fields.gender)
	assignNullString(&character.Faith, fields.faith)
	assignNullString(&character.Lifestyle, fields.lifestyle)
	assignNullString(&character.Avatar, fields.avatar)
}

// Helper functions for assignment

// assignNullString assigns a sql.NullString to a *string if valid
func assignNullString(dest **string, src sql.NullString) {
	if src.Valid {
		*dest = &src.String
	}
}

// assignNullInt assigns a sql.NullInt64 to a *int if valid
func assignNullInt(dest **int, src sql.NullInt64) {
	if src.Valid {
		intVal := int(src.Int64)
		*dest = &intVal
	}
}

// assignNullStringToBytes assigns a sql.NullString to a json.RawMessage if valid and non-empty
func assignNullStringToBytes(dest *json.RawMessage, src sql.NullString) {
	if src.Valid && src.String != "" {
		*dest = json.RawMessage(src.String)
	}
}

// Helper type to hold nullable fields for list queries
type listCharacterScanFields struct {
	campaignIDNull, background, alignment, hitDice, spellcastingAbility, avatar sql.NullString
	spellSaveDC, spellAttackBonus                                               sql.NullInt64
	skills, savingThrows, proficiencies, languages, senses                      sql.NullString
	spellSlots, preparedSpells                                                  sql.NullString
	currency, weapons, armorJSON, equipment                                     sql.NullString
	features, racialTraits                                                      sql.NullString
	personalityTraits, ideals, bonds, flaws, appearance, backstory, notes       sql.NullString
}

func (s *SQLiteDB) ListCharactersByUserID(ctx context.Context, userID string, campaignID *string) ([]*Character, error) {
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
	FROM characters WHERE user_id = ?`

	args := []interface{}{userID}
	if campaignID != nil {
		query += ` AND (campaign_id = ? OR campaign_id IS NULL)`
		args = append(args, *campaignID)
	}
	query += sqlOrderByCreatedAtDesc

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	return scanCharacterListRows(rows)
}

// scanCharacterListRows scans multiple character rows from query results
func scanCharacterListRows(rows *sql.Rows) ([]*Character, error) {
	var characters []*Character
	for rows.Next() {
		character, err := scanListCharacterRow(rows)
		if err != nil {
			return nil, err
		}
		characters = append(characters, character)
	}
	return characters, rows.Err()
}

// scanListCharacterRow scans a single character row from list queries
func scanListCharacterRow(rows *sql.Rows) (*Character, error) {
	character := &Character{}
	fields := &listCharacterScanFields{}

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

	populateListCharacterFromScanFields(character, fields)
	return character, nil
}

// populateListCharacterFromScanFields populates character fields from list scan fields
func populateListCharacterFromScanFields(character *Character, fields *listCharacterScanFields) {
	populateListCharacterBasicFields(character, fields)
	populateListCharacterSpellFields(character, fields)
	populateListCharacterJSONFields(character, fields)
	populateListCharacterInventoryFields(character, fields)
	populateListCharacterPersonalityFields(character, fields)
}

// populateListCharacterBasicFields populates basic character fields for list queries
func populateListCharacterBasicFields(character *Character, fields *listCharacterScanFields) {
	assignNullString(&character.CampaignID, fields.campaignIDNull)
	assignNullString(&character.Background, fields.background)
	assignNullString(&character.Alignment, fields.alignment)
	assignNullString(&character.HitDice, fields.hitDice)
	assignNullString(&character.Avatar, fields.avatar)
}

// populateListCharacterSpellFields populates spell-related fields for list queries
func populateListCharacterSpellFields(character *Character, fields *listCharacterScanFields) {
	assignNullString(&character.SpellcastingAbility, fields.spellcastingAbility)
	assignNullInt(&character.SpellSaveDC, fields.spellSaveDC)
	assignNullInt(&character.SpellAttackBonus, fields.spellAttackBonus)
	assignNullStringToBytes(&character.SpellSlots, fields.spellSlots)
	assignNullStringToBytes(&character.PreparedSpells, fields.preparedSpells)
}

// populateListCharacterJSONFields populates JSON fields for list queries
func populateListCharacterJSONFields(character *Character, fields *listCharacterScanFields) {
	assignNullStringToBytes(&character.Skills, fields.skills)
	assignNullStringToBytes(&character.SavingThrows, fields.savingThrows)
	assignNullStringToBytes(&character.Proficiencies, fields.proficiencies)
	assignNullStringToBytes(&character.Languages, fields.languages)
	assignNullStringToBytes(&character.Senses, fields.senses)
	assignNullStringToBytes(&character.Features, fields.features)
	assignNullStringToBytes(&character.RacialTraits, fields.racialTraits)
}

// populateListCharacterInventoryFields populates inventory fields for list queries
func populateListCharacterInventoryFields(character *Character, fields *listCharacterScanFields) {
	assignNullStringToBytes(&character.Currency, fields.currency)
	assignNullStringToBytes(&character.Weapons, fields.weapons)
	assignNullStringToBytes(&character.Armor, fields.armorJSON)
	assignNullStringToBytes(&character.Equipment, fields.equipment)
}

// populateListCharacterPersonalityFields populates personality fields for list queries
func populateListCharacterPersonalityFields(character *Character, fields *listCharacterScanFields) {
	assignNullString(&character.PersonalityTraits, fields.personalityTraits)
	assignNullString(&character.Ideals, fields.ideals)
	assignNullString(&character.Bonds, fields.bonds)
	assignNullString(&character.Flaws, fields.flaws)
	assignNullString(&character.Appearance, fields.appearance)
	assignNullString(&character.Backstory, fields.backstory)
	assignNullString(&character.Notes, fields.notes)
}

// Helper type for campaign-based list queries (subset of fields, no languages/senses)
type campaignCharacterScanFields struct {
	campaignIDNull, background, alignment, hitDice, spellcastingAbility, avatar sql.NullString
	spellSaveDC, spellAttackBonus                                               sql.NullInt64
	skills, savingThrows, proficiencies                                         sql.NullString
	spellSlots, preparedSpells                                                  sql.NullString
	currency, weapons, armorJSON, equipment                                     sql.NullString
	features, racialTraits                                                      sql.NullString
	personalityTraits, ideals, bonds, flaws, appearance, backstory, notes       sql.NullString
}

func (s *SQLiteDB) ListCharactersByCampaignID(ctx context.Context, campaignID string) ([]*Character, error) {
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
	FROM characters WHERE campaign_id = ? ORDER BY created_at DESC`

	rows, err := s.db.QueryContext(ctx, query, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	return scanCampaignCharacterListRows(rows)
}

// scanCampaignCharacterListRows scans multiple character rows for campaign queries
func scanCampaignCharacterListRows(rows *sql.Rows) ([]*Character, error) {
	var characters []*Character
	for rows.Next() {
		character, err := scanCampaignCharacterRow(rows)
		if err != nil {
			return nil, err
		}
		characters = append(characters, character)
	}
	return characters, rows.Err()
}

// scanCampaignCharacterRow scans a single character row from campaign queries
func scanCampaignCharacterRow(rows *sql.Rows) (*Character, error) {
	character := &Character{}
	fields := &campaignCharacterScanFields{}

	err := rows.Scan(
		&character.ID, &character.UserID, &fields.campaignIDNull, &character.Name, &character.Level,
		&character.Race, &character.ClassInfo, &fields.background, &fields.alignment, &character.ExperiencePoints,
		&character.Strength, &character.Dexterity, &character.Constitution, &character.Intelligence,
		&character.Wisdom, &character.Charisma,
		&character.ArmorClass, &character.Initiative, &character.Speed, &character.MaxHitPoints,
		&character.CurrentHitPoints, &character.TempHitPoints,
		&fields.hitDice, &character.ProficiencyBonus, &character.PassivePerception,
		&fields.skills, &fields.savingThrows, &fields.proficiencies,
		&fields.spellcastingAbility, &fields.spellSaveDC, &fields.spellAttackBonus, &fields.spellSlots, &fields.preparedSpells,
		&fields.currency, &fields.weapons, &fields.armorJSON, &fields.equipment,
		&fields.features, &fields.racialTraits,
		&fields.personalityTraits, &fields.ideals, &fields.bonds, &fields.flaws, &fields.appearance, &fields.backstory, &fields.notes,
		&fields.avatar, &character.AIGenerated, &character.CreatedAt, &character.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	populateCampaignCharacterFromScanFields(character, fields)
	return character, nil
}

// populateCampaignCharacterFromScanFields populates character fields from campaign scan fields
func populateCampaignCharacterFromScanFields(character *Character, fields *campaignCharacterScanFields) {
	populateCampaignCharacterBasicFields(character, fields)
	populateCampaignCharacterSpellFields(character, fields)
	populateCampaignCharacterJSONFields(character, fields)
	populateCampaignCharacterInventoryFields(character, fields)
	populateCampaignCharacterPersonalityFields(character, fields)
}

// populateCampaignCharacterBasicFields populates basic character fields for campaign queries
func populateCampaignCharacterBasicFields(character *Character, fields *campaignCharacterScanFields) {
	assignNullString(&character.CampaignID, fields.campaignIDNull)
	assignNullString(&character.Background, fields.background)
	assignNullString(&character.Alignment, fields.alignment)
	assignNullString(&character.HitDice, fields.hitDice)
	assignNullString(&character.Avatar, fields.avatar)
}

// populateCampaignCharacterSpellFields populates spell-related fields for campaign queries
func populateCampaignCharacterSpellFields(character *Character, fields *campaignCharacterScanFields) {
	assignNullString(&character.SpellcastingAbility, fields.spellcastingAbility)
	assignNullInt(&character.SpellSaveDC, fields.spellSaveDC)
	assignNullInt(&character.SpellAttackBonus, fields.spellAttackBonus)
	assignNullStringToBytes(&character.SpellSlots, fields.spellSlots)
	assignNullStringToBytes(&character.PreparedSpells, fields.preparedSpells)
}

// populateCampaignCharacterJSONFields populates JSON fields for campaign queries
func populateCampaignCharacterJSONFields(character *Character, fields *campaignCharacterScanFields) {
	assignNullStringToBytes(&character.Skills, fields.skills)
	assignNullStringToBytes(&character.SavingThrows, fields.savingThrows)
	assignNullStringToBytes(&character.Proficiencies, fields.proficiencies)
	assignNullStringToBytes(&character.Features, fields.features)
	assignNullStringToBytes(&character.RacialTraits, fields.racialTraits)
}

// populateCampaignCharacterInventoryFields populates inventory fields for campaign queries
func populateCampaignCharacterInventoryFields(character *Character, fields *campaignCharacterScanFields) {
	assignNullStringToBytes(&character.Currency, fields.currency)
	assignNullStringToBytes(&character.Weapons, fields.weapons)
	assignNullStringToBytes(&character.Armor, fields.armorJSON)
	assignNullStringToBytes(&character.Equipment, fields.equipment)
}

// populateCampaignCharacterPersonalityFields populates personality fields for campaign queries
func populateCampaignCharacterPersonalityFields(character *Character, fields *campaignCharacterScanFields) {
	assignNullString(&character.PersonalityTraits, fields.personalityTraits)
	assignNullString(&character.Ideals, fields.ideals)
	assignNullString(&character.Bonds, fields.bonds)
	assignNullString(&character.Flaws, fields.flaws)
	assignNullString(&character.Appearance, fields.appearance)
	assignNullString(&character.Backstory, fields.backstory)
	assignNullString(&character.Notes, fields.notes)
}

func (s *SQLiteDB) UpdateCharacter(ctx context.Context, character *Character) error {
	character.UpdatedAt = time.Now()

	query := `UPDATE characters SET
		campaign_id = ?, name = ?, level = ?, race = ?, subrace = ?, class_info = ?, subclass = ?,
		background = ?, alignment = ?, experience_points = ?, inspiration = ?,
		strength = ?, dexterity = ?, constitution = ?, intelligence = ?, wisdom = ?, charisma = ?,
		armor_class = ?, initiative = ?, speed = ?, speed_walking = ?, speed_flying = ?,
		speed_swimming = ?, speed_climbing = ?,
		max_hit_points = ?, current_hit_points = ?, temp_hit_points = ?,
		hit_dice = ?, hit_dice_total = ?, hit_dice_used = ?,
		proficiency_bonus = ?, passive_perception = ?, passive_insight = ?, passive_investigation = ?,
		death_save_successes = ?, death_save_failures = ?, exhaustion_level = ?, conditions = ?,
		skills = ?, saving_throws = ?, proficiencies = ?, languages = ?, senses = ?,
		actions = ?, bonus_actions = ?, reactions = ?,
		spellcasting_ability = ?, spell_save_dc = ?, spell_attack_bonus = ?, spell_slots = ?,
		prepared_spells = ?, known_spells = ?, cantrips = ?,
		currency = ?, weapons = ?, armor = ?, equipment = ?, treasure = ?,
		features = ?, racial_traits = ?, feats = ?,
		personality_traits = ?, ideals = ?, bonds = ?, flaws = ?, appearance = ?, backstory = ?,
		allies_organizations = ?, notes = ?,
		age = ?, height = ?, weight = ?, eyes = ?, skin = ?, hair = ?, faith = ?, lifestyle = ?,
		avatar = ?, updated_at = ?
	WHERE id = ?`

	_, err := s.db.ExecContext(ctx, query,
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

func (s *SQLiteDB) DeleteCharacter(ctx context.Context, id string) error {
	query := `DELETE FROM characters WHERE id = ?`
	_, err := s.db.ExecContext(ctx, query, id)
	return err
}

// Campaign Character linking operations (many-to-many)

func (s *SQLiteDB) LinkCharacterToCampaign(ctx context.Context, campaignID, characterID string) error {
	id := generateUUID()
	query := `INSERT INTO campaign_characters (id, campaign_id, character_id, added_at)
		VALUES (?, ?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(campaign_id, character_id) DO NOTHING`
	_, err := s.db.ExecContext(ctx, query, id, campaignID, characterID)
	return err
}

func (s *SQLiteDB) UnlinkCharacterFromCampaign(ctx context.Context, campaignID, characterID string) error {
	query := `DELETE FROM campaign_characters WHERE campaign_id = ? AND character_id = ?`
	_, err := s.db.ExecContext(ctx, query, campaignID, characterID)
	return err
}

func (s *SQLiteDB) ListCampaignCharacters(ctx context.Context, campaignID string) ([]*Character, error) {
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
	WHERE cc.campaign_id = ?
	ORDER BY cc.added_at DESC`

	rows, err := s.db.QueryContext(ctx, query, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close() //nolint:errcheck // Best effort close

	return scanCampaignCharacterListRows(rows)
}
