package db

import (
	"context"
)

// playerModeOps returns the unified PlayerModeOperations for PostgreSQL.
func (db *PostgresDB) playerModeOps() *PlayerModeOperations {
	return NewPlayerModeOperations(db.Executor(), db.QueryBuilder())
}

// ============================================================================
// PLAYER JOURNAL ENTRY OPERATIONS (PostgreSQL)
// ============================================================================

func (db *PostgresDB) CreatePlayerJournalEntry(ctx context.Context, entry *PlayerJournalEntry) error {
	return db.playerModeOps().CreatePlayerJournalEntry(ctx, entry)
}

func (db *PostgresDB) GetPlayerJournalEntryByID(ctx context.Context, id string) (*PlayerJournalEntry, error) {
	return db.playerModeOps().GetPlayerJournalEntryByID(ctx, id)
}

func (db *PostgresDB) ListPlayerJournalEntries(ctx context.Context, userID string, campaignID *string) ([]*PlayerJournalEntry, error) {
	return db.playerModeOps().ListPlayerJournalEntries(ctx, userID, campaignID)
}

func (db *PostgresDB) UpdatePlayerJournalEntry(ctx context.Context, entry *PlayerJournalEntry) error {
	return db.playerModeOps().UpdatePlayerJournalEntry(ctx, entry)
}

func (db *PostgresDB) DeletePlayerJournalEntry(ctx context.Context, id string) error {
	return db.playerModeOps().DeletePlayerJournalEntry(ctx, id)
}

// ============================================================================
// PLAYER QUEST TRACKING OPERATIONS (PostgreSQL)
// ============================================================================

func (db *PostgresDB) CreatePlayerQuestTracking(ctx context.Context, quest *PlayerQuestTracking) error {
	return db.playerModeOps().CreatePlayerQuestTracking(ctx, quest)
}

func (db *PostgresDB) GetPlayerQuestTrackingByID(ctx context.Context, id string) (*PlayerQuestTracking, error) {
	return db.playerModeOps().GetPlayerQuestTrackingByID(ctx, id)
}

func (db *PostgresDB) ListPlayerQuestTracking(ctx context.Context, userID string, campaignID *string, status *string) ([]*PlayerQuestTracking, error) {
	return db.playerModeOps().ListPlayerQuestTracking(ctx, userID, campaignID, status)
}

func (db *PostgresDB) UpdatePlayerQuestTracking(ctx context.Context, quest *PlayerQuestTracking) error {
	return db.playerModeOps().UpdatePlayerQuestTracking(ctx, quest)
}

func (db *PostgresDB) DeletePlayerQuestTracking(ctx context.Context, id string) error {
	return db.playerModeOps().DeletePlayerQuestTracking(ctx, id)
}

// ============================================================================
// PLAYER NPC ENCOUNTER OPERATIONS (PostgreSQL)
// ============================================================================

func (db *PostgresDB) CreatePlayerNPCEncounter(ctx context.Context, encounter *PlayerNPCEncounter) error {
	return db.playerModeOps().CreatePlayerNPCEncounter(ctx, encounter)
}

func (db *PostgresDB) GetPlayerNPCEncounterByID(ctx context.Context, id string) (*PlayerNPCEncounter, error) {
	return db.playerModeOps().GetPlayerNPCEncounterByID(ctx, id)
}

func (db *PostgresDB) ListPlayerNPCEncounters(ctx context.Context, userID string, campaignID *string) ([]*PlayerNPCEncounter, error) {
	return db.playerModeOps().ListPlayerNPCEncounters(ctx, userID, campaignID)
}

func (db *PostgresDB) UpdatePlayerNPCEncounter(ctx context.Context, encounter *PlayerNPCEncounter) error {
	return db.playerModeOps().UpdatePlayerNPCEncounter(ctx, encounter)
}

func (db *PostgresDB) DeletePlayerNPCEncounter(ctx context.Context, id string) error {
	return db.playerModeOps().DeletePlayerNPCEncounter(ctx, id)
}

// ============================================================================
// PLAYER LOCATION VISIT OPERATIONS (PostgreSQL)
// ============================================================================

func (db *PostgresDB) CreatePlayerLocationVisit(ctx context.Context, visit *PlayerLocationVisit) error {
	return db.playerModeOps().CreatePlayerLocationVisit(ctx, visit)
}

func (db *PostgresDB) GetPlayerLocationVisitByID(ctx context.Context, id string) (*PlayerLocationVisit, error) {
	return db.playerModeOps().GetPlayerLocationVisitByID(ctx, id)
}

func (db *PostgresDB) ListPlayerLocationVisits(ctx context.Context, userID string, campaignID *string) ([]*PlayerLocationVisit, error) {
	return db.playerModeOps().ListPlayerLocationVisits(ctx, userID, campaignID)
}

func (db *PostgresDB) UpdatePlayerLocationVisit(ctx context.Context, visit *PlayerLocationVisit) error {
	return db.playerModeOps().UpdatePlayerLocationVisit(ctx, visit)
}

func (db *PostgresDB) DeletePlayerLocationVisit(ctx context.Context, id string) error {
	return db.playerModeOps().DeletePlayerLocationVisit(ctx, id)
}

