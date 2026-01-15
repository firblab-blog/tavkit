// Package db provides database interfaces and implementations.
package db

import (
	"context"
)

// Transaction represents a database transaction with commit and rollback capabilities.
// It provides the same operations as Database but within a transactional context.
type Transaction interface {
	// Commit commits the transaction. Pass the same context used for BeginTx.
	Commit(ctx context.Context) error
	// Rollback rolls back the transaction. Pass the same context used for BeginTx.
	Rollback(ctx context.Context) error

	// Campaign Summary operations (within transaction)
	CreateCampaignSummary(ctx context.Context, summary *CampaignSummary) error
	GetCampaignSummaryByCampaignID(ctx context.Context, campaignID string) (*CampaignSummary, error)
	UpdateCampaignSummary(ctx context.Context, summary *CampaignSummary) error

	// Campaign Content Status operations (within transaction)
	UpsertCampaignContentStatus(ctx context.Context, status *CampaignContentStatus) error
	GetCampaignContentStatus(ctx context.Context, campaignID string, contentType string, contentID string) (*CampaignContentStatus, error)

	// Combat operations (within transaction for combat resolution)
	UpdateCombatParticipant(ctx context.Context, participant *CombatParticipant) error
	CreateCombatCondition(ctx context.Context, condition *CombatCondition) error
	DeleteCombatCondition(ctx context.Context, id string) error
	UpdateCombatEncounter(ctx context.Context, combat *CombatEncounter) error
	CreateSessionEvent(ctx context.Context, event *SessionEvent) error

	// Character operations (within transaction for campaign transfer)
	UpdateCharacter(ctx context.Context, character *Character) error
	LinkCharacterToCampaign(ctx context.Context, campaignID, characterID string) error
	UnlinkCharacterFromCampaign(ctx context.Context, campaignID, characterID string) error
}

