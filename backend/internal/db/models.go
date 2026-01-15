package db

import (
	"encoding/json"
	"time"
)

// Campaign represents a campaign/world setting
type Campaign struct {
	ID          string          `json:"id"`
	UserID      string          `json:"user_id"`
	Name        string          `json:"name"`
	Description *string         `json:"description,omitempty"`
	GameSystem  string          `json:"game_system"`           // Default: "Dungeons & Dragons 5th Edition"
	Theme       *string         `json:"theme,omitempty"`       // "High Fantasy", "Dark Fantasy", "Urban", etc.
	Tone        *string         `json:"tone,omitempty"`        // "Serious", "Comedic", "Gritty", etc.
	Setting     json.RawMessage `json:"setting,omitempty"`     // World details
	Factions    json.RawMessage `json:"factions,omitempty"`    // Array of faction info
	History     *string         `json:"history,omitempty"`     // World history
	MagicLevel  *string         `json:"magic_level,omitempty"` // "Low", "Standard", "High"
	TechLevel   *string         `json:"tech_level,omitempty"`  // "Medieval", "Renaissance", etc.
	Notes       *string         `json:"notes,omitempty"`
	Role        string          `json:"role"`      // "owner" (GM) or "player" - user's role in this campaign
	IsActive    bool            `json:"is_active"` // Currently active campaign
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

// User represents a user in the system
type User struct {
	ID           string    `json:"id"`
	Username     string    `json:"username"`
	Email        string    `json:"email"`
	DisplayName  *string   `json:"display_name,omitempty"` // Optional friendly display name
	PasswordHash string    `json:"-"`                      // Never send password hash in JSON
	IsAdmin      bool      `json:"is_admin"`
	GameSystem   string    `json:"game_system"` // Default: "Dungeons & Dragons 5th Edition"
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// Tool represents a configured tool for a user
type Tool struct {
	ID        string          `json:"id"`
	UserID    string          `json:"user_id"`
	Name      string          `json:"name"`
	Type      string          `json:"type"` // 'external', 'generator', 'git'
	URL       *string         `json:"url,omitempty"`
	Config    json.RawMessage `json:"config,omitempty"`
	Position  int             `json:"position"`
	IsPinned  bool            `json:"is_pinned"`
	CreatedAt time.Time       `json:"created_at"`
}

// NPC represents an AI-generated or manually created NPC
type NPC struct {
	ID          string          `json:"id"`
	UserID      string          `json:"user_id"`
	CampaignID  *string         `json:"campaign_id,omitempty"` // Optional campaign context
	Name        string          `json:"name"`
	Race        *string         `json:"race,omitempty"`
	Class       *string         `json:"class,omitempty"`
	Personality *string         `json:"personality,omitempty"`
	Backstory   *string         `json:"backstory,omitempty"`
	Stats       json.RawMessage `json:"stats,omitempty"`
	Inventory   json.RawMessage `json:"inventory,omitempty"` // Array of {item_id, quantity, notes} for item cross-references
	AIGenerated bool            `json:"ai_generated"`
	AIProvider  *string         `json:"ai_provider,omitempty"`
	CreatedAt   time.Time       `json:"created_at"`
}

// Monster represents an AI-generated or manually created monster
type Monster struct {
	ID          string          `json:"id"`
	UserID      string          `json:"user_id"`
	CampaignID  *string         `json:"campaign_id,omitempty"` // Optional campaign context
	Name        string          `json:"name"`
	CR          float64         `json:"cr"` // Challenge Rating
	Stats       json.RawMessage `json:"stats"`
	Lore        *string         `json:"lore,omitempty"`
	Tactics     *string         `json:"tactics,omitempty"`
	AIGenerated bool            `json:"ai_generated"`
	CreatedAt   time.Time       `json:"created_at"`
}

// Encounter represents a combat encounter
type Encounter struct {
	ID          string          `json:"id"`
	UserID      string          `json:"user_id"`
	CampaignID  *string         `json:"campaign_id,omitempty"`
	Name        string          `json:"name"`
	PartyLevel  int             `json:"party_level"`
	PartySize   int             `json:"party_size"`
	Difficulty  string          `json:"difficulty"` // 'easy', 'medium', 'hard', 'deadly'
	Description *string         `json:"description,omitempty"`
	Environment json.RawMessage `json:"environment,omitempty"` // Environment details
	Creatures   json.RawMessage `json:"creatures"`             // Array of creatures
	Treasure    json.RawMessage `json:"treasure,omitempty"`    // Treasure details
	XPTotal     int             `json:"xp_total,omitempty"`
	XPPerPlayer float64         `json:"xp_per_player,omitempty"`
	Notes       *string         `json:"notes,omitempty"`
	AIGenerated bool            `json:"ai_generated"`
	CreatedAt   time.Time       `json:"created_at"`
}

// Dialogue represents an AI-generated dialogue/conversation
type Dialogue struct {
	ID              string          `json:"id"`
	UserID          string          `json:"user_id"`
	CampaignID      *string         `json:"campaign_id,omitempty"`
	CharacterName   string          `json:"character_name"`
	SceneSetting    *string         `json:"scene_setting,omitempty"`
	Mood            *string         `json:"mood,omitempty"`
	DialogueTree    json.RawMessage `json:"dialogue_tree"`          // Branching dialogue options
	SkillChecks     json.RawMessage `json:"skill_checks,omitempty"` // Array of skill checks
	Information     json.RawMessage `json:"information,omitempty"`  // Information revealed
	PotentialQuests json.RawMessage `json:"potential_quests,omitempty"`
	AIGenerated     bool            `json:"ai_generated"`
	CreatedAt       time.Time       `json:"created_at"`
}

// Location represents a place in the campaign world
type Location struct {
	ID          string          `json:"id"`
	UserID      string          `json:"user_id"`
	CampaignID  *string         `json:"campaign_id,omitempty"`
	Name        string          `json:"name"`
	Type        string          `json:"type"` // 'settlement', 'dungeon', 'tavern', 'shop', 'temple', 'wilderness', 'ruins', 'lair'
	Theme       *string         `json:"theme,omitempty"`
	Description *string         `json:"description,omitempty"`
	Features    json.RawMessage `json:"features,omitempty"`   // Array of notable features
	Secrets     json.RawMessage `json:"secrets,omitempty"`    // Array of secrets/clues
	Factions    json.RawMessage `json:"factions,omitempty"`   // Array of faction names present
	NPCs        json.RawMessage `json:"npcs,omitempty"`       // Array of NPC IDs or names
	Encounters  json.RawMessage `json:"encounters,omitempty"` // Array of encounter hooks
	Treasure    json.RawMessage `json:"treasure,omitempty"`   // Array of {item_id, quantity, found} for item cross-references
	Map         *string         `json:"map,omitempty"`        // Map image URL or description
	ParentID    *string         `json:"parent_id,omitempty"`  // For nested locations (e.g., shop in a city)
	AIGenerated bool            `json:"ai_generated"`
	AIProvider  *string         `json:"ai_provider,omitempty"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

// Quest represents a quest, job, or story hook
type Quest struct {
	ID                string          `json:"id"`
	UserID            string          `json:"user_id"`
	CampaignID        *string         `json:"campaign_id,omitempty"`
	Title             string          `json:"title"`
	Type              string          `json:"type"`               // 'main', 'side', 'faction', 'timed'
	Category          *string         `json:"category,omitempty"` // 'mystery', 'politics', 'exploration', 'combat', 'social'
	Description       *string         `json:"description,omitempty"`
	Objectives        json.RawMessage `json:"objectives,omitempty"`         // Array of quest objectives
	Rewards           json.RawMessage `json:"rewards,omitempty"`            // Gold, items, XP, reputation
	Complications     json.RawMessage `json:"complications,omitempty"`      // Potential twists
	NPCsInvolved      json.RawMessage `json:"npcs_involved,omitempty"`      // Array of NPC IDs or names
	LocationsInvolved json.RawMessage `json:"locations_involved,omitempty"` // Array of location IDs
	FactionAlignment  *string         `json:"faction_alignment,omitempty"`  // Which faction offers this
	PartyLevel        *int            `json:"party_level,omitempty"`        // Recommended level
	Status            string          `json:"status"`                       // 'available', 'active', 'completed', 'failed'
	MoralAmbiguity    *bool           `json:"moral_ambiguity,omitempty"`    // True if morally complex
	CombatIntensity   *string         `json:"combat_intensity,omitempty"`   // 'none', 'light', 'medium', 'heavy'
	TimeLimit         *string         `json:"time_limit,omitempty"`         // "3 days", "urgent", etc.
	AIGenerated       bool            `json:"ai_generated"`
	AIProvider        *string         `json:"ai_provider,omitempty"`
	CreatedAt         time.Time       `json:"created_at"`
	UpdatedAt         time.Time       `json:"updated_at"`
}

// Item represents an item, loot, or treasure
type Item struct {
	ID            string          `json:"id"`
	UserID        string          `json:"user_id"`
	CampaignID    *string         `json:"campaign_id,omitempty"` // Optional campaign context
	Name          string          `json:"name"`
	Type          string          `json:"type"`             // 'weapon', 'armor', 'consumable', 'treasure', 'tool', 'quest_item', 'relic'
	Rarity        *string         `json:"rarity,omitempty"` // 'common', 'uncommon', 'rare', 'very_rare', 'legendary', 'artifact'
	Description   *string         `json:"description,omitempty"`
	Properties    json.RawMessage `json:"properties,omitempty"`     // Mechanical properties
	Origin        *string         `json:"origin,omitempty"`         // Backstory/creation
	PreviousOwner *string         `json:"previous_owner,omitempty"` // Who owned it before
	Complication  *string         `json:"complication,omitempty"`   // Curse, flaw, or story hook
	Value         *int            `json:"value,omitempty"`          // Gold value
	Weight        *float64        `json:"weight,omitempty"`         // Weight in pounds
	Attunement    *bool           `json:"attunement,omitempty"`     // Requires attunement
	LocationFound *string         `json:"location_found,omitempty"` // Where it was found
	AIGenerated   bool            `json:"ai_generated"`
	AIProvider    *string         `json:"ai_provider,omitempty"`
	CreatedAt     time.Time       `json:"created_at"`
	UpdatedAt     time.Time       `json:"updated_at"`
}

// Rumor represents gossip, whispers, or information the party might hear
type Rumor struct {
	ID            string          `json:"id"`
	UserID        string          `json:"user_id"`
	CampaignID    *string         `json:"campaign_id,omitempty"`
	Text          string          `json:"text"`
	Source        *string         `json:"source,omitempty"`        // "Tavern gossip", "Street whisper", etc.
	Veracity      string          `json:"veracity"`                // 'true', 'partially_true', 'false'
	LeadsTo       *string         `json:"leads_to,omitempty"`      // 'npc', 'location', 'quest', 'item'
	RelatedID     *string         `json:"related_id,omitempty"`    // ID of related entity
	Context       *string         `json:"context,omitempty"`       // When/where this would be heard
	Foreshadowing *bool           `json:"foreshadowing,omitempty"` // Is this foreshadowing future events
	Tags          json.RawMessage `json:"tags,omitempty"`          // Array of thematic tags
	Revealed      bool            `json:"revealed"`                // Has this been shared with players
	AIGenerated   bool            `json:"ai_generated"`
	AIProvider    *string         `json:"ai_provider,omitempty"`
	CreatedAt     time.Time       `json:"created_at"`
	UpdatedAt     time.Time       `json:"updated_at"`
}

// Tavern represents a tavern, inn, or drinking establishment
type Tavern struct {
	ID                string          `json:"id"`
	UserID            string          `json:"user_id"`
	CampaignID        *string         `json:"campaign_id,omitempty"`
	Name              string          `json:"name"`
	Type              string          `json:"type"`                         // 'tavern', 'inn', 'pub', 'alehouse', 'roadhouse', 'brewery'
	Atmosphere        *string         `json:"atmosphere,omitempty"`         // Brief feel/vibe
	Description       *string         `json:"description,omitempty"`        // Detailed description
	KeeperName        string          `json:"keeper_name"`                  // Tavern keeper name
	KeeperPersonality string          `json:"keeper_personality"`           // Brief personality
	KeeperDescription *string         `json:"keeper_description,omitempty"` // Detailed keeper info
	MenuFood          json.RawMessage `json:"menu_food,omitempty"`          // Array of food items
	MenuDrinks        json.RawMessage `json:"menu_drinks,omitempty"`        // Array of drink items
	Rooms             json.RawMessage `json:"rooms,omitempty"`              // Array of room types
	Patrons           json.RawMessage `json:"patrons,omitempty"`            // Array of current patrons
	Events            json.RawMessage `json:"events,omitempty"`             // Current happenings
	Rumors            json.RawMessage `json:"rumors,omitempty"`             // Rumors heard here
	SpecialNotes      *string         `json:"special_notes,omitempty"`      // Secret rooms, connections, etc.
	AIGenerated       bool            `json:"ai_generated"`
	AIProvider        *string         `json:"ai_provider,omitempty"`
	CreatedAt         time.Time       `json:"created_at"`
	UpdatedAt         time.Time       `json:"updated_at"`
}

// Merchant represents a shop or merchant establishment
type Merchant struct {
	ID                string          `json:"id"`
	UserID            string          `json:"user_id"`
	CampaignID        *string         `json:"campaign_id,omitempty"`
	Name              string          `json:"name"`                         // Shop name
	ShopType          string          `json:"shop_type"`                    // 'general_store', 'blacksmith', 'apothecary', 'magic_shop', 'tavern_supplies', etc.
	Atmosphere        *string         `json:"atmosphere,omitempty"`         // Brief feel/vibe
	Description       *string         `json:"description,omitempty"`        // Shop description
	Location          *string         `json:"location,omitempty"`           // Where in the world
	OwnerName         string          `json:"owner_name"`                   // Shopkeeper name
	OwnerPersonality  string          `json:"owner_personality"`            // Brief personality
	OwnerDescription  *string         `json:"owner_description,omitempty"`  // Detailed keeper info
	Inventory         json.RawMessage `json:"inventory,omitempty"`          // Array of items for sale
	Services          json.RawMessage `json:"services,omitempty"`           // Special services offered
	SpecialItems      json.RawMessage `json:"special_items,omitempty"`      // Rare/unique items
	Rumors            json.RawMessage `json:"rumors,omitempty"`             // Rumors shopkeeper knows
	RecentlySold      json.RawMessage `json:"recently_sold,omitempty"`      // Recently sold items for continuity
	SpecialNotes      *string         `json:"special_notes,omitempty"`      // Secret inventory, black market connections, etc.
	HaggleWillingness *string         `json:"haggle_willingness,omitempty"` // 'never', 'rarely', 'sometimes', 'often', 'always'
	AIGenerated       bool            `json:"ai_generated"`
	AIProvider        *string         `json:"ai_provider,omitempty"`
	CreatedAt         time.Time       `json:"created_at"`
	UpdatedAt         time.Time       `json:"updated_at"`
}

// Trap represents a trap or puzzle
type Trap struct {
	ID            string          `json:"id"`
	UserID        string          `json:"user_id"`
	CampaignID    *string         `json:"campaign_id,omitempty"`
	Name          string          `json:"name"`                     // Trap name
	TrapType      string          `json:"trap_type"`                // 'mechanical', 'magical', 'puzzle', 'combination', 'environmental'
	Difficulty    string          `json:"difficulty"`               // 'easy', 'medium', 'hard', 'deadly'
	Description   *string         `json:"description,omitempty"`    // Trap description
	Environment   *string         `json:"environment,omitempty"`    // Where trap is found
	Trigger       *string         `json:"trigger,omitempty"`        // What activates the trap
	Effect        *string         `json:"effect,omitempty"`         // What happens when triggered
	Damage        *string         `json:"damage,omitempty"`         // Damage dealt (e.g., "2d6 piercing")
	Detection     json.RawMessage `json:"detection,omitempty"`      // Detection DCs and clues
	SolutionPaths json.RawMessage `json:"solution_paths,omitempty"` // Multiple ways to solve/bypass
	Complications json.RawMessage `json:"complications,omitempty"`  // Additional challenges
	Rewards       json.RawMessage `json:"rewards,omitempty"`        // Rewards for success
	Scaling       json.RawMessage `json:"scaling,omitempty"`        // How to adjust difficulty
	DMNotes       *string         `json:"dm_notes,omitempty"`       // Notes for the DM
	AIGenerated   bool            `json:"ai_generated"`
	AIProvider    *string         `json:"ai_provider,omitempty"`
	CreatedAt     time.Time       `json:"created_at"`
	UpdatedAt     time.Time       `json:"updated_at"`
}

// Critter represents a creature, animal, or beast
type Critter struct {
	ID                 string          `json:"id"`
	UserID             string          `json:"user_id"`
	CampaignID         *string         `json:"campaign_id,omitempty"`
	Name               string          `json:"name"`                          // Common name
	Species            *string         `json:"species,omitempty"`             // Scientific/fantasy species name
	CritterType        string          `json:"critter_type"`                  // 'bird', 'mammal', 'reptile', etc.
	Size               string          `json:"size"`                          // 'tiny', 'small', 'medium', 'large', etc.
	Temperament        *string         `json:"temperament,omitempty"`         // 'docile', 'curious', 'aggressive', etc.
	Habitat            *string         `json:"habitat,omitempty"`             // Primary environment
	Description        *string         `json:"description,omitempty"`         // Physical appearance
	Behavior           *string         `json:"behavior,omitempty"`            // How it acts
	Stats              json.RawMessage `json:"stats,omitempty"`               // D&D stats (AC, HP, Speed, abilities)
	SpecialAbilities   json.RawMessage `json:"special_abilities,omitempty"`   // Special abilities array
	Uses               json.RawMessage `json:"uses,omitempty"`                // Potential uses array
	TrainingDifficulty *string         `json:"training_difficulty,omitempty"` // How hard to train
	Diet               *string         `json:"diet,omitempty"`                // Carnivore, herbivore, etc.
	Lifespan           *string         `json:"lifespan,omitempty"`            // How long it lives
	InterestingFacts   json.RawMessage `json:"interesting_facts,omitempty"`   // Cool facts array
	EncounterNotes     *string         `json:"encounter_notes,omitempty"`     // How to use in game
	AIGenerated        bool            `json:"ai_generated"`
	AIProvider         *string         `json:"ai_provider,omitempty"`
	CreatedAt          time.Time       `json:"created_at"`
	UpdatedAt          time.Time       `json:"updated_at"`
}

// Chase represents a chase/pursuit scene
type Chase struct {
	ID                   string          `json:"id"`
	UserID               string          `json:"user_id"`
	CampaignID           *string         `json:"campaign_id,omitempty"`
	Name                 string          `json:"name"`                            // Chase name/title
	ChaseType            string          `json:"chase_type"`                      // 'foot_chase', 'mounted_chase', 'vehicle_chase', etc.
	Terrain              string          `json:"terrain"`                         // 'urban', 'urban_rooftops', 'forest', etc.
	Difficulty           string          `json:"difficulty"`                      // 'easy', 'medium', 'challenging', 'hard', 'extreme'
	Description          *string         `json:"description,omitempty"`           // Chase description
	Setting              *string         `json:"setting,omitempty"`               // Physical setting details
	Participants         json.RawMessage `json:"participants,omitempty"`          // Quarry and pursuers
	StartingConditions   *string         `json:"starting_conditions,omitempty"`   // Initial situation
	Obstacles            json.RawMessage `json:"obstacles,omitempty"`             // Array of obstacles with DCs
	Complications        json.RawMessage `json:"complications,omitempty"`         // Random events/complications
	Shortcuts            json.RawMessage `json:"shortcuts,omitempty"`             // Alternative paths
	ChasePhases          json.RawMessage `json:"chase_phases,omitempty"`          // How chase progresses by round
	EndingConditions     json.RawMessage `json:"ending_conditions,omitempty"`     // Success/failure conditions
	Rewards              json.RawMessage `json:"rewards,omitempty"`               // Rewards for different outcomes
	SpecialRules         *string         `json:"special_rules,omitempty"`         // Mechanics for running chase
	EnvironmentalFactors json.RawMessage `json:"environmental_factors,omitempty"` // Weather, visibility, etc.
	AIGenerated          bool            `json:"ai_generated"`
	AIProvider           *string         `json:"ai_provider,omitempty"`
	CreatedAt            time.Time       `json:"created_at"`
	UpdatedAt            time.Time       `json:"updated_at"`

	// Tracker-specific fields
	CurrentRound     int     `json:"current_round"`        // Current round number (0 = not started)
	MaxRounds        *int    `json:"max_rounds,omitempty"` // Optional time limit
	StartingDistance int     `json:"starting_distance"`    // Initial spaces between pursuer/quarry
	CurrentDistance  int     `json:"current_distance"`     // Current spaces between pursuer/quarry
	CatchThreshold   int     `json:"catch_threshold"`      // Spaces needed to catch (usually 0)
	EscapeThreshold  int     `json:"escape_threshold"`     // Spaces needed to escape
	Status           string  `json:"status"`               // 'setup', 'active', 'completed'
	Outcome          *string `json:"outcome,omitempty"`    // 'caught', 'escaped', 'timeout', 'alternate'
	Notes            *string `json:"notes,omitempty"`      // GM notes
}

// ChaseParticipant represents a PC or NPC in a chase
type ChaseParticipant struct {
	ID                string          `json:"id"`
	ChaseID           string          `json:"chase_id"`
	ParticipantType   string          `json:"participant_type"`       // 'pc' or 'npc'
	CharacterID       *string         `json:"character_id,omitempty"` // Reference to characters table if PC
	NPCID             *string         `json:"npc_id,omitempty"`       // Reference to npcs table if NPC
	Name              string          `json:"name"`
	Role              string          `json:"role"`             // 'pursuer' or 'quarry'
	MovementSpeed     int             `json:"movement_speed"`   // In feet
	CurrentPosition   int             `json:"current_position"` // Position on track (spaces from start)
	Stamina           int             `json:"stamina"`
	MaxStamina        int             `json:"max_stamina"`
	HasDashed         bool            `json:"has_dashed"`           // Has used Dash action this round
	Conditions        json.RawMessage `json:"conditions,omitempty"` // JSON array: ['advantage', 'disadvantage', 'exhausted']
	MovementThisRound int             `json:"movement_this_round"`
	CreatedAt         time.Time       `json:"created_at"`
}

// ChaseChallenge represents a skill check for a chase round
type ChaseChallenge struct {
	ID              string          `json:"id"`
	ChaseID         string          `json:"chase_id"`
	Round           int             `json:"round"`
	Description     string          `json:"description"`
	Skill           string          `json:"skill"` // 'Athletics', 'Acrobatics', 'Perception', etc.
	DC              int             `json:"dc"`
	SuccessEffect   string          `json:"success_effect"`             // "+1 space", "Advantage next round", etc.
	FailureEffect   string          `json:"failure_effect"`             // "-1 space", "Fall prone", etc.
	AlternateSkills json.RawMessage `json:"alternate_skills,omitempty"` // JSON array of alternative valid skills
	AIGenerated     bool            `json:"ai_generated"`
	Used            bool            `json:"used"` // Has this challenge been used?
	CreatedAt       time.Time       `json:"created_at"`
}

// ChaseComplication represents an obstacle, hazard, or event
type ChaseComplication struct {
	ID               string    `json:"id"`
	ChaseID          string    `json:"chase_id"`
	Round            int       `json:"round"`
	Description      string    `json:"description"`
	ComplicationType string    `json:"complication_type"` // 'obstacle', 'hazard', 'bystander', 'terrain_change', 'reinforcement'
	Effect           *string   `json:"effect,omitempty"`
	SaveAbility      *string   `json:"save_ability,omitempty"` // 'Strength', 'Dexterity', etc.
	SaveDC           *int      `json:"save_dc,omitempty"`
	Resolved         bool      `json:"resolved"`
	CreatedAt        time.Time `json:"created_at"`
}

// ChaseEvent represents a history entry
type ChaseEvent struct {
	ID              string    `json:"id"`
	ChaseID         string    `json:"chase_id"`
	Round           int       `json:"round"`
	ParticipantName *string   `json:"participant_name,omitempty"`
	Action          string    `json:"action"`            // "rolled Athletics", "moved forward", "triggered complication"
	Roll            *int      `json:"roll,omitempty"`    // Dice roll result
	Success         *bool     `json:"success,omitempty"` // Was the check successful?
	Effect          string    `json:"effect"`            // Description of what happened
	CreatedAt       time.Time `json:"created_at"`
}

// Getter methods for generic helpers

// GetUserID returns the UserID field for Chase
func (c *Chase) GetUserID() string {
	return c.UserID
}

// GetSessionID returns the SessionID field for CombatEncounter
func (c *CombatEncounter) GetSessionID() string {
	return c.SessionID
}

// GetSessionID returns the SessionID field for SocialEncounter
func (s *SocialEncounter) GetSessionID() string {
	return s.SessionID
}

// GetSessionID returns the SessionID field for TavernEncounter
func (t *TavernEncounter) GetSessionID() string {
	return t.SessionID
}

// GetSessionID returns the SessionID field for ShoppingEncounter
func (s *ShoppingEncounter) GetSessionID() string {
	return s.SessionID
}

// GetUserID returns the UserID field for Session
func (s *Session) GetUserID() string {
	return s.UserID
}

// ChaseTemplate represents a pre-built chase scenario
type ChaseTemplate struct {
	ID                      string          `json:"id"`
	Name                    string          `json:"name"`
	Description             *string         `json:"description,omitempty"`
	ChaseType               string          `json:"chase_type"`
	Terrain                 *string         `json:"terrain,omitempty"`
	DefaultStartingDistance *int            `json:"default_starting_distance,omitempty"`
	DefaultCatchThreshold   *int            `json:"default_catch_threshold,omitempty"`
	DefaultEscapeThreshold  *int            `json:"default_escape_threshold,omitempty"`
	DefaultMaxRounds        *int            `json:"default_max_rounds,omitempty"`
	Difficulty              *string         `json:"difficulty,omitempty"`
	Challenges              json.RawMessage `json:"challenges"`           // JSON array of challenge templates
	Complications           json.RawMessage `json:"complications"`        // JSON array of complication templates
	IsPublic                bool            `json:"is_public"`            // Available to all users?
	CreatedBy               *string         `json:"created_by,omitempty"` // User ID of creator
	CreatedAt               time.Time       `json:"created_at"`
}

// Settings represents application-wide settings
type Settings struct {
	RegistrationEnabled        bool            `json:"registration_enabled"`
	AITimeoutSeconds           int             `json:"ai_timeout_seconds"`              // Timeout for AI service requests (default: 120)
	OllamaCapability           string          `json:"ollama_capability"`               // Device capability: "standard" or "low_power" (default: "standard")
	OllamaURL                  string          `json:"ollama_url,omitempty"`            // Custom Ollama endpoint URL (e.g., "http://localhost:11434")
	UISettings                 json.RawMessage `json:"ui_settings,omitempty"`           // JSON object for UI preferences
	DefaultCampaignEnabled     bool            `json:"default_campaign_enabled"`        // Whether to show the default Crossroads Chronicle campaign
	DefaultCampaignInitialized bool            `json:"default_campaign_initialized"`    // Whether the default campaign has been seeded
	RAGKnowledgeBaseEnabled    bool            `json:"rag_knowledge_base_enabled"`      // Whether RAG/wiki knowledge base feature is enabled
	EnabledSettingPacks        json.RawMessage `json:"enabled_setting_packs,omitempty"` // Array of enabled setting pack slugs ["eberron", "forgotten-realms", ...]
}

// SessionChatMessage represents a chat message in the session chat feature
type SessionChatMessage struct {
	ID             string          `json:"id"`
	CampaignID     string          `json:"campaign_id"`
	UserID         string          `json:"user_id"`
	ConversationID *string         `json:"conversation_id,omitempty"` // Optional conversation grouping
	Role           string          `json:"role"`                      // "user" or "assistant"
	Content        string          `json:"content"`
	RAGSources     json.RawMessage `json:"rag_sources,omitempty"` // Array of {page_title, source_url, similarity}
	CreatedAt      time.Time       `json:"created_at"`
}

// ChatConversation represents a conversation thread within a campaign
type ChatConversation struct {
	ID         string    `json:"id"`
	CampaignID string    `json:"campaign_id"`
	UserID     string    `json:"user_id"`
	Title      string    `json:"title"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// ChatSourcePreferences represents per-campaign chat source toggles
type ChatSourcePreferences struct {
	ID         string `json:"id"`
	CampaignID string `json:"campaign_id"`
	UserID     string `json:"user_id"`

	// Campaign content toggles
	IncludeNPCs            bool `json:"include_npcs"`
	IncludeMonsters        bool `json:"include_monsters"`
	IncludeLocations       bool `json:"include_locations"`
	IncludeQuests          bool `json:"include_quests"`
	IncludeItems           bool `json:"include_items"`
	IncludeEncounters      bool `json:"include_encounters"`
	IncludeRumors          bool `json:"include_rumors"`
	IncludeTaverns         bool `json:"include_taverns"`
	IncludeMerchants       bool `json:"include_merchants"`
	IncludeTraps           bool `json:"include_traps"`
	IncludeCritters        bool `json:"include_critters"`
	IncludeChases          bool `json:"include_chases"`
	IncludeDialogues       bool `json:"include_dialogues"`
	IncludeCampaignSummary bool `json:"include_campaign_summary"`

	// Wiki knowledge toggle
	IncludeWikiKnowledge bool            `json:"include_wiki_knowledge"`
	EnabledWikiSources   json.RawMessage `json:"enabled_wiki_sources,omitempty"` // Array of enabled wiki source slugs ["eberron", "forgotten-realms", ...]

	// Performance tuning
	MaxContextChunks int `json:"max_context_chunks"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// CampaignSummary represents an AI-generated summary of a campaign for context
type CampaignSummary struct {
	ID                string          `json:"id"`
	CampaignID        string          `json:"campaign_id"`
	UserID            string          `json:"user_id"`
	Overview          *string         `json:"overview,omitempty"`           // Brief campaign overview (1-2 sentences)
	SettingSummary    *string         `json:"setting_summary,omitempty"`    // Key setting details
	CharactersSummary *string         `json:"characters_summary,omitempty"` // Important NPCs and relationships
	PlotSummary       *string         `json:"plot_summary,omitempty"`       // Main quests and story arcs
	ToneSummary       *string         `json:"tone_summary,omitempty"`       // Atmosphere, themes, and style
	ContentStats      json.RawMessage `json:"content_stats,omitempty"`      // Counts by type {npcs: 5, locations: 3, ...}
	SectionSummaries  json.RawMessage `json:"section_summaries,omitempty"`  // {npcs: [...summaries], locations: [...], ...}
	Version           int             `json:"version"`                      // Increment on updates
	CreatedAt         time.Time       `json:"created_at"`
	UpdatedAt         time.Time       `json:"updated_at"`
}

// ContentStats represents counts of content by type
type ContentStats struct {
	NPCs            int `json:"npcs"`
	Locations       int `json:"locations"`
	Quests          int `json:"quests"`
	Monsters        int `json:"monsters"`
	Items           int `json:"items"`
	Encounters      int `json:"encounters"`
	Rumors          int `json:"rumors"`
	CampaignContent int `json:"campaign_content"`
}

// SectionSummaries represents summaries organized by content type
type SectionSummaries struct {
	NPCs            []string `json:"npcs,omitempty"`
	Locations       []string `json:"locations,omitempty"`
	Quests          []string `json:"quests,omitempty"`
	Monsters        []string `json:"monsters,omitempty"`
	Items           []string `json:"items,omitempty"`
	Encounters      []string `json:"encounters,omitempty"`
	Rumors          []string `json:"rumors,omitempty"`
	CampaignContent []string `json:"campaign_content,omitempty"`
}

// ExistingNames holds just the names of existing content to avoid duplicates during generation
type ExistingNames struct {
	NPCs       []string `json:"npcs,omitempty"`
	Locations  []string `json:"locations,omitempty"`
	Quests     []string `json:"quests,omitempty"`
	Monsters   []string `json:"monsters,omitempty"`
	Items      []string `json:"items,omitempty"`
	Encounters []string `json:"encounters,omitempty"`
	Taverns    []string `json:"taverns,omitempty"`
	Merchants  []string `json:"merchants,omitempty"`
	Traps      []string `json:"traps,omitempty"`
	Critters   []string `json:"critters,omitempty"`
	Dialogues  []string `json:"dialogues,omitempty"`
	Chases     []string `json:"chases,omitempty"`
}

// Character represents a player character in the guild roster
type Character struct {
	ID               string  `json:"id"`
	UserID           string  `json:"user_id"`
	CampaignID       *string `json:"campaign_id,omitempty"`
	Name             string  `json:"name"`
	Level            int     `json:"level"`
	Race             string  `json:"race"`
	Subrace          *string `json:"subrace,omitempty"`
	ClassInfo        string  `json:"class_info"` // e.g., "Fighter 5/Wizard 2" for multiclass
	Subclass         *string `json:"subclass,omitempty"`
	Background       *string `json:"background,omitempty"`
	Alignment        *string `json:"alignment,omitempty"`
	ExperiencePoints int     `json:"experience_points"`
	Inspiration      bool    `json:"inspiration"`

	// Ability Scores
	Strength     int `json:"strength"`
	Dexterity    int `json:"dexterity"`
	Constitution int `json:"constitution"`
	Intelligence int `json:"intelligence"`
	Wisdom       int `json:"wisdom"`
	Charisma     int `json:"charisma"`

	// Combat Stats
	ArmorClass           int     `json:"armor_class"`
	Initiative           int     `json:"initiative"`
	Speed                int     `json:"speed"` // Walking speed
	SpeedWalking         *int    `json:"speed_walking,omitempty"`
	SpeedFlying          *int    `json:"speed_flying,omitempty"`
	SpeedSwimming        *int    `json:"speed_swimming,omitempty"`
	SpeedClimbing        *int    `json:"speed_climbing,omitempty"`
	SpeedBurrowing       *int    `json:"speed_burrowing,omitempty"`
	Size                 *string `json:"size,omitempty"`         // Tiny, Small, Medium, Large, etc.
	DnDBeyondID          *string `json:"dndbeyond_id,omitempty"` // Original D&D Beyond character ID
	MaxHitPoints         int     `json:"max_hp"`
	CurrentHitPoints     int     `json:"current_hp"`
	TempHitPoints        int     `json:"temp_hp"`
	HitDice              *string `json:"hit_dice,omitempty"` // e.g., "5d10"
	HitDiceTotal         int     `json:"hit_dice_total"`     // Total hit dice available
	HitDiceUsed          int     `json:"hit_dice_used"`      // Hit dice expended
	ProficiencyBonus     int     `json:"proficiency_bonus"`
	PassivePerception    int     `json:"passive_perception"`
	PassiveInsight       *int    `json:"passive_insight,omitempty"`
	PassiveInvestigation *int    `json:"passive_investigation,omitempty"`

	// Death Saves
	DeathSaveSuccesses int `json:"death_save_successes"` // 0-3
	DeathSaveFailures  int `json:"death_save_failures"`  // 0-3

	// Conditions & Status
	ExhaustionLevel int             `json:"exhaustion_level"`     // 0-6
	Conditions      json.RawMessage `json:"conditions,omitempty"` // array of active conditions

	// Skills (JSON: skill_name -> bonus)
	Skills json.RawMessage `json:"skills,omitempty"`

	// Saving Throws (JSON: ability_name -> bonus)
	SavingThrows json.RawMessage `json:"saving_throws,omitempty"`

	// Proficiencies & Languages
	Proficiencies json.RawMessage `json:"proficiencies,omitempty"` // armor, weapons, tools
	Languages     json.RawMessage `json:"languages,omitempty"`     // known languages
	Senses        json.RawMessage `json:"senses,omitempty"`        // darkvision, blindsight, etc.

	// Actions & Abilities
	Actions      json.RawMessage `json:"actions,omitempty"`       // standard actions
	BonusActions json.RawMessage `json:"bonus_actions,omitempty"` // bonus actions
	Reactions    json.RawMessage `json:"reactions,omitempty"`     // reactions

	// Spellcasting
	SpellcastingAbility *string         `json:"spellcasting_ability,omitempty"` // INT, WIS, CHA
	SpellSaveDC         *int            `json:"spell_save_dc,omitempty"`
	SpellAttackBonus    *int            `json:"spell_attack_bonus,omitempty"`
	SpellSlots          json.RawMessage `json:"spell_slots,omitempty"`     // by level with used/total
	PreparedSpells      json.RawMessage `json:"prepared_spells,omitempty"` // array of spell objects
	KnownSpells         json.RawMessage `json:"known_spells,omitempty"`    // for classes that know spells
	Cantrips            json.RawMessage `json:"cantrips,omitempty"`        // cantrips known

	// Equipment & Wealth
	Currency  json.RawMessage `json:"currency,omitempty"`  // cp, sp, ep, gp, pp
	Weapons   json.RawMessage `json:"weapons,omitempty"`   // array of weapon objects with attack/damage
	Armor     json.RawMessage `json:"armor,omitempty"`     // array of armor objects
	Equipment json.RawMessage `json:"equipment,omitempty"` // array of equipment objects
	Treasure  *string         `json:"treasure,omitempty"`  // additional treasure notes

	// Features & Traits
	Features     json.RawMessage `json:"features,omitempty"`      // class features
	RacialTraits json.RawMessage `json:"racial_traits,omitempty"` // racial features
	Feats        json.RawMessage `json:"feats,omitempty"`         // feats taken

	// Personality & Background
	PersonalityTraits   *string `json:"personality_traits,omitempty"`
	Ideals              *string `json:"ideals,omitempty"`
	Bonds               *string `json:"bonds,omitempty"`
	Flaws               *string `json:"flaws,omitempty"`
	Appearance          *string `json:"appearance,omitempty"`
	Backstory           *string `json:"backstory,omitempty"`
	AlliesOrganizations *string `json:"allies_organizations,omitempty"`
	Enemies             *string `json:"enemies,omitempty"`
	Notes               *string `json:"notes,omitempty"`

	// Physical Characteristics
	Age    *string `json:"age,omitempty"`
	Height *string `json:"height,omitempty"`
	Weight *string `json:"weight,omitempty"`
	Eyes   *string `json:"eyes,omitempty"`
	Skin   *string `json:"skin,omitempty"`
	Hair   *string `json:"hair,omitempty"`
	Gender *string `json:"gender,omitempty"`

	// Additional Info
	Faith     *string `json:"faith,omitempty"`     // deity/religion
	Lifestyle *string `json:"lifestyle,omitempty"` // modest, comfortable, etc.

	// Metadata
	Avatar      *string   `json:"avatar,omitempty"` // URL or data URI
	AIGenerated bool      `json:"ai_generated"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// MarshalJSON implements custom JSON marshaling for Character
// This ensures json.RawMessage fields are properly embedded as JSON objects/arrays
// instead of being base64 encoded strings
func (c Character) MarshalJSON() ([]byte, error) {
	type Alias Character
	return json.Marshal(&struct {
		*Alias
		Conditions     json.RawMessage `json:"conditions,omitempty"`
		Skills         json.RawMessage `json:"skills,omitempty"`
		SavingThrows   json.RawMessage `json:"saving_throws,omitempty"`
		Proficiencies  json.RawMessage `json:"proficiencies,omitempty"`
		Languages      json.RawMessage `json:"languages,omitempty"`
		Senses         json.RawMessage `json:"senses,omitempty"`
		Actions        json.RawMessage `json:"actions,omitempty"`
		BonusActions   json.RawMessage `json:"bonus_actions,omitempty"`
		Reactions      json.RawMessage `json:"reactions,omitempty"`
		SpellSlots     json.RawMessage `json:"spell_slots,omitempty"`
		PreparedSpells json.RawMessage `json:"prepared_spells,omitempty"`
		KnownSpells    json.RawMessage `json:"known_spells,omitempty"`
		Cantrips       json.RawMessage `json:"cantrips,omitempty"`
		Currency       json.RawMessage `json:"currency,omitempty"`
		Weapons        json.RawMessage `json:"weapons,omitempty"`
		Armor          json.RawMessage `json:"armor,omitempty"`
		Equipment      json.RawMessage `json:"equipment,omitempty"`
		Features       json.RawMessage `json:"features,omitempty"`
		RacialTraits   json.RawMessage `json:"racial_traits,omitempty"`
		Feats          json.RawMessage `json:"feats,omitempty"`
	}{
		Alias:          (*Alias)(&c),
		Conditions:     c.Conditions,
		Skills:         c.Skills,
		SavingThrows:   c.SavingThrows,
		Proficiencies:  c.Proficiencies,
		Languages:      c.Languages,
		Senses:         c.Senses,
		Actions:        c.Actions,
		BonusActions:   c.BonusActions,
		Reactions:      c.Reactions,
		SpellSlots:     c.SpellSlots,
		PreparedSpells: c.PreparedSpells,
		KnownSpells:    c.KnownSpells,
		Cantrips:       c.Cantrips,
		Currency:       c.Currency,
		Weapons:        c.Weapons,
		Armor:          c.Armor,
		Equipment:      c.Equipment,
		Features:       c.Features,
		RacialTraits:   c.RacialTraits,
		Feats:          c.Feats,
	})
}

// CampaignContentStatus represents campaign-specific status tracking for generator content
// This allows the same generator content (e.g., "Adult Red Dragon") to have different status
// in different campaigns (defeated in Campaign A, still alive in Campaign B)
type CampaignContentStatus struct {
	ID          string `json:"id"`
	CampaignID  string `json:"campaign_id"`
	ContentType string `json:"content_type"` // 'npc', 'monster', 'location', 'item', etc.
	ContentID   string `json:"content_id"`   // ID of the content in its respective table

	// Status flags (campaign-specific, not on generator tables)
	Defeated    bool `json:"defeated"`    // Monsters
	Visited     bool `json:"visited"`     // Locations
	Obtained    bool `json:"obtained"`    // Items
	Heard       bool `json:"heard"`       // Rumors
	Triggered   bool `json:"triggered"`   // Traps
	Encountered bool `json:"encountered"` // Critters
	Completed   bool `json:"completed"`   // Encounters/Quests

	// Flexible tracking fields
	RelationshipNotes *string         `json:"relationship_notes,omitempty"` // For NPCs: "Friendly - helped with goblins"
	StatusData        json.RawMessage `json:"status_data,omitempty"`        // JSON for additional campaign-specific data
	Notes             *string         `json:"notes,omitempty"`              // General notes

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// ContentWithStatus wraps generator content with its campaign-specific status
type ContentWithStatus struct {
	Content interface{}            `json:"content"`          // The actual content (NPC, Monster, etc.)
	Status  *CampaignContentStatus `json:"status,omitempty"` // Campaign-specific status, nil if no status set
}

// Session represents a session (parent for all session runners)
type Session struct {
	ID              string     `json:"id"`
	UserID          string     `json:"user_id"`
	CampaignID      string     `json:"campaign_id"`
	SessionType     string     `json:"session_type"` // 'chase', 'combat', 'social', 'tavern', 'shopping'
	Name            string     `json:"name"`
	Status          string     `json:"status"` // 'active', 'paused', 'completed'
	StartedAt       time.Time  `json:"started_at"`
	EndedAt         *time.Time `json:"ended_at,omitempty"`
	DurationMinutes *int       `json:"duration_minutes,omitempty"`
	Summary         *string    `json:"summary,omitempty"` // Post-session AI summary
	Notes           *string    `json:"notes,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

// SessionEvent represents a timeline entry for a session
type SessionEvent struct {
	ID        string          `json:"id"`
	SessionID string          `json:"session_id"`
	EventType string          `json:"event_type"`      // 'action', 'dialogue', 'combat', 'skill_check'
	Round     *int            `json:"round,omitempty"` // For combat/chase
	Timestamp time.Time       `json:"timestamp"`
	Actor     *string         `json:"actor,omitempty"`   // Who did it
	Action    string          `json:"action"`            // What happened
	Details   json.RawMessage `json:"details,omitempty"` // JSON with specifics
	Outcome   *string         `json:"outcome,omitempty"`
	Important bool            `json:"important"` // Flag key moments
	CreatedAt time.Time       `json:"created_at"`
}

// CombatEncounter represents a combat session state
type CombatEncounter struct {
	ID             string    `json:"id"`
	SessionID      string    `json:"session_id"`
	CampaignID     *string   `json:"campaign_id,omitempty"`  // Link to campaign for real-time sync
	EncounterID    *string   `json:"encounter_id,omitempty"` // Reference to generated encounter
	Name           string    `json:"name"`
	CurrentRound   int       `json:"current_round"`
	CurrentTurn    int       `json:"current_turn"`
	Status         string    `json:"status"` // 'active', 'paused', 'completed'
	Difficulty     *string   `json:"difficulty,omitempty"`
	Environment    *string   `json:"environment,omitempty"`
	Notes          *string   `json:"notes,omitempty"`
	VisibilityMode string    `json:"visibility_mode"` // 'full', 'gm_controlled'
	IsActive       bool      `json:"is_active"`
	CreatedAt      time.Time `json:"created_at"`
}

// CombatParticipant represents a PC or NPC/monster in combat
type CombatParticipant struct {
	ID              string  `json:"id"`
	CombatID        string  `json:"combat_id"`
	ParticipantType string  `json:"participant_type"` // 'pc', 'npc', 'monster'
	CharacterID     *string `json:"character_id,omitempty"`
	NPCID           *string `json:"npc_id,omitempty"`
	MonsterID       *string `json:"monster_id,omitempty"`
	OwnerUserID     *string `json:"owner_user_id,omitempty"` // User who controls this participant

	// Snapshot fields (captured at import time)
	Name              string          `json:"name"`
	MaxHP             int             `json:"max_hp"`
	AC                int             `json:"ac"`
	StatsSnapshot     json.RawMessage `json:"stats_snapshot,omitempty"`
	AbilitiesSnapshot json.RawMessage `json:"abilities_snapshot,omitempty"`

	// Live session state
	Initiative           int             `json:"initiative"`
	InitiativeBonus      int             `json:"initiative_bonus"`
	InitiativeRoll       *int            `json:"initiative_roll,omitempty"` // Raw d20 roll
	CurrentHP            int             `json:"current_hp"`
	TempHP               int             `json:"temp_hp"`
	PassivePerception    *int            `json:"passive_perception,omitempty"`
	Conditions           json.RawMessage `json:"conditions,omitempty"` // JSON array
	ConcentrationSpell   *string         `json:"concentration_spell,omitempty"`
	DeathSaves           json.RawMessage `json:"death_saves,omitempty"` // JSON object
	IsSurprised          bool            `json:"is_surprised"`
	HasReaction          bool            `json:"has_reaction"`
	LegendaryActionsUsed int             `json:"legendary_actions_used"`
	LegendaryActionsMax  int             `json:"legendary_actions_max"`
	Position             int             `json:"position"` // Order in initiative
	Notes                *string         `json:"notes,omitempty"`

	// Visibility controls (GM-controlled mode)
	IsVisibleToPlayers      bool `json:"is_visible_to_players"`
	ShowHPToPlayers         bool `json:"show_hp_to_players"`
	ShowConditionsToPlayers bool `json:"show_conditions_to_players"`
}

// CombatCondition represents a condition affecting a participant
type CombatCondition struct {
	ID             string  `json:"id"`
	ParticipantID  string  `json:"participant_id"`
	ConditionName  string  `json:"condition_name"` // 'prone', 'poisoned', etc.
	DurationRounds *int    `json:"duration_rounds,omitempty"`
	SaveDC         *int    `json:"save_dc,omitempty"`
	SaveAbility    *string `json:"save_ability,omitempty"` // 'Constitution', 'Wisdom', etc.
	Source         *string `json:"source,omitempty"`
	AppliedRound   int     `json:"applied_round"`
	Notes          *string `json:"notes,omitempty"`
}

// CombatSettings represents campaign-level combat preferences
type CombatSettings struct {
	ID                  string    `json:"id"`
	CampaignID          string    `json:"campaign_id"`
	DefaultVisibility   string    `json:"default_visibility"` // 'full', 'gm_controlled'
	AllowPlayerSelfJoin bool      `json:"allow_player_self_join"`
	AutoRollInitiative  bool      `json:"auto_roll_initiative"`
	ShowMonsterNames    bool      `json:"show_monster_names"`
	ShowMonsterHP       bool      `json:"show_monster_hp"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}

// SocialEncounter represents a social/dialogue session state
type SocialEncounter struct {
	ID               string    `json:"id"`
	SessionID        string    `json:"session_id"`
	DialogueID       *string   `json:"dialogue_id,omitempty"`
	NPCID            *string   `json:"npc_id,omitempty"`
	Name             string    `json:"name"`
	EncounterType    string    `json:"encounter_type"` // 'negotiation', 'interrogation', 'persuasion', etc.
	Goal             string    `json:"goal"`
	CurrentMood      int       `json:"current_mood"`      // -5 to +5
	StartingMood     int       `json:"starting_mood"`     // -5 to +5
	SuccessThreshold int       `json:"success_threshold"` // How many successes needed
	SuccessCount     int       `json:"success_count"`
	FailureCount     int       `json:"failure_count"`
	Status           string    `json:"status"` // 'active', 'success', 'failure', 'abandoned'
	Outcome          *string   `json:"outcome,omitempty"`
	Notes            *string   `json:"notes,omitempty"`
	CreatedAt        time.Time `json:"created_at"`
}

// SocialCheck represents a skill check made during social encounter
type SocialCheck struct {
	ID            string    `json:"id"`
	EncounterID   string    `json:"encounter_id"`
	CharacterName string    `json:"character_name"`
	Skill         string    `json:"skill"` // 'Persuasion', 'Deception', 'Intimidation', 'Insight'
	DC            int       `json:"dc"`
	Roll          int       `json:"roll"`
	Modifier      int       `json:"modifier"`
	Total         int       `json:"total"`
	Success       bool      `json:"success"`
	Approach      *string   `json:"approach,omitempty"`     // What they said/did
	NPCResponse   *string   `json:"npc_response,omitempty"` // How NPC reacted
	MoodChange    int       `json:"mood_change"`            // +/- mood shift
	CreatedAt     time.Time `json:"created_at"`
}

// TavernEncounter represents a tavern session state
type TavernEncounter struct {
	ID         string    `json:"id"`
	SessionID  string    `json:"session_id"`
	TavernID   string    `json:"tavern_id"`
	TimeOfDay  string    `json:"time_of_day"` // 'morning', 'afternoon', 'evening', 'night'
	CrowdSize  string    `json:"crowd_size"`  // 'empty', 'sparse', 'moderate', 'crowded', 'packed'
	Atmosphere string    `json:"atmosphere"`  // 'quiet', 'tense', 'lively', 'rowdy', 'chaotic'
	Status     string    `json:"status"`      // 'active', 'completed'
	Notes      *string   `json:"notes,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
}

// PatronInteraction represents interaction with a tavern patron
type PatronInteraction struct {
	ID                  string          `json:"id"`
	EncounterID         string          `json:"encounter_id"`
	PatronName          string          `json:"patron_name"`
	PatronData          json.RawMessage `json:"patron_data"` // JSON snapshot
	TalkedTo            bool            `json:"talked_to"`
	Relationship        string          `json:"relationship"` // 'hostile', 'unfriendly', 'neutral', 'friendly', 'helpful'
	ConversationSummary *string         `json:"conversation_summary,omitempty"`
	RumorsShared        json.RawMessage `json:"rumors_shared,omitempty"` // JSON array
	QuestHooks          json.RawMessage `json:"quest_hooks,omitempty"`   // JSON array
	Notes               *string         `json:"notes,omitempty"`
}

// RumorTracking represents a rumor heard during tavern session
type RumorTracking struct {
	ID           string  `json:"id"`
	EncounterID  string  `json:"encounter_id"`
	RumorText    string  `json:"rumor_text"`
	SourcePatron *string `json:"source_patron,omitempty"`
	Heard        bool    `json:"heard"`
	Verified     bool    `json:"verified"`
	RelatedTo    *string `json:"related_to,omitempty"` // Campaign Ledger entry
	Notes        *string `json:"notes,omitempty"`
}

// TavernTab represents character tab/bill at tavern
type TavernTab struct {
	ID            string          `json:"id"`
	EncounterID   string          `json:"encounter_id"`
	CharacterName string          `json:"character_name"`
	ItemsOrdered  json.RawMessage `json:"items_ordered"` // JSON array
	TotalCost     string          `json:"total_cost"`    // e.g. "5gp 3sp 7cp"
	Paid          bool            `json:"paid"`
	Notes         *string         `json:"notes,omitempty"`
}

// ShoppingEncounter represents a shopping session state
type ShoppingEncounter struct {
	ID                 string    `json:"id"`
	SessionID          string    `json:"session_id"`
	MerchantID         string    `json:"merchant_id"`
	MerchantMood       int       `json:"merchant_mood"`             // -5 to +5
	RelationshipLevel  string    `json:"relationship_level"`        // 'new_customer', 'regular', 'valued', 'friend', 'ally'
	DiscountPercentage int       `json:"discount_percentage"`       // 0-100
	Status             string    `json:"status"`                    // 'active', 'completed'
	TotalPurchased     *string   `json:"total_purchased,omitempty"` // e.g. "45gp 12sp 5cp"
	Notes              *string   `json:"notes,omitempty"`
	CreatedAt          time.Time `json:"created_at"`
}

// ShoppingCart represents items in cart
type ShoppingCart struct {
	ID              string          `json:"id"`
	EncounterID     string          `json:"encounter_id"`
	CharacterName   string          `json:"character_name"`
	ItemName        string          `json:"item_name"`
	ItemData        json.RawMessage `json:"item_data"` // JSON snapshot
	Quantity        int             `json:"quantity"`
	BasePrice       string          `json:"base_price"`                 // Original price
	NegotiatedPrice *string         `json:"negotiated_price,omitempty"` // After haggling
	Purchased       bool            `json:"purchased"`
}

// HagglingSession represents a negotiation attempt
type HagglingSession struct {
	ID              string    `json:"id"`
	EncounterID     string    `json:"encounter_id"`
	ItemName        string    `json:"item_name"`
	CharacterName   string    `json:"character_name"`
	StartingPrice   string    `json:"starting_price"`
	PartyOffer      string    `json:"party_offer"`
	MerchantCounter *string   `json:"merchant_counter,omitempty"`
	Rounds          int       `json:"rounds"`
	MaxRounds       int       `json:"max_rounds"`
	SkillCheckType  string    `json:"skill_check_type"` // 'Persuasion', 'Intimidation', 'Deception'
	RollTotal       *int      `json:"roll_total,omitempty"`
	Success         *bool     `json:"success,omitempty"`
	FinalPrice      *string   `json:"final_price,omitempty"`
	MoodChange      int       `json:"mood_change"`
	Notes           *string   `json:"notes,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
}

// CampaignContent represents campaign-specific content entries
type CampaignContent struct {
	ID         string  `json:"id"`
	CampaignID string  `json:"campaign_id"`
	UserID     string  `json:"user_id"`
	Section    string  `json:"section"`
	Subsection *string `json:"subsection,omitempty"`
	Title      string  `json:"title"`
	Content    string  `json:"content"`
	Type       string  `json:"type"`                // 'manual', 'imported', etc.
	FileName   *string `json:"file_name,omitempty"` // For imported content
	Summary    *string `json:"summary,omitempty"`   // AI-generated summary
	CreatedAt  string  `json:"created_at"`
	UpdatedAt  string  `json:"updated_at"`
}

// CampaignFactCache stores extracted facts per content item for incremental summary updates
type CampaignFactCache struct {
	ID          string          `json:"id"`
	CampaignID  string          `json:"campaign_id"`
	ContentType string          `json:"content_type"` // 'npc', 'location', 'quest', etc.
	ContentID   string          `json:"content_id"`   // ID of source content
	ContentHash string          `json:"content_hash"` // SHA256 for change detection
	Facts       json.RawMessage `json:"facts"`        // JSON array of extracted facts
	ExtractedAt time.Time       `json:"extracted_at"`
}

// SummaryGenerationJob tracks async summary generation progress
type SummaryGenerationJob struct {
	ID              string     `json:"id"`
	CampaignID      string     `json:"campaign_id"`
	UserID          string     `json:"user_id"`
	Status          string     `json:"status"`                  // pending/extracting/synthesizing/completed/failed
	CurrentStage    *string    `json:"current_stage,omitempty"` // 'npcs', 'locations', etc.
	CurrentBatch    int        `json:"current_batch"`
	TotalBatches    int        `json:"total_batches"`
	ProgressPercent int        `json:"progress_percent"`
	ErrorMessage    *string    `json:"error_message,omitempty"`
	StartedAt       *time.Time `json:"started_at,omitempty"`
	CompletedAt     *time.Time `json:"completed_at,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
}

// CampaignItem represents a many-to-many link between campaigns and items
// Allows items to be linked to multiple campaigns (reusable item templates)
type CampaignItem struct {
	ID         string    `json:"id"`
	CampaignID string    `json:"campaign_id"`
	ItemID     string    `json:"item_id"`
	Quantity   int       `json:"quantity"`
	Notes      *string   `json:"notes,omitempty"`
	AddedAt    time.Time `json:"added_at"`
}

// ItemWithCampaignLink represents an item with its campaign-specific link data
type ItemWithCampaignLink struct {
	Item
	LinkID   string  `json:"link_id"`
	Quantity int     `json:"quantity"`
	Notes    *string `json:"notes,omitempty"`
	AddedAt  string  `json:"added_at"`
}

// UserContext represents a user's persistent context and preferences
// This enables "continue where you left off" functionality
type UserContext struct {
	ID                     string          `json:"id"`
	UserID                 string          `json:"user_id"`
	LastContextType        *string         `json:"last_context_type,omitempty"` // 'gm_campaign', 'player_campaign', 'library'
	LastCampaignID         *string         `json:"last_campaign_id,omitempty"`
	LastCharacterID        *string         `json:"last_character_id,omitempty"`
	HasCompletedOnboarding bool            `json:"has_completed_onboarding"`
	DefaultGameSystem      *string         `json:"default_game_system,omitempty"`
	UISettings             json.RawMessage `json:"ui_settings,omitempty"` // JSON object for user UI preferences
	CreatedAt              time.Time       `json:"created_at"`
	UpdatedAt              time.Time       `json:"updated_at"`
}

// CampaignInvite represents an invite code for players to join a GM's campaign
type CampaignInvite struct {
	ID            string     `json:"id"`
	CampaignID    string     `json:"campaign_id"`
	Code          string     `json:"code"`
	CreatedBy     string     `json:"created_by"`
	UsesRemaining *int       `json:"uses_remaining,omitempty"` // NULL = unlimited
	ExpiresAt     *time.Time `json:"expires_at,omitempty"`     // NULL = never expires
	IsActive      bool       `json:"is_active"`
	CreatedAt     time.Time  `json:"created_at"`
}

// CampaignMember represents a player who joined a campaign via invite code
type CampaignMember struct {
	ID             string    `json:"id"`
	CampaignID     string    `json:"campaign_id"`
	UserID         string    `json:"user_id"`
	Role           string    `json:"role"` // 'player' or 'co_gm'
	CharacterID    *string   `json:"character_id,omitempty"`
	InviteCodeUsed *string   `json:"invite_code_used,omitempty"`
	JoinedAt       time.Time `json:"joined_at"`
}

// CampaignMembershipType indicates how a user is related to a campaign
type CampaignMembershipType string

const (
	MembershipOwner        CampaignMembershipType = "owner"         // User owns this campaign (role='owner')
	MembershipPlayerLocal  CampaignMembershipType = "player_local"  // User's local tracking campaign (role='player')
	MembershipPlayerJoined CampaignMembershipType = "player_joined" // User joined via invite code
)

// CampaignWithMembership extends Campaign with membership information
type CampaignWithMembership struct {
	Campaign
	MembershipType CampaignMembershipType `json:"membership_type"`
	GMName         *string                `json:"gm_name,omitempty"`      // For joined campaigns
	CharacterID    *string                `json:"character_id,omitempty"` // For joined campaigns
}

// ============================================================================
// Player Mode Models
// ============================================================================

// PlayerJournalEntry represents a session note/journal entry for a player
type PlayerJournalEntry struct {
	ID              string          `json:"id"`
	UserID          string          `json:"user_id"`
	CampaignID      *string         `json:"campaign_id,omitempty"`
	CharacterID     *string         `json:"character_id,omitempty"`
	Title           string          `json:"title"`
	Content         *string         `json:"content,omitempty"`
	SessionDate     *string         `json:"session_date,omitempty"` // ISO date string
	SessionNumber   *int            `json:"session_number,omitempty"`
	TaggedNPCs      json.RawMessage `json:"tagged_npcs,omitempty"`      // [{npc_id?, name}]
	TaggedLocations json.RawMessage `json:"tagged_locations,omitempty"` // [{location_id?, name}]
	TaggedQuests    json.RawMessage `json:"tagged_quests,omitempty"`    // [{quest_id?, title}]
	IsPrivate       bool            `json:"is_private"`
	CreatedAt       time.Time       `json:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at"`
}

// PlayerQuestTracking represents a quest or personal goal tracked by a player
type PlayerQuestTracking struct {
	ID          string          `json:"id"`
	UserID      string          `json:"user_id"`
	CampaignID  *string         `json:"campaign_id,omitempty"`
	CharacterID *string         `json:"character_id,omitempty"`
	QuestID     *string         `json:"quest_id,omitempty"` // Reference to GM's quest if gm_shared
	Title       string          `json:"title"`
	Description *string         `json:"description,omitempty"`
	QuestType   string          `json:"quest_type"`           // 'personal', 'main', 'side', 'gm_shared'
	Status      string          `json:"status"`               // 'active', 'completed', 'failed', 'abandoned'
	Objectives  json.RawMessage `json:"objectives,omitempty"` // [{text, completed, notes?}]
	Priority    int             `json:"priority"`
	Notes       *string         `json:"notes,omitempty"`
	StartedAt   time.Time       `json:"started_at"`
	CompletedAt *time.Time      `json:"completed_at,omitempty"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

// PlayerNPCEncounter represents an NPC that the player has met
type PlayerNPCEncounter struct {
	ID               string     `json:"id"`
	UserID           string     `json:"user_id"`
	CampaignID       *string    `json:"campaign_id,omitempty"`
	NPCID            *string    `json:"npc_id,omitempty"` // Reference to GM's NPC if revealed
	Name             string     `json:"name"`
	Description      *string    `json:"description,omitempty"`
	Relationship     string     `json:"relationship"` // 'friendly', 'neutral', 'hostile', 'unknown'
	FirstMetSession  *int       `json:"first_met_session,omitempty"`
	FirstMetLocation *string    `json:"first_met_location,omitempty"`
	LastInteraction  *time.Time `json:"last_interaction,omitempty"`
	Notes            *string    `json:"notes,omitempty"`
	IsGMRevealed     bool       `json:"is_gm_revealed"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

// PlayerLocationVisit represents a location that the player has visited
type PlayerLocationVisit struct {
	ID                string    `json:"id"`
	UserID            string    `json:"user_id"`
	CampaignID        *string   `json:"campaign_id,omitempty"`
	LocationID        *string   `json:"location_id,omitempty"` // Reference to GM's location if revealed
	Name              string    `json:"name"`
	Description       *string   `json:"description,omitempty"`
	FirstVisitSession *int      `json:"first_visit_session,omitempty"`
	Notes             *string   `json:"notes,omitempty"`
	IsGMRevealed      bool      `json:"is_gm_revealed"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

// PartyLoot represents an item in the shared party inventory
type PartyLoot struct {
	ID              string    `json:"id"`
	CampaignID      string    `json:"campaign_id"`
	ItemID          *string   `json:"item_id,omitempty"` // Reference to Item if linked
	Name            string    `json:"name"`
	Description     *string   `json:"description,omitempty"`
	Quantity        int       `json:"quantity"`
	Value           *string   `json:"value,omitempty"`      // e.g., "50gp"
	ClaimedBy       *string   `json:"claimed_by,omitempty"` // Character ID
	ClaimedByName   *string   `json:"claimed_by_name,omitempty"`
	Source          *string   `json:"source,omitempty"` // "Found in Goblin Cave"
	SessionAcquired *int      `json:"session_acquired,omitempty"`
	Notes           *string   `json:"notes,omitempty"`
	CreatedBy       string    `json:"created_by"` // User ID
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// ContentReveal represents content that a GM has shared with players
type ContentReveal struct {
	ID          string    `json:"id"`
	CampaignID  string    `json:"campaign_id"`
	RevealedBy  string    `json:"revealed_by"`  // GM's User ID
	ContentType string    `json:"content_type"` // 'npc', 'location', 'quest', 'item', 'monster', 'encounter'
	ContentID   string    `json:"content_id"`
	RevealLevel string    `json:"reveal_level"` // 'name_only', 'summary', 'full'
	CustomNotes *string   `json:"custom_notes,omitempty"`
	RevealedAt  time.Time `json:"revealed_at"`
}

// AbilityUsageTracking represents tracking of limited-use abilities for a character
type AbilityUsageTracking struct {
	ID           string     `json:"id"`
	UserID       string     `json:"user_id"`
	CharacterID  string     `json:"character_id"`
	AbilityName  string     `json:"ability_name"`
	AbilityType  *string    `json:"ability_type,omitempty"` // 'spell_slot', 'class_feature', 'racial', 'item', 'feat', 'other'
	MaxUses      int        `json:"max_uses"`
	CurrentUses  int        `json:"current_uses"`
	RechargeType *string    `json:"recharge_type,omitempty"` // 'short_rest', 'long_rest', 'daily', 'dawn', 'custom'
	Notes        *string    `json:"notes,omitempty"`
	LastUsed     *time.Time `json:"last_used,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

// TaggedEntity represents a tagged NPC, location, or quest in journal entries
type TaggedEntity struct {
	ID   *string `json:"id,omitempty"`
	Name string  `json:"name"`
}

// QuestObjective represents an objective within a tracked quest
type QuestObjective struct {
	Text      string  `json:"text"`
	Completed bool    `json:"completed"`
	Notes     *string `json:"notes,omitempty"`
}

// PlayerCombatState represents a player's combat state for their character
type PlayerCombatState struct {
	ID                 string          `json:"id"`
	UserID             string          `json:"user_id"`
	CharacterID        string          `json:"character_id"`
	CampaignID         *string         `json:"campaign_id,omitempty"`
	IsInCombat         bool            `json:"is_in_combat"`
	CurrentHP          int             `json:"current_hp"`
	MaxHP              int             `json:"max_hp"`
	TempHP             int             `json:"temp_hp"`
	Conditions         json.RawMessage `json:"conditions"` // [{type, source?, duration?, notes?}]
	ConcentrationSpell *string         `json:"concentration_spell,omitempty"`
	ReactionUsed       bool            `json:"reaction_used"`
	Initiative         *int            `json:"initiative,omitempty"`
	Notes              *string         `json:"notes,omitempty"`
	CreatedAt          time.Time       `json:"created_at"`
	UpdatedAt          time.Time       `json:"updated_at"`
}

// ActiveCondition represents a condition applied to a character
type ActiveCondition struct {
	Type     string  `json:"type"`
	Source   *string `json:"source,omitempty"`
	Duration *string `json:"duration,omitempty"`
	Notes    *string `json:"notes,omitempty"`
}
