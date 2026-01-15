package db

import (
	"context"
)

// combatOps returns the unified CombatOperations for SQLite.
func (s *SQLiteDB) combatOps() *CombatOperations {
	return NewCombatOperations(s.Executor(), s.QueryBuilder())
}

// ============================================================================
// COMBAT ENCOUNTER OPERATIONS
// ============================================================================

func (s *SQLiteDB) CreateCombatEncounter(ctx context.Context, combat *CombatEncounter) error {
	return s.combatOps().CreateCombatEncounter(ctx, combat)
}

func (s *SQLiteDB) GetCombatEncounterByID(ctx context.Context, id string) (*CombatEncounter, error) {
	return s.combatOps().GetCombatEncounterByID(ctx, id)
}

func (s *SQLiteDB) GetCombatEncounterBySessionID(ctx context.Context, sessionID string) (*CombatEncounter, error) {
	return s.combatOps().GetCombatEncounterBySessionID(ctx, sessionID)
}

func (s *SQLiteDB) UpdateCombatEncounter(ctx context.Context, combat *CombatEncounter) error {
	return s.combatOps().UpdateCombatEncounter(ctx, combat)
}

func (s *SQLiteDB) DeleteCombatEncounter(ctx context.Context, id string) error {
	return s.combatOps().DeleteCombatEncounter(ctx, id)
}

// ============================================================================
// COMBAT PARTICIPANT OPERATIONS
// ============================================================================

func (s *SQLiteDB) CreateCombatParticipant(ctx context.Context, participant *CombatParticipant) error {
	return s.combatOps().CreateCombatParticipant(ctx, participant)
}

func (s *SQLiteDB) GetCombatParticipantByID(ctx context.Context, id string) (*CombatParticipant, error) {
	return s.combatOps().GetCombatParticipantByID(ctx, id)
}

func (s *SQLiteDB) ListCombatParticipants(ctx context.Context, combatID string) ([]*CombatParticipant, error) {
	return s.combatOps().ListCombatParticipants(ctx, combatID)
}

func (s *SQLiteDB) UpdateCombatParticipant(ctx context.Context, participant *CombatParticipant) error {
	return s.combatOps().UpdateCombatParticipant(ctx, participant)
}

func (s *SQLiteDB) DeleteCombatParticipant(ctx context.Context, id string) error {
	return s.combatOps().DeleteCombatParticipant(ctx, id)
}

// ============================================================================
// COMBAT CONDITION OPERATIONS
// ============================================================================

func (s *SQLiteDB) CreateCombatCondition(ctx context.Context, condition *CombatCondition) error {
	return s.combatOps().CreateCombatCondition(ctx, condition)
}

func (s *SQLiteDB) ListCombatConditions(ctx context.Context, participantID string) ([]*CombatCondition, error) {
	return s.combatOps().ListCombatConditions(ctx, participantID)
}

func (s *SQLiteDB) DeleteCombatCondition(ctx context.Context, id string) error {
	return s.combatOps().DeleteCombatCondition(ctx, id)
}

// ============================================================================
// CAMPAIGN-LINKED COMBAT OPERATIONS
// ============================================================================

func (s *SQLiteDB) GetActiveCombatByCampaignID(ctx context.Context, campaignID string) (*CombatEncounter, error) {
	return s.combatOps().GetActiveCombatByCampaignID(ctx, campaignID)
}

func (s *SQLiteDB) ListCombatsByCampaignID(ctx context.Context, campaignID string) ([]*CombatEncounter, error) {
	return s.combatOps().ListCombatsByCampaignID(ctx, campaignID)
}

func (s *SQLiteDB) GetParticipantByOwnerUserID(ctx context.Context, combatID, userID string) (*CombatParticipant, error) {
	return s.combatOps().GetParticipantByOwnerUserID(ctx, combatID, userID)
}

func (s *SQLiteDB) GetParticipantByCharacterID(ctx context.Context, combatID, characterID string) (*CombatParticipant, error) {
	return s.combatOps().GetParticipantByCharacterID(ctx, combatID, characterID)
}

func (s *SQLiteDB) ListVisibleParticipants(ctx context.Context, combatID string) ([]*CombatParticipant, error) {
	return s.combatOps().ListVisibleParticipants(ctx, combatID)
}

// ============================================================================
// COMBAT SETTINGS OPERATIONS
// ============================================================================

func (s *SQLiteDB) GetCombatSettings(ctx context.Context, campaignID string) (*CombatSettings, error) {
	return s.combatOps().GetCombatSettings(ctx, campaignID)
}

func (s *SQLiteDB) UpsertCombatSettings(ctx context.Context, settings *CombatSettings) error {
	return s.combatOps().UpsertCombatSettings(ctx, settings)
}