// Database interface defines all database operations
type Database interface {
	Close() error
	Migrate() error
	Ping(ctx context.Context) error

	// Transaction support
	BeginTx(ctx context.Context) (Transaction, error)

	// User operations
	CreateUser(ctx context.Context, user *User) error
	GetUserByID(ctx context.Context, id string) (*User, error)
	GetUserByUsername(ctx context.Context, username string) (*User, error)
	GetUserByEmail(ctx context.Context, email string) (*User, error)
	UpdateUser(ctx context.Context, user *User) error
	DeleteUser(ctx context.Context, id string) error

	// Admin user operations
	ListUsers(ctx context.Context, limit, offset int) ([]*User, int, error)
	AdminUpdateUser(ctx context.Context, user *User) error
	AdminUpdateUserPassword(ctx context.Context, userID, passwordHash string) error

	// Tool operations
	CreateTool(ctx context.Context, tool *Tool) error
	GetToolByID(ctx context.Context, id string) (*Tool, error)
	ListToolsByUserID(ctx context.Context, userID string) ([]*Tool, error)
	UpdateTool(ctx context.Context, tool *Tool) error
	DeleteTool(ctx context.Context, id string) error

	// NPC operations
	CreateNPC(ctx context.Context, npc *NPC) error
	GetNPCByID(ctx context.Context, id string) (*NPC, error)
	ListNPCsByUserID(ctx context.Context, userID string, campaignID *string) ([]*NPC, error)
	UpdateNPC(ctx context.Context, npc *NPC) error
	DeleteNPC(ctx context.Context, id string) error

	// Monster operations
	CreateMonster(ctx context.Context, monster *Monster) error
	GetMonsterByID(ctx context.Context, id string) (*Monster, error)
	ListMonstersByUserID(ctx context.Context, userID string, campaignID *string) ([]*Monster, error)
	UpdateMonster(ctx context.Context, monster *Monster) error
	DeleteMonster(ctx context.Context, id string) error

	// Encounter operations
	CreateEncounter(ctx context.Context, encounter *Encounter) error
	GetEncounterByID(ctx context.Context, id string) (*Encounter, error)
	ListEncountersByUserID(ctx context.Context, userID string, campaignID *string) ([]*Encounter, error)
	UpdateEncounter(ctx context.Context, encounter *Encounter) error
	DeleteEncounter(ctx context.Context, id string) error

	// Dialogue operations
	CreateDialogue(ctx context.Context, dialogue *Dialogue) error
	GetDialogueByID(ctx context.Context, id string) (*Dialogue, error)
	ListDialoguesByUserID(ctx context.Context, userID string, campaignID *string) ([]*Dialogue, error)
	UpdateDialogue(ctx context.Context, dialogue *Dialogue) error
	DeleteDialogue(ctx context.Context, id string) error

	// Location operations
	CreateLocation(ctx context.Context, location *Location) error
	GetLocationByID(ctx context.Context, id string) (*Location, error)
	ListLocationsByUserID(ctx context.Context, userID string, campaignID *string) ([]*Location, error)
	UpdateLocation(ctx context.Context, location *Location) error
	DeleteLocation(ctx context.Context, id string) error

	// Quest operations
	CreateQuest(ctx context.Context, quest *Quest) error
	GetQuestByID(ctx context.Context, id string) (*Quest, error)
	ListQuestsByUserID(ctx context.Context, userID string, campaignID *string) ([]*Quest, error)
	UpdateQuest(ctx context.Context, quest *Quest) error
	DeleteQuest(ctx context.Context, id string) error

	// Item operations
	CreateItem(ctx context.Context, item *Item) error
	GetItemByID(ctx context.Context, id string) (*Item, error)
	ListItemsByUserID(ctx context.Context, userID string, campaignID *string) ([]*Item, error)
	UpdateItem(ctx context.Context, item *Item) error
	DeleteItem(ctx context.Context, id string) error

	// Rumor operations
	CreateRumor(ctx context.Context, rumor *Rumor) error
	GetRumorByID(ctx context.Context, id string) (*Rumor, error)
	ListRumorsByUserID(ctx context.Context, userID string, campaignID *string) ([]*Rumor, error)
	UpdateRumor(ctx context.Context, rumor *Rumor) error
	DeleteRumor(ctx context.Context, id string) error

	// Tavern operations
	CreateTavern(ctx context.Context, tavern *Tavern) error
	GetTavernByID(ctx context.Context, id string) (*Tavern, error)
	ListTavernsByUserID(ctx context.Context, userID string, campaignID *string) ([]*Tavern, error)
	ListTavernsByCampaignID(ctx context.Context, campaignID string) ([]*Tavern, error)
	UpdateTavern(ctx context.Context, tavern *Tavern) error
	DeleteTavern(ctx context.Context, id string) error

	// Merchant operations
	CreateMerchant(ctx context.Context, merchant *Merchant) error
	GetMerchantByID(ctx context.Context, id string) (*Merchant, error)
	ListMerchantsByUserID(ctx context.Context, userID string, campaignID *string) ([]*Merchant, error)
	ListMerchantsByCampaignID(ctx context.Context, campaignID string) ([]*Merchant, error)
	UpdateMerchant(ctx context.Context, merchant *Merchant) error
	DeleteMerchant(ctx context.Context, id string) error

	// Trap operations
	CreateTrap(ctx context.Context, trap *Trap) error
	GetTrapByID(ctx context.Context, id string) (*Trap, error)
	ListTrapsByUserID(ctx context.Context, userID string, campaignID *string) ([]*Trap, error)
	ListTrapsByCampaignID(ctx context.Context, campaignID string) ([]*Trap, error)
	UpdateTrap(ctx context.Context, trap *Trap) error
	DeleteTrap(ctx context.Context, id string) error

	// Critter operations
	CreateCritter(ctx context.Context, critter *Critter) error
	GetCritterByID(ctx context.Context, id string) (*Critter, error)
	ListCrittersByUserID(ctx context.Context, userID string, campaignID *string) ([]*Critter, error)
	ListCrittersByCampaignID(ctx context.Context, campaignID string) ([]*Critter, error)
	UpdateCritter(ctx context.Context, critter *Critter) error
	DeleteCritter(ctx context.Context, id string) error

	// Chase operations
	CreateChase(ctx context.Context, chase *Chase) error
	GetChaseByID(ctx context.Context, id string) (*Chase, error)
	ListChasesByUserID(ctx context.Context, userID string, campaignID *string) ([]*Chase, error)
	ListChasesByCampaignID(ctx context.Context, campaignID string) ([]*Chase, error)
	UpdateChase(ctx context.Context, chase *Chase) error
	DeleteChase(ctx context.Context, id string) error

	// Chase Tracker - Participants
	CreateChaseParticipant(ctx context.Context, participant *ChaseParticipant) error
	GetChaseParticipantByID(ctx context.Context, id string) (*ChaseParticipant, error)
	ListChaseParticipants(ctx context.Context, chaseID string) ([]*ChaseParticipant, error)
	UpdateChaseParticipant(ctx context.Context, participant *ChaseParticipant) error
	DeleteChaseParticipant(ctx context.Context, id string) error

	// Chase Tracker - Challenges
	CreateChaseChallenge(ctx context.Context, challenge *ChaseChallenge) error
	GetChaseChallengeByID(ctx context.Context, id string) (*ChaseChallenge, error)
	ListChaseChallenges(ctx context.Context, chaseID string) ([]*ChaseChallenge, error)
	ListChaseChallengesByRound(ctx context.Context, chaseID string, round int) ([]*ChaseChallenge, error)
	UpdateChaseChallenge(ctx context.Context, challenge *ChaseChallenge) error
	DeleteChaseChallenge(ctx context.Context, id string) error

	// Chase Tracker - Complications
	CreateChaseComplication(ctx context.Context, complication *ChaseComplication) error
	GetChaseComplicationByID(ctx context.Context, id string) (*ChaseComplication, error)
	ListChaseComplications(ctx context.Context, chaseID string) ([]*ChaseComplication, error)
	ListChaseComplicationsByRound(ctx context.Context, chaseID string, round int) ([]*ChaseComplication, error)
	UpdateChaseComplication(ctx context.Context, complication *ChaseComplication) error
	DeleteChaseComplication(ctx context.Context, id string) error

	// Chase Tracker - Events
	CreateChaseEvent(ctx context.Context, event *ChaseEvent) error
	ListChaseEvents(ctx context.Context, chaseID string) ([]*ChaseEvent, error)
	ListChaseEventsByRound(ctx context.Context, chaseID string, round int) ([]*ChaseEvent, error)
	DeleteChaseEventsByChaseID(ctx context.Context, chaseID string) error

	// Chase Tracker - Templates
	CreateChaseTemplate(ctx context.Context, template *ChaseTemplate) error
	GetChaseTemplateByID(ctx context.Context, id string) (*ChaseTemplate, error)
	ListChaseTemplates(ctx context.Context, chaseType *string) ([]*ChaseTemplate, error)
	UpdateChaseTemplate(ctx context.Context, template *ChaseTemplate) error
	DeleteChaseTemplate(ctx context.Context, id string) error

	// Character operations
	CreateCharacter(ctx context.Context, character *Character) error
	GetCharacterByID(ctx context.Context, id string) (*Character, error)
	ListCharactersByUserID(ctx context.Context, userID string, campaignID *string) ([]*Character, error)
	ListCharactersByCampaignID(ctx context.Context, campaignID string) ([]*Character, error)
	UpdateCharacter(ctx context.Context, character *Character) error
	DeleteCharacter(ctx context.Context, id string) error

	// Campaign Character linking operations (many-to-many)
	LinkCharacterToCampaign(ctx context.Context, campaignID, characterID string) error
	UnlinkCharacterFromCampaign(ctx context.Context, campaignID, characterID string) error
	ListCampaignCharacters(ctx context.Context, campaignID string) ([]*Character, error)

	// Campaign Item linking operations (many-to-many)
	LinkItemToCampaign(ctx context.Context, campaignID, itemID string, quantity int, notes *string) error
	UnlinkItemFromCampaign(ctx context.Context, campaignID, itemID string) error
	UpdateCampaignItemLink(ctx context.Context, campaignID, itemID string, quantity int, notes *string) error
	ListCampaignItems(ctx context.Context, campaignID string) ([]*ItemWithCampaignLink, error)
	ListItemCampaigns(ctx context.Context, itemID string) ([]*Campaign, error)

	// Settings operations
	GetSettings(ctx context.Context) (*Settings, error)
	UpdateSettings(ctx context.Context, settings *Settings) error

	// Campaign operations
	CreateCampaign(ctx context.Context, campaign *Campaign) error
	GetCampaigns(ctx context.Context) ([]*Campaign, error)
	GetCampaignByID(ctx context.Context, id string) (*Campaign, error)
	GetCampaignByIDAndUserID(ctx context.Context, id string, userID string) (*Campaign, error)
	ListCampaignsByUserID(ctx context.Context, userID string) ([]*Campaign, error)
	UpdateCampaign(ctx context.Context, campaign *Campaign) error
	DeleteCampaign(ctx context.Context, id string) error
	GetCampaignContentByCampaignID(ctx context.Context, campaignID string, userID string) ([]*CampaignContent, error)
	GetCampaignContentBySection(ctx context.Context, campaignID string, userID string, section string, subsection *string) ([]*CampaignContent, error)
	CreateCampaignContent(ctx context.Context, content *CampaignContent) error
	GetCampaignContentByID(ctx context.Context, id string) (*CampaignContent, error)
	UpdateCampaignContent(ctx context.Context, content *CampaignContent) error
	DeleteCampaignContent(ctx context.Context, id string) error

	// Campaign Summary operations
	CreateCampaignSummary(ctx context.Context, summary *CampaignSummary) error
	GetCampaignSummaryByCampaignID(ctx context.Context, campaignID string) (*CampaignSummary, error)
	UpdateCampaignSummary(ctx context.Context, summary *CampaignSummary) error
	DeleteCampaignSummary(ctx context.Context, campaignID string) error
	UpsertCampaignSummary(ctx context.Context, summary *CampaignSummary) error

	// Campaign Fact Cache operations (for chunked summary pipeline)
	CreateFactCache(ctx context.Context, cache *CampaignFactCache) error
	GetFactCache(ctx context.Context, campaignID, contentType, contentID string) (*CampaignFactCache, error)
	ListFactCacheByCampaign(ctx context.Context, campaignID string) ([]*CampaignFactCache, error)
	UpsertFactCache(ctx context.Context, cache *CampaignFactCache) error
	DeleteFactCacheByContent(ctx context.Context, campaignID, contentType, contentID string) error
	DeleteFactCacheByCampaign(ctx context.Context, campaignID string) error

	// Summary Generation Job operations (for async progress tracking)
	CreateSummaryJob(ctx context.Context, job *SummaryGenerationJob) error
	GetSummaryJob(ctx context.Context, id string) (*SummaryGenerationJob, error)
	UpdateSummaryJob(ctx context.Context, job *SummaryGenerationJob) error
	GetActiveSummaryJobForCampaign(ctx context.Context, campaignID string) (*SummaryGenerationJob, error)
	DeleteSummaryJob(ctx context.Context, id string) error

	// Campaign Content Status operations
	UpsertCampaignContentStatus(ctx context.Context, status *CampaignContentStatus) error
	GetCampaignContentStatus(ctx context.Context, campaignID string, contentType string, contentID string) (*CampaignContentStatus, error)
	ListCampaignContentStatus(ctx context.Context, campaignID string, contentType *string) ([]*CampaignContentStatus, error)
	DeleteCampaignContentStatus(ctx context.Context, id string) error

	// Campaign Status Queries (convenience methods)
	MarkContentDefeated(ctx context.Context, campaignID string, contentType string, contentID string) error
	MarkContentVisited(ctx context.Context, campaignID string, contentID string) error
	MarkContentObtained(ctx context.Context, campaignID string, contentID string) error
	MarkContentHeard(ctx context.Context, campaignID string, contentID string) error
	MarkContentTriggered(ctx context.Context, campaignID string, contentID string) error
	MarkContentEncountered(ctx context.Context, campaignID string, contentID string) error
	MarkContentCompleted(ctx context.Context, campaignID string, contentType string, contentID string) error
	UpdateRelationshipNotes(ctx context.Context, campaignID string, npcID string, notes string) error

	// Session operations
	CreateSession(ctx context.Context, session *Session) error
	GetSessionByID(ctx context.Context, id string) (*Session, error)
	ListSessionsByCampaignID(ctx context.Context, campaignID string) ([]*Session, error)
	ListActiveSessionsByCampaignID(ctx context.Context, campaignID string) ([]*Session, error)
	UpdateSession(ctx context.Context, session *Session) error
	CompleteSession(ctx context.Context, id string, summary *string) error
	DeleteSession(ctx context.Context, id string) error

	// Session Event operations
	CreateSessionEvent(ctx context.Context, event *SessionEvent) error
	ListSessionEvents(ctx context.Context, sessionID string) ([]*SessionEvent, error)
	ListSessionEventsByRound(ctx context.Context, sessionID string, round int) ([]*SessionEvent, error)
	ListImportantSessionEvents(ctx context.Context, sessionID string) ([]*SessionEvent, error)

	// Combat Encounter operations
	CreateCombatEncounter(ctx context.Context, combat *CombatEncounter) error
	GetCombatEncounterByID(ctx context.Context, id string) (*CombatEncounter, error)
	GetCombatEncounterBySessionID(ctx context.Context, sessionID string) (*CombatEncounter, error)
	UpdateCombatEncounter(ctx context.Context, combat *CombatEncounter) error
	DeleteCombatEncounter(ctx context.Context, id string) error

	// Combat Participant operations
	CreateCombatParticipant(ctx context.Context, participant *CombatParticipant) error
	GetCombatParticipantByID(ctx context.Context, id string) (*CombatParticipant, error)
	ListCombatParticipants(ctx context.Context, combatID string) ([]*CombatParticipant, error)
	UpdateCombatParticipant(ctx context.Context, participant *CombatParticipant) error
	DeleteCombatParticipant(ctx context.Context, id string) error

	// Combat Condition operations
	CreateCombatCondition(ctx context.Context, condition *CombatCondition) error
	ListCombatConditions(ctx context.Context, participantID string) ([]*CombatCondition, error)
	DeleteCombatCondition(ctx context.Context, id string) error

	// Campaign-linked combat operations
	GetActiveCombatByCampaignID(ctx context.Context, campaignID string) (*CombatEncounter, error)
	ListCombatsByCampaignID(ctx context.Context, campaignID string) ([]*CombatEncounter, error)
	GetParticipantByOwnerUserID(ctx context.Context, combatID, userID string) (*CombatParticipant, error)
	GetParticipantByCharacterID(ctx context.Context, combatID, characterID string) (*CombatParticipant, error)
	ListVisibleParticipants(ctx context.Context, combatID string) ([]*CombatParticipant, error)

	// Combat Settings operations
	GetCombatSettings(ctx context.Context, campaignID string) (*CombatSettings, error)
	UpsertCombatSettings(ctx context.Context, settings *CombatSettings) error

	// Social Encounter operations
	CreateSocialEncounter(ctx context.Context, encounter *SocialEncounter) error
	GetSocialEncounterByID(ctx context.Context, id string) (*SocialEncounter, error)
	GetSocialEncounterBySessionID(ctx context.Context, sessionID string) (*SocialEncounter, error)
	UpdateSocialEncounter(ctx context.Context, encounter *SocialEncounter) error
	DeleteSocialEncounter(ctx context.Context, id string) error

	// Social Check operations
	CreateSocialCheck(ctx context.Context, check *SocialCheck) error
	ListSocialChecks(ctx context.Context, encounterID string) ([]*SocialCheck, error)

	// Tavern Encounter operations
	CreateTavernEncounter(ctx context.Context, encounter *TavernEncounter) error
	GetTavernEncounterByID(ctx context.Context, id string) (*TavernEncounter, error)
	GetTavernEncounterBySessionID(ctx context.Context, sessionID string) (*TavernEncounter, error)
	UpdateTavernEncounter(ctx context.Context, encounter *TavernEncounter) error
	DeleteTavernEncounter(ctx context.Context, id string) error

	// Patron Interaction operations
	CreatePatronInteraction(ctx context.Context, patron *PatronInteraction) error
	GetPatronInteraction(ctx context.Context, id string) (*PatronInteraction, error)
	ListPatronInteractions(ctx context.Context, encounterID string) ([]*PatronInteraction, error)
	UpdatePatronInteraction(ctx context.Context, patron *PatronInteraction) error

	// Rumor Tracking operations
	CreateRumorTracking(ctx context.Context, rumor *RumorTracking) error
	ListRumorTracking(ctx context.Context, encounterID string) ([]*RumorTracking, error)
	UpdateRumorTracking(ctx context.Context, rumor *RumorTracking) error

	// Tavern Tab operations
	CreateTavernTab(ctx context.Context, tab *TavernTab) error
	ListTavernTabs(ctx context.Context, encounterID string) ([]*TavernTab, error)
	UpdateTavernTab(ctx context.Context, tab *TavernTab) error

	// Shopping Encounter operations
	CreateShoppingEncounter(ctx context.Context, encounter *ShoppingEncounter) error
	GetShoppingEncounterByID(ctx context.Context, id string) (*ShoppingEncounter, error)
	GetShoppingEncounterBySessionID(ctx context.Context, sessionID string) (*ShoppingEncounter, error)
	UpdateShoppingEncounter(ctx context.Context, encounter *ShoppingEncounter) error
	DeleteShoppingEncounter(ctx context.Context, id string) error

	// Shopping Cart operations
	CreateShoppingCartItem(ctx context.Context, item *ShoppingCart) error
	ListShoppingCartItems(ctx context.Context, encounterID string) ([]*ShoppingCart, error)
	UpdateShoppingCartItem(ctx context.Context, item *ShoppingCart) error
	DeleteShoppingCartItem(ctx context.Context, id string) error

	// Haggling Session operations
	CreateHagglingSession(ctx context.Context, session *HagglingSession) error
	GetHagglingSession(ctx context.Context, id string) (*HagglingSession, error)
	ListHagglingSessions(ctx context.Context, encounterID string) ([]*HagglingSession, error)
	UpdateHagglingSession(ctx context.Context, session *HagglingSession) error

	// Session Chat operations
	CreateSessionChatMessage(ctx context.Context, msg *SessionChatMessage) error
	GetSessionChatMessages(ctx context.Context, campaignID string, limit int) ([]*SessionChatMessage, error)
	ClearSessionChatMessages(ctx context.Context, campaignID, userID string) error
	GetRecentSessionChatMessages(ctx context.Context, campaignID string, limit int) ([]*SessionChatMessage, error)

	// Chat Conversation operations
	CreateChatConversation(ctx context.Context, conv *ChatConversation) error
	GetChatConversationByID(ctx context.Context, id string) (*ChatConversation, error)
	ListChatConversationsByCampaignID(ctx context.Context, campaignID, userID string) ([]*ChatConversation, error)
	UpdateChatConversation(ctx context.Context, conv *ChatConversation) error
	DeleteChatConversation(ctx context.Context, id string) error

	// Chat messages by conversation
	GetSessionChatMessagesByConversationID(ctx context.Context, conversationID string, limit int) ([]*SessionChatMessage, error)
	ClearSessionChatMessagesByConversationID(ctx context.Context, conversationID string) error

	// Chat Source Preferences operations
	GetChatSourcePreferences(ctx context.Context, campaignID string) (*ChatSourcePreferences, error)
	UpsertChatSourcePreferences(ctx context.Context, prefs *ChatSourcePreferences) error

	// User Context operations
	CreateUserContext(ctx context.Context, uc *UserContext) error
	GetUserContextByUserID(ctx context.Context, userID string) (*UserContext, error)
	UpdateUserContext(ctx context.Context, uc *UserContext) error
	UpsertUserContext(ctx context.Context, uc *UserContext) error
	DeleteUserContext(ctx context.Context, userID string) error
	MarkOnboardingComplete(ctx context.Context, userID string) error
	GetOrCreateUserContext(ctx context.Context, userID string) (*UserContext, error)
	UpdateUserUISettings(ctx context.Context, userID string, uiSettings []byte) error
	GetUserUISettings(ctx context.Context, userID string) ([]byte, error)

	// Campaign Invite operations
	CreateCampaignInvite(ctx context.Context, invite *CampaignInvite) error
	GetCampaignInviteByCode(ctx context.Context, code string) (*CampaignInvite, error)
	ListCampaignInvites(ctx context.Context, campaignID string) ([]*CampaignInvite, error)
	DecrementInviteUses(ctx context.Context, inviteID string) error
	DeactivateCampaignInvite(ctx context.Context, campaignID, code string) error

	// Campaign Member operations
	CreateCampaignMember(ctx context.Context, member *CampaignMember) error
	GetCampaignMember(ctx context.Context, campaignID, userID string) (*CampaignMember, error)
	ListCampaignMembers(ctx context.Context, campaignID string) ([]*CampaignMember, error)
	ListUserMemberships(ctx context.Context, userID string) ([]*CampaignMember, error)
	DeleteCampaignMember(ctx context.Context, campaignID, userID string) error
	UpdateCampaignMemberCharacter(ctx context.Context, campaignID, userID string, characterID *string) error
	GetCampaignsWithMembership(ctx context.Context, userID string) ([]*CampaignWithMembership, error)

	// Wrapper methods for generic helpers
	GetChaseByIDWithInterface(ctx context.Context, id string) (interface{ GetUserID() string }, error)
	GetCombatEncounterByIDWithInterface(ctx context.Context, id string) (interface{ GetSessionID() string }, error)
	GetSessionByIDWithInterface(ctx context.Context, id string) (interface{ GetUserID() string }, error)

	// ============================================================================
	// Player Mode Operations
	// ============================================================================

	// Player Journal operations
	CreatePlayerJournalEntry(ctx context.Context, entry *PlayerJournalEntry) error
	GetPlayerJournalEntryByID(ctx context.Context, id string) (*PlayerJournalEntry, error)
	ListPlayerJournalEntries(ctx context.Context, userID string, campaignID *string) ([]*PlayerJournalEntry, error)
	UpdatePlayerJournalEntry(ctx context.Context, entry *PlayerJournalEntry) error
	DeletePlayerJournalEntry(ctx context.Context, id string) error

	// Player Quest Tracking operations
	CreatePlayerQuestTracking(ctx context.Context, quest *PlayerQuestTracking) error
	GetPlayerQuestTrackingByID(ctx context.Context, id string) (*PlayerQuestTracking, error)
	ListPlayerQuestTracking(ctx context.Context, userID string, campaignID *string, status *string) ([]*PlayerQuestTracking, error)
	UpdatePlayerQuestTracking(ctx context.Context, quest *PlayerQuestTracking) error
	DeletePlayerQuestTracking(ctx context.Context, id string) error

	// Player NPC Encounter operations
	CreatePlayerNPCEncounter(ctx context.Context, encounter *PlayerNPCEncounter) error
	GetPlayerNPCEncounterByID(ctx context.Context, id string) (*PlayerNPCEncounter, error)
	ListPlayerNPCEncounters(ctx context.Context, userID string, campaignID *string) ([]*PlayerNPCEncounter, error)
	UpdatePlayerNPCEncounter(ctx context.Context, encounter *PlayerNPCEncounter) error
	DeletePlayerNPCEncounter(ctx context.Context, id string) error

	// Player Location Visit operations
	CreatePlayerLocationVisit(ctx context.Context, visit *PlayerLocationVisit) error
	GetPlayerLocationVisitByID(ctx context.Context, id string) (*PlayerLocationVisit, error)
	ListPlayerLocationVisits(ctx context.Context, userID string, campaignID *string) ([]*PlayerLocationVisit, error)
	UpdatePlayerLocationVisit(ctx context.Context, visit *PlayerLocationVisit) error
	DeletePlayerLocationVisit(ctx context.Context, id string) error

	// Party Loot operations
	CreatePartyLoot(ctx context.Context, loot *PartyLoot) error
	GetPartyLootByID(ctx context.Context, id string) (*PartyLoot, error)
	ListPartyLoot(ctx context.Context, campaignID string) ([]*PartyLoot, error)
	UpdatePartyLoot(ctx context.Context, loot *PartyLoot) error
	DeletePartyLoot(ctx context.Context, id string) error
	ClaimPartyLoot(ctx context.Context, lootID string, characterID string, characterName string) error

	// Content Reveal operations
	CreateContentReveal(ctx context.Context, reveal *ContentReveal) error
	GetContentReveal(ctx context.Context, campaignID, contentType, contentID string) (*ContentReveal, error)
	ListContentReveals(ctx context.Context, campaignID string, contentType *string) ([]*ContentReveal, error)
	DeleteContentReveal(ctx context.Context, id string) error

	// Ability Usage Tracking operations
	CreateAbilityUsageTracking(ctx context.Context, tracking *AbilityUsageTracking) error
	GetAbilityUsageTrackingByID(ctx context.Context, id string) (*AbilityUsageTracking, error)
	ListAbilityUsageTracking(ctx context.Context, characterID string) ([]*AbilityUsageTracking, error)
	UpdateAbilityUsageTracking(ctx context.Context, tracking *AbilityUsageTracking) error
	DeleteAbilityUsageTracking(ctx context.Context, id string) error
	UseAbility(ctx context.Context, id string) error
	ResetAbility(ctx context.Context, id string) error
	ResetAbilitiesByRechargeType(ctx context.Context, characterID string, rechargeType string) error

	// Player Combat State operations
	CreatePlayerCombatState(ctx context.Context, state *PlayerCombatState) error
	GetPlayerCombatStateByCharacterID(ctx context.Context, characterID string) (*PlayerCombatState, error)
	UpdatePlayerCombatState(ctx context.Context, state *PlayerCombatState) error
	UpsertPlayerCombatState(ctx context.Context, state *PlayerCombatState) error
	DeletePlayerCombatState(ctx context.Context, characterID string) error
}
