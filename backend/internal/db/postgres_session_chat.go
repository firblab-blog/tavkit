package db

import (
	"context"
)

// sessionChatOps returns the unified SessionChatOperations for PostgreSQL.
func (db *PostgresDB) sessionChatOps() *SessionChatOperations {
	return NewSessionChatOperations(db.Executor(), db.QueryBuilder())
}

// =============================================================================
// Session Chat Message Operations (PostgreSQL)
// =============================================================================

func (db *PostgresDB) CreateSessionChatMessage(ctx context.Context, msg *SessionChatMessage) error {
	return db.sessionChatOps().CreateSessionChatMessage(ctx, msg)
}

func (db *PostgresDB) GetSessionChatMessages(ctx context.Context, campaignID string, limit int) ([]*SessionChatMessage, error) {
	return db.sessionChatOps().GetSessionChatMessages(ctx, campaignID, limit)
}

func (db *PostgresDB) ClearSessionChatMessages(ctx context.Context, campaignID, userID string) error {
	return db.sessionChatOps().ClearSessionChatMessages(ctx, campaignID, userID)
}

func (db *PostgresDB) GetRecentSessionChatMessages(ctx context.Context, campaignID string, limit int) ([]*SessionChatMessage, error) {
	return db.sessionChatOps().GetRecentSessionChatMessages(ctx, campaignID, limit)
}

func (db *PostgresDB) GetSessionChatMessagesByConversationID(ctx context.Context, conversationID string, limit int) ([]*SessionChatMessage, error) {
	return db.sessionChatOps().GetSessionChatMessagesByConversationID(ctx, conversationID, limit)
}

func (db *PostgresDB) ClearSessionChatMessagesByConversationID(ctx context.Context, conversationID string) error {
	return db.sessionChatOps().ClearSessionChatMessagesByConversationID(ctx, conversationID)
}

// =============================================================================
// Chat Conversation Operations (PostgreSQL)
// =============================================================================

func (db *PostgresDB) CreateChatConversation(ctx context.Context, conv *ChatConversation) error {
	return db.sessionChatOps().CreateChatConversation(ctx, conv)
}

func (db *PostgresDB) GetChatConversationByID(ctx context.Context, id string) (*ChatConversation, error) {
	return db.sessionChatOps().GetChatConversationByID(ctx, id)
}

func (db *PostgresDB) ListChatConversationsByCampaignID(ctx context.Context, campaignID, userID string) ([]*ChatConversation, error) {
	return db.sessionChatOps().ListChatConversationsByCampaignID(ctx, campaignID, userID)
}

func (db *PostgresDB) UpdateChatConversation(ctx context.Context, conv *ChatConversation) error {
	return db.sessionChatOps().UpdateChatConversation(ctx, conv)
}

func (db *PostgresDB) DeleteChatConversation(ctx context.Context, id string) error {
	// PostgreSQL has proper CASCADE, just delete the conversation
	return db.sessionChatOps().DeleteChatConversation(ctx, id)
}

// =============================================================================
// Chat Source Preferences Operations (PostgreSQL)
// =============================================================================

func (db *PostgresDB) GetChatSourcePreferences(ctx context.Context, campaignID string) (*ChatSourcePreferences, error) {
	return db.sessionChatOps().GetChatSourcePreferences(ctx, campaignID)
}

func (db *PostgresDB) UpsertChatSourcePreferences(ctx context.Context, prefs *ChatSourcePreferences) error {
	return db.sessionChatOps().UpsertChatSourcePreferences(ctx, prefs)
}
