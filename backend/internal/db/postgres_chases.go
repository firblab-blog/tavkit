package db

import (
	"context"
)

// chasesOps returns the unified ChasesOperations for PostgreSQL.
func (db *PostgresDB) chasesOps() *ChasesOperations {
	return NewChasesOperations(db.Executor(), db.QueryBuilder())
}

// ============================================================================
// CHASE OPERATIONS (PostgreSQL)
// ============================================================================

func (db *PostgresDB) CreateChase(ctx context.Context, chase *Chase) error {
	return db.chasesOps().CreateChase(ctx, chase)
}

func (db *PostgresDB) GetChaseByID(ctx context.Context, id string) (*Chase, error) {
	return db.chasesOps().GetChaseByID(ctx, id)
}

func (db *PostgresDB) ListChasesByUserID(ctx context.Context, userID string, campaignID *string) ([]*Chase, error) {
	return db.chasesOps().ListChasesByUserID(ctx, userID, campaignID)
}

func (db *PostgresDB) ListChasesByCampaignID(ctx context.Context, campaignID string) ([]*Chase, error) {
	return db.chasesOps().ListChasesByCampaignID(ctx, campaignID)
}

func (db *PostgresDB) UpdateChase(ctx context.Context, chase *Chase) error {
	return db.chasesOps().UpdateChase(ctx, chase)
}

func (db *PostgresDB) DeleteChase(ctx context.Context, id string) error {
	return db.chasesOps().DeleteChase(ctx, id)
}

// ============================================================================
// CHASE PARTICIPANT OPERATIONS (PostgreSQL)
// ============================================================================

func (db *PostgresDB) CreateChaseParticipant(ctx context.Context, participant *ChaseParticipant) error {
	return db.chasesOps().CreateChaseParticipant(ctx, participant)
}

func (db *PostgresDB) GetChaseParticipantByID(ctx context.Context, id string) (*ChaseParticipant, error) {
	return db.chasesOps().GetChaseParticipantByID(ctx, id)
}

func (db *PostgresDB) ListChaseParticipants(ctx context.Context, chaseID string) ([]*ChaseParticipant, error) {
	return db.chasesOps().ListChaseParticipants(ctx, chaseID)
}

func (db *PostgresDB) UpdateChaseParticipant(ctx context.Context, participant *ChaseParticipant) error {
	return db.chasesOps().UpdateChaseParticipant(ctx, participant)
}

func (db *PostgresDB) DeleteChaseParticipant(ctx context.Context, id string) error {
	return db.chasesOps().DeleteChaseParticipant(ctx, id)
}

// ============================================================================
// CHASE CHALLENGE OPERATIONS (PostgreSQL)
// ============================================================================

func (db *PostgresDB) CreateChaseChallenge(ctx context.Context, challenge *ChaseChallenge) error {
	return db.chasesOps().CreateChaseChallenge(ctx, challenge)
}

func (db *PostgresDB) GetChaseChallengeByID(ctx context.Context, id string) (*ChaseChallenge, error) {
	return db.chasesOps().GetChaseChallengeByID(ctx, id)
}

func (db *PostgresDB) ListChaseChallenges(ctx context.Context, chaseID string) ([]*ChaseChallenge, error) {
	return db.chasesOps().ListChaseChallenges(ctx, chaseID)
}

func (db *PostgresDB) ListChaseChallengesByRound(ctx context.Context, chaseID string, round int) ([]*ChaseChallenge, error) {
	return db.chasesOps().ListChaseChallengesByRound(ctx, chaseID, round)
}

func (db *PostgresDB) UpdateChaseChallenge(ctx context.Context, challenge *ChaseChallenge) error {
	return db.chasesOps().UpdateChaseChallenge(ctx, challenge)
}

func (db *PostgresDB) DeleteChaseChallenge(ctx context.Context, id string) error {
	return db.chasesOps().DeleteChaseChallenge(ctx, id)
}

// ============================================================================
// CHASE COMPLICATION OPERATIONS (PostgreSQL)
// ============================================================================

func (db *PostgresDB) CreateChaseComplication(ctx context.Context, complication *ChaseComplication) error {
	return db.chasesOps().CreateChaseComplication(ctx, complication)
}

func (db *PostgresDB) GetChaseComplicationByID(ctx context.Context, id string) (*ChaseComplication, error) {
	return db.chasesOps().GetChaseComplicationByID(ctx, id)
}

func (db *PostgresDB) ListChaseComplications(ctx context.Context, chaseID string) ([]*ChaseComplication, error) {
	return db.chasesOps().ListChaseComplications(ctx, chaseID)
}

func (db *PostgresDB) ListChaseComplicationsByRound(ctx context.Context, chaseID string, round int) ([]*ChaseComplication, error) {
	return db.chasesOps().ListChaseComplicationsByRound(ctx, chaseID, round)
}

func (db *PostgresDB) UpdateChaseComplication(ctx context.Context, complication *ChaseComplication) error {
	return db.chasesOps().UpdateChaseComplication(ctx, complication)
}

func (db *PostgresDB) DeleteChaseComplication(ctx context.Context, id string) error {
	return db.chasesOps().DeleteChaseComplication(ctx, id)
}

// ============================================================================
// CHASE EVENT OPERATIONS (PostgreSQL)
// ============================================================================

func (db *PostgresDB) CreateChaseEvent(ctx context.Context, event *ChaseEvent) error {
	return db.chasesOps().CreateChaseEvent(ctx, event)
}

func (db *PostgresDB) ListChaseEvents(ctx context.Context, chaseID string) ([]*ChaseEvent, error) {
	return db.chasesOps().ListChaseEvents(ctx, chaseID)
}

func (db *PostgresDB) ListChaseEventsByRound(ctx context.Context, chaseID string, round int) ([]*ChaseEvent, error) {
	return db.chasesOps().ListChaseEventsByRound(ctx, chaseID, round)
}

func (db *PostgresDB) DeleteChaseEventsByChaseID(ctx context.Context, chaseID string) error {
	return db.chasesOps().DeleteChaseEventsByChaseID(ctx, chaseID)
}

// ============================================================================
// CHASE TEMPLATE OPERATIONS (PostgreSQL)
// ============================================================================

func (db *PostgresDB) CreateChaseTemplate(ctx context.Context, template *ChaseTemplate) error {
	return db.chasesOps().CreateChaseTemplate(ctx, template)
}

func (db *PostgresDB) GetChaseTemplateByID(ctx context.Context, id string) (*ChaseTemplate, error) {
	return db.chasesOps().GetChaseTemplateByID(ctx, id)
}

func (db *PostgresDB) ListChaseTemplates(ctx context.Context, chaseType *string) ([]*ChaseTemplate, error) {
	return db.chasesOps().ListChaseTemplates(ctx, chaseType)
}

func (db *PostgresDB) UpdateChaseTemplate(ctx context.Context, template *ChaseTemplate) error {
	return db.chasesOps().UpdateChaseTemplate(ctx, template)
}

func (db *PostgresDB) DeleteChaseTemplate(ctx context.Context, id string) error {
	return db.chasesOps().DeleteChaseTemplate(ctx, id)
}
