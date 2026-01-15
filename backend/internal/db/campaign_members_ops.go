package db

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"fmt"
	"time"
)

// CampaignMembersOperations provides unified campaign invite and member operations.
type CampaignMembersOperations struct {
	exec Executor
	qb   *QueryBuilder
}

// NewCampaignMembersOperations creates a new CampaignMembersOperations.
func NewCampaignMembersOperations(exec Executor, qb *QueryBuilder) *CampaignMembersOperations {
	return &CampaignMembersOperations{exec: exec, qb: qb}
}

// generateInviteCode creates a 12-character alphanumeric code
func generateInviteCode() string {
	bytes := make([]byte, 6)
	if _, err := rand.Read(bytes); err != nil {
		// Fallback to timestamp-based code if random fails
		return hex.EncodeToString([]byte(fmt.Sprintf("%d", time.Now().UnixNano()))[:6])
	}
	return hex.EncodeToString(bytes)
}

// =============================================================================
// Campaign Invite Operations
// =============================================================================

var campaignInviteColumns = []string{
	"id", "campaign_id", "code", "created_by", "uses_remaining",
	"expires_at", "is_active", "created_at",
}

func (ops *CampaignMembersOperations) CreateCampaignInvite(ctx context.Context, invite *CampaignInvite) error {
	if invite.ID == "" {
		invite.ID = generateUUID()
	}
	if invite.Code == "" {
		invite.Code = generateInviteCode()
	}
	invite.CreatedAt = time.Now()

	query := ops.qb.BuildInsert("campaign_invites", campaignInviteColumns)

	_, err := ops.exec.Exec(ctx, query,
		invite.ID,
		invite.CampaignID,
		invite.Code,
		invite.CreatedBy,
		invite.UsesRemaining,
		invite.ExpiresAt,
		invite.IsActive,
		invite.CreatedAt,
	)
	return err
}

