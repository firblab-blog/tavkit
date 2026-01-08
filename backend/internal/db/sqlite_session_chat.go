package db

import (
	"context"
	"time"
)

// =============================================================================
// Session Chat Operations (SQLite)
// =============================================================================

// CreateSessionChatMessage creates a new chat message
func (s *SQLiteDB) CreateSessionChatMessage(ctx context.Context, msg *SessionChatMessage) error {
	msg.ID = generateUUID()
	msg.CreatedAt = time.Now()

	query := `
		INSERT INTO session_chat_messages (id, campaign_id, user_id, role, content, rag_sources, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)`

	var ragSources *string
	if len(msg.RAGSources) > 0 {
		s := string(msg.RAGSources)
		ragSources = &s
	}

	_, err := s.db.ExecContext(ctx, query,
		msg.ID, msg.CampaignID, msg.UserID, msg.Role, msg.Content, ragSources, msg.CreatedAt)
	return err
}

// GetSessionChatMessages retrieves chat messages for a campaign
func (s *SQLiteDB) GetSessionChatMessages(ctx context.Context, campaignID string, limit int) ([]*SessionChatMessage, error) {
	if limit <= 0 {
		limit = 50
	}

	query := `
		SELECT id, campaign_id, user_id, role, content, rag_sources, created_at
		FROM session_chat_messages
		WHERE campaign_id = ?
		ORDER BY created_at ASC
		LIMIT ?`

	rows, err := s.db.QueryContext(ctx, query, campaignID, limit)
	if err != nil {
		return nil, err
	}
	defer func() {
		_ = rows.Close()
	}()

	var messages []*SessionChatMessage
	for rows.Next() {
		msg := &SessionChatMessage{}
		var ragSources *string
		if err := rows.Scan(&msg.ID, &msg.CampaignID, &msg.UserID, &msg.Role, &msg.Content, &ragSources, &msg.CreatedAt); err != nil {
			return nil, err
		}
		if ragSources != nil {
			msg.RAGSources = []byte(*ragSources)
		}
		messages = append(messages, msg)
	}

	return messages, rows.Err()
}

// ClearSessionChatMessages deletes all chat messages for a campaign
func (s *SQLiteDB) ClearSessionChatMessages(ctx context.Context, campaignID, userID string) error {
	query := `DELETE FROM session_chat_messages WHERE campaign_id = ? AND user_id = ?`
	_, err := s.db.ExecContext(ctx, query, campaignID, userID)
	return err
}

// GetRecentSessionChatMessages retrieves the most recent N messages for context
func (s *SQLiteDB) GetRecentSessionChatMessages(ctx context.Context, campaignID string, limit int) ([]*SessionChatMessage, error) {
	if limit <= 0 {
		limit = 10
	}

	// Get recent messages in reverse order, then reverse the result
	query := `
		SELECT id, campaign_id, user_id, role, content, rag_sources, created_at
		FROM session_chat_messages
		WHERE campaign_id = ?
		ORDER BY created_at DESC
		LIMIT ?`

	rows, err := s.db.QueryContext(ctx, query, campaignID, limit)
	if err != nil {
		return nil, err
	}
	defer func() {
		_ = rows.Close()
	}()

	var messages []*SessionChatMessage
	for rows.Next() {
		msg := &SessionChatMessage{}
		var ragSources *string
		if err := rows.Scan(&msg.ID, &msg.CampaignID, &msg.UserID, &msg.Role, &msg.Content, &ragSources, &msg.CreatedAt); err != nil {
			return nil, err
		}
		if ragSources != nil {
			msg.RAGSources = []byte(*ragSources)
		}
		messages = append(messages, msg)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Reverse to get chronological order
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	return messages, nil
}
