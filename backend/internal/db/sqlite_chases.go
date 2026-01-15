package db

import (
	"context"
)

// chasesOps returns the unified ChasesOperations for SQLite.
func (s *SQLiteDB) chasesOps() *ChasesOperations {
	return NewChasesOperations(s.Executor(), s.QueryBuilder())
}

// ============================================================================
// CHASE OPERATIONS (SQLite)
// ============================================================================

func (s *SQLiteDB) CreateChase(ctx context.Context, chase *Chase) error {
	return s.chasesOps().CreateChase(ctx, chase)
}

func (s *SQLiteDB) GetChaseByID(ctx context.Context, id string) (*Chase, error) {
	return s.chasesOps().GetChaseByID(ctx, id)
}

func (s *SQLiteDB) ListChasesByUserID(ctx context.Context, userID string, campaignID *string) ([]*Chase, error) {
	return s.chasesOps().ListChasesByUserID(ctx, userID, campaignID)
}

func (s *SQLiteDB) ListChasesByCampaignID(ctx context.Context, campaignID string) ([]*Chase, error) {
	return s.chasesOps().ListChasesByCampaignID(ctx, campaignID)
}

func (s *SQLiteDB) UpdateChase(ctx context.Context, chase *Chase) error {
	return s.chasesOps().UpdateChase(ctx, chase)
}

func (s *SQLiteDB) DeleteChase(ctx context.Context, id string) error {
	return s.chasesOps().DeleteChase(ctx, id)
}

// ============================================================================
// CHASE PARTICIPANT OPERATIONS (SQLite)
// ============================================================================

func (s *SQLiteDB) CreateChaseParticipant(ctx context.Context, participant *ChaseParticipant) error {
	return s.chasesOps().CreateChaseParticipant(ctx, participant)
}

func (s *SQLiteDB) GetChaseParticipantByID(ctx context.Context, id string) (*ChaseParticipant, error) {
	return s.chasesOps().GetChaseParticipantByID(ctx, id)
}

func (s *SQLiteDB) ListChaseParticipants(ctx context.Context, chaseID string) ([]*ChaseParticipant, error) {
	return s.chasesOps().ListChaseParticipants(ctx, chaseID)
}

func (s *SQLiteDB) UpdateChaseParticipant(ctx context.Context, participant *ChaseParticipant) error {
	return s.chasesOps().UpdateChaseParticipant(ctx, participant)
}

func (s *SQLiteDB) DeleteChaseParticipant(ctx context.Context, id string) error {
	return s.chasesOps().DeleteChaseParticipant(ctx, id)
}

// ============================================================================
// CHASE CHALLENGE OPERATIONS (SQLite)
// ============================================================================

func (s *SQLiteDB) CreateChaseChallenge(ctx context.Context, challenge *ChaseChallenge) error {
	return s.chasesOps().CreateChaseChallenge(ctx, challenge)
}

func (s *SQLiteDB) GetChaseChallengeByID(ctx context.Context, id string) (*ChaseChallenge, error) {
	return s.chasesOps().GetChaseChallengeByID(ctx, id)
}

func (s *SQLiteDB) ListChaseChallenges(ctx context.Context, chaseID string) ([]*ChaseChallenge, error) {
	return s.chasesOps().ListChaseChallenges(ctx, chaseID)
}

func (s *SQLiteDB) ListChaseChallengesByRound(ctx context.Context, chaseID string, round int) ([]*ChaseChallenge, error) {
	return s.chasesOps().ListChaseChallengesByRound(ctx, chaseID, round)
}

func (s *SQLiteDB) UpdateChaseChallenge(ctx context.Context, challenge *ChaseChallenge) error {
	return s.chasesOps().UpdateChaseChallenge(ctx, challenge)
}

func (s *SQLiteDB) DeleteChaseChallenge(ctx context.Context, id string) error {
	return s.chasesOps().DeleteChaseChallenge(ctx, id)
}

// ============================================================================
// CHASE COMPLICATION OPERATIONS (SQLite)
// ============================================================================

func (s *SQLiteDB) CreateChaseComplication(ctx context.Context, complication *ChaseComplication) error {
	return s.chasesOps().CreateChaseComplication(ctx, complication)
}

func (s *SQLiteDB) GetChaseComplicationByID(ctx context.Context, id string) (*ChaseComplication, error) {
	return s.chasesOps().GetChaseComplicationByID(ctx, id)
}

func (s *SQLiteDB) ListChaseComplications(ctx context.Context, chaseID string) ([]*ChaseComplication, error) {
	return s.chasesOps().ListChaseComplications(ctx, chaseID)
}

func (s *SQLiteDB) ListChaseComplicationsByRound(ctx context.Context, chaseID string, round int) ([]*ChaseComplication, error) {
	return s.chasesOps().ListChaseComplicationsByRound(ctx, chaseID, round)
}

func (s *SQLiteDB) UpdateChaseComplication(ctx context.Context, complication *ChaseComplication) error {
	return s.chasesOps().UpdateChaseComplication(ctx, complication)
}

func (s *SQLiteDB) DeleteChaseComplication(ctx context.Context, id string) error {
	return s.chasesOps().DeleteChaseComplication(ctx, id)
}

// ============================================================================
// CHASE EVENT OPERATIONS (SQLite)
// ============================================================================

func (s *SQLiteDB) CreateChaseEvent(ctx context.Context, event *ChaseEvent) error {
	return s.chasesOps().CreateChaseEvent(ctx, event)
}

func (s *SQLiteDB) ListChaseEvents(ctx context.Context, chaseID string) ([]*ChaseEvent, error) {
	return s.chasesOps().ListChaseEvents(ctx, chaseID)
}

func (s *SQLiteDB) ListChaseEventsByRound(ctx context.Context, chaseID string, round int) ([]*ChaseEvent, error) {
	return s.chasesOps().ListChaseEventsByRound(ctx, chaseID, round)
}

func (s *SQLiteDB) DeleteChaseEventsByChaseID(ctx context.Context, chaseID string) error {
	return s.chasesOps().DeleteChaseEventsByChaseID(ctx, chaseID)
}

// ============================================================================
// CHASE TEMPLATE OPERATIONS (SQLite)
// ============================================================================

func (s *SQLiteDB) CreateChaseTemplate(ctx context.Context, template *ChaseTemplate) error {
	return s.chasesOps().CreateChaseTemplate(ctx, template)
}

func (s *SQLiteDB) GetChaseTemplateByID(ctx context.Context, id string) (*ChaseTemplate, error) {
	return s.chasesOps().GetChaseTemplateByID(ctx, id)
}

func (s *SQLiteDB) ListChaseTemplates(ctx context.Context, chaseType *string) ([]*ChaseTemplate, error) {
	return s.chasesOps().ListChaseTemplates(ctx, chaseType)
}

func (s *SQLiteDB) UpdateChaseTemplate(ctx context.Context, template *ChaseTemplate) error {
	return s.chasesOps().UpdateChaseTemplate(ctx, template)
}

func (s *SQLiteDB) DeleteChaseTemplate(ctx context.Context, id string) error {
	return s.chasesOps().DeleteChaseTemplate(ctx, id)
}
