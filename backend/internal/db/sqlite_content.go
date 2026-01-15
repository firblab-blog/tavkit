package db

import (
	"context"
	"database/sql"
)

// contentOps returns the unified ContentOps for SQLite.
func (s *SQLiteDB) contentOps() *ContentOps {
	return NewContentOps(s.Executor(), s.QueryBuilder())
}

// ============================================================================
// NPC OPERATIONS (SQLite)
// ============================================================================

func (s *SQLiteDB) CreateNPC(ctx context.Context, npc *NPC) error {
	return s.contentOps().CreateNPC(ctx, npc)
}

func (s *SQLiteDB) GetNPCByID(ctx context.Context, id string) (*NPC, error) {
	return s.contentOps().GetNPCByID(ctx, id)
}

func (s *SQLiteDB) ListNPCsByUserID(ctx context.Context, userID string, campaignID *string) ([]*NPC, error) {
	return s.contentOps().ListNPCsByUserID(ctx, userID, campaignID)
}

func (s *SQLiteDB) DeleteNPC(ctx context.Context, id string) error {
	return s.contentOps().DeleteNPC(ctx, id)
}

func (s *SQLiteDB) UpdateNPC(ctx context.Context, npc *NPC) error {
	return s.contentOps().UpdateNPC(ctx, npc)
}

// ============================================================================
// MONSTER OPERATIONS (SQLite)
// ============================================================================

func (s *SQLiteDB) CreateMonster(ctx context.Context, monster *Monster) error {
	return s.contentOps().CreateMonster(ctx, monster)
}

func (s *SQLiteDB) GetMonsterByID(ctx context.Context, id string) (*Monster, error) {
	return s.contentOps().GetMonsterByID(ctx, id)
}

func (s *SQLiteDB) ListMonstersByUserID(ctx context.Context, userID string, campaignID *string) ([]*Monster, error) {
	return s.contentOps().ListMonstersByUserID(ctx, userID, campaignID)
}

func (s *SQLiteDB) DeleteMonster(ctx context.Context, id string) error {
	return s.contentOps().DeleteMonster(ctx, id)
}

func (s *SQLiteDB) UpdateMonster(ctx context.Context, monster *Monster) error {
	return s.contentOps().UpdateMonster(ctx, monster)
}

// ============================================================================
// ENCOUNTER OPERATIONS (SQLite)
// ============================================================================

func (s *SQLiteDB) CreateEncounter(ctx context.Context, encounter *Encounter) error {
	return s.contentOps().CreateEncounter(ctx, encounter)
}

func (s *SQLiteDB) GetEncounterByID(ctx context.Context, id string) (*Encounter, error) {
	return s.contentOps().GetEncounterByID(ctx, id)
}

func (s *SQLiteDB) ListEncountersByUserID(ctx context.Context, userID string, campaignID *string) ([]*Encounter, error) {
	return s.contentOps().ListEncountersByUserID(ctx, userID, campaignID)
}

func (s *SQLiteDB) DeleteEncounter(ctx context.Context, id string) error {
	return s.contentOps().DeleteEncounter(ctx, id)
}

func (s *SQLiteDB) UpdateEncounter(ctx context.Context, encounter *Encounter) error {
	return s.contentOps().UpdateEncounter(ctx, encounter)
}

// ============================================================================
// DIALOGUE OPERATIONS (SQLite)
// ============================================================================

func (s *SQLiteDB) CreateDialogue(ctx context.Context, dialogue *Dialogue) error {
	return s.contentOps().CreateDialogue(ctx, dialogue)
}

func (s *SQLiteDB) GetDialogueByID(ctx context.Context, id string) (*Dialogue, error) {
	return s.contentOps().GetDialogueByID(ctx, id)
}

func (s *SQLiteDB) ListDialoguesByUserID(ctx context.Context, userID string, campaignID *string) ([]*Dialogue, error) {
	return s.contentOps().ListDialoguesByUserID(ctx, userID, campaignID)
}

func (s *SQLiteDB) DeleteDialogue(ctx context.Context, id string) error {
	return s.contentOps().DeleteDialogue(ctx, id)
}

func (s *SQLiteDB) UpdateDialogue(ctx context.Context, dialogue *Dialogue) error {
	return s.contentOps().UpdateDialogue(ctx, dialogue)
}

// ============================================================================
// LOCATION OPERATIONS (SQLite)
// ============================================================================

func (s *SQLiteDB) CreateLocation(ctx context.Context, location *Location) error {
	return s.contentOps().CreateLocation(ctx, location)
}

