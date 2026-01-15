package db

import (
	"context"
)

// playerModeOps returns the unified PlayerModeOperations for SQLite.
func (s *SQLiteDB) playerModeOps() *PlayerModeOperations {
	return NewPlayerModeOperations(s.Executor(), s.QueryBuilder())
}

// ============================================================================
// PLAYER JOURNAL ENTRY OPERATIONS (SQLite)
// ============================================================================

func (s *SQLiteDB) CreatePlayerJournalEntry(ctx context.Context, entry *PlayerJournalEntry) error {
	return s.playerModeOps().CreatePlayerJournalEntry(ctx, entry)
}

func (s *SQLiteDB) GetPlayerJournalEntryByID(ctx context.Context, id string) (*PlayerJournalEntry, error) {
	return s.playerModeOps().GetPlayerJournalEntryByID(ctx, id)
}

func (s *SQLiteDB) ListPlayerJournalEntries(ctx context.Context, userID string, campaignID *string) ([]*PlayerJournalEntry, error) {
	return s.playerModeOps().ListPlayerJournalEntries(ctx, userID, campaignID)
}

func (s *SQLiteDB) UpdatePlayerJournalEntry(ctx context.Context, entry *PlayerJournalEntry) error {
	return s.playerModeOps().UpdatePlayerJournalEntry(ctx, entry)
}

func (s *SQLiteDB) DeletePlayerJournalEntry(ctx context.Context, id string) error {
	return s.playerModeOps().DeletePlayerJournalEntry(ctx, id)
}

// ============================================================================
// PLAYER QUEST TRACKING OPERATIONS (SQLite)
// ============================================================================

func (s *SQLiteDB) CreatePlayerQuestTracking(ctx context.Context, quest *PlayerQuestTracking) error {
	return s.playerModeOps().CreatePlayerQuestTracking(ctx, quest)
}

func (s *SQLiteDB) GetPlayerQuestTrackingByID(ctx context.Context, id string) (*PlayerQuestTracking, error) {
	return s.playerModeOps().GetPlayerQuestTrackingByID(ctx, id)
}

func (s *SQLiteDB) ListPlayerQuestTracking(ctx context.Context, userID string, campaignID *string, status *string) ([]*PlayerQuestTracking, error) {
	return s.playerModeOps().ListPlayerQuestTracking(ctx, userID, campaignID, status)
}

func (s *SQLiteDB) UpdatePlayerQuestTracking(ctx context.Context, quest *PlayerQuestTracking) error {
	return s.playerModeOps().UpdatePlayerQuestTracking(ctx, quest)
}

func (s *SQLiteDB) DeletePlayerQuestTracking(ctx context.Context, id string) error {
	return s.playerModeOps().DeletePlayerQuestTracking(ctx, id)
}

// ============================================================================
// PLAYER NPC ENCOUNTER OPERATIONS (SQLite)
// ============================================================================

func (s *SQLiteDB) CreatePlayerNPCEncounter(ctx context.Context, encounter *PlayerNPCEncounter) error {
	return s.playerModeOps().CreatePlayerNPCEncounter(ctx, encounter)
}

func (s *SQLiteDB) GetPlayerNPCEncounterByID(ctx context.Context, id string) (*PlayerNPCEncounter, error) {
	return s.playerModeOps().GetPlayerNPCEncounterByID(ctx, id)
}

func (s *SQLiteDB) ListPlayerNPCEncounters(ctx context.Context, userID string, campaignID *string) ([]*PlayerNPCEncounter, error) {
	return s.playerModeOps().ListPlayerNPCEncounters(ctx, userID, campaignID)
}

func (s *SQLiteDB) UpdatePlayerNPCEncounter(ctx context.Context, encounter *PlayerNPCEncounter) error {
	return s.playerModeOps().UpdatePlayerNPCEncounter(ctx, encounter)
}

func (s *SQLiteDB) DeletePlayerNPCEncounter(ctx context.Context, id string) error {
	return s.playerModeOps().DeletePlayerNPCEncounter(ctx, id)
}

// ============================================================================
// PLAYER LOCATION VISIT OPERATIONS (SQLite)
// ============================================================================

func (s *SQLiteDB) CreatePlayerLocationVisit(ctx context.Context, visit *PlayerLocationVisit) error {
	return s.playerModeOps().CreatePlayerLocationVisit(ctx, visit)
}

func (s *SQLiteDB) GetPlayerLocationVisitByID(ctx context.Context, id string) (*PlayerLocationVisit, error) {
	return s.playerModeOps().GetPlayerLocationVisitByID(ctx, id)
}

func (s *SQLiteDB) ListPlayerLocationVisits(ctx context.Context, userID string, campaignID *string) ([]*PlayerLocationVisit, error) {
	return s.playerModeOps().ListPlayerLocationVisits(ctx, userID, campaignID)
}

func (s *SQLiteDB) UpdatePlayerLocationVisit(ctx context.Context, visit *PlayerLocationVisit) error {
	return s.playerModeOps().UpdatePlayerLocationVisit(ctx, visit)
}

func (s *SQLiteDB) DeletePlayerLocationVisit(ctx context.Context, id string) error {
	return s.playerModeOps().DeletePlayerLocationVisit(ctx, id)
}

