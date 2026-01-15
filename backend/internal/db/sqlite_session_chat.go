package db

import (
	"context"
)

// sessionChatOps returns the unified SessionChatOperations for SQLite.
func (s *SQLiteDB) sessionChatOps() *SessionChatOperations {
	return NewSessionChatOperations(s.Executor(), s.QueryBuilder())
}

// =============================================================================
// Session Chat Message Operations (SQLite)
// =============================================================================

func (s *SQLiteDB) CreateSessionChatMessage(ctx context.Context, msg *SessionChatMessage) error {
	return s.sessionChatOps().CreateSessionChatMessage(ctx, msg)
}

func (s *SQLiteDB) GetSessionChatMessages(ctx context.Context, campaignID string, limit int) ([]*SessionChatMessage, error) {
	return s.sessionChatOps().GetSessionChatMessages(ctx, campaignID, limit)
}

func (s *SQLiteDB) ClearSessionChatMessages(ctx context.Context, campaignID, userID string) error {
	return s.sessionChatOps().ClearSessionChatMessages(ctx, campaignID, userID)
}

func (s *SQLiteDB) GetRecentSessionChatMessages(ctx context.Context, campaignID string, limit int) ([]*SessionChatMessage, error) {
	return s.sessionChatOps().GetRecentSessionChatMessages(ctx, campaignID, limit)
}

func (s *SQLiteDB) GetSessionChatMessagesByConversationID(ctx context.Context, conversationID string, limit int) ([]*SessionChatMessage, error) {
	return s.sessionChatOps().GetSessionChatMessagesByConversationID(ctx, conversationID, limit)
}

func (s *SQLiteDB) ClearSessionChatMessagesByConversationID(ctx context.Context, conversationID string) error {
	return s.sessionChatOps().ClearSessionChatMessagesByConversationID(ctx, conversationID)
}

// =============================================================================
// Chat Conversation Operations (SQLite)
// =============================================================================

func (s *SQLiteDB) CreateChatConversation(ctx context.Context, conv *ChatConversation) error {
	return s.sessionChatOps().CreateChatConversation(ctx, conv)
}

func (s *SQLiteDB) GetChatConversationByID(ctx context.Context, id string) (*ChatConversation, error) {
	return s.sessionChatOps().GetChatConversationByID(ctx, id)
}

func (s *SQLiteDB) ListChatConversationsByCampaignID(ctx context.Context, campaignID, userID string) ([]*ChatConversation, error) {
	return s.sessionChatOps().ListChatConversationsByCampaignID(ctx, campaignID, userID)
}

func (s *SQLiteDB) UpdateChatConversation(ctx context.Context, conv *ChatConversation) error {
	return s.sessionChatOps().UpdateChatConversation(ctx, conv)
}

func (s *SQLiteDB) DeleteChatConversation(ctx context.Context, id string) error {
	// SQLite doesn't always enforce CASCADE, so delete messages first
	if err := s.sessionChatOps().ClearSessionChatMessagesByConversationID(ctx, id); err != nil {
		return err
	}
	return s.sessionChatOps().DeleteChatConversation(ctx, id)
}

// =============================================================================
// Chat Source Preferences Operations (SQLite)
// =============================================================================

func (s *SQLiteDB) GetChatSourcePreferences(ctx context.Context, campaignID string) (*ChatSourcePreferences, error) {
	return s.sessionChatOps().GetChatSourcePreferences(ctx, campaignID)
}

func (s *SQLiteDB) UpsertChatSourcePreferences(ctx context.Context, prefs *ChatSourcePreferences) error {
	return s.sessionChatOps().UpsertChatSourcePreferences(ctx, prefs)
}
