package db

import (
	"context"
)

// combatOps returns the unified CombatOperations for PostgreSQL.
func (db *PostgresDB) combatOps() *CombatOperations {
	return NewCombatOperations(db.Executor(), db.QueryBuilder())
}

// ============================================================================
// COMBAT ENCOUNTER OPERATIONS
// ============================================================================

func (db *PostgresDB) CreateCombatEncounter(ctx context.Context, combat *CombatEncounter) error {
	return db.combatOps().CreateCombatEncounter(ctx, combat)
}

func (db *PostgresDB) GetCombatEncounterByID(ctx context.Context, id string) (*CombatEncounter, error) {
	return db.combatOps().GetCombatEncounterByID(ctx, id)
}

func (db *PostgresDB) GetCombatEncounterBySessionID(ctx context.Context, sessionID string) (*CombatEncounter, error) {
	return db.combatOps().GetCombatEncounterBySessionID(ctx, sessionID)
}

func (db *PostgresDB) UpdateCombatEncounter(ctx context.Context, combat *CombatEncounter) error {
	return db.combatOps().UpdateCombatEncounter(ctx, combat)
}

func (db *PostgresDB) DeleteCombatEncounter(ctx context.Context, id string) error {
	return db.combatOps().DeleteCombatEncounter(ctx, id)
}

// ============================================================================
// COMBAT PARTICIPANT OPERATIONS
// ============================================================================

func (db *PostgresDB) CreateCombatParticipant(ctx context.Context, participant *CombatParticipant) error {
	return db.combatOps().CreateCombatParticipant(ctx, participant)
}

func (db *PostgresDB) GetCombatParticipantByID(ctx context.Context, id string) (*CombatParticipant, error) {
	return db.combatOps().GetCombatParticipantByID(ctx, id)
}

func (db *PostgresDB) ListCombatParticipants(ctx context.Context, combatID string) ([]*CombatParticipant, error) {
	return db.combatOps().ListCombatParticipants(ctx, combatID)
}

func (db *PostgresDB) UpdateCombatParticipant(ctx context.Context, participant *CombatParticipant) error {
	return db.combatOps().UpdateCombatParticipant(ctx, participant)
}

func (db *PostgresDB) DeleteCombatParticipant(ctx context.Context, id string) error {
	return db.combatOps().DeleteCombatParticipant(ctx, id)
}

// ============================================================================
// COMBAT CONDITION OPERATIONS
// ============================================================================

func (db *PostgresDB) CreateCombatCondition(ctx context.Context, condition *CombatCondition) error {
	return db.combatOps().CreateCombatCondition(ctx, condition)
}

func (db *PostgresDB) ListCombatConditions(ctx context.Context, participantID string) ([]*CombatCondition, error) {
	return db.combatOps().ListCombatConditions(ctx, participantID)
}

func (db *PostgresDB) DeleteCombatCondition(ctx context.Context, id string) error {
	return db.combatOps().DeleteCombatCondition(ctx, id)
}

// ============================================================================
// CAMPAIGN-LINKED COMBAT OPERATIONS
// ============================================================================

func (db *PostgresDB) GetActiveCombatByCampaignID(ctx context.Context, campaignID string) (*CombatEncounter, error) {
	return db.combatOps().GetActiveCombatByCampaignID(ctx, campaignID)
}

func (db *PostgresDB) ListCombatsByCampaignID(ctx context.Context, campaignID string) ([]*CombatEncounter, error) {
	return db.combatOps().ListCombatsByCampaignID(ctx, campaignID)
}

func (db *PostgresDB) GetParticipantByOwnerUserID(ctx context.Context, combatID, userID string) (*CombatParticipant, error) {
	return db.combatOps().GetParticipantByOwnerUserID(ctx, combatID, userID)
}

func (db *PostgresDB) GetParticipantByCharacterID(ctx context.Context, combatID, characterID string) (*CombatParticipant, error) {
	return db.combatOps().GetParticipantByCharacterID(ctx, combatID, characterID)
}

func (db *PostgresDB) ListVisibleParticipants(ctx context.Context, combatID string) ([]*CombatParticipant, error) {
	return db.combatOps().ListVisibleParticipants(ctx, combatID)
}

// ============================================================================
// COMBAT SETTINGS OPERATIONS
// ============================================================================

func (db *PostgresDB) GetCombatSettings(ctx context.Context, campaignID string) (*CombatSettings, error) {
	return db.combatOps().GetCombatSettings(ctx, campaignID)
}

func (db *PostgresDB) UpsertCombatSettings(ctx context.Context, settings *CombatSettings) error {
	return db.combatOps().UpsertCombatSettings(ctx, settings)
}