// ============================================================================
// PARTY LOOT OPERATIONS (SQLite)
// ============================================================================

func (s *SQLiteDB) CreatePartyLoot(ctx context.Context, loot *PartyLoot) error {
	return s.playerModeOps().CreatePartyLoot(ctx, loot)
}

func (s *SQLiteDB) GetPartyLootByID(ctx context.Context, id string) (*PartyLoot, error) {
	return s.playerModeOps().GetPartyLootByID(ctx, id)
}

func (s *SQLiteDB) ListPartyLoot(ctx context.Context, campaignID string) ([]*PartyLoot, error) {
	return s.playerModeOps().ListPartyLoot(ctx, campaignID)
}

func (s *SQLiteDB) UpdatePartyLoot(ctx context.Context, loot *PartyLoot) error {
	return s.playerModeOps().UpdatePartyLoot(ctx, loot)
}

func (s *SQLiteDB) DeletePartyLoot(ctx context.Context, id string) error {
	return s.playerModeOps().DeletePartyLoot(ctx, id)
}

func (s *SQLiteDB) ClaimPartyLoot(ctx context.Context, lootID string, characterID string, characterName string) error {
	return s.playerModeOps().ClaimPartyLoot(ctx, lootID, characterID, characterName)
}

// ============================================================================
// CONTENT REVEAL OPERATIONS (SQLite)
// ============================================================================

func (s *SQLiteDB) CreateContentReveal(ctx context.Context, reveal *ContentReveal) error {
	return s.playerModeOps().CreateContentReveal(ctx, reveal)
}

func (s *SQLiteDB) GetContentReveal(ctx context.Context, campaignID, contentType, contentID string) (*ContentReveal, error) {
	return s.playerModeOps().GetContentReveal(ctx, campaignID, contentType, contentID)
}

func (s *SQLiteDB) ListContentReveals(ctx context.Context, campaignID string, contentType *string) ([]*ContentReveal, error) {
	return s.playerModeOps().ListContentReveals(ctx, campaignID, contentType)
}

func (s *SQLiteDB) DeleteContentReveal(ctx context.Context, id string) error {
	return s.playerModeOps().DeleteContentReveal(ctx, id)
}

// ============================================================================
// ABILITY USAGE TRACKING OPERATIONS (SQLite)
// ============================================================================

func (s *SQLiteDB) CreateAbilityUsageTracking(ctx context.Context, tracking *AbilityUsageTracking) error {
	return s.playerModeOps().CreateAbilityUsageTracking(ctx, tracking)
}

func (s *SQLiteDB) GetAbilityUsageTrackingByID(ctx context.Context, id string) (*AbilityUsageTracking, error) {
	return s.playerModeOps().GetAbilityUsageTrackingByID(ctx, id)
}

func (s *SQLiteDB) ListAbilityUsageTracking(ctx context.Context, characterID string) ([]*AbilityUsageTracking, error) {
	return s.playerModeOps().ListAbilityUsageTracking(ctx, characterID)
}

func (s *SQLiteDB) UpdateAbilityUsageTracking(ctx context.Context, tracking *AbilityUsageTracking) error {
	return s.playerModeOps().UpdateAbilityUsageTracking(ctx, tracking)
}

func (s *SQLiteDB) DeleteAbilityUsageTracking(ctx context.Context, id string) error {
	return s.playerModeOps().DeleteAbilityUsageTracking(ctx, id)
}

func (s *SQLiteDB) UseAbility(ctx context.Context, id string) error {
	return s.playerModeOps().UseAbility(ctx, id)
}

func (s *SQLiteDB) ResetAbility(ctx context.Context, id string) error {
	return s.playerModeOps().ResetAbility(ctx, id)
}

func (s *SQLiteDB) ResetAbilitiesByRechargeType(ctx context.Context, characterID string, rechargeType string) error {
	return s.playerModeOps().ResetAbilitiesByRechargeType(ctx, characterID, rechargeType)
}

// ============================================================================
// PLAYER COMBAT STATE OPERATIONS (SQLite)
// ============================================================================

func (s *SQLiteDB) CreatePlayerCombatState(ctx context.Context, state *PlayerCombatState) error {
	return s.playerModeOps().CreatePlayerCombatState(ctx, state)
}

func (s *SQLiteDB) GetPlayerCombatStateByCharacterID(ctx context.Context, characterID string) (*PlayerCombatState, error) {
	return s.playerModeOps().GetPlayerCombatStateByCharacterID(ctx, characterID)
}

func (s *SQLiteDB) UpdatePlayerCombatState(ctx context.Context, state *PlayerCombatState) error {
	return s.playerModeOps().UpdatePlayerCombatState(ctx, state)
}

func (s *SQLiteDB) UpsertPlayerCombatState(ctx context.Context, state *PlayerCombatState) error {
	return s.playerModeOps().UpsertPlayerCombatState(ctx, state)
}

func (s *SQLiteDB) DeletePlayerCombatState(ctx context.Context, characterID string) error {
	return s.playerModeOps().DeletePlayerCombatState(ctx, characterID)
}
