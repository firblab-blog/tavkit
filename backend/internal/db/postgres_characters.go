package db

import (
	"context"
)

// charactersOps returns the unified CharactersOperations for PostgreSQL.
func (db *PostgresDB) charactersOps() *CharactersOperations {
	return NewCharactersOperations(db.Executor(), db.QueryBuilder())
}

// ============================================================================
// CHARACTER OPERATIONS (PostgreSQL)
// ============================================================================

func (db *PostgresDB) CreateCharacter(ctx context.Context, character *Character) error {
	return db.charactersOps().CreateCharacter(ctx, character)
}

func (db *PostgresDB) GetCharacterByID(ctx context.Context, id string) (*Character, error) {
	return db.charactersOps().GetCharacterByID(ctx, id)
}

func (db *PostgresDB) ListCharactersByUserID(ctx context.Context, userID string, campaignID *string) ([]*Character, error) {
	return db.charactersOps().ListCharactersByUserID(ctx, userID, campaignID)
}

func (db *PostgresDB) ListCharactersByCampaignID(ctx context.Context, campaignID string) ([]*Character, error) {
	return db.charactersOps().ListCharactersByCampaignID(ctx, campaignID)
}

func (db *PostgresDB) UpdateCharacter(ctx context.Context, character *Character) error {
	return db.charactersOps().UpdateCharacter(ctx, character)
}

func (db *PostgresDB) DeleteCharacter(ctx context.Context, id string) error {
	return db.charactersOps().DeleteCharacter(ctx, id)
}

// ============================================================================
// CAMPAIGN CHARACTER LINKING OPERATIONS (PostgreSQL)
// ============================================================================

func (db *PostgresDB) LinkCharacterToCampaign(ctx context.Context, campaignID, characterID string) error {
	return db.charactersOps().LinkCharacterToCampaign(ctx, campaignID, characterID)
}

func (db *PostgresDB) UnlinkCharacterFromCampaign(ctx context.Context, campaignID, characterID string) error {
	return db.charactersOps().UnlinkCharacterFromCampaign(ctx, campaignID, characterID)
}

func (db *PostgresDB) ListCampaignCharacters(ctx context.Context, campaignID string) ([]*Character, error) {
	return db.charactersOps().ListCampaignCharacters(ctx, campaignID)
}