func (s *SQLiteDB) GetLocationByID(ctx context.Context, id string) (*Location, error) {
	return s.contentOps().GetLocationByID(ctx, id)
}

func (s *SQLiteDB) ListLocationsByUserID(ctx context.Context, userID string, campaignID *string) ([]*Location, error) {
	return s.contentOps().ListLocationsByUserID(ctx, userID, campaignID)
}

func (s *SQLiteDB) UpdateLocation(ctx context.Context, location *Location) error {
	return s.contentOps().UpdateLocation(ctx, location)
}

func (s *SQLiteDB) DeleteLocation(ctx context.Context, id string) error {
	return s.contentOps().DeleteLocation(ctx, id)
}

// ============================================================================
// QUEST OPERATIONS (SQLite)
// ============================================================================

func (s *SQLiteDB) CreateQuest(ctx context.Context, quest *Quest) error {
	return s.contentOps().CreateQuest(ctx, quest)
}

func (s *SQLiteDB) GetQuestByID(ctx context.Context, id string) (*Quest, error) {
	return s.contentOps().GetQuestByID(ctx, id)
}

func (s *SQLiteDB) ListQuestsByUserID(ctx context.Context, userID string, campaignID *string) ([]*Quest, error) {
	return s.contentOps().ListQuestsByUserID(ctx, userID, campaignID)
}

func (s *SQLiteDB) UpdateQuest(ctx context.Context, quest *Quest) error {
	return s.contentOps().UpdateQuest(ctx, quest)
}

func (s *SQLiteDB) DeleteQuest(ctx context.Context, id string) error {
	return s.contentOps().DeleteQuest(ctx, id)
}

// ============================================================================
// ITEM OPERATIONS (SQLite)
// ============================================================================

func (s *SQLiteDB) CreateItem(ctx context.Context, item *Item) error {
	return s.contentOps().CreateItem(ctx, item)
}

func (s *SQLiteDB) GetItemByID(ctx context.Context, id string) (*Item, error) {
	return s.contentOps().GetItemByID(ctx, id)
}

func (s *SQLiteDB) ListItemsByUserID(ctx context.Context, userID string, campaignID *string) ([]*Item, error) {
	return s.contentOps().ListItemsByUserID(ctx, userID, campaignID)
}

func (s *SQLiteDB) UpdateItem(ctx context.Context, item *Item) error {
	return s.contentOps().UpdateItem(ctx, item)
}

func (s *SQLiteDB) DeleteItem(ctx context.Context, id string) error {
	return s.contentOps().DeleteItem(ctx, id)
}

// ============================================================================
// RUMOR OPERATIONS (SQLite)
// ============================================================================

func (s *SQLiteDB) CreateRumor(ctx context.Context, rumor *Rumor) error {
	return s.contentOps().CreateRumor(ctx, rumor)
}

func (s *SQLiteDB) GetRumorByID(ctx context.Context, id string) (*Rumor, error) {
	return s.contentOps().GetRumorByID(ctx, id)
}

func (s *SQLiteDB) ListRumorsByUserID(ctx context.Context, userID string, campaignID *string) ([]*Rumor, error) {
	return s.contentOps().ListRumorsByUserID(ctx, userID, campaignID)
}

func (s *SQLiteDB) UpdateRumor(ctx context.Context, rumor *Rumor) error {
	return s.contentOps().UpdateRumor(ctx, rumor)
}

func (s *SQLiteDB) DeleteRumor(ctx context.Context, id string) error {
	return s.contentOps().DeleteRumor(ctx, id)
}

// ============================================================================
// TAVERN OPERATIONS (SQLite)
// ============================================================================

func (s *SQLiteDB) CreateTavern(ctx context.Context, tavern *Tavern) error {
	return s.contentOps().CreateTavern(ctx, tavern)
}

func (s *SQLiteDB) GetTavernByID(ctx context.Context, id string) (*Tavern, error) {
	return s.contentOps().GetTavernByID(ctx, id)
}

func (s *SQLiteDB) ListTavernsByUserID(ctx context.Context, userID string, campaignID *string) ([]*Tavern, error) {
	return s.contentOps().ListTavernsByUserID(ctx, userID, campaignID)
}

func (s *SQLiteDB) ListTavernsByCampaignID(ctx context.Context, campaignID string) ([]*Tavern, error) {
	return s.contentOps().ListTavernsByCampaignID(ctx, campaignID)
}

func (s *SQLiteDB) UpdateTavern(ctx context.Context, tavern *Tavern) error {
	return s.contentOps().UpdateTavern(ctx, tavern)
}

func (s *SQLiteDB) DeleteTavern(ctx context.Context, id string) error {
	return s.contentOps().DeleteTavern(ctx, id)
}