// ============================================================================
// PARTY LOOT OPERATIONS (PostgreSQL)
// ============================================================================

func (db *PostgresDB) CreatePartyLoot(ctx context.Context, loot *PartyLoot) error {
	return db.playerModeOps().CreatePartyLoot(ctx, loot)
}

func (db *PostgresDB) GetPartyLootByID(ctx context.Context, id string) (*PartyLoot, error) {
	return db.playerModeOps().GetPartyLootByID(ctx, id)
}

func (db *PostgresDB) ListPartyLoot(ctx context.Context, campaignID string) ([]*PartyLoot, error) {
	return db.playerModeOps().ListPartyLoot(ctx, campaignID)
}

func (db *PostgresDB) UpdatePartyLoot(ctx context.Context, loot *PartyLoot) error {
	return db.playerModeOps().UpdatePartyLoot(ctx, loot)
}

func (db *PostgresDB) DeletePartyLoot(ctx context.Context, id string) error {
	return db.playerModeOps().DeletePartyLoot(ctx, id)
}

func (db *PostgresDB) ClaimPartyLoot(ctx context.Context, lootID string, characterID string, characterName string) error {
	return db.playerModeOps().ClaimPartyLoot(ctx, lootID, characterID, characterName)
}

// ============================================================================
// CONTENT REVEAL OPERATIONS (PostgreSQL)
// ============================================================================

func (db *PostgresDB) CreateContentReveal(ctx context.Context, reveal *ContentReveal) error {
	return db.playerModeOps().CreateContentReveal(ctx, reveal)
}

func (db *PostgresDB) GetContentReveal(ctx context.Context, campaignID, contentType, contentID string) (*ContentReveal, error) {
	return db.playerModeOps().GetContentReveal(ctx, campaignID, contentType, contentID)
}

func (db *PostgresDB) ListContentReveals(ctx context.Context, campaignID string, contentType *string) ([]*ContentReveal, error) {
	return db.playerModeOps().ListContentReveals(ctx, campaignID, contentType)
}

func (db *PostgresDB) DeleteContentReveal(ctx context.Context, id string) error {
	return db.playerModeOps().DeleteContentReveal(ctx, id)
}

// ============================================================================
// ABILITY USAGE TRACKING OPERATIONS (PostgreSQL)
// ============================================================================

func (db *PostgresDB) CreateAbilityUsageTracking(ctx context.Context, tracking *AbilityUsageTracking) error {
	return db.playerModeOps().CreateAbilityUsageTracking(ctx, tracking)
}

func (db *PostgresDB) GetAbilityUsageTrackingByID(ctx context.Context, id string) (*AbilityUsageTracking, error) {
	return db.playerModeOps().GetAbilityUsageTrackingByID(ctx, id)
}

func (db *PostgresDB) ListAbilityUsageTracking(ctx context.Context, characterID string) ([]*AbilityUsageTracking, error) {
	return db.playerModeOps().ListAbilityUsageTracking(ctx, characterID)
}

func (db *PostgresDB) UpdateAbilityUsageTracking(ctx context.Context, tracking *AbilityUsageTracking) error {
	return db.playerModeOps().UpdateAbilityUsageTracking(ctx, tracking)
}

func (db *PostgresDB) DeleteAbilityUsageTracking(ctx context.Context, id string) error {
	return db.playerModeOps().DeleteAbilityUsageTracking(ctx, id)
}

func (db *PostgresDB) UseAbility(ctx context.Context, id string) error {
	return db.playerModeOps().UseAbility(ctx, id)
}

func (db *PostgresDB) ResetAbility(ctx context.Context, id string) error {
	return db.playerModeOps().ResetAbility(ctx, id)
}

func (db *PostgresDB) ResetAbilitiesByRechargeType(ctx context.Context, characterID string, rechargeType string) error {
	return db.playerModeOps().ResetAbilitiesByRechargeType(ctx, characterID, rechargeType)
}

// ============================================================================
// PLAYER COMBAT STATE OPERATIONS (PostgreSQL)
// ============================================================================

func (db *PostgresDB) CreatePlayerCombatState(ctx context.Context, state *PlayerCombatState) error {
	return db.playerModeOps().CreatePlayerCombatState(ctx, state)
}

func (db *PostgresDB) GetPlayerCombatStateByCharacterID(ctx context.Context, characterID string) (*PlayerCombatState, error) {
	return db.playerModeOps().GetPlayerCombatStateByCharacterID(ctx, characterID)
}

func (db *PostgresDB) UpdatePlayerCombatState(ctx context.Context, state *PlayerCombatState) error {
	return db.playerModeOps().UpdatePlayerCombatState(ctx, state)
}

func (db *PostgresDB) UpsertPlayerCombatState(ctx context.Context, state *PlayerCombatState) error {
	return db.playerModeOps().UpsertPlayerCombatState(ctx, state)
}

func (db *PostgresDB) DeletePlayerCombatState(ctx context.Context, characterID string) error {
	return db.playerModeOps().DeletePlayerCombatState(ctx, characterID)
}
