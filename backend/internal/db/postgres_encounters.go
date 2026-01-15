package db

import (
	"context"
)

// encountersOps returns the unified EncountersOperations for PostgreSQL.
func (db *PostgresDB) encountersOps() *EncountersOperations {
	return NewEncountersOperations(db.Executor(), db.QueryBuilder())
}

// ============================================================================
// SOCIAL ENCOUNTER OPERATIONS (PostgreSQL)
// ============================================================================

func (db *PostgresDB) CreateSocialEncounter(ctx context.Context, encounter *SocialEncounter) error {
	return db.encountersOps().CreateSocialEncounter(ctx, encounter)
}

func (db *PostgresDB) GetSocialEncounterByID(ctx context.Context, id string) (*SocialEncounter, error) {
	return db.encountersOps().GetSocialEncounterByID(ctx, id)
}

func (db *PostgresDB) GetSocialEncounterBySessionID(ctx context.Context, sessionID string) (*SocialEncounter, error) {
	return db.encountersOps().GetSocialEncounterBySessionID(ctx, sessionID)
}

func (db *PostgresDB) UpdateSocialEncounter(ctx context.Context, encounter *SocialEncounter) error {
	return db.encountersOps().UpdateSocialEncounter(ctx, encounter)
}

func (db *PostgresDB) DeleteSocialEncounter(ctx context.Context, id string) error {
	return db.encountersOps().DeleteSocialEncounter(ctx, id)
}

func (db *PostgresDB) CreateSocialCheck(ctx context.Context, check *SocialCheck) error {
	return db.encountersOps().CreateSocialCheck(ctx, check)
}

func (db *PostgresDB) ListSocialChecks(ctx context.Context, encounterID string) ([]*SocialCheck, error) {
	return db.encountersOps().ListSocialChecks(ctx, encounterID)
}

// ============================================================================
// TAVERN ENCOUNTER OPERATIONS (PostgreSQL)
// ============================================================================

func (db *PostgresDB) CreateTavernEncounter(ctx context.Context, encounter *TavernEncounter) error {
	return db.encountersOps().CreateTavernEncounter(ctx, encounter)
}

func (db *PostgresDB) GetTavernEncounterByID(ctx context.Context, id string) (*TavernEncounter, error) {
	return db.encountersOps().GetTavernEncounterByID(ctx, id)
}

func (db *PostgresDB) GetTavernEncounterBySessionID(ctx context.Context, sessionID string) (*TavernEncounter, error) {
	return db.encountersOps().GetTavernEncounterBySessionID(ctx, sessionID)
}

func (db *PostgresDB) UpdateTavernEncounter(ctx context.Context, encounter *TavernEncounter) error {
	return db.encountersOps().UpdateTavernEncounter(ctx, encounter)
}

func (db *PostgresDB) DeleteTavernEncounter(ctx context.Context, id string) error {
	return db.encountersOps().DeleteTavernEncounter(ctx, id)
}

func (db *PostgresDB) CreatePatronInteraction(ctx context.Context, patron *PatronInteraction) error {
	return db.encountersOps().CreatePatronInteraction(ctx, patron)
}

func (db *PostgresDB) GetPatronInteraction(ctx context.Context, id string) (*PatronInteraction, error) {
	return db.encountersOps().GetPatronInteraction(ctx, id)
}

func (db *PostgresDB) ListPatronInteractions(ctx context.Context, encounterID string) ([]*PatronInteraction, error) {
	return db.encountersOps().ListPatronInteractions(ctx, encounterID)
}

func (db *PostgresDB) UpdatePatronInteraction(ctx context.Context, patron *PatronInteraction) error {
	return db.encountersOps().UpdatePatronInteraction(ctx, patron)
}

func (db *PostgresDB) CreateRumorTracking(ctx context.Context, rumor *RumorTracking) error {
	return db.encountersOps().CreateRumorTracking(ctx, rumor)
}

func (db *PostgresDB) ListRumorTracking(ctx context.Context, encounterID string) ([]*RumorTracking, error) {
	return db.encountersOps().ListRumorTracking(ctx, encounterID)
}

func (db *PostgresDB) UpdateRumorTracking(ctx context.Context, rumor *RumorTracking) error {
	return db.encountersOps().UpdateRumorTracking(ctx, rumor)
}

func (db *PostgresDB) CreateTavernTab(ctx context.Context, tab *TavernTab) error {
	return db.encountersOps().CreateTavernTab(ctx, tab)
}

func (db *PostgresDB) ListTavernTabs(ctx context.Context, encounterID string) ([]*TavernTab, error) {
	return db.encountersOps().ListTavernTabs(ctx, encounterID)
}

func (db *PostgresDB) UpdateTavernTab(ctx context.Context, tab *TavernTab) error {
	return db.encountersOps().UpdateTavernTab(ctx, tab)
}

// ============================================================================
// SHOPPING ENCOUNTER OPERATIONS (PostgreSQL)
// ============================================================================

func (db *PostgresDB) CreateShoppingEncounter(ctx context.Context, encounter *ShoppingEncounter) error {
	return db.encountersOps().CreateShoppingEncounter(ctx, encounter)
}

func (db *PostgresDB) GetShoppingEncounterByID(ctx context.Context, id string) (*ShoppingEncounter, error) {
	return db.encountersOps().GetShoppingEncounterByID(ctx, id)
}

func (db *PostgresDB) GetShoppingEncounterBySessionID(ctx context.Context, sessionID string) (*ShoppingEncounter, error) {
	return db.encountersOps().GetShoppingEncounterBySessionID(ctx, sessionID)
}

func (db *PostgresDB) UpdateShoppingEncounter(ctx context.Context, encounter *ShoppingEncounter) error {
	return db.encountersOps().UpdateShoppingEncounter(ctx, encounter)
}

func (db *PostgresDB) DeleteShoppingEncounter(ctx context.Context, id string) error {
	return db.encountersOps().DeleteShoppingEncounter(ctx, id)
}

func (db *PostgresDB) CreateShoppingCartItem(ctx context.Context, item *ShoppingCart) error {
	return db.encountersOps().CreateShoppingCartItem(ctx, item)
}

func (db *PostgresDB) ListShoppingCartItems(ctx context.Context, encounterID string) ([]*ShoppingCart, error) {
	return db.encountersOps().ListShoppingCartItems(ctx, encounterID)
}

func (db *PostgresDB) UpdateShoppingCartItem(ctx context.Context, item *ShoppingCart) error {
	return db.encountersOps().UpdateShoppingCartItem(ctx, item)
}

func (db *PostgresDB) DeleteShoppingCartItem(ctx context.Context, id string) error {
	return db.encountersOps().DeleteShoppingCartItem(ctx, id)
}

func (db *PostgresDB) CreateHagglingSession(ctx context.Context, session *HagglingSession) error {
	return db.encountersOps().CreateHagglingSession(ctx, session)
}

func (db *PostgresDB) GetHagglingSession(ctx context.Context, id string) (*HagglingSession, error) {
	return db.encountersOps().GetHagglingSession(ctx, id)
}

func (db *PostgresDB) ListHagglingSessions(ctx context.Context, encounterID string) ([]*HagglingSession, error) {
	return db.encountersOps().ListHagglingSessions(ctx, encounterID)
}

func (db *PostgresDB) UpdateHagglingSession(ctx context.Context, session *HagglingSession) error {
	return db.encountersOps().UpdateHagglingSession(ctx, session)
}
