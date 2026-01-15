package db

import (
	"context"
	"time"
)

// SessionChatOperations provides unified session chat operations.
type SessionChatOperations struct {
	exec Executor
	qb   *QueryBuilder
}

// NewSessionChatOperations creates a new SessionChatOperations.
func NewSessionChatOperations(exec Executor, qb *QueryBuilder) *SessionChatOperations {
	return &SessionChatOperations{exec: exec, qb: qb}
}

// =============================================================================
// Session Chat Message Operations
// =============================================================================

func (ops *SessionChatOperations) CreateSessionChatMessage(ctx context.Context, msg *SessionChatMessage) error {
	msg.ID = generateUUID()
	msg.CreatedAt = time.Now()

	query := `INSERT INTO session_chat_messages (id, campaign_id, user_id, conversation_id, role, content, rag_sources, created_at)
		VALUES (` + ops.qb.Placeholders(8) + `)`

	var ragSources interface{}
	if len(msg.RAGSources) > 0 {
		ragSources = string(msg.RAGSources)
	}

	_, err := ops.exec.Exec(ctx, query,
		msg.ID, msg.CampaignID, msg.UserID, msg.ConversationID, msg.Role, msg.Content, ragSources, msg.CreatedAt)
	return err
}

func (ops *SessionChatOperations) scanSessionChatMessage(rows Rows) (*SessionChatMessage, error) {
	msg := &SessionChatMessage{}
	var ragSources *string
	if err := rows.Scan(&msg.ID, &msg.CampaignID, &msg.UserID, &msg.Role, &msg.Content, &ragSources, &msg.CreatedAt); err != nil {
		return nil, err
	}
	if ragSources != nil {
		msg.RAGSources = []byte(*ragSources)
	}
	return msg, nil
}

func (ops *SessionChatOperations) scanSessionChatMessageWithConversation(rows Rows) (*SessionChatMessage, error) {
	msg := &SessionChatMessage{}
	var ragSources *string
	if err := rows.Scan(&msg.ID, &msg.CampaignID, &msg.UserID, &msg.ConversationID, &msg.Role, &msg.Content, &ragSources, &msg.CreatedAt); err != nil {
		return nil, err
	}
	if ragSources != nil {
		msg.RAGSources = []byte(*ragSources)
	}
	return msg, nil
}

