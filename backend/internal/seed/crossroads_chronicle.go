// Package seed provides functionality to seed the database with default data.
package seed

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"

	"tavkit/internal/db"
)

// GetDefaultCampaignID returns the unique campaign ID for a specific user
func GetDefaultCampaignID(userID string) string {
	return "crossroads-chronicle-" + userID
}

// CrossroadsChronicleSeeder seeds the Crossroads Chronicle campaign
type CrossroadsChronicleSeeder struct {
	db     db.Database
	logger *zap.Logger
}

// NewCrossroadsChronicleSeeder creates a new seeder
func NewCrossroadsChronicleSeeder(database db.Database, logger *zap.Logger) *CrossroadsChronicleSeeder {
	return &CrossroadsChronicleSeeder{
		db:     database,
		logger: logger,
	}
}

// SeedForUser seeds the Crossroads Chronicle campaign for a specific user
func (s *CrossroadsChronicleSeeder) SeedForUser(ctx context.Context, userID string) error {
	campaignID := GetDefaultCampaignID(userID)
	s.logger.Info("Seeding Crossroads Chronicle campaign", zap.String("user_id", userID), zap.String("campaign_id", campaignID))

	// Get the underlying SQL database
	sqlDB, err := s.getSQLDB()
	if err != nil {
		return fmt.Errorf("failed to get SQL DB: %w", err)
	}

	// Check if campaign already exists for this user
	var existingID string
	err = sqlDB.QueryRowContext(ctx, `SELECT id FROM campaigns WHERE id = ? AND user_id = ?`, campaignID, userID).Scan(&existingID)
	if err == nil {
		s.logger.Info("Crossroads Chronicle campaign already exists for user", zap.String("user_id", userID))
		return nil
	} else if err != sql.ErrNoRows {
		return fmt.Errorf("failed to check existing campaign: %w", err)
	}

	// Create the campaign
	if err := s.createCampaign(ctx, sqlDB, userID); err != nil {
		return fmt.Errorf("failed to create campaign: %w", err)
	}

	// Seed NPCs
	if err := s.seedNPCs(ctx, sqlDB, userID); err != nil {
		return fmt.Errorf("failed to seed NPCs: %w", err)
	}

	// Seed Locations
	if err := s.seedLocations(ctx, sqlDB, userID); err != nil {
		return fmt.Errorf("failed to seed locations: %w", err)
	}

	// Seed Quests
	if err := s.seedQuests(ctx, sqlDB, userID); err != nil {
		return fmt.Errorf("failed to seed quests: %w", err)
	}

	// Seed Items
	if err := s.seedItems(ctx, sqlDB, userID); err != nil {
		return fmt.Errorf("failed to seed items: %w", err)
	}

	// Seed Rumors
	if err := s.seedRumors(ctx, sqlDB, userID); err != nil {
		return fmt.Errorf("failed to seed rumors: %w", err)
	}

	// Seed Campaign Ledger content (campaign_content table)
	if err := s.seedCampaignLedgerContent(ctx, sqlDB, userID); err != nil {
		return fmt.Errorf("failed to seed campaign ledger content: %w", err)
	}

	s.logger.Info("Successfully seeded Crossroads Chronicle campaign", zap.String("user_id", userID))
	return nil
}

func (s *CrossroadsChronicleSeeder) getSQLDB() (*sql.DB, error) {
	type sqliteDBGetter interface {
		DB() *sql.DB
	}
	if getter, ok := s.db.(sqliteDBGetter); ok {
		return getter.DB(), nil
	}
	return nil, fmt.Errorf("database does not support DB()")
}

