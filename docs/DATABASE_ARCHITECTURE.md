# 🗄️ TavKit Database Architecture

> **Note:** This document describes both the **current implementation** and the **planned architecture**. Sections marked with 🚧 describe features that are planned but not yet implemented. The Artificer's Toolkit (content generation) is fully implemented; the Tavern Toolkit (session runners) is in development.

## Overview

TavKit's database is designed to support two distinct but integrated workflows:

1. **Artificer's Toolkit** (Prep) - Generate and store campaign content
2. **Tavern Toolkit** (Run) - Execute interactive session runners during live gameplay

The database maintains a clear separation between **static generated content** (what you prep) and **dynamic session state** (what happens during play), while enabling seamless integration between them.

---

## Core Architectural Principles

### 1. **Prep → Run → Record Workflow**

```
┌─────────────────────────────────────────────────────────────┐
│                    ARTIFICER'S TOOLKIT                       │
│                    (Content Generation)                      │
│                                                              │
│  Generate: NPCs, Monsters, Taverns, Merchants, Encounters,  │
│           Locations, Quests, Items, Traps, Chases, etc.     │
│                                                              │
│  Storage: Generator tables (npcs, taverns, merchants, etc.) │
└─────────────────────┬────────────────────────────────────────┘
                      │
                      │ Import into session
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                     TAVERN TOOLKIT                           │
│                  (Interactive Runners)                       │
│                                                              │
│  Run: The Pursuit, The Brawl, The Gathering, The Market,    │
│       The Parley                                             │
│                                                              │
│  Storage: Session tables (combat_encounters, social_         │
│           encounters, tavern_encounters, etc.)               │
└─────────────────────┬────────────────────────────────────────┘
                      │
                      │ Save outcomes
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    CAMPAIGN LEDGER                           │
│                  (Campaign History)                          │
│                                                              │
│  Record: Session events, NPC relationships, quest progress,  │
│          location visits, item acquisition, etc.             │
│                                                              │
│  Storage: Updated generator tables + sessions + events       │
└─────────────────────────────────────────────────────────────┘
```

### 2. **Separation of Concerns**

**Generator Tables (Static Content)**
- Store generated content from Artificer's Toolkit
- Immutable base data (can be edited, but not during sessions)
- Linked to campaigns for context
- Examples: `npcs`, `monsters`, `taverns`, `merchants`, `encounters`, `items`, `quests`, `locations`, `traps`, `critters`, `chases`, `dialogues`, `rumors`

**Session Tables (Dynamic State)**
- Store live session state from Tavern Toolkit
- Mutable during active sessions
- Reference generator tables but maintain separate state
- Examples: `sessions`, `combat_encounters`, `social_encounters`, `tavern_encounters`, `shopping_encounters`

**Tracking Tables (Usage & History)**
- Track which content has been used
- Record relationships and outcomes
- Enable campaign continuity
- Examples: `session_events`, `patron_interactions`, `rumor_tracking`, `combat_conditions`

---

## Table Categories

### 📦 Core Tables

#### `users`
User accounts and authentication.

#### `campaigns`
Campaign metadata (name, setting, theme, system, etc.)

#### `campaign_summaries`
AI-generated campaign summaries for context in generators.

---

### ⚒️ Artificer's Toolkit (Generator Tables)

All generator tables follow a consistent pattern:

```sql
CREATE TABLE [content_type] (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    campaign_id TEXT,                    -- Link to campaign for context
    name TEXT NOT NULL,
    -- Content-specific fields --
    ai_generated BOOLEAN DEFAULT 0,
    ai_provider TEXT,
    
    -- Usage tracking (added in migration 007)
    last_used_session TEXT,              -- Most recent session using this
    usage_count INTEGER DEFAULT 0,       -- How many times used
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL,
    FOREIGN KEY (last_used_session) REFERENCES sessions(id) ON DELETE SET NULL
);
```

#### Content Types:

1. **`npcs`** - Non-player characters with personality, backstory, stats
2. **`monsters`** - Creatures with combat stats, lore, tactics
3. **`encounters`** - Combat scenarios with creatures, difficulty, XP
4. **`quests`** - Plot hooks with objectives, rewards, complications
5. **`locations`** - Settings with features, secrets, NPCs
6. **`items`** - Equipment, magic items, loot
7. **`taverns`** - Inns/taverns with keepers, menus, patrons, rumors
8. **`merchants`** - Shops with inventory, owners, haggle willingness
9. **`traps`** - Traps/puzzles with triggers, effects, solutions
10. **`critters`** - Small creatures/familiars with behavior, uses
11. **`chases`** - Chase scenarios with obstacles, phases, complications
12. **`dialogues`** - NPC conversation trees with skill checks
13. **`rumors`** - World-building flavor and plot hooks

**Usage Tracking Fields** (added in migration 007):
- `last_used_session` - References the most recent session this content appeared in
- `usage_count` - How many times this content has been used

**Campaign-Specific Status Tracking:**

Status is **NOT** stored on generator tables. Instead, campaign-specific status is tracked in the `campaign_content_status` table:

```sql
CREATE TABLE campaign_content_status (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    content_type TEXT NOT NULL,  -- 'npc', 'monster', 'location', etc.
    content_id TEXT NOT NULL,    -- ID of the content
    
    -- Status flags (campaign-specific)
    defeated BOOLEAN DEFAULT 0,   -- Monsters
    visited BOOLEAN DEFAULT 0,    -- Locations
    obtained BOOLEAN DEFAULT 0,   -- Items
    heard BOOLEAN DEFAULT 0,      -- Rumors
    triggered BOOLEAN DEFAULT 0,  -- Traps
    encountered BOOLEAN DEFAULT 0, -- Critters
    completed BOOLEAN DEFAULT 0,  -- Encounters/Quests
    
    -- Flexible tracking
    relationship_notes TEXT,      -- NPCs: "Friendly, helped with goblins"
    status_data TEXT,             -- JSON for additional data
    notes TEXT,
    
    UNIQUE(campaign_id, content_type, content_id)
);
```

**Why?** This allows the same generator content (e.g., "Adult Red Dragon") to be used across multiple campaigns with different status:
- Campaign A: Dragon is defeated
- Campaign B: Dragon is still alive
- Generator content stays pristine and reusable

---

### 🚧 Tavern Toolkit (Session Runner Tables) - Planned

> **Status:** These tables are planned but not yet implemented. The schema below represents the target architecture for session runners.

Session runner tables will store **live session state** and **interactive gameplay data**.

#### Core Session Tables

##### `sessions`
Parent table for all active sessions. Tracks session type, status, timing.

```sql
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    campaign_id TEXT NOT NULL,
    session_type TEXT NOT NULL,    -- 'chase', 'combat', 'social', 'tavern', 'shopping'
    name TEXT NOT NULL,
    status TEXT DEFAULT 'active',  -- 'active', 'paused', 'completed'
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    duration_minutes INTEGER,
    summary TEXT,                  -- Post-session AI summary
    notes TEXT
);
```

##### `session_events`
Timeline of everything that happened during a session.

```sql
CREATE TABLE session_events (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL,      -- 'action', 'dialogue', 'combat', 'skill_check'
    round INTEGER,                 -- For combat/chase
    timestamp TIMESTAMP,
    actor TEXT,                    -- Who did it
    action TEXT NOT NULL,
    details TEXT,                  -- JSON with specifics
    outcome TEXT,
    important BOOLEAN DEFAULT 0    -- Flag key moments
);
```

---

#### The Brawl (Combat Tracker)

##### `combat_encounters`
Active combat sessions.

```sql
CREATE TABLE combat_encounters (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    encounter_id TEXT,             -- Reference to generated encounter
    name TEXT NOT NULL,
    current_round INTEGER DEFAULT 0,
    current_turn INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    difficulty TEXT,
    environment TEXT
);
```

##### `combat_participants`
All combatants (PCs, NPCs, monsters).