func (ops *CampaignMembersOperations) scanCampaignInvite(row Row) (*CampaignInvite, error) {
	var invite CampaignInvite
	var usesRemaining sql.NullInt32
	var expiresAt sql.NullTime

	err := row.Scan(
		&invite.ID,
		&invite.CampaignID,
		&invite.Code,
		&invite.CreatedBy,
		&usesRemaining,
		&expiresAt,
		&invite.IsActive,
		&invite.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	if usesRemaining.Valid {
		uses := int(usesRemaining.Int32)
		invite.UsesRemaining = &uses
	}
	if expiresAt.Valid {
		invite.ExpiresAt = &expiresAt.Time
	}

	return &invite, nil
}

func (ops *CampaignMembersOperations) scanCampaignInviteFromRows(rows Rows) (*CampaignInvite, error) {
	var invite CampaignInvite
	var usesRemaining sql.NullInt32
	var expiresAt sql.NullTime

	err := rows.Scan(
		&invite.ID,
		&invite.CampaignID,
		&invite.Code,
		&invite.CreatedBy,
		&usesRemaining,
		&expiresAt,
		&invite.IsActive,
		&invite.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	if usesRemaining.Valid {
		uses := int(usesRemaining.Int32)
		invite.UsesRemaining = &uses
	}
	if expiresAt.Valid {
		invite.ExpiresAt = &expiresAt.Time
	}

	return &invite, nil
}

func (ops *CampaignMembersOperations) GetCampaignInviteByCode(ctx context.Context, code string) (*CampaignInvite, error) {
	query := `SELECT id, campaign_id, code, created_by, uses_remaining, expires_at, is_active, created_at
		FROM campaign_invites WHERE code = ` + ops.qb.Placeholder(1)

	row := ops.exec.QueryRow(ctx, query, code)
	return ops.scanCampaignInvite(row)
}

func (ops *CampaignMembersOperations) ListCampaignInvites(ctx context.Context, campaignID string) ([]*CampaignInvite, error) {
	query := `SELECT id, campaign_id, code, created_by, uses_remaining, expires_at, is_active, created_at
		FROM campaign_invites WHERE campaign_id = ` + ops.qb.Placeholder(1) + ` ORDER BY created_at DESC`

	rows, err := ops.exec.Query(ctx, query, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var invites []*CampaignInvite
	for rows.Next() {
		invite, err := ops.scanCampaignInviteFromRows(rows)
		if err != nil {
			return nil, err
		}
		invites = append(invites, invite)
	}

	return invites, rows.Err()
}

func (ops *CampaignMembersOperations) DecrementInviteUses(ctx context.Context, inviteID string) error {
	query := `UPDATE campaign_invites
		SET uses_remaining = uses_remaining - 1
		WHERE id = ` + ops.qb.Placeholder(1) + ` AND uses_remaining IS NOT NULL AND uses_remaining > 0`
	_, err := ops.exec.Exec(ctx, query, inviteID)
	return err
}

func (ops *CampaignMembersOperations) DeactivateCampaignInvite(ctx context.Context, campaignID, code string) error {
	query := `UPDATE campaign_invites SET is_active = ` + ops.qb.BoolLiteral(false) +
		` WHERE campaign_id = ` + ops.qb.Placeholder(1) + ` AND code = ` + ops.qb.Placeholder(2)
	_, err := ops.exec.Exec(ctx, query, campaignID, code)
	return err
}

// =============================================================================
// Campaign Member Operations
// =============================================================================

var campaignMemberColumns = []string{
	"id", "campaign_id", "user_id", "role", "character_id",
	"invite_code_used", "joined_at",
}

func (ops *CampaignMembersOperations) CreateCampaignMember(ctx context.Context, member *CampaignMember) error {
	if member.ID == "" {
		member.ID = generateUUID()
	}
	if member.Role == "" {
		member.Role = "player"
	}
	member.JoinedAt = time.Now()

	query := ops.qb.BuildInsert("campaign_members", campaignMemberColumns)

	_, err := ops.exec.Exec(ctx, query,
		member.ID,
		member.CampaignID,
		member.UserID,
		member.Role,
		member.CharacterID,
		member.InviteCodeUsed,
		member.JoinedAt,
	)
	return err
}

func (ops *CampaignMembersOperations) scanCampaignMember(row Row) (*CampaignMember, error) {
	var member CampaignMember
	var characterID, inviteCodeUsed sql.NullString

	err := row.Scan(
		&member.ID,
		&member.CampaignID,
		&member.UserID,
		&member.Role,
		&characterID,
		&inviteCodeUsed,
		&member.JoinedAt,
	)
	if err != nil {
		return nil, err
	}

	if characterID.Valid {
		member.CharacterID = &characterID.String
	}
	if inviteCodeUsed.Valid {
		member.InviteCodeUsed = &inviteCodeUsed.String
	}

	return &member, nil
}

func (ops *CampaignMembersOperations) scanCampaignMemberFromRows(rows Rows) (*CampaignMember, error) {
	var member CampaignMember
	var characterID, inviteCodeUsed sql.NullString

	err := rows.Scan(
		&member.ID,
		&member.CampaignID,
		&member.UserID,
		&member.Role,
		&characterID,
		&inviteCodeUsed,
		&member.JoinedAt,
	)
	if err != nil {
		return nil, err
	}

	if characterID.Valid {
		member.CharacterID = &characterID.String
	}
	if inviteCodeUsed.Valid {
		member.InviteCodeUsed = &inviteCodeUsed.String
	}

	return &member, nil
}

func (ops *CampaignMembersOperations) GetCampaignMember(ctx context.Context, campaignID, userID string) (*CampaignMember, error) {
	query := `SELECT id, campaign_id, user_id, role, character_id, invite_code_used, joined_at
		FROM campaign_members WHERE campaign_id = ` + ops.qb.Placeholder(1) + ` AND user_id = ` + ops.qb.Placeholder(2)

	row := ops.exec.QueryRow(ctx, query, campaignID, userID)
	return ops.scanCampaignMember(row)
}

func (ops *CampaignMembersOperations) ListCampaignMembers(ctx context.Context, campaignID string) ([]*CampaignMember, error) {
	query := `SELECT id, campaign_id, user_id, role, character_id, invite_code_used, joined_at
		FROM campaign_members WHERE campaign_id = ` + ops.qb.Placeholder(1) + ` ORDER BY joined_at`

	rows, err := ops.exec.Query(ctx, query, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []*CampaignMember
	for rows.Next() {
		member, err := ops.scanCampaignMemberFromRows(rows)
		if err != nil {
			return nil, err
		}
		members = append(members, member)
	}

	return members, rows.Err()
}

func (ops *CampaignMembersOperations) ListUserMemberships(ctx context.Context, userID string) ([]*CampaignMember, error) {
	query := `SELECT id, campaign_id, user_id, role, character_id, invite_code_used, joined_at
		FROM campaign_members WHERE user_id = ` + ops.qb.Placeholder(1) + ` ORDER BY joined_at DESC`

	rows, err := ops.exec.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer func() {
		if err := rows.Close(); err != nil {
			// Log error but don't override return value
		}
	}()

	var members []*CampaignMember
	for rows.Next() {
		member, err := ops.scanCampaignMemberFromRows(rows)
		if err != nil {
			return nil, err
		}
		members = append(members, member)
	}

	return members, rows.Err()
}

func (ops *CampaignMembersOperations) DeleteCampaignMember(ctx context.Context, campaignID, userID string) error {
	query := `DELETE FROM campaign_members WHERE campaign_id = ` + ops.qb.Placeholder(1) + ` AND user_id = ` + ops.qb.Placeholder(2)
	_, err := ops.exec.Exec(ctx, query, campaignID, userID)
	return err
}

func (ops *CampaignMembersOperations) UpdateCampaignMemberCharacter(ctx context.Context, campaignID, userID string, characterID *string) error {
	query := `UPDATE campaign_members SET character_id = ` + ops.qb.Placeholder(1) +
		` WHERE campaign_id = ` + ops.qb.Placeholder(2) + ` AND user_id = ` + ops.qb.Placeholder(3)
	_, err := ops.exec.Exec(ctx, query, characterID, campaignID, userID)
	return err
}

// =============================================================================
// Combined Campaign + Membership Queries
// =============================================================================

// GetCampaignsWithMembership returns all campaigns a user has access to.
// This includes: campaigns they own, local player campaigns, and campaigns they've joined.
func (ops *CampaignMembersOperations) GetCampaignsWithMembership(ctx context.Context, userID string) ([]*CampaignWithMembership, error) {
	p1 := ops.qb.Placeholder(1)

	// Get owned campaigns (role='owner') and local player campaigns (role='player')
	ownedQuery := `SELECT c.id, c.user_id, c.name, c.description, c.game_system, c.theme, c.tone,
		c.setting, c.factions, c.history, c.magic_level, c.tech_level, c.notes, c.role,
		c.is_active, c.created_at, c.updated_at,
		CASE WHEN c.role = 'owner' THEN 'owner' ELSE 'player_local' END as membership_type,
		NULL as gm_name, NULL as member_character_id
		FROM campaigns c
		WHERE c.user_id = ` + p1

	// Combine with UNION ALL
	// Note: For SQLite, we use positional placeholders, so we need p2 for the second query
	p2 := ops.qb.Placeholder(2)

	// Get joined campaigns (via campaign_members)
	joinedQuery := `SELECT c.id, c.user_id, c.name, c.description, c.game_system, c.theme, c.tone,
		c.setting, c.factions, c.history, c.magic_level, c.tech_level, c.notes, c.role,
		c.is_active, c.created_at, c.updated_at,
		'player_joined' as membership_type,
		u.display_name as gm_name, m.character_id as member_character_id
		FROM campaigns c
		JOIN campaign_members m ON c.id = m.campaign_id
		LEFT JOIN users u ON c.user_id = u.id
		WHERE m.user_id = ` + p2

	query := ownedQuery + " UNION ALL " + joinedQuery + " ORDER BY is_active DESC, updated_at DESC"

	// Pass userID twice - once for each placeholder in the UNION query
	rows, err := ops.exec.Query(ctx, query, userID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var campaigns []*CampaignWithMembership
	for rows.Next() {
		cwm, err := ops.scanCampaignWithMembershipFromRows(rows)
		if err != nil {
			return nil, err
		}
		campaigns = append(campaigns, cwm)
	}

	return campaigns, rows.Err()
}

func (ops *CampaignMembersOperations) scanCampaignWithMembershipFromRows(rows Rows) (*CampaignWithMembership, error) {
	var cwm CampaignWithMembership
	var description, theme, tone, history, magicLevel, techLevel, notes sql.NullString
	var setting, factions []byte
	var membershipType string
	var gmName, memberCharacterID sql.NullString

	err := rows.Scan(
		&cwm.ID,
		&cwm.UserID,
		&cwm.Name,
		&description,
		&cwm.Campaign.GameSystem,
		&theme,
		&tone,
		&setting,
		&factions,
		&history,
		&magicLevel,
		&techLevel,
		&notes,
		&cwm.Campaign.Role,
		&cwm.Campaign.IsActive,
		&cwm.Campaign.CreatedAt,
		&cwm.Campaign.UpdatedAt,
		&membershipType,
		&gmName,
		&memberCharacterID,
	)
	if err != nil {
		return nil, err
	}

	// Handle nullable strings
	if description.Valid {
		cwm.Campaign.Description = &description.String
	}
	if theme.Valid {
		cwm.Campaign.Theme = &theme.String
	}
	if tone.Valid {
		cwm.Campaign.Tone = &tone.String
	}
	if history.Valid {
		cwm.Campaign.History = &history.String
	}
	if magicLevel.Valid {
		cwm.Campaign.MagicLevel = &magicLevel.String
	}
	if techLevel.Valid {
		cwm.Campaign.TechLevel = &techLevel.String
	}
	if notes.Valid {
		cwm.Campaign.Notes = &notes.String
	}
	if gmName.Valid {
		cwm.GMName = &gmName.String
	}
	if memberCharacterID.Valid {
		cwm.CharacterID = &memberCharacterID.String
	}

	// Set membership type
	cwm.MembershipType = CampaignMembershipType(membershipType)

	// Parse JSON fields
	if len(setting) > 0 {
		cwm.Campaign.Setting = setting
	}
	if len(factions) > 0 {
		cwm.Campaign.Factions = factions
	}

	return &cwm, nil
}