func (s *CrossroadsChronicleSeeder) createCampaign(ctx context.Context, sqlDB *sql.DB, userID string) error {
	campaignID := GetDefaultCampaignID(userID)
	now := time.Now()

	// Campaign setting as JSON
	setting := map[string]interface{}{
		"name":               "Thornwick Crossing",
		"type":               "Frontier Trading Town",
		"description":        "A frontier adventure campaign set in Thornwick Crossing, where three ancient roads converge beneath failing magical standing stones.",
		"themes":             []string{"The cost of progress vs. tradition", "Found family and unlikely alliances", "Secrets buried beneath the surface", "The balance between civilization and wilderness"},
		"starting_level":     1,
		"expected_end_level": 5,
		"estimated_sessions": "8-12",
	}
	settingJSON, _ := json.Marshal(setting)

	// Factions as JSON
	factions := []map[string]interface{}{
		{"name": "The Merchant Council", "type": "Political/Economic", "alignment": "Lawful Neutral"},
		{"name": "The Old Faith", "type": "Religious/Mystical", "alignment": "Neutral Good"},
		{"name": "The Waywardens", "type": "Military/Protective", "alignment": "Neutral Good"},
		{"name": "The Shadow Market", "type": "Criminal/Underground", "alignment": "Neutral"},
		{"name": "The Thornback Tribe", "type": "Neutral Monster Faction", "alignment": "Neutral (Survivalist)"},
	}
	factionsJSON, _ := json.Marshal(factions)

	description := `# The Crossroads Chronicle

A frontier adventure campaign set in Thornwick Crossing, where three ancient roads converge beneath seven standing stones that have protected travelers for centuries. But the stones are failing—cracked by mining operations that disturbed something that should have stayed buried.

## Quick Facts
- **Levels:** 1-5
- **Sessions:** 8-12 estimated
- **Tone:** Mystery, faction politics, dungeon crawling, and cosmic horror
- **Setting:** Frontier trading town on a magical crossroads

## Central Conflict
The seven standing stones that protect Thornwick Crossing are failing. Strange creatures now slip through the weakened wards at night. The Merchant Council blames the druids of the Old Faith for neglecting the stones. The Old Faith claims the merchants' mining operations have disturbed something beneath the earth.

## Campaign Hook
The party arrives in Thornwick Crossing seeking shelter, work, or answers to personal quests. On their first night at the Crossroads Inn, the standing stones flare with sickly green light, and something breaks through the ward for the first time in living memory.

---
*Welcome to Thornwick Crossing. The roads await.*`

	history := `Thornwick Crossing was founded 247 years ago by a merchant named Tobias Thornwick, who recognized the crossroads' potential as a trading hub. The standing stones' protective ward made it an ideal location for a permanent settlement—safe from the monsters and bandits that plagued the roads.

The Old Faith existed here before the town—the druids of Mossward Grove had tended the standing stones for generations. An early conflict between the merchants and the druids was resolved by the Crossroads Compact: the druids would maintain the stones and provide spiritual guidance, while the merchants would govern civil matters.

Recently, the Ironvein Mine was established in the Thornback Hills. Three weeks ago, miners broke through into an ancient sealed chamber, and the standing stones began to crack.`

	theme := "Classic Fantasy with Mystery Elements"
	tone := "Heroic but with Dark Undertones"
	gameSystem := "Dungeons & Dragons 5th Edition"
	magicLevel := "Standard"
	techLevel := "Medieval"

	_, err := sqlDB.ExecContext(ctx, `
		INSERT INTO campaigns (
			id, user_id, name, description, game_system, theme, tone,
			setting, factions, history, magic_level, tech_level, notes,
			is_active, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		campaignID,
		userID,
		"The Crossroads Chronicle",
		description,
		gameSystem,
		theme,
		tone,
		string(settingJSON),
		string(factionsJSON),
		history,
		magicLevel,
		techLevel,
		"This is the default demo campaign included with TavKit. Feel free to modify it or create your own!",
		false, // Not active by default
		now,
		now,
	)

	return err
}

func generateID() string {
	return uuid.New().String()
}

func (s *CrossroadsChronicleSeeder) seedNPCs(ctx context.Context, sqlDB *sql.DB, userID string) error {
	campaignID := GetDefaultCampaignID(userID)
	now := time.Now()
	npcs := []struct {
		Name        string
		Race        string
		Class       string
		Personality string
		Backstory   string
		Stats       map[string]interface{}
	}{
		{
			Name:        "Marta Hearthwood",
			Race:        "Human",
			Class:       "Tavern Keeper / Information Broker",
			Personality: "Warm and welcoming to paying customers, but with a spine of steel. Marta has a gift for remembering faces and an even greater gift for remembering secrets. She maintains strict neutrality in town politics because information flows more freely to those who don't take sides.",
			Backstory:   "Marta arrived in Thornwick Crossing thirty years ago with nothing but a recipe book and a mysterious past. She built the Crossroads Inn from a rundown waystation into the heart of the town. Rumors suggest she was once a spy for a foreign kingdom, a reformed assassin, or a disgraced noble—she neither confirms nor denies any of them.",
			Stats: map[string]interface{}{
				"armor_class":       12,
				"hit_points":        22,
				"challenge_rating":  "1/2",
				"notable_abilities": "Keen insight, network of informants, hidden dagger expertise",
			},
		},
		{
			Name:        "Aldric Goldmantle",
			Race:        "Human",
			Class:       "Merchant Council Chairman",
			Personality: "Aldric presents himself as a reasonable, pragmatic leader focused on prosperity. Beneath the genial exterior, he's ruthlessly ambitious and views everything—including people—as assets or obstacles.",
			Backstory:   "Third-generation merchant who transformed his family's modest trading company into the dominant economic force in Thornwick Crossing. He pushed for the mining operations at Ironvein against the Old Faith's objections and has grown wealthy from the iron ore. The mine's recent troubles threaten both his fortune and his position.",
			Stats: map[string]interface{}{
				"armor_class":       10,
				"hit_points":        9,
				"challenge_rating":  "0",
				"notable_abilities": "Wealthy resources, political connections, merchant network",
			},
		},
		{
			Name:        "Elder Thessa Mossward",
			Race:        "Half-Elf",
			Class:       "High Druid of the Old Faith",
			Personality: "Patient as stone and just as unyielding when it comes to protecting the old ways. Thessa speaks in deliberate, measured tones and often answers questions with questions. She's not hostile to progress, but she's seen empires rise and fall.",
			Backstory:   "Thessa has tended the standing stones for over eighty years, trained by the previous keeper who died defending them during the Goblin Wars. She felt the first crack in the stones' magic two years ago and has been desperately researching the cause while trying to maintain the wards.",
			Stats: map[string]interface{}{
				"armor_class":       16,
				"hit_points":        75,
				"challenge_rating":  "5",
				"notable_abilities": "Druidic magic, stone speech, prophetic visions, wild shape",
			},
		},
		{
			Name:        "Captain Roderick Ashford",
			Race:        "Human",
			Class:       "Town Guard Captain",
			Personality: "Roderick is a good man in a compromised position. He genuinely wants to protect the townspeople but has been taking Goldmantle's coin to suppress reports about the mine. The guilt is eating at him.",
			Backstory:   "A veteran of the border wars who came to Thornwick Crossing seeking a quiet posting to finish his career. Instead, he found himself caught between political factions with the safety of the town hanging in the balance.",
			Stats: map[string]interface{}{
				"armor_class":       16,
				"hit_points":        52,
				"challenge_rating":  "3",
				"notable_abilities": "Martial combat, tactical leadership, defensive fighting",
			},
		},
		{
			Name:        "Whisper",
			Race:        "Tiefling",
			Class:       "Shadow Market Broker",
			Personality: "Whisper treats everything as a transaction—loyalty, information, even friendship all have prices. They're not cruel, but they're utterly pragmatic. Despite this, they have a strict personal code: they never break a deal.",
			Backstory:   "No one knows Whisper's real name or origin. They appeared in Thornwick Crossing five years ago and quickly established themselves as the person to see for anything the Merchant Council doesn't want sold.",
			Stats: map[string]interface{}{
				"armor_class":       15,
				"hit_points":        40,
				"challenge_rating":  "3",
				"notable_abilities": "Stealth mastery, poison expertise, shadow magic, extensive spy network",
			},
		},
		{
			Name:        "Brother Aldous the Gentle",
			Race:        "Human",
			Class:       "Wandering Priest / Secret Seeker",
			Personality: "Jovial, curious, and seemingly guileless. Aldous laughs easily, shares freely, and appears to be exactly what he claims: a simple traveling priest offering blessings to wayfarers. This is mostly true—but he's also a skilled investigator.",
			Backstory:   "Aldous serves a god of travelers, crossroads, and transitions. His church received disturbing omens about Thornwick Crossing and sent him to investigate. He's been in town for two weeks, gathering information while maintaining his cover.",
			Stats: map[string]interface{}{
				"armor_class":       13,
				"hit_points":        45,
				"challenge_rating":  "2",
				"notable_abilities": "Divine magic, zone of truth, healing, hidden combat training",
			},
		},
		{
			Name:        "Grimjaw",
			Race:        "Half-Orc",
			Class:       "Waywarden Sergeant",
			Personality: "Blunt, practical, and fiercely protective of those under her care. Grimjaw has no patience for politics or bullshit—she cares about keeping the roads safe and her wardens alive. Despite her gruff exterior, she's genuinely kind to those in need.",
			Backstory:   "Abandoned as an infant and raised by a Waywarden who found her on the King's Road, Grimjaw has spent her entire life protecting travelers. The recent increase in attacks has her stretched thin and desperate for capable help.",
			Stats: map[string]interface{}{
				"armor_class":       15,
				"hit_points":        67,
				"challenge_rating":  "4",
				"notable_abilities": "Relentless endurance, savage attacks, tracking expertise, greataxe mastery",
			},
		},
		{
			Name:        "The Hollow Man",
			Race:        "Unknown (formerly Human)",
			Class:       "Primary Antagonist (Hidden)",
			Personality: "Patient beyond mortal comprehension and utterly alien in its thinking. The Hollow Man doesn't hate—it hungers. It speaks in whispers that promise power, peace, or whatever its victims most desire.",
			Backstory:   "Before Thornwick Crossing, before the roads, before humans came to this land, the Hollow Man was sealed beneath the earth by the same people who raised the standing stones. It is a being of the space between—between life and death, between thought and void.",
			Stats: map[string]interface{}{
				"armor_class":       18,
				"hit_points":        180,
				"challenge_rating":  "10",
				"notable_abilities": "Psychic whispers, memory consumption, shadow minion creation, incorporeal movement, legendary resistances",
			},
		},
	}

	for _, npc := range npcs {
		statsJSON, _ := json.Marshal(npc.Stats)
		_, err := sqlDB.ExecContext(ctx, `
			INSERT INTO npcs (id, user_id, campaign_id, name, race, class, personality, backstory, stats, ai_generated, created_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`,
			generateID(),
			userID,
			campaignID,
			npc.Name,
			npc.Race,
			npc.Class,
			npc.Personality,
			npc.Backstory,
			string(statsJSON),
			false,
			now,
		)
		if err != nil {
			return fmt.Errorf("failed to insert NPC %s: %w", npc.Name, err)
		}
	}

	return nil
}

func (s *CrossroadsChronicleSeeder) seedLocations(ctx context.Context, sqlDB *sql.DB, userID string) error {
	campaignID := GetDefaultCampaignID(userID)
	now := time.Now()
	locations := []struct {
		Name        string
		Type        string
		Description string
		Features    []string
		Secrets     []string
	}{
		{
			Name:        "The Crossroads Inn",
			Type:        "tavern",
			Description: "A sprawling three-story establishment built around an ancient oak tree that grows through its center. The common room wraps around the trunk, and the tree's branches extend through the upper floors, with private rooms nestled among the boughs.",
			Features:    []string{"The Hearthroot: The ancient oak at the inn's center", "The Crossroads Board: A cork board near the entrance covered in job postings", "The Canopy Rooms: Expensive private rooms built into the oak's upper branches", "The Root Cellar: An extensive basement that definitely doesn't have a secret tunnel"},
			Secrets:     []string{"The oak tree is magically connected to the standing stones", "A tunnel in the Root Cellar leads outside town walls", "Marta keeps a hidden ledger of everyone's secrets"},
		},
		{
			Name:        "The Standing Stone Circle",
			Type:        "ruins",
			Description: "Seven massive standing stones arranged in a circle at the exact point where the three roads converge. Each stone is twice the height of a man and carved with spiraling runes that glow faintly blue at night. Recently, cracks have appeared in three of the stones.",
			Features:    []string{"The Seven Stones: Each named for a virtue—Valor, Mercy, Justice, Wisdom, Hope, Memory, and Sacrifice", "The Convergence Point: The exact center where the roads meet", "The Cracked Stones: Valor, Hope, and Memory show spreading cracks", "The Ritual Ground: Worn stone where Elder Thessa performs maintenance rituals"},
			Secrets:     []string{"The stones are made from the petrified essence of the Hollow Man", "A ritual at the center can reveal what was sealed below", "Each stone's damage corresponds to mining progress beneath it"},
		},
		{
			Name:        "Ironvein Mine",
			Type:        "dungeon",
			Description: "A sprawling iron mine carved into the Thornback Hills. Three weeks ago, miners broke through into an ancient sealed chamber and haven't been heard from since. The mine is now officially 'closed for safety assessments.'",
			Features:    []string{"The Main Shaft: Elevator system (currently broken) and emergency ladders", "The Mining Tunnels: Maze of passages, some collapsed", "The Breach: Where miners broke into something ancient", "The Sealed Chamber: An impossibly old vault with warning runes"},
			Secrets:     []string{"The sealed chamber held the Hollow Man's physical anchor", "Some miners survived but are now under the Hollow Man's influence", "Goldmantle's son is alive but changed—and doesn't want to leave"},
		},
		{
			Name:        "The Hollows",
			Type:        "settlement",
			Description: "A network of natural caves and abandoned root cellars beneath the town that has been converted into an underground market. The Shadow Market operates here under Whisper's watchful gaze.",
			Features:    []string{"The Moonpool: A natural pool where oaths are sworn", "Whisper's Alcove: A raised platform where the Shadow Market's master holds court", "The Bazaar: Main marketplace with dozens of stalls", "The Deep Passage: A tunnel that supposedly leads to the mine"},
			Secrets:     []string{"Whisper's agents have been into the mine—one sent back a message before dying", "The Moonpool is connected to the same ancient magic as the standing stones", "A forgotten entrance to the mine exists in the Deep Passage"},
		},
		{
			Name:        "Waywarden Lodge",
			Type:        "settlement",
			Description: "A fortified stone building that serves as headquarters for the Waywardens—the rangers and soldiers who patrol the three roads. The walls are decorated with trophies from decades of monster hunts.",
			Features:    []string{"The Trophy Hall: Monster trophies and a bounty board", "The Map Room: Detailed maps of all three roads", "The Armory: Well-stocked with weapons and supplies", "The Stables: Fast horses bred for road patrol"},
			Secrets:     []string{"Grimjaw has a map showing an unusual pattern to the attacks", "A wounded warden saw something massive near the mine entrance", "The Waywardens have captured a shadow-touched animal for study"},
		},
		{
			Name:        "Mossward Grove",
			Type:        "wilderness",
			Description: "An ancient grove where the Old Faith has practiced for generations. Massive oak trees form a natural cathedral, their branches intertwined so thickly that only dappled light reaches the forest floor.",
			Features:    []string{"The Elder Oak: A tree so old it predates the town", "The Lesser Circle: Smaller standing stones used for training", "The Healing Spring: A natural spring with curative properties", "The Archive Tree: A hollow tree containing written records"},
			Secrets:     []string{"The Archive Tree contains a partial record of what was sealed under the mine", "The grove's stones are fragments of the same material as the town's standing stones", "Thessa performs secret rituals here trying to hold the seals together"},
		},
		{
			Name:        "The Ruined Watchtower",
			Type:        "dungeon",
			Description: "A crumbling watchtower from a fallen kingdom on the King's Road, now home to bandits taking advantage of the increased chaos.",
			Features:    []string{"The Ground Floor: Reinforced door, defensive positions", "The Second Floor: Living quarters for the bandits", "The Top Floor: Partially collapsed, but offers excellent sightlines", "The Hidden Chamber: An ancient vault the bandits haven't discovered"},
			Secrets:     []string{"The hidden chamber contains ancient records about the region's history", "Red Marta saw shadow creatures near the mine", "One of the prisoners is actually a spy for Whisper"},
		},
		{
			Name:        "The Goblin Caves",
			Type:        "dungeon",
			Description: "A network of caves inhabited by the Thornback goblin tribe. Unlike typical goblins, the Thornbacks have maintained a wary truce with Thornwick Crossing for generations. Recently, something has been driving them from their deeper caves.",
			Features:    []string{"The Entry Caves: Where the goblins now crowd together", "The Abandoned Depths: Tunnels the goblins have fled from", "The Chieftain's Chamber: Where Skrix the Clever holds court", "The Deep Connection: A tunnel that connects to somewhere dark"},
			Secrets:     []string{"The deep connection leads to the lower levels of Ironvein Mine", "The goblins have artifacts from the ancient civilization", "Skrix's grandmother knew rituals that could hurt shadow creatures"},
		},
		{
			Name:        "The Flooded Shrine",
			Type:        "ruins",
			Description: "An ancient shrine to a forgotten water deity, now half-submerged in a marsh that wasn't there a decade ago. The water level has been rising steadily, threatening a vital trade route.",
			Features:    []string{"The Outer Shrine: Partially above water, covered in old offerings", "The Inner Sanctum: Submerged, requires swimming to access", "The Blocked Passage: Where something has dammed the natural flow", "The Deep Altar: An underwater altar to the forgotten god"},
			Secrets:     []string{"The corruption is the Hollow Man's influence reaching out", "A forgotten god still lingers here and could be an ally", "The shrine contains artifacts relevant to the main quest"},
		},
		{
			Name:        "Goldmantle Manor",
			Type:        "settlement",
			Description: "A three-story stone manor overlooking Thornwick Crossing, displaying the wealth and influence of the Goldmantle family. Despite the luxury, there's an undercurrent of tension since the mining troubles began.",
			Features:    []string{"The Great Hall: Where Aldric hosts political dinners", "The Study: Where the real decisions are made", "The Family Wing: Private quarters, currently empty except for Aldric", "The Wine Cellar: Extensive collection, includes a hidden safe"},
			Secrets:     []string{"The study contains suppressed reports about the mine", "Marcus's room has his journal documenting strange dreams", "The hidden safe contains blackmail material"},
		},
	}

	for _, loc := range locations {
		featuresJSON, _ := json.Marshal(loc.Features)
		secretsJSON, _ := json.Marshal(loc.Secrets)
		_, err := sqlDB.ExecContext(ctx, `
			INSERT INTO locations (id, user_id, campaign_id, name, type, description, features, secrets, ai_generated, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`,
			generateID(),
			userID,
			campaignID,
			loc.Name,
			loc.Type,
			loc.Description,
			string(featuresJSON),
			string(secretsJSON),
			false,
			now,
			now,
		)
		if err != nil {
			return fmt.Errorf("failed to insert location %s: %w", loc.Name, err)
		}
	}

	return nil
}

func (s *CrossroadsChronicleSeeder) seedQuests(ctx context.Context, sqlDB *sql.DB, userID string) error {
	campaignID := GetDefaultCampaignID(userID)
	now := time.Now()
	quests := []struct {
		Title       string
		Type        string
		Description string
		Objectives  []string
	}{
		{
			Title:       "The Flickering Ward",
			Type:        "main",
			Description: "The standing stones that have protected Thornwick Crossing for centuries are failing. Three of the seven stones show spreading cracks, and the protective ward flickers unpredictably. Something is weakening the ancient magic, and if the stones fail completely, the town will be defenseless.",
			Objectives:  []string{"Investigate the failing standing stones", "Discover the connection between the stones and the mine", "Learn the truth about what was sealed underground", "Find a way to repair the stones or defeat the threat", "Confront the Hollow Man and end the danger"},
		},
		{
			Title:       "The Assessment",
			Type:        "side",
			Description: "Aldric Goldmantle hires the party to 'assess' the Ironvein Mine for reopening. He claims miners reported 'unusual geological activity' and he needs independent confirmation that it's safe to resume operations. He's offering good gold and promises a bonus for quick, discrete work.",
			Objectives:  []string{"Enter the upper levels of Ironvein Mine", "Document the current conditions", "Investigate reports of 'geological activity'", "Return and report to Aldric"},
		},
		{
			Title:       "Toll Road",
			Type:        "side",
			Description: "Bandits have taken over the Ruined Watchtower on the King's Road and are demanding 'tolls' from travelers. Two merchants have been killed resisting, and at least three more are being held for ransom. The Waywardens are stretched too thin to handle it themselves.",
			Objectives:  []string{"Travel to the Ruined Watchtower", "Defeat or drive off the bandits", "Rescue any surviving hostages", "Recover stolen goods if possible"},
		},
		{
			Title:       "The Old Ways",
			Type:        "side",
			Description: "The Thornback goblin tribe has been driven from their deep caves by something terrible. Grimjaw has a secret peace treaty with them and needs someone to make contact. Elder Thessa believes the goblins may have knowledge—or artifacts—from the ancient civilization.",
			Objectives:  []string{"Travel to the Thornback Caves", "Make peaceful contact with the goblins", "Learn what drove them from their homes", "Negotiate for information or artifacts"},
		},
		{
			Title:       "Rising Waters",
			Type:        "side",
			Description: "The Flooded Shrine on the Merchant's Way has become a serious problem. The marsh keeps expanding, threatening a vital trade route. The Merchant Council wants the drainage fixed. Elder Thessa senses something deeply wrong with the shrine's magic.",
			Objectives:  []string{"Investigate the Flooded Shrine", "Discover why the waters are rising", "Deal with the undead guardians", "Restore proper drainage or cleanse the corruption"},
		},
		{
			Title:       "Whispers in the Dark",
			Type:        "side",
			Description: "Whisper approaches the party with an offer: they've sent three agents into the mine to retrieve 'something valuable,' and all three have disappeared. The last one sent a message before going silent—a single word: 'BELOW.'",
			Objectives:  []string{"Accept Whisper's job", "Enter the mine through the Shadow Market's secret tunnel", "Find out what happened to Whisper's agents", "Retrieve information or the item for Whisper"},
		},
		{
			Title:       "A Father's Guilt",
			Type:        "side",
			Description: "As the truth about the mine becomes impossible to hide, Aldric Goldmantle finally breaks. His son Marcus went into the mine to prove himself to his father and never came out. He begs the party to find Marcus—or at least bring back his body.",
			Objectives:  []string{"Descend deep into Ironvein Mine", "Find Marcus Goldmantle or evidence of his fate", "Deal with whatever Marcus has become", "Return to Aldric with the truth"},
		},
		{
			Title:       "The Hungry Dark",
			Type:        "main",
			Description: "The time has come. The ward is failing, the Hollow Man is stirring, and the party must descend to the sealed chamber and end the threat—one way or another.",
			Objectives:  []string{"Gather all necessary resources and allies", "Descend to the sealed chamber", "Confront the Hollow Man", "End the threat (multiple possible methods)"},
		},
	}

	for _, quest := range quests {
		objectivesJSON, _ := json.Marshal(quest.Objectives)
		_, err := sqlDB.ExecContext(ctx, `
			INSERT INTO quests (id, user_id, campaign_id, title, type, description, objectives, status, ai_generated, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`,
			generateID(),
			userID,
			campaignID,
			quest.Title,
			quest.Type,
			quest.Description,
			string(objectivesJSON),
			"available",
			false,
			now,
			now,
		)
		if err != nil {
			return fmt.Errorf("failed to insert quest %s: %w", quest.Title, err)
		}
	}

	return nil
}

func (s *CrossroadsChronicleSeeder) seedItems(ctx context.Context, sqlDB *sql.DB, userID string) error {
	campaignID := GetDefaultCampaignID(userID)
	now := time.Now()
	items := []struct {
		Name        string
		Type        string
		Rarity      string
		Description string
		Properties  []string
	}{
		{
			Name:        "Wardstone Fragment",
			Type:        "treasure",
			Rarity:      "uncommon",
			Description: "A palm-sized piece of the same strange material as the standing stones, likely broken off during the recent cracking. It pulses with faint blue light and feels slightly warm to the touch.",
			Properties:  []string{"Advantage on saves against being frightened by undead or shadow creatures", "As a reaction, cause 1d6 radiant damage to attacking shadow creature (3/day)", "Resonates visibly when near other wardstone fragments or standing stones"},
		},
		{
			Name:        "Miner's Last Lantern",
			Type:        "tool",
			Rarity:      "common",
			Description: "A battered hooded lantern found in the Ironvein Mine, clutched in the hands of a dead miner. It has been etched with prayers and protective symbols by someone desperately seeking safety.",
			Properties:  []string{"Never needs oil—produces light from residual magical energy", "Shadow creatures have disadvantage on attacks within bright light radius", "Once per day, cast Daylight centered on the lantern for 1 minute"},
		},
		{
			Name:        "Skrix's Shadow-Bane Knife",
			Type:        "weapon",
			Rarity:      "uncommon",
			Description: "An ancient obsidian dagger passed down through generations of Thornback goblin chieftains. The blade is covered in tiny spiraling runes and seems to drink in light around it.",
			Properties:  []string{"+1 bonus to attack and damage rolls", "Extra 1d4 radiant damage to shadow creatures and undead", "See in magical darkness as dim light, out to 30 feet", "Command word causes blade to glow with silver light for 10 minutes"},
		},
		{
			Name:        "Thessa's Focusing Lens",
			Type:        "tool",
			Rarity:      "rare",
			Description: "A disc of polished quartz set in a bronze frame carved with druidic symbols. When held up to light, it reveals invisible writing and magical auras.",
			Properties:  []string{"Cast Detect Magic at will", "See flow of magical energy in standing stones and corruption spreading", "Once per day, cast See Invisibility for 1 hour", "10 minutes of study reveals item properties as Identify"},
		},
		{
			Name:        "Void-Touched Amulet",
			Type:        "treasure",
			Rarity:      "rare",
			Description: "A black iron amulet found on Marcus Goldmantle, shaped like an eye with no pupil. It seems to absorb light around it and feels cold even in warm hands. Those who wear it hear faint whispers promising power.",
			Properties:  []string{"Resistance to necrotic damage and darkvision out to 60 feet", "Cast Darkness once per day", "CURSE: DC 15 Wisdom save each long rest or gain exhaustion and disturbing dreams"},
		},
		{
			Name:        "Waywarden Signal Horn",
			Type:        "tool",
			Rarity:      "uncommon",
			Description: "A curved horn made from some great beast, banded with brass and engraved with road symbols. Standard issue for Waywarden sergeants, used to signal for help across great distances.",
			Properties:  []string{"Clear note audible up to 3 miles away", "Three distinct calls: Aid Needed, All Clear, and Retreat", "Once per day, cast Thunderwave (DC 13) in direction of opening"},
		},
		{
			Name:        "Sealing Stone",
			Type:        "relic",
			Rarity:      "legendary",
			Description: "A fist-sized sphere of the same material as the standing stones, perfectly smooth and warm to the touch. This was once the key to the sealed chamber—the final piece that locked the Hollow Man away.",
			Properties:  []string{"Immune to Hollow Man's psychic whispers, cannot be charmed or frightened by it", "Present stone to force DC 17 Wisdom save on shadow creatures within 30 feet or be turned", "Can perform sealing ritual but requires sacrifice (8d10 necrotic damage)", "Can be shattered for 10d10 radiant damage to shadow creatures within 100 feet"},
		},
		{
			Name:        "Goldmantle Mining Company Scrip",
			Type:        "treasure",
			Rarity:      "common",
			Description: "Metal tokens stamped with the Goldmantle Mining Company seal. These are used to pay miners and are exchangeable for goods at company-approved vendors.",
			Properties:  []string{"Worth roughly 1 silver piece each", "Exchangeable at the company store (at inflated prices)", "Widely accepted in Thornwick Crossing but worthless elsewhere"},
		},
	}

	for _, item := range items {
		propertiesJSON, _ := json.Marshal(item.Properties)
		_, err := sqlDB.ExecContext(ctx, `
			INSERT INTO items (id, user_id, campaign_id, name, type, rarity, description, properties, ai_generated, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`,
			generateID(),
			userID,
			campaignID,
			item.Name,
			item.Type,
			item.Rarity,
			item.Description,
			string(propertiesJSON),
			false,
			now,
			now,
		)
		if err != nil {
			return fmt.Errorf("failed to insert item %s: %w", item.Name, err)
		}
	}

	return nil
}

func (s *CrossroadsChronicleSeeder) seedRumors(ctx context.Context, sqlDB *sql.DB, userID string) error {
	campaignID := GetDefaultCampaignID(userID)
	now := time.Now()
	rumors := []struct {
		Text     string
		Source   string
		Veracity string // "true", "false", "partial", "unknown"
		Context  string
	}{
		{
			Text:     "The standing stones have been cracking at night. Old Thom says he heard them groaning like wounded animals during the last full moon.",
			Source:   "Tavern patrons",
			Veracity: "true",
			Context:  "Main plot hook about the failing wards",
		},
		{
			Text:     "Something ain't right at that mine. Three crews have quit in the past month, and they won't say why—just get pale and walk off the job.",
			Source:   "Miners at the bar",
			Veracity: "true",
			Context:  "Main plot - hints at mine troubles",
		},
		{
			Text:     "Goldmantle's son Marcus hasn't been seen in weeks. They say he went to the mine to prove himself and never came back.",
			Source:   "Servant gossip",
			Veracity: "true",
			Context:  "Side quest hook - A Father's Guilt",
		},
		{
			Text:     "The goblins in the Thornback Hills have been seen closer to town lately. Not attacking—just watching from the treeline.",
			Source:   "Waywarden report",
			Veracity: "true",
			Context:  "Side quest hook - The Old Ways",
		},
		{
			Text:     "Elder Thessa has been conducting secret rituals in her grove at midnight. Some say she's trying to hold back something terrible.",
			Source:   "Travelers passing through",
			Veracity: "true",
			Context:  "Main plot - druid involvement",
		},
		{
			Text:     "Whisper from the Shadow Market is offering triple the normal rate for information about the mine. That usually means trouble.",
			Source:   "Underground contacts",
			Veracity: "true",
			Context:  "Side quest hook - Whispers in the Dark",
		},
		{
			Text:     "Captain Ashford has been drinking heavily and muttering about 'things that should stay buried.' He knows something he's not telling.",
			Source:   "Guard barracks",
			Veracity: "true",
			Context:  "Character insight - compromised guard captain",
		},
		{
			Text:     "There's a hidden passage under the Crossroads Inn that leads outside the town walls. Marta uses it for smuggling.",
			Source:   "Drunk merchant",
			Veracity: "true",
			Context:  "Location secret - useful escape route",
		},
		{
			Text:     "The bandits at the old watchtower aren't just robbing travelers—they're looking for something specific among the cargo.",
			Source:   "Escaped hostage",
			Veracity: "true",
			Context:  "Side quest hook - Toll Road",
		},
		{
			Text:     "The Merchant Council is planning to have Elder Thessa arrested for sabotaging the mine. Goldmantle wants her gone.",
			Source:   "Political whispers",
			Veracity: "false",
			Context:  "Red herring - faction tensions",
		},
		{
			Text:     "There's treasure hidden in the Flooded Shrine—an offering to the old water god that the druids forgot about.",
			Source:   "Old fisherman",
			Veracity: "true",
			Context:  "Side quest hook - Rising Waters",
		},
		{
			Text:     "Brother Aldous isn't just a wandering priest. He's been asking too many questions about the standing stones and the old days.",
			Source:   "Suspicious locals",
			Veracity: "true",
			Context:  "Character insight - secret investigator",
		},
	}

	for _, rumor := range rumors {
		_, err := sqlDB.ExecContext(ctx, `
			INSERT INTO rumors (id, user_id, campaign_id, text, source, veracity, context, ai_generated, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`,
			generateID(),
			userID,
			campaignID,
			rumor.Text,
			rumor.Source,
			rumor.Veracity,
			rumor.Context,
			false,
			now,
			now,
		)
		if err != nil {
			return fmt.Errorf("failed to insert rumor: %w", err)
		}
	}

	return nil
}

// seedCampaignLedgerContent populates the campaign_content table for the Campaign Ledger UI
func (s *CrossroadsChronicleSeeder) seedCampaignLedgerContent(ctx context.Context, sqlDB *sql.DB, userID string) error {
	campaignID := GetDefaultCampaignID(userID)
	now := time.Now()

	// Campaign Ledger content entries - these appear in the Campaign Ledger sidebar sections
	entries := []struct {
		Section    string
		Subsection string
		Title      string
		Content    string
		Type       string
	}{
		// Campaign Overview section
		{
			Section:    "overview",
			Subsection: "",
			Title:      "Campaign Overview",
			Content: `# The Crossroads Chronicle

A frontier adventure campaign set in Thornwick Crossing, where three ancient roads converge beneath failing magical standing stones.

## Setting
**Thornwick Crossing** - A frontier trading town at the junction of three ancient roads: the King's Road, the Merchant's Way, and the Old Forest Path. The town grew around a circle of seven standing stones that have protected travelers for centuries.

## Tone
Classic heroic fantasy with mystery elements, faction intrigue, and dungeon delving.

## Themes
- The cost of progress vs. tradition
- Found family and unlikely alliances
- Secrets buried beneath the surface
- The balance between civilization and wilderness

## Level Range
Levels 1-5 (8-12 sessions estimated)

## Central Conflict
The seven standing stones that protect Thornwick Crossing are failing. Strange creatures now slip through the weakened wards at night. The Merchant Council blames the druids of the Old Faith for neglecting the stones. The Old Faith claims the merchants' mining operations have disturbed something beneath the earth.

## Campaign Hook
The party arrives in Thornwick Crossing seeking shelter, work, or answers to personal quests. On their first night at the Crossroads Inn, the standing stones flare with sickly green light, and something breaks through the ward for the first time in living memory.`,
			Type: "manual",
		},

		// NPC entries
		{
			Section:    "npcs",
			Subsection: "",
			Title:      "Marta Hearthwood",
			Content: `# Marta Hearthwood
**Tavern Keeper / Information Broker** | Human Female, Age 52

## Location
The Crossroads Inn

## Appearance
A sturdy woman with iron-gray hair pulled back in a practical bun, laugh lines around sharp brown eyes, and flour perpetually dusting her apron. Her hands are calloused from years of work, and she walks with a slight limp from an old injury she never discusses.

## Personality
Warm and welcoming to paying customers, but with a spine of steel. Marta has a gift for remembering faces and an even greater gift for remembering secrets. She maintains strict neutrality in town politics because information flows more freely to those who don't take sides.

## Background
Marta arrived in Thornwick Crossing thirty years ago with nothing but a recipe book and a mysterious past. She built the Crossroads Inn from a rundown waystation into the heart of the town.

## Motivations
- Protect the town she's made her home
- Keep the Inn prosperous and her staff safe
- Discover who's been asking questions about her past

## Secrets
- She was a courier for a thieves' guild in her youth and still has contacts in the Shadow Market
- She knows the location of a hidden tunnel beneath the Inn that leads outside the town walls
- Her limp comes from a wound dealt by the same creature now stirring in the Ironvein Mine

## Stats
AC 12 | HP 22 | CR 1/2`,
			Type: "manual",
		},
		{
			Section:    "npcs",
			Subsection: "",
			Title:      "Aldric Goldmantle",
			Content: `# Aldric Goldmantle
**Merchant Council Chairman** | Human Male, Age 58

## Location
Goldmantle Manor / Council Hall

## Appearance
A portly man who dresses in expensive but practical clothing—fine wool rather than silk, gold rings on thick fingers, a well-trimmed gray beard. His smile never quite reaches his calculating blue eyes.

## Personality
Aldric presents himself as a reasonable, pragmatic leader focused on prosperity. Beneath the genial exterior, he's ruthlessly ambitious and views everything—including people—as assets or obstacles.

## Background
Third-generation merchant who transformed his family's modest trading company into the dominant economic force in Thornwick Crossing. He pushed for the mining operations at Ironvein against the Old Faith's objections.

## Motivations
- Maintain his wealth and political power
- Get the Ironvein Mine operational again at any cost
- Discredit the Old Faith to remove their influence

## Secrets
- He knows the miners broke into an ancient sealed chamber before the attacks started
- He's been bribing the town guard captain to downplay the mine incidents
- His youngest son disappeared into the mine three weeks ago—officially he's "traveling abroad"

## Stats
AC 10 | HP 9 | CR 0`,
			Type: "manual",
		},
		{
			Section:    "npcs",
			Subsection: "",
			Title:      "Elder Thessa Mossward",
			Content: `# Elder Thessa Mossward
**High Druid of the Old Faith** | Half-Elf Female, Age 127

## Location
The Standing Stone Circle / Mossward Grove

## Appearance
Tall and willowy with silver-streaked auburn hair woven with living vines. Her eyes are the deep green of old forests, and her weathered skin bears ritual scarification in spiral patterns. She dresses in robes of undyed wool and carries a staff of petrified wood.

## Personality
Patient as stone and just as unyielding when it comes to protecting the old ways. Thessa speaks in deliberate, measured tones and often answers questions with questions.

## Background
Thessa has tended the standing stones for over eighty years. She felt the first crack in the stones' magic two years ago and has been desperately researching the cause while trying to maintain the wards.

## Motivations
- Restore the standing stones to full power
- Protect the balance between civilization and wild
- Uncover what was sealed beneath the earth and ensure it stays sealed

## Secrets
- The stones aren't just protection—they're a prison for something ancient
- She's been having prophetic nightmares about a "hunger that sleeps beneath"
- She knows a ritual that could restore the stones but requires a sacrifice she's unwilling to make

## Stats
AC 16 | HP 75 | CR 5`,
			Type: "manual",
		},
		{
			Section:    "npcs",
			Subsection: "",
			Title:      "Captain Roderick Ashford",
			Content: `# Captain Roderick Ashford
**Town Guard Captain** | Human Male, Age 45

## Location
Guard Barracks / Town Gates

## Appearance
A weathered soldier with a soldier's bearing—broad shoulders, cropped salt-and-pepper hair, and a scar running from his left temple to his jaw. He wears well-maintained chainmail and carries a longsword with a worn grip.

## Personality
Roderick is a good man in a compromised position. He genuinely wants to protect the townspeople but has been taking Goldmantle's coin to suppress reports about the mine. The guilt is eating at him.

## Background
A veteran of the border wars who came to Thornwick Crossing seeking a quiet posting to finish his career. Instead, he found himself caught between political factions with the safety of the town hanging in the balance.

## Motivations
- Protect the innocent people of Thornwick Crossing
- Find a way out of Goldmantle's pocket
- Redeem himself for his compromises

## Secrets
- He has copies of the suppressed mine incident reports hidden in his quarters
- He knows Goldmantle's son went into the mine and never came out
- He's been secretly training a militia in case the guard isn't enough

## Stats
AC 16 | HP 52 | CR 3`,
			Type: "manual",
		},

		// Locations
		{
			Section:    "locations",
			Subsection: "",
			Title:      "The Crossroads Inn",
			Content: `# The Crossroads Inn
**Type:** Tavern | **Owner:** Marta Hearthwood

## Description
A sprawling three-story establishment built around an ancient oak tree that grows through its center. The common room wraps around the trunk, and the tree's branches extend through the upper floors, with private rooms nestled among the boughs.

## Notable Features
- **The Hearthroot:** The ancient oak at the inn's center, its roots extending deep beneath the building
- **The Crossroads Board:** A cork board near the entrance covered in job postings, wanted posters, and travel notices
- **The Canopy Rooms:** Expensive private rooms built into the oak's upper branches
- **The Root Cellar:** An extensive basement with surprisingly ancient stonework

## Atmosphere
Warm amber light from enchanted lanterns, the smell of wood smoke and fresh bread, the constant hum of conversation in a dozen languages. This is where travelers share news and merchants make deals.

## Secrets
- The oak tree is magically connected to the standing stones—it wilts when they weaken
- A tunnel in the Root Cellar leads outside town walls (Marta's escape route)
- Marta keeps a hidden ledger of everyone's secrets behind a loose stone in her office`,
			Type: "manual",
		},
		{
			Section:    "locations",
			Subsection: "",
			Title:      "The Standing Stone Circle",
			Content: `# The Standing Stone Circle
**Type:** Ancient Monument / Protective Ward

## Description
Seven massive standing stones arranged in a circle at the exact point where the three roads converge. Each stone is twice the height of a man and carved with spiraling runes that glow faintly blue at night. Recently, cracks have appeared in three of the stones.

## The Seven Stones
Each stone is named for a virtue it was said to embody:
1. **Valor** - Northern stone, now cracked
2. **Mercy** - Northeastern stone
3. **Justice** - Eastern stone
4. **Wisdom** - Southeastern stone
5. **Hope** - Southern stone, now cracked
6. **Memory** - Southwestern stone, now cracked
7. **Sacrifice** - Western stone

## The Ward
The stones generate a protective barrier that keeps dangerous creatures at bay. As the stones crack, gaps appear in the ward, allowing shadow creatures to slip through at night.

## Secrets
- The stones are made from the petrified essence of the Hollow Man itself
- A ritual at the center can reveal visions of what was sealed below
- Each stone's crack corresponds to mining progress beneath it`,
			Type: "manual",
		},
		{
			Section:    "locations",
			Subsection: "",
			Title:      "Ironvein Mine",
			Content: `# Ironvein Mine
**Type:** Dungeon / Mine Complex

## Description
A sprawling iron mine carved into the Thornback Hills. Three weeks ago, miners broke through into an ancient sealed chamber and haven't been heard from since. The mine is now officially "closed for safety assessments."

## Levels
1. **Upper Tunnels:** Relatively safe, recently worked mining tunnels
2. **Mid Levels:** Older tunnels, some collapsed, strange shadows move here
3. **The Breach:** Where miners broke into something ancient
4. **The Sealed Chamber:** An impossibly old vault with warning runes in a dead language

## Current State
- The main elevator is broken; only emergency ladders work
- Strange sounds echo from the depths—metal scraping on stone
- A cold mist seeps up from below, smelling of copper and decay

## Secrets
- The sealed chamber held the physical anchor of the Hollow Man
- Some miners survived but are now shadow-touched and hostile
- Goldmantle's son Marcus is alive in the depths—but changed`,
			Type: "manual",
		},

		// Factions
		{
			Section:    "factions",
			Subsection: "",
			Title:      "The Merchant Council",
			Content: `# The Merchant Council
**Type:** Political/Economic | **Alignment:** Lawful Neutral

## Overview
The governing body of Thornwick Crossing, composed of the five wealthiest merchant families. They control trade, taxation, and most civic decisions.

## Leadership
**Aldric Goldmantle** - Chairman, most powerful voice

## Goals
- Maximize trade profits through the crossroads
- Reopen the Ironvein Mine at any cost
- Reduce the influence of the Old Faith

## Resources
- Wealth to hire mercenaries and adventurers
- Control of the town guard (through bribes)
- Trade connections throughout the region

## Current Status
Desperate. The mine closure is costing them money daily, and they're willing to bend morals to solve the problem.

## Relationship with Party
Will hire the party for investigations, but withhold key information.`,
			Type: "manual",
		},
		{
			Section:    "factions",
			Subsection: "",
			Title:      "The Old Faith",
			Content: `# The Old Faith
**Type:** Religious/Mystical | **Alignment:** Neutral Good

## Overview
The druidic order that has tended the standing stones for generations. They serve as spiritual advisors and maintain the protective wards.

## Leadership
**Elder Thessa Mossward** - High Druid, keeper of the stones

## Goals
- Repair the standing stones and restore the ward
- Protect the natural balance of the region
- Keep whatever was sealed beneath the earth imprisoned

## Resources
- Ancient knowledge of the stones and their magic
- Network of druids and rangers throughout the wilderness
- Healing magic and nature-based abilities

## Current Status
Strained. They're blamed by the Council for the ward's failure, when they know the mining is responsible.

## Relationship with Party
Will seek allies who respect nature and understand the true threat.`,
			Type: "manual",
		},
		{
			Section:    "factions",
			Subsection: "",
			Title:      "The Waywardens",
			Content: `# The Waywardens
**Type:** Military/Protective | **Alignment:** Neutral Good

## Overview
An organization of rangers, soldiers, and monster hunters who patrol the three roads, protecting travelers from bandits and beasts.

## Leadership
**Grimjaw** - Sergeant, most experienced field commander

## Goals
- Keep the roads safe for honest travelers
- Hunt down whatever is making creatures more aggressive
- Protect the people the politicians forget

## Resources
- Skilled warriors and trackers
- Knowledge of the wilderness and monster behavior
- Respect of common folk and travelers

## Current Status
Overwhelmed. Monster attacks have tripled, and they don't have enough people.

## Relationship with Party
Primary source of combat-focused quests; will gladly accept help.`,
			Type: "manual",
		},

		// Lore
		{
			Section:    "lore",
			Subsection: "",
			Title:      "The History of Thornwick Crossing",
			Content: `# The History of Thornwick Crossing

## The Ancient Times (Pre-History)
Before humans came to this land, something terrible walked the earth—a being of the void between worlds. The Elder Peoples (name now forgotten) imprisoned it beneath the earth and raised seven standing stones from its own petrified essence to seal it away.

## The Founding (247 Years Ago)
Tobias Thornwick, a traveling merchant, discovered the crossroads and recognized its potential. The standing stones' protective ward made it an ideal settlement location. He established the first trading post.

## The Crossroads Compact (230 Years Ago)
After early conflicts, the merchants and the druids who tended the stones reached an agreement: the Old Faith would maintain the stones and provide spiritual guidance, while the merchants would govern civil matters.

## The Present Crisis
Two years ago, prospectors discovered iron in the Thornback Hills. The Merchant Council, led by Aldric Goldmantle, pushed for mining despite the Old Faith's warnings about disturbing ancient ground. Three weeks ago, miners broke through into a sealed chamber, and the standing stones began to crack.`,
			Type: "manual",
		},
		{
			Section:    "lore",
			Subsection: "",
			Title:      "The Hollow Man",
			Content: `# The Hollow Man
**The True Threat**

## What It Is
A being from the space between worlds—between life and death, between thought and void. It has no true physical form, existing as a presence that can only manifest through hosts or shadows.

## Its Origin
Legend suggests it was once human—a sorcerer or priest who sought to transcend mortality and instead became something neither living nor dead. The Elder Peoples imprisoned it when it threatened to consume their civilization.

## Its Powers
- **Psychic Whispers:** Can speak directly into minds, offering what the listener most desires
- **Memory Consumption:** Feeds on memories and life force, leaving husks
- **Shadow Creation:** Can animate shadows as minions
- **Corruption:** Can slowly transform the willing into extensions of itself

## How to Defeat It
The Hollow Man cannot be killed by conventional means. It must be re-sealed using the ritual the Elder Peoples created—or, according to some legends, confronted with the memories it has consumed, which may restore its original humanity long enough to destroy it.

## Its Current State
Awakening. The mining broke the inner seals, and it grows stronger each day. Soon it will be powerful enough to break the outer seals (the standing stones) entirely.`,
			Type: "manual",
		},

		// Sessions
		{
			Section:    "sessions",
			Subsection: "",
			Title:      "Session 1: Arrival at the Crossroads",
			Content: `# Session 1: Arrival at the Crossroads
**Levels 1-2 | Introduction**

## Summary
The party arrives in Thornwick Crossing and becomes involved when the standing stones flare and something breaches the ward for the first time.

## Opening Scene
The party approaches town as evening falls. They see the seven standing stones glowing softly blue against the darkening sky. The Crossroads Inn's lights promise warmth and food.

## Key Events
1. **Arrival at the Inn:** Meet Marta, get a room, hear rumors
2. **The Breach:** At midnight, the stones flare sickly green. Screams from outside.
3. **First Combat:** Shadow creatures attack travelers on the road. Party defends.
4. **Morning After:** Town in uproar. Multiple factions approach the party for help.

## Possible Hooks for Session 2
- Goldmantle wants to hire them to "assess" the mine
- Elder Thessa wants help gathering ritual components
- Grimjaw needs someone to investigate road attacks
- A mysterious note slipped under their door: "Meet me in the Hollows. I have information."`,
			Type: "manual",
		},
		{
			Section:    "sessions",
			Subsection: "",
			Title:      "Session 2-3: Investigation Phase",
			Content: `# Sessions 2-3: Investigation Phase
**Levels 2-3 | Mystery Development**

## Summary
The party investigates the various leads from Session 1, gradually uncovering the connection between the mine, the stones, and the shadow creatures.

## Possible Quest Lines

### The Mine Assessment (Goldmantle)
- Enter upper levels of Ironvein Mine
- Encounter evidence of the breach
- Find miner's journal describing what they found
- Shadow creature ambush

### The Road Patrols (Waywardens)
- Accompany wardens on patrol
- Track shadow creature back to its origin
- Discover trail leads toward the mine
- Meet Grimjaw's goblin contacts

### The Ritual Components (Old Faith)
- Journey to gather items for ward repair
- Learn history of the stones from Thessa
- Encounter echoes of the past in ancient ruins
- Receive prophetic vision

### The Shadow Market (Whisper)
- Descend into the Hollows
- Meet Whisper, negotiate for information
- Learn about their lost agents in the mine
- Side quest to prove trustworthiness`,
			Type: "manual",
		},
	}

	for _, entry := range entries {
		_, err := sqlDB.ExecContext(ctx, `
			INSERT INTO campaign_content (id, campaign_id, user_id, section, subsection, title, content, type, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`,
			generateID(),
			campaignID,
			userID,
			entry.Section,
			entry.Subsection,
			entry.Title,
			entry.Content,
			entry.Type,
			now,
			now,
		)
		if err != nil {
			return fmt.Errorf("failed to insert campaign content %s: %w", entry.Title, err)
		}
	}

	return nil
}

// DeleteForUser removes the Crossroads Chronicle campaign and all its content for a user
func (s *CrossroadsChronicleSeeder) DeleteForUser(ctx context.Context, userID string) error {
	campaignID := GetDefaultCampaignID(userID)
	s.logger.Info("Deleting Crossroads Chronicle campaign", zap.String("user_id", userID), zap.String("campaign_id", campaignID))

	sqlDB, err := s.getSQLDB()
	if err != nil {
		return fmt.Errorf("failed to get SQL DB: %w", err)
	}

	// Delete all content associated with the campaign
	tables := []string{"campaign_content", "npcs", "locations", "quests", "items", "rumors", "monsters", "encounters", "dialogues", "taverns", "merchants", "traps", "critters", "chases"}
	for _, table := range tables {
		_, err := sqlDB.ExecContext(ctx, fmt.Sprintf(`DELETE FROM %s WHERE campaign_id = ? AND user_id = ?`, table), campaignID, userID)
		if err != nil {
			s.logger.Warn("Failed to delete from table", zap.String("table", table), zap.Error(err))
		}
	}

	// Delete the campaign itself
	_, err = sqlDB.ExecContext(ctx, `DELETE FROM campaigns WHERE id = ? AND user_id = ?`, campaignID, userID)
	if err != nil {
		return fmt.Errorf("failed to delete campaign: %w", err)
	}

	s.logger.Info("Successfully deleted Crossroads Chronicle campaign", zap.String("user_id", userID))
	return nil
}
