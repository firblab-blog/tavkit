package db

import (
	"context"
)

// campaignMembersOps returns the unified CampaignMembersOperations for PostgreSQL.
func (db *PostgresDB) campaignMembersOps() *CampaignMembersOperations {
	return NewCampaignMembersOperations(db.Executor(), db.QueryBuilder())
}

// =============================================================================
// Campaign Invite Operations (PostgreSQL)
// =============================================================================

func (db *PostgresDB) CreateCampaignInvite(ctx context.Context, invite *CampaignInvite) error {
	return db.campaignMembersOps().CreateCampaignInvite(ctx, invite)
}

func (db *PostgresDB) GetCampaignInviteByCode(ctx context.Context, code string) (*CampaignInvite, error) {
	return db.campaignMembersOps().GetCampaignInviteByCode(ctx, code)
}

func (db *PostgresDB) ListCampaignInvites(ctx context.Context, campaignID string) ([]*CampaignInvite, error) {
	return db.campaignMembersOps().ListCampaignInvites(ctx, campaignID)
}

func (db *PostgresDB) DecrementInviteUses(ctx context.Context, inviteID string) error {
	return db.campaignMembersOps().DecrementInviteUses(ctx, inviteID)
}

func (db *PostgresDB) DeactivateCampaignInvite(ctx context.Context, campaignID, code string) error {
	return db.campaignMembersOps().DeactivateCampaignInvite(ctx, campaignID, code)
}

// =============================================================================
// Campaign Member Operations (PostgreSQL)
// =============================================================================

func (db *PostgresDB) CreateCampaignMember(ctx context.Context, member *CampaignMember) error {
	return db.campaignMembersOps().CreateCampaignMember(ctx, member)
}

func (db *PostgresDB) GetCampaignMember(ctx context.Context, campaignID, userID string) (*CampaignMember, error) {
	return db.campaignMembersOps().GetCampaignMember(ctx, campaignID, userID)
}

func (db *PostgresDB) ListCampaignMembers(ctx context.Context, campaignID string) ([]*CampaignMember, error) {
	return db.campaignMembersOps().ListCampaignMembers(ctx, campaignID)
}

func (db *PostgresDB) ListUserMemberships(ctx context.Context, userID string) ([]*CampaignMember, error) {
	return db.campaignMembersOps().ListUserMemberships(ctx, userID)
}

func (db *PostgresDB) DeleteCampaignMember(ctx context.Context, campaignID, userID string) error {
	return db.campaignMembersOps().DeleteCampaignMember(ctx, campaignID, userID)
}

func (db *PostgresDB) UpdateCampaignMemberCharacter(ctx context.Context, campaignID, userID string, characterID *string) error {
	return db.campaignMembersOps().UpdateCampaignMemberCharacter(ctx, campaignID, userID, characterID)
}

// =============================================================================
// Combined Campaign + Membership Queries (PostgreSQL)
// =============================================================================

func (db *PostgresDB) GetCampaignsWithMembership(ctx context.Context, userID string) ([]*CampaignWithMembership, error) {
	return db.campaignMembersOps().GetCampaignsWithMembership(ctx, userID)
}