```sql
CREATE TABLE combat_participants (
    id TEXT PRIMARY KEY,
    combat_id TEXT NOT NULL,
    participant_type TEXT NOT NULL,  -- 'pc', 'npc', 'monster'
    character_id TEXT,               -- Link to characters
    npc_id TEXT,                     -- Link to npcs
    monster_id TEXT,                 -- Link to monsters
    
    -- Snapshot fields (captured at import)
    name TEXT NOT NULL,
    max_hp INTEGER NOT NULL,
    ac INTEGER NOT NULL,
    stats_snapshot TEXT,             -- JSON snapshot of full stats
    abilities_snapshot TEXT,         -- JSON snapshot of abilities
    
    -- Live session state (changes during combat)
    initiative INTEGER NOT NULL,
    current_hp INTEGER NOT NULL,
    temp_hp INTEGER DEFAULT 0,
    conditions TEXT,                 -- JSON array
    concentration_spell TEXT,
    death_saves TEXT,                -- JSON: {successes: 0, failures: 0}
    legendary_actions_used INTEGER DEFAULT 0,
    position INTEGER NOT NULL        -- Order in initiative
);
```

**Why Snapshots?** If a GM edits a monster's stats after importing it into combat, the snapshot preserves the historical accuracy of what actually happened during that session.

##### `combat_conditions`
Active conditions on combatants (poisoned, prone, frightened, etc.).

---

#### The Parley (Social Encounter Tracker)

##### `social_encounters`
Dialogue/negotiation sessions with NPCs.

```sql
CREATE TABLE social_encounters (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    dialogue_id TEXT,              -- Reference to generated dialogue
    npc_id TEXT,                   -- Main NPC
    name TEXT NOT NULL,
    encounter_type TEXT NOT NULL,  -- 'negotiation', 'persuasion', etc.
    goal TEXT NOT NULL,            -- What party is trying to achieve
    current_mood INTEGER DEFAULT 0, -- -5 (hostile) to +5 (helpful)
    starting_mood INTEGER DEFAULT 0,
    success_threshold INTEGER DEFAULT 3,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    outcome TEXT
);
```

##### `social_checks`
Skill checks made during dialogue.

```sql
CREATE TABLE social_checks (
    id TEXT PRIMARY KEY,
    encounter_id TEXT NOT NULL,
    character_name TEXT NOT NULL,
    skill TEXT NOT NULL,           -- 'Persuasion', 'Deception', etc.
    dc INTEGER NOT NULL,
    roll INTEGER NOT NULL,
    total INTEGER NOT NULL,
    success BOOLEAN NOT NULL,
    approach TEXT,                 -- What they said/did
    npc_response TEXT,             -- How NPC reacted
    mood_change INTEGER DEFAULT 0  -- +/- mood shift
);
```

---

#### The Gathering (Tavern Encounter Tracker)

##### `tavern_encounters`
Live tavern sessions.

```sql
CREATE TABLE tavern_encounters (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    tavern_id TEXT NOT NULL,       -- Reference to generated tavern
    time_of_day TEXT DEFAULT 'evening',
    crowd_size TEXT DEFAULT 'moderate',
    atmosphere TEXT DEFAULT 'lively',
    status TEXT DEFAULT 'active'
);
```

##### `patron_interactions`
Track which patrons have been talked to.

```sql
CREATE TABLE patron_interactions (
    id TEXT PRIMARY KEY,
    encounter_id TEXT NOT NULL,
    patron_name TEXT NOT NULL,
    patron_data TEXT NOT NULL,     -- JSON copy of patron
    talked_to BOOLEAN DEFAULT 0,
    relationship TEXT DEFAULT 'neutral',
    conversation_summary TEXT,
    rumors_shared TEXT,            -- JSON array
    quest_hooks TEXT               -- JSON array
);
```

##### `rumor_tracking`
Which rumors have been heard.

##### `tavern_tabs`
What characters ordered and owe.

---

#### The Market (Shopping Encounter Tracker)

##### `shopping_encounters`
Live shop sessions.

```sql
CREATE TABLE shopping_encounters (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    merchant_id TEXT NOT NULL,     -- Reference to generated merchant
    merchant_mood INTEGER DEFAULT 0,
    relationship_level TEXT DEFAULT 'new_customer',
    discount_percentage INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    total_purchased TEXT           -- e.g. "45gp 12sp 5cp"
);
```

##### `shopping_cart`
Items being considered for purchase.

##### `haggling_sessions`
Track negotiation attempts.

```sql
CREATE TABLE haggling_sessions (
    id TEXT PRIMARY KEY,
    encounter_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    character_name TEXT NOT NULL,
    starting_price TEXT NOT NULL,
    party_offer TEXT NOT NULL,
    merchant_counter TEXT,
    rounds INTEGER DEFAULT 1,
    max_rounds INTEGER DEFAULT 3,
    skill_check_type TEXT NOT NULL,
    final_price TEXT,
    mood_change INTEGER DEFAULT 0
);
```

