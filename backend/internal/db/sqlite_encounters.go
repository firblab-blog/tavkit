package db

import (
	"context"
)

// encountersOps returns the unified EncountersOperations for SQLite.
func (s *SQLiteDB) encountersOps() *EncountersOperations {
	return NewEncountersOperations(s.Executor(), s.QueryBuilder())
}

// ============================================================================
// SOCIAL ENCOUNTER OPERATIONS (SQLite)
// ============================================================================

func (s *SQLiteDB) CreateSocialEncounter(ctx context.Context, encounter *SocialEncounter) error {
	return s.encountersOps().CreateSocialEncounter(ctx, encounter)
}

func (s *SQLiteDB) GetSocialEncounterByID(ctx context.Context, id string) (*SocialEncounter, error) {
	return s.encountersOps().GetSocialEncounterByID(ctx, id)
}

func (s *SQLiteDB) GetSocialEncounterBySessionID(ctx context.Context, sessionID string) (*SocialEncounter, error) {
	return s.encountersOps().GetSocialEncounterBySessionID(ctx, sessionID)
}

func (s *SQLiteDB) UpdateSocialEncounter(ctx context.Context, encounter *SocialEncounter) error {
	return s.encountersOps().UpdateSocialEncounter(ctx, encounter)
}

func (s *SQLiteDB) DeleteSocialEncounter(ctx context.Context, id string) error {
	return s.encountersOps().DeleteSocialEncounter(ctx, id)
}

func (s *SQLiteDB) CreateSocialCheck(ctx context.Context, check *SocialCheck) error {
	return s.encountersOps().CreateSocialCheck(ctx, check)
}

func (s *SQLiteDB) ListSocialChecks(ctx context.Context, encounterID string) ([]*SocialCheck, error) {
	return s.encountersOps().ListSocialChecks(ctx, encounterID)
}

// ============================================================================
// TAVERN ENCOUNTER OPERATIONS (SQLite)
// ============================================================================

func (s *SQLiteDB) CreateTavernEncounter(ctx context.Context, encounter *TavernEncounter) error {
	return s.encountersOps().CreateTavernEncounter(ctx, encounter)
}

func (s *SQLiteDB) GetTavernEncounterByID(ctx context.Context, id string) (*TavernEncounter, error) {
	return s.encountersOps().GetTavernEncounterByID(ctx, id)
}

func (s *SQLiteDB) GetTavernEncounterBySessionID(ctx context.Context, sessionID string) (*TavernEncounter, error) {
	return s.encountersOps().GetTavernEncounterBySessionID(ctx, sessionID)
}

func (s *SQLiteDB) UpdateTavernEncounter(ctx context.Context, encounter *TavernEncounter) error {
	return s.encountersOps().UpdateTavernEncounter(ctx, encounter)
}

func (s *SQLiteDB) DeleteTavernEncounter(ctx context.Context, id string) error {
	return s.encountersOps().DeleteTavernEncounter(ctx, id)
}

func (s *SQLiteDB) CreatePatronInteraction(ctx context.Context, patron *PatronInteraction) error {
	return s.encountersOps().CreatePatronInteraction(ctx, patron)
}

func (s *SQLiteDB) GetPatronInteraction(ctx context.Context, id string) (*PatronInteraction, error) {
	return s.encountersOps().GetPatronInteraction(ctx, id)
}

func (s *SQLiteDB) ListPatronInteractions(ctx context.Context, encounterID string) ([]*PatronInteraction, error) {
	return s.encountersOps().ListPatronInteractions(ctx, encounterID)
}

func (s *SQLiteDB) UpdatePatronInteraction(ctx context.Context, patron *PatronInteraction) error {
	return s.encountersOps().UpdatePatronInteraction(ctx, patron)
}

func (s *SQLiteDB) CreateRumorTracking(ctx context.Context, rumor *RumorTracking) error {
	return s.encountersOps().CreateRumorTracking(ctx, rumor)
}

func (s *SQLiteDB) ListRumorTracking(ctx context.Context, encounterID string) ([]*RumorTracking, error) {
	return s.encountersOps().ListRumorTracking(ctx, encounterID)
}

func (s *SQLiteDB) UpdateRumorTracking(ctx context.Context, rumor *RumorTracking) error {
	return s.encountersOps().UpdateRumorTracking(ctx, rumor)
}

func (s *SQLiteDB) CreateTavernTab(ctx context.Context, tab *TavernTab) error {
	return s.encountersOps().CreateTavernTab(ctx, tab)
}

func (s *SQLiteDB) ListTavernTabs(ctx context.Context, encounterID string) ([]*TavernTab, error) {
	return s.encountersOps().ListTavernTabs(ctx, encounterID)
}

func (s *SQLiteDB) UpdateTavernTab(ctx context.Context, tab *TavernTab) error {
	return s.encountersOps().UpdateTavernTab(ctx, tab)
}

// ============================================================================
// SHOPPING ENCOUNTER OPERATIONS (SQLite)
// ============================================================================

func (s *SQLiteDB) CreateShoppingEncounter(ctx context.Context, encounter *ShoppingEncounter) error {
	return s.encountersOps().CreateShoppingEncounter(ctx, encounter)
}

func (s *SQLiteDB) GetShoppingEncounterByID(ctx context.Context, id string) (*ShoppingEncounter, error) {
	return s.encountersOps().GetShoppingEncounterByID(ctx, id)
}

func (s *SQLiteDB) GetShoppingEncounterBySessionID(ctx context.Context, sessionID string) (*ShoppingEncounter, error) {
	return s.encountersOps().GetShoppingEncounterBySessionID(ctx, sessionID)
}

func (s *SQLiteDB) UpdateShoppingEncounter(ctx context.Context, encounter *ShoppingEncounter) error {
	return s.encountersOps().UpdateShoppingEncounter(ctx, encounter)
}

func (s *SQLiteDB) DeleteShoppingEncounter(ctx context.Context, id string) error {
	return s.encountersOps().DeleteShoppingEncounter(ctx, id)
}

func (s *SQLiteDB) CreateShoppingCartItem(ctx context.Context, item *ShoppingCart) error {
	return s.encountersOps().CreateShoppingCartItem(ctx, item)
}

func (s *SQLiteDB) ListShoppingCartItems(ctx context.Context, encounterID string) ([]*ShoppingCart, error) {
	return s.encountersOps().ListShoppingCartItems(ctx, encounterID)
}

func (s *SQLiteDB) UpdateShoppingCartItem(ctx context.Context, item *ShoppingCart) error {
	return s.encountersOps().UpdateShoppingCartItem(ctx, item)
}

func (s *SQLiteDB) DeleteShoppingCartItem(ctx context.Context, id string) error {
	return s.encountersOps().DeleteShoppingCartItem(ctx, id)
}

func (s *SQLiteDB) CreateHagglingSession(ctx context.Context, session *HagglingSession) error {
	return s.encountersOps().CreateHagglingSession(ctx, session)
}

func (s *SQLiteDB) GetHagglingSession(ctx context.Context, id string) (*HagglingSession, error) {
	return s.encountersOps().GetHagglingSession(ctx, id)
}

func (s *SQLiteDB) ListHagglingSessions(ctx context.Context, encounterID string) ([]*HagglingSession, error) {
	return s.encountersOps().ListHagglingSessions(ctx, encounterID)
}

func (s *SQLiteDB) UpdateHagglingSession(ctx context.Context, session *HagglingSession) error {
	return s.encountersOps().UpdateHagglingSession(ctx, session)
}