func (ops *SessionChatOperations) GetSessionChatMessages(ctx context.Context, campaignID string, limit int) ([]*SessionChatMessage, error) {
	if limit <= 0 {
		limit = 50
	}

	query := `SELECT id, campaign_id, user_id, role, content, rag_sources, created_at
		FROM session_chat_messages
		WHERE campaign_id = ` + ops.qb.Placeholder(1) + `
		ORDER BY created_at ASC
		LIMIT ` + ops.qb.Placeholder(2)

	rows, err := ops.exec.Query(ctx, query, campaignID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []*SessionChatMessage
	for rows.Next() {
		msg, err := ops.scanSessionChatMessage(rows)
		if err != nil {
			return nil, err
		}
		messages = append(messages, msg)
	}

	return messages, rows.Err()
}

func (ops *SessionChatOperations) ClearSessionChatMessages(ctx context.Context, campaignID, userID string) error {
	query := `DELETE FROM session_chat_messages WHERE campaign_id = ` + ops.qb.Placeholder(1) + ` AND user_id = ` + ops.qb.Placeholder(2)
	_, err := ops.exec.Exec(ctx, query, campaignID, userID)
	return err
}

func (ops *SessionChatOperations) GetRecentSessionChatMessages(ctx context.Context, campaignID string, limit int) ([]*SessionChatMessage, error) {
	if limit <= 0 {
		limit = 10
	}

	query := `SELECT id, campaign_id, user_id, role, content, rag_sources, created_at
		FROM session_chat_messages
		WHERE campaign_id = ` + ops.qb.Placeholder(1) + `
		ORDER BY created_at DESC
		LIMIT ` + ops.qb.Placeholder(2)

	rows, err := ops.exec.Query(ctx, query, campaignID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []*SessionChatMessage
	for rows.Next() {
		msg, err := ops.scanSessionChatMessage(rows)
		if err != nil {
			return nil, err
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

func (ops *SessionChatOperations) GetSessionChatMessagesByConversationID(ctx context.Context, conversationID string, limit int) ([]*SessionChatMessage, error) {
	if limit <= 0 {
		limit = 50
	}

	query := `SELECT id, campaign_id, user_id, conversation_id, role, content, rag_sources, created_at
		FROM session_chat_messages
		WHERE conversation_id = ` + ops.qb.Placeholder(1) + `
		ORDER BY created_at ASC
		LIMIT ` + ops.qb.Placeholder(2)

	rows, err := ops.exec.Query(ctx, query, conversationID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []*SessionChatMessage
	for rows.Next() {
		msg, err := ops.scanSessionChatMessageWithConversation(rows)
		if err != nil {
			return nil, err
		}
		messages = append(messages, msg)
	}

	return messages, rows.Err()
}

func (ops *SessionChatOperations) ClearSessionChatMessagesByConversationID(ctx context.Context, conversationID string) error {
	query := `DELETE FROM session_chat_messages WHERE conversation_id = ` + ops.qb.Placeholder(1)
	_, err := ops.exec.Exec(ctx, query, conversationID)
	return err
}

// =============================================================================
// Chat Conversation Operations
// =============================================================================

func (ops *SessionChatOperations) CreateChatConversation(ctx context.Context, conv *ChatConversation) error {
	conv.ID = generateUUID()
	now := time.Now()
	conv.CreatedAt = now
	conv.UpdatedAt = now

	if conv.Title == "" {
		conv.Title = "New Conversation"
	}

	query := `INSERT INTO chat_conversations (id, campaign_id, user_id, title, created_at, updated_at)
		VALUES (` + ops.qb.Placeholders(6) + `)`

	_, err := ops.exec.Exec(ctx, query,
		conv.ID, conv.CampaignID, conv.UserID, conv.Title, conv.CreatedAt, conv.UpdatedAt)
	return err
}

func (ops *SessionChatOperations) GetChatConversationByID(ctx context.Context, id string) (*ChatConversation, error) {
	query := `SELECT id, campaign_id, user_id, title, created_at, updated_at
		FROM chat_conversations
		WHERE id = ` + ops.qb.Placeholder(1)

	conv := &ChatConversation{}
	row := ops.exec.QueryRow(ctx, query, id)
	err := row.Scan(&conv.ID, &conv.CampaignID, &conv.UserID, &conv.Title, &conv.CreatedAt, &conv.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return conv, nil
}

func (ops *SessionChatOperations) ListChatConversationsByCampaignID(ctx context.Context, campaignID, userID string) ([]*ChatConversation, error) {
	query := `SELECT id, campaign_id, user_id, title, created_at, updated_at
		FROM chat_conversations
		WHERE campaign_id = ` + ops.qb.Placeholder(1) + ` AND user_id = ` + ops.qb.Placeholder(2) + `
		ORDER BY updated_at DESC`

	rows, err := ops.exec.Query(ctx, query, campaignID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var conversations []*ChatConversation
	for rows.Next() {
		conv := &ChatConversation{}
		if err := rows.Scan(&conv.ID, &conv.CampaignID, &conv.UserID, &conv.Title, &conv.CreatedAt, &conv.UpdatedAt); err != nil {
			return nil, err
		}
		conversations = append(conversations, conv)
	}

	return conversations, rows.Err()
}

func (ops *SessionChatOperations) UpdateChatConversation(ctx context.Context, conv *ChatConversation) error {
	conv.UpdatedAt = time.Now()

	query := `UPDATE chat_conversations
		SET title = ` + ops.qb.Placeholder(1) + `, updated_at = ` + ops.qb.Placeholder(2) + `
		WHERE id = ` + ops.qb.Placeholder(3)

	_, err := ops.exec.Exec(ctx, query, conv.Title, conv.UpdatedAt, conv.ID)
	return err
}

// DeleteChatConversation deletes a conversation.
// Note: For SQLite, messages should be deleted first by the caller if CASCADE is not reliable.
func (ops *SessionChatOperations) DeleteChatConversation(ctx context.Context, id string) error {
	query := `DELETE FROM chat_conversations WHERE id = ` + ops.qb.Placeholder(1)
	_, err := ops.exec.Exec(ctx, query, id)
	return err
}

// =============================================================================
// Chat Source Preferences Operations
// =============================================================================

func (ops *SessionChatOperations) GetChatSourcePreferences(ctx context.Context, campaignID string) (*ChatSourcePreferences, error) {
	// Use database-specific COALESCE for JSON
	emptyJSON := ops.qb.EmptyJSONArray()
	query := `SELECT id, campaign_id, user_id,
		include_npcs, include_monsters, include_locations, include_quests,
		include_items, include_encounters, include_rumors, include_taverns,
		include_merchants, include_traps, include_critters, include_chases,
		include_dialogues, include_campaign_summary, include_wiki_knowledge,
		COALESCE(enabled_wiki_sources, ` + emptyJSON + `),
		max_context_chunks, created_at, updated_at
		FROM chat_source_preferences
		WHERE campaign_id = ` + ops.qb.Placeholder(1)

	prefs := &ChatSourcePreferences{}
	row := ops.exec.QueryRow(ctx, query, campaignID)
	err := row.Scan(
		&prefs.ID, &prefs.CampaignID, &prefs.UserID,
		&prefs.IncludeNPCs, &prefs.IncludeMonsters, &prefs.IncludeLocations, &prefs.IncludeQuests,
		&prefs.IncludeItems, &prefs.IncludeEncounters, &prefs.IncludeRumors, &prefs.IncludeTaverns,
		&prefs.IncludeMerchants, &prefs.IncludeTraps, &prefs.IncludeCritters, &prefs.IncludeChases,
		&prefs.IncludeDialogues, &prefs.IncludeCampaignSummary, &prefs.IncludeWikiKnowledge,
		&prefs.EnabledWikiSources,
		&prefs.MaxContextChunks, &prefs.CreatedAt, &prefs.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return prefs, nil
}

func (ops *SessionChatOperations) UpsertChatSourcePreferences(ctx context.Context, prefs *ChatSourcePreferences) error {
	now := time.Now()
	prefs.UpdatedAt = now

	if prefs.ID == "" {
		prefs.ID = generateUUID()
		prefs.CreatedAt = now
	}

	// Default max_context_chunks to 5 if not set
	if prefs.MaxContextChunks == 0 {
		prefs.MaxContextChunks = 5
	}

	// Default enabled_wiki_sources to empty array if nil
	if prefs.EnabledWikiSources == nil {
		prefs.EnabledWikiSources = []byte("[]")
	}

	query := `INSERT INTO chat_source_preferences (
		id, campaign_id, user_id,
		include_npcs, include_monsters, include_locations, include_quests,
		include_items, include_encounters, include_rumors, include_taverns,
		include_merchants, include_traps, include_critters, include_chases,
		include_dialogues, include_campaign_summary, include_wiki_knowledge,
		enabled_wiki_sources, max_context_chunks, created_at, updated_at
	) VALUES (` + ops.qb.Placeholders(22) + `)
	ON CONFLICT (campaign_id) DO UPDATE SET
		include_npcs = ` + ops.qb.ExcludedCol("include_npcs") + `,
		include_monsters = ` + ops.qb.ExcludedCol("include_monsters") + `,
		include_locations = ` + ops.qb.ExcludedCol("include_locations") + `,
		include_quests = ` + ops.qb.ExcludedCol("include_quests") + `,
		include_items = ` + ops.qb.ExcludedCol("include_items") + `,
		include_encounters = ` + ops.qb.ExcludedCol("include_encounters") + `,
		include_rumors = ` + ops.qb.ExcludedCol("include_rumors") + `,
		include_taverns = ` + ops.qb.ExcludedCol("include_taverns") + `,
		include_merchants = ` + ops.qb.ExcludedCol("include_merchants") + `,
		include_traps = ` + ops.qb.ExcludedCol("include_traps") + `,
		include_critters = ` + ops.qb.ExcludedCol("include_critters") + `,
		include_chases = ` + ops.qb.ExcludedCol("include_chases") + `,
		include_dialogues = ` + ops.qb.ExcludedCol("include_dialogues") + `,
		include_campaign_summary = ` + ops.qb.ExcludedCol("include_campaign_summary") + `,
		include_wiki_knowledge = ` + ops.qb.ExcludedCol("include_wiki_knowledge") + `,
		enabled_wiki_sources = ` + ops.qb.ExcludedCol("enabled_wiki_sources") + `,
		max_context_chunks = ` + ops.qb.ExcludedCol("max_context_chunks") + `,
		updated_at = ` + ops.qb.ExcludedCol("updated_at")

	_, err := ops.exec.Exec(ctx, query,
		prefs.ID, prefs.CampaignID, prefs.UserID,
		prefs.IncludeNPCs, prefs.IncludeMonsters, prefs.IncludeLocations, prefs.IncludeQuests,
		prefs.IncludeItems, prefs.IncludeEncounters, prefs.IncludeRumors, prefs.IncludeTaverns,
		prefs.IncludeMerchants, prefs.IncludeTraps, prefs.IncludeCritters, prefs.IncludeChases,
		prefs.IncludeDialogues, prefs.IncludeCampaignSummary, prefs.IncludeWikiKnowledge,
		prefs.EnabledWikiSources, prefs.MaxContextChunks, prefs.CreatedAt, prefs.UpdatedAt)
	return err
}
