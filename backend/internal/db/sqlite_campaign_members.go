package db

import (
	"context"
)

// campaignMembersOps returns the unified CampaignMembersOperations for SQLite.
func (s *SQLiteDB) campaignMembersOps() *CampaignMembersOperations {
	return NewCampaignMembersOperations(s.Executor(), s.QueryBuilder())
}

// =============================================================================
// Campaign Invite Operations (SQLite)
// =============================================================================

func (s *SQLiteDB) CreateCampaignInvite(ctx context.Context, invite *CampaignInvite) error {
	return s.campaignMembersOps().CreateCampaignInvite(ctx, invite)
}

func (s *SQLiteDB) GetCampaignInviteByCode(ctx context.Context, code string) (*CampaignInvite, error) {
	return s.campaignMembersOps().GetCampaignInviteByCode(ctx, code)
}

func (s *SQLiteDB) ListCampaignInvites(ctx context.Context, campaignID string) ([]*CampaignInvite, error) {
	return s.campaignMembersOps().ListCampaignInvites(ctx, campaignID)
}

func (s *SQLiteDB) DecrementInviteUses(ctx context.Context, inviteID string) error {
	return s.campaignMembersOps().DecrementInviteUses(ctx, inviteID)
}

func (s *SQLiteDB) DeactivateCampaignInvite(ctx context.Context, campaignID, code string) error {
	return s.campaignMembersOps().DeactivateCampaignInvite(ctx, campaignID, code)
}

// =============================================================================
// Campaign Member Operations (SQLite)
// =============================================================================

func (s *SQLiteDB) CreateCampaignMember(ctx context.Context, member *CampaignMember) error {
	return s.campaignMembersOps().CreateCampaignMember(ctx, member)
}

func (s *SQLiteDB) GetCampaignMember(ctx context.Context, campaignID, userID string) (*CampaignMember, error) {
	return s.campaignMembersOps().GetCampaignMember(ctx, campaignID, userID)
}

func (s *SQLiteDB) ListCampaignMembers(ctx context.Context, campaignID string) ([]*CampaignMember, error) {
	return s.campaignMembersOps().ListCampaignMembers(ctx, campaignID)
}

func (s *SQLiteDB) ListUserMemberships(ctx context.Context, userID string) ([]*CampaignMember, error) {
	return s.campaignMembersOps().ListUserMemberships(ctx, userID)
}

func (s *SQLiteDB) DeleteCampaignMember(ctx context.Context, campaignID, userID string) error {
	return s.campaignMembersOps().DeleteCampaignMember(ctx, campaignID, userID)
}

func (s *SQLiteDB) UpdateCampaignMemberCharacter(ctx context.Context, campaignID, userID string, characterID *string) error {
	return s.campaignMembersOps().UpdateCampaignMemberCharacter(ctx, campaignID, userID, characterID)
}

// =============================================================================
// Combined Campaign + Membership Queries (SQLite)
// =============================================================================

func (s *SQLiteDB) GetCampaignsWithMembership(ctx context.Context, userID string) ([]*CampaignWithMembership, error) {
	return s.campaignMembersOps().GetCampaignsWithMembership(ctx, userID)
}