---

#### The Pursuit (Chase Tracker)

See [migration 006](../db/migrations/006_add_chase_system.sql) for chase system tables:
- `chases` (base table, extended with tracker fields)
- `chase_participants`
- `chase_challenges`
- `chase_complications`
- `chase_events`
- `chase_templates`

---

## 🚧 Query Patterns for Session Runners - Planned

> **Status:** These query patterns are planned for when session runner tables are implemented.

### Fast Retrieval During Live Sessions

The database will be optimized for these common query patterns:

#### 1. **Get All Unused Content for a Campaign**

```sql
-- Get all NPCs not yet used in this campaign
SELECT * FROM npcs 
WHERE campaign_id = ? 
  AND usage_count = 0
ORDER BY created_at DESC;

-- Or use the view for all content types
SELECT * FROM v_unused_content
WHERE campaign_id = ?
ORDER BY created_at DESC;
```

#### 2. **Get Recently Used Content**

```sql
-- Get NPCs used in recent sessions
SELECT n.*, s.name as session_name, s.started_at
FROM npcs n
JOIN sessions s ON n.last_used_session = s.id
WHERE n.campaign_id = ?
ORDER BY s.started_at DESC
LIMIT 10;
```

#### 3. **Get Popular/Frequently Used Content**

```sql
-- Most used NPCs in campaign
SELECT * FROM v_popular_npcs
WHERE campaign_id = ?
LIMIT 10;

-- Or directly
SELECT * FROM npcs
WHERE campaign_id = ?
  AND usage_count > 0
ORDER BY usage_count DESC, updated_at DESC;
```

#### 4. **Import Generated Content into Session Runner**

```sql
-- Import tavern into The Gathering
INSERT INTO tavern_encounters (id, session_id, tavern_id, time_of_day, crowd_size, atmosphere)
VALUES (?, ?, ?, 'evening', 'moderate', 'lively');

-- Copy patrons for interaction tracking
INSERT INTO patron_interactions (id, encounter_id, patron_name, patron_data)
SELECT gen_uuid(), ?, patron->>'name', patron::TEXT
FROM taverns t, json_array_elements(t.patrons) AS patron
WHERE t.id = ?;

-- Update tavern usage
UPDATE taverns 
SET usage_count = usage_count + 1,
    last_used_session = ?
WHERE id = ?;
```

#### 5. **Save Session Outcomes Back to Campaign**

```sql
-- Mark NPC as used and update relationship
UPDATE npcs 
SET usage_count = usage_count + 1,
    last_used_session = ?,
    relationship_notes = ?
WHERE id = ?;

-- Mark quest as active
UPDATE quests
SET status = 'active',
    usage_count = usage_count + 1,
    last_used_session = ?
WHERE id = ?;

-- Mark location as visited
UPDATE locations
SET visited = 1,
    usage_count = usage_count + 1,
    last_used_session = ?
WHERE id = ?;
```

#### 6. **Get Active Sessions**

```sql
-- Use the view
SELECT * FROM v_active_sessions
WHERE campaign_id = ?;

-- Or directly
SELECT s.*, c.name as campaign_name
FROM sessions s
JOIN campaigns c ON s.campaign_id = c.id
WHERE s.campaign_id = ?
  AND s.status = 'active'
ORDER BY s.started_at DESC;
```

---

## 🚧 Indexes for Performance - Planned

All session runner queries will be optimized with indexes:

```sql
-- Campaign-based queries (most common)
CREATE INDEX idx_npcs_campaign_used ON npcs(campaign_id, last_used_session);
CREATE INDEX idx_taverns_campaign_used ON taverns(campaign_id, last_used_session);
-- ... (repeated for all generator tables)

-- Unused content queries
CREATE INDEX idx_npcs_unused ON npcs(campaign_id) WHERE usage_count = 0;
CREATE INDEX idx_taverns_unused ON taverns(campaign_id) WHERE usage_count = 0;
-- ... (repeated for all generator tables)

-- Session queries
CREATE INDEX idx_sessions_campaign ON sessions(campaign_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_session_events_session ON session_events(session_id);

-- Combat queries
CREATE INDEX idx_combat_participants_initiative ON combat_participants(combat_id, initiative DESC);
CREATE INDEX idx_combat_conditions_participant ON combat_conditions(participant_id);

-- Social queries
CREATE INDEX idx_social_checks_encounter ON social_checks(encounter_id);

-- Tavern queries
CREATE INDEX idx_patron_interactions_talked ON patron_interactions(encounter_id, talked_to);

-- Shopping queries
CREATE INDEX idx_shopping_cart_purchased ON shopping_cart(encounter_id, purchased);
```

