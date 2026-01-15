package db

import (
	"context"
)

// charactersOps returns the unified CharactersOperations for SQLite.
func (s *SQLiteDB) charactersOps() *CharactersOperations {
	return NewCharactersOperations(s.Executor(), s.QueryBuilder())
}

// ============================================================================
// CHARACTER OPERATIONS (SQLite)
// ============================================================================

func (s *SQLiteDB) CreateCharacter(ctx context.Context, character *Character) error {
	return s.charactersOps().CreateCharacter(ctx, character)
}

func (s *SQLiteDB) GetCharacterByID(ctx context.Context, id string) (*Character, error) {
	return s.charactersOps().GetCharacterByID(ctx, id)
}

func (s *SQLiteDB) ListCharactersByUserID(ctx context.Context, userID string, campaignID *string) ([]*Character, error) {
	return s.charactersOps().ListCharactersByUserID(ctx, userID, campaignID)
}

func (s *SQLiteDB) ListCharactersByCampaignID(ctx context.Context, campaignID string) ([]*Character, error) {
	return s.charactersOps().ListCharactersByCampaignID(ctx, campaignID)
}

func (s *SQLiteDB) UpdateCharacter(ctx context.Context, character *Character) error {
	return s.charactersOps().UpdateCharacter(ctx, character)
}

func (s *SQLiteDB) DeleteCharacter(ctx context.Context, id string) error {
	return s.charactersOps().DeleteCharacter(ctx, id)
}

// ============================================================================
// CAMPAIGN CHARACTER LINKING OPERATIONS (SQLite)
// ============================================================================

func (s *SQLiteDB) LinkCharacterToCampaign(ctx context.Context, campaignID, characterID string) error {
	return s.charactersOps().LinkCharacterToCampaign(ctx, campaignID, characterID)
}

func (s *SQLiteDB) UnlinkCharacterFromCampaign(ctx context.Context, campaignID, characterID string) error {
	return s.charactersOps().UnlinkCharacterFromCampaign(ctx, campaignID, characterID)
}

func (s *SQLiteDB) ListCampaignCharacters(ctx context.Context, campaignID string) ([]*Character, error) {
	return s.charactersOps().ListCampaignCharacters(ctx, campaignID)
}