// ============================================================================
// MERCHANT OPERATIONS (SQLite)
// ============================================================================

func (s *SQLiteDB) CreateMerchant(ctx context.Context, merchant *Merchant) error {
	return s.contentOps().CreateMerchant(ctx, merchant)
}

func (s *SQLiteDB) GetMerchantByID(ctx context.Context, id string) (*Merchant, error) {
	return s.contentOps().GetMerchantByID(ctx, id)
}

func (s *SQLiteDB) ListMerchantsByUserID(ctx context.Context, userID string, campaignID *string) ([]*Merchant, error) {
	return s.contentOps().ListMerchantsByUserID(ctx, userID, campaignID)
}

func (s *SQLiteDB) ListMerchantsByCampaignID(ctx context.Context, campaignID string) ([]*Merchant, error) {
	return s.contentOps().ListMerchantsByCampaignID(ctx, campaignID)
}

func (s *SQLiteDB) UpdateMerchant(ctx context.Context, merchant *Merchant) error {
	return s.contentOps().UpdateMerchant(ctx, merchant)
}

func (s *SQLiteDB) DeleteMerchant(ctx context.Context, id string) error {
	return s.contentOps().DeleteMerchant(ctx, id)
}

// ============================================================================
// TRAP OPERATIONS (SQLite)
// ============================================================================

func (s *SQLiteDB) CreateTrap(ctx context.Context, trap *Trap) error {
	return s.contentOps().CreateTrap(ctx, trap)
}

func (s *SQLiteDB) GetTrapByID(ctx context.Context, id string) (*Trap, error) {
	return s.contentOps().GetTrapByID(ctx, id)
}

func (s *SQLiteDB) ListTrapsByUserID(ctx context.Context, userID string, campaignID *string) ([]*Trap, error) {
	return s.contentOps().ListTrapsByUserID(ctx, userID, campaignID)
}

func (s *SQLiteDB) ListTrapsByCampaignID(ctx context.Context, campaignID string) ([]*Trap, error) {
	return s.contentOps().ListTrapsByCampaignID(ctx, campaignID)
}

func (s *SQLiteDB) UpdateTrap(ctx context.Context, trap *Trap) error {
	return s.contentOps().UpdateTrap(ctx, trap)
}

func (s *SQLiteDB) DeleteTrap(ctx context.Context, id string) error {
	return s.contentOps().DeleteTrap(ctx, id)
}

// ============================================================================
// CRITTER OPERATIONS (SQLite)
// ============================================================================

func (s *SQLiteDB) CreateCritter(ctx context.Context, critter *Critter) error {
	return s.contentOps().CreateCritter(ctx, critter)
}

func (s *SQLiteDB) GetCritterByID(ctx context.Context, id string) (*Critter, error) {
	return s.contentOps().GetCritterByID(ctx, id)
}

func (s *SQLiteDB) ListCrittersByUserID(ctx context.Context, userID string, campaignID *string) ([]*Critter, error) {
	return s.contentOps().ListCrittersByUserID(ctx, userID, campaignID)
}

func (s *SQLiteDB) ListCrittersByCampaignID(ctx context.Context, campaignID string) ([]*Critter, error) {
	return s.contentOps().ListCrittersByCampaignID(ctx, campaignID)
}

func (s *SQLiteDB) UpdateCritter(ctx context.Context, critter *Critter) error {
	return s.contentOps().UpdateCritter(ctx, critter)
}

func (s *SQLiteDB) DeleteCritter(ctx context.Context, id string) error {
	return s.contentOps().DeleteCritter(ctx, id)
}

// =============================================================================
// Campaign Item Linking Operations (many-to-many)
// =============================================================================

func (s *SQLiteDB) LinkItemToCampaign(ctx context.Context, campaignID, itemID string, quantity int, notes *string) error {
	id := generateUUID()
	query := `INSERT INTO campaign_items (id, campaign_id, item_id, quantity, notes, added_at)
		VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(campaign_id, item_id) DO UPDATE SET quantity = excluded.quantity, notes = excluded.notes`
	_, err := s.db.ExecContext(ctx, query, id, campaignID, itemID, quantity, notes)
	return err
}

func (s *SQLiteDB) UnlinkItemFromCampaign(ctx context.Context, campaignID, itemID string) error {
	query := `DELETE FROM campaign_items WHERE campaign_id = ? AND item_id = ?`
	_, err := s.db.ExecContext(ctx, query, campaignID, itemID)
	return err
}