---

## 🚧 Database Views - Planned

Pre-built views for common data retrieval (to be implemented):

### `v_active_sessions`
All active sessions with elapsed time calculation.

### `v_session_summary`
Session details with event counts.

### `v_popular_npcs`
Most frequently used NPCs across all campaigns.

### `v_unused_content`
All generated content that hasn't been used yet.

---

## Migration Strategy

Migrations are applied in order:

**Current Migrations:**
1. **`0001_initial_schema.sql`** - Core tables (users, campaigns, all 13 generator content types)
2. **`0003_pgvector_wiki_rag.sql`** - PostgreSQL vector embeddings for RAG (PostgreSQL only)
3. **`0004_session_chat.sql`** - Session chat functionality

**Planned Migrations:**
- Session runner tables (combat, social, tavern, shopping encounters)
- Usage tracking fields on generator tables

---

## Best Practices

### For Artificer's Toolkit (Generators)

1. Always link generated content to a campaign via `campaign_id`
2. Set `ai_generated = true` and `ai_provider` when using AI
3. Use campaign summaries to generate contextually appropriate content
4. Don't delete generated content - mark as archived instead

### For Tavern Toolkit (Session Runners)

1. Create a `session` record when starting any interactive runner
2. Import content by copying IDs, not data (link via foreign keys)
3. Update `usage_count` and `last_used_session` after using content
4. Log important events to `session_events` for Campaign Ledger
5. Save outcomes back to generator tables (relationships, status changes)
6. Complete sessions properly (set `status = 'completed'`, `ended_at`, etc.)

### For Campaign Ledger Integration

1. Session events should reference Campaign Ledger content by ID
2. Update generator table status fields after sessions (defeated, obtained, visited, etc.)
3. Use `relationship_notes` on NPCs to track party interactions
4. Mark quests as active/completed based on session outcomes
5. Generate AI summaries after important sessions

---

## Schema Visualization

```
ARTIFICER'S TOOLKIT          TAVERN TOOLKIT               CAMPAIGN LEDGER
(Generator Tables)           (Session Tables)             (Tracking & History)
┌─────────────┐             ┌──────────────┐             ┌─────────────────┐
│ npcs        │◄────────────┤ combat_      │             │ sessions        │
│ monsters    │             │ participants │────────────►│ session_events  │
│ encounters  │             └──────────────┘             │ campaign_       │
│ quests      │                                          │ summaries       │
│ locations   │             ┌──────────────┐             └─────────────────┘
│ items       │◄────────────┤ social_      │                     ▲
│             │             │ encounters   │─────────────────────┘
│ taverns     │             └──────────────┘
│ merchants   │                                          
│ traps       │             ┌──────────────┐
│ critters    │◄────────────┤ tavern_      │
│ chases      │             │ encounters   │
│ dialogues   │             └──────────────┘
│ rumors      │
└─────────────┘             ┌──────────────┐
      ▲                     │ shopping_    │
      │                     │ encounters   │
      │                     └──────────────┘
      │
      │ References content
      │ Updates usage_count
      │ Saves outcomes
      └─────────────────────────────────────
```

---

## Summary

TavKit's database architecture supports the complete GM workflow:

1. **Prep** - Generate content with Artificer's Toolkit → Store in generator tables
2. **Run** - Use Tavern Toolkit session runners → Store state in session tables
3. **Record** - Save outcomes to Campaign Ledger → Update generator tables + session history

The separation between **static content** (what you prep) and **dynamic state** (what happens during play) ensures:
- Fast retrieval during live sessions
- Clean data modeling
- Campaign continuity tracking
- Usage analytics
- Self-referential content generation

All session runners follow the same pattern: Import → Track → Save, making the system consistent, predictable, and efficient.