func (s *SQLiteDB) UpdateCampaignItemLink(ctx context.Context, campaignID, itemID string, quantity int, notes *string) error {
	query := `UPDATE campaign_items SET quantity = ?, notes = ? WHERE campaign_id = ? AND item_id = ?`
	_, err := s.db.ExecContext(ctx, query, quantity, notes, campaignID, itemID)
	return err
}

func (s *SQLiteDB) ListCampaignItems(ctx context.Context, campaignID string) ([]*ItemWithCampaignLink, error) {
	query := `SELECT
		i.id, i.user_id, i.campaign_id, i.name, i.type, i.rarity, i.description, i.properties,
		i.origin, i.previous_owner, i.complication, i.value, i.weight, i.attunement,
		i.location_found, i.ai_generated, i.ai_provider, i.created_at, i.updated_at,
		ci.id as link_id, ci.quantity, ci.notes, ci.added_at
	FROM items i
	INNER JOIN campaign_items ci ON i.id = ci.item_id
	WHERE ci.campaign_id = ?
	ORDER BY ci.added_at DESC`

	rows, err := s.db.QueryContext(ctx, query, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []*ItemWithCampaignLink
	for rows.Next() {
		item := &ItemWithCampaignLink{}
		var campaignIDNull, rarity, description, origin, previousOwner, complication, locationFound, aiProvider sql.NullString
		var value sql.NullInt64
		var weight sql.NullFloat64
		var attunement sql.NullBool
		var linkNotes sql.NullString
		var addedAt string

		err := rows.Scan(
			&item.ID, &item.UserID, &campaignIDNull, &item.Name, &item.Type, &rarity, &description, &item.Properties,
			&origin, &previousOwner, &complication, &value, &weight, &attunement,
			&locationFound, &item.AIGenerated, &aiProvider, &item.CreatedAt, &item.UpdatedAt,
			&item.LinkID, &item.Quantity, &linkNotes, &addedAt,
		)
		if err != nil {
			return nil, err
		}

		// Assign nullable fields
		if campaignIDNull.Valid {
			item.CampaignID = &campaignIDNull.String
		}
		if rarity.Valid {
			item.Rarity = &rarity.String
		}
		if description.Valid {
			item.Description = &description.String
		}
		if origin.Valid {
			item.Origin = &origin.String
		}
		if previousOwner.Valid {
			item.PreviousOwner = &previousOwner.String
		}
		if complication.Valid {
			item.Complication = &complication.String
		}
		if value.Valid {
			v := int(value.Int64)
			item.Value = &v
		}
		if weight.Valid {
			item.Weight = &weight.Float64
		}
		if attunement.Valid {
			item.Attunement = &attunement.Bool
		}
		if locationFound.Valid {
			item.LocationFound = &locationFound.String
		}
		if aiProvider.Valid {
			item.AIProvider = &aiProvider.String
		}
		if linkNotes.Valid {
			item.Notes = &linkNotes.String
		}
		item.AddedAt = addedAt

		items = append(items, item)
	}

	return items, rows.Err()
}

func (s *SQLiteDB) ListItemCampaigns(ctx context.Context, itemID string) ([]*Campaign, error) {
	query := `SELECT
		c.id, c.user_id, c.name, c.description, c.game_system, c.theme, c.tone, c.setting, c.factions,
		c.history, c.magic_level, c.tech_level, c.notes, c.is_active, c.created_at, c.updated_at
	FROM campaigns c
	INNER JOIN campaign_items ci ON c.id = ci.campaign_id
	WHERE ci.item_id = ?
	ORDER BY c.name`

	rows, err := s.db.QueryContext(ctx, query, itemID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var campaigns []*Campaign
	for rows.Next() {
		campaign := &Campaign{}
		var description, theme, tone, history, magicLevel, techLevel, notes sql.NullString

		err := rows.Scan(
			&campaign.ID, &campaign.UserID, &campaign.Name, &description, &campaign.GameSystem,
			&theme, &tone, &campaign.Setting, &campaign.Factions, &history, &magicLevel, &techLevel,
			&notes, &campaign.IsActive, &campaign.CreatedAt, &campaign.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		if description.Valid {
			campaign.Description = &description.String
		}
		if theme.Valid {
			campaign.Theme = &theme.String
		}
		if tone.Valid {
			campaign.Tone = &tone.String
		}
		if history.Valid {
			campaign.History = &history.String
		}
		if magicLevel.Valid {
			campaign.MagicLevel = &magicLevel.String
		}
		if techLevel.Valid {
			campaign.TechLevel = &techLevel.String
		}
		if notes.Valid {
			campaign.Notes = &notes.String
		}

		campaigns = append(campaigns, campaign)
	}

	return campaigns, rows.Err()
}
