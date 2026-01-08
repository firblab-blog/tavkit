# Tavkit AI Feature Roadmap

**Vision**: Transform Tavkit from "generator tool" to "GM cognitive exoskeleton"

---

## ✅ Current Features (v0.2.2)

### Artificer's Toolkit (Content Generation) - COMPLETE
- ✅ NPC Generator
- ✅ Monster Generator
- ✅ Location Generator
- ✅ Quest Generator
- ✅ Item Generator
- ✅ Encounter Generator
- ✅ Dialogue Generator
- ✅ Rumor Generator
- ✅ Tavern Generator
- ✅ Merchant Generator
- ✅ Trap/Puzzle Generator
- ✅ Critter Generator
- ✅ Chase Generator

### Tavern Toolkit (Session Running)
- ✅ Campaign Ledger
- ✅ Guild Roster
- ✅ The Pursuit (Chase Manager)

---

## ✅ Phase 1: Core Generator Suite - COMPLETE

All 13 generators are built and integrated with the Campaign Summary system.

---

## 🍺 Phase 1.5: Tavern Toolkit Session Managers (HIGH PRIORITY)

**Goal**: Build live session tools that utilize generated content

Each session manager consumes content from the Artificer's Toolkit generators, creating a complete prep-to-play pipeline.

### Currently Built
- **The Pursuit** (Chase Scenes) - Uses Chase Generator content

### 1.5.1 Quest Board ⭐ **NEXT UP**
**Status**: Not Started  
**Priority**: Critical

**Uses**: Quest Generator

Features:
- Job board interface for displaying available quests
- Quest briefing view with objectives, rewards, complications
- Mission handout generation for players
- Quest status tracking (available/active/completed)
- Filter by quest type, difficulty, faction

**Why**: Turns generated quests into interactive session content

---

### 1.5.2 The Road (Travel & Exploration)
**Status**: Not Started  
**Priority**: High

**Uses**: Random Encounter Generator, Location Generator

Features:
- Travel route management with waypoints
- On-the-fly random encounter triggering
- Location discovery and reveal
- Travel pace and time tracking
- Environmental conditions

**Why**: Makes overland travel engaging instead of "you arrive three days later"

---

### 1.5.3 The Brawl (Combat Tracker)
**Status**: Not Started  
**Priority**: High

**Uses**: Monster Generator, Encounter Generator

Features:
- Initiative tracking
- HP and condition management
- Monster stat quick-reference
- Encounter difficulty display
- Death saves and concentration tracking

---

### 1.5.4 The Parley (Social Encounters)
**Status**: Not Started  
**Priority**: Medium

**Uses**: NPC Generator, Dialogue Generator

Features:
- NPC disposition tracking
- Conversation tree navigation
- Social skill check integration
- Relationship/standing shifts
- Goal and leverage tracking

---

### 1.5.5 The Gathering (Tavern Sessions)
**Status**: Not Started  
**Priority**: Medium

**Uses**: Tavern Generator, Rumor Generator

Features:
- Patron interaction management
- Rumor dispensing with truth/false tagging
- Tavern atmosphere and events
- Bar tab and services tracking

---

### 1.5.6 The Market (Shopping)
**Status**: Not Started  
**Priority**: Medium

**Uses**: Merchant Generator, Item Generator

Features:
- Shop inventory browsing
- Haggling mini-game mechanics
- Merchant personality and willingness
- Transaction history
- Special item availability

---

## 🧠 Phase 2: Campaign Glue & Continuity (DIFFERENTIATION)

**Goal**: Elevate from generator to campaign engine

### 2.1 Session Continuity Assistant ⭐ **KILLER FEATURE**
**Status**: Not Started  
**Priority**: Critical

Features:
- **Canon Watchdog**: Tracks names, relationships, facts, timelines
- **Contradiction Flagging**: Alerts to inconsistencies with suggested soft retcons
- **Consequences Ledger**: Tracks promises made, enemies spared, factions wronged
- **Unresolved Thread Surfacing**: Highlights what matters now
- **Session Recap → Next Hook**: Transforms notes into actionable prep

**Why**: Creates sticky lock-in - the more you use it, the more valuable it becomes

**Technical Notes**:
- Uses existing NPC, encounter, dialogue data
- Requires session note tracking system
- Natural language timeline queries

---

### 2.2 Faction Generator & Tracker
**Status**: Not Started  
**Priority**: High

Generates:
- Name & ideology
- Leadership NPCs (integrates with NPC system)
- Resources
- Internal conflicts
- PC relationships

Advanced features:
- Faction clocks (progress tracking)
- Power shifts over time
- Automatic consequence generation

**Why**: Feeds NPCs, quests, encounters, and politics

---

### 2.3 Plot Twist/Complication Generator
**Status**: Not Started  
**Priority**: Medium

Generates:
- Mid-quest reversals
- Betrayals
- Hidden truths
- Escalations

Examples:
- "The patron is lying, but not maliciously"
- "The monster is protecting something worse"

**Why**: Ideal for on-the-fly improv

---

### 2.4 Timeline/Event Generator
**Status**: Not Started  
**Priority**: Medium

Generates:
- What happens if PCs do nothing
- World events
- Off-screen consequences

**Why**: Creates living, breathing worlds

---

## 🧩 Phase 3: Session-Specific Power Tools

**Goal**: GM quality-of-life improvements

### 3.1 Clue & Mystery Generator
**Status**: Not Started  
**Priority**: High

Generates:
- Multi-clue trails (3-clue rule)
- Red herrings
- Escalation clues

Formats:
- Investigation
- Heist
- Political intrigue

---

### 3.2 Social Encounter Generator
**Status**: Not Started  
**Priority**: Medium

Generates:
- Goals per NPC
- Social stakes
- Leverage points
- Failure consequences

**Why**: Turns talking into structured gameplay

---

### 3.3 Failure Consequence Generator
**Status**: Not Started  
**Priority**: Medium

When players fail, generates:
- Complications (not dead ends)
- Partial success outcomes

**Why**: Makes failure fun and forward-moving

---

## 🧙 Phase 4: Flavor & Immersion Generators

**Goal**: Premium feel, memorable details

### 4.1 Cultural Flavor Generator
**Status**: Not Started  
**Priority**: Low

Generates:
- Naming conventions
- Customs
- Taboos
- Greetings

---

### 4.2 Prop Text Generator
**Status**: Not Started  
**Priority**: Medium

Generates printable handouts:
- Letters
- Journals
- Contracts
- Wanted posters
- Ancient warnings

---

### 4.3 Environment/Travel Generator
**Status**: Not Started  
**Priority**: Low

Generates:
- Travel hazards
- Environmental effects
- Weather with mechanical impact

---

## 🧠 Phase 5: AI as Cognitive Assistant (REVOLUTIONARY)

**Goal**: AI that assists thinking, not just generates content

### 5.1 Intent Interpreter (GM Mind-Reader)
**Status**: Not Started  
**Priority**: High

Instead of clicking generators, GM types intent:

> "The players are suspicious of the mayor but I don't want him to be evil yet."

AI responds with:
- 3 ways to portray ambiguous behavior
- 2 clues that support suspicion
- 1 scene that defuses certainty

**Why**: Intent-driven assistance, not content generation

---

### 5.2 Player Behavior Pattern Detection
**Status**: Not Started  
**Priority**: Medium

Analyzes session notes to identify:
- What players consistently chase
- What they ignore
- Who drives decisions
- Risk tolerance

Outputs:
- Encounter tuning suggestions
- Plot hooks more likely to land
- Engagement warnings

---

### 5.3 Dead Air Detector (Live Safety Net)
**Status**: Not Started  
**Priority**: High

When GM is stuck, suggests:
- Sensory detail
- NPC interruption
- Complication
- Player-specific hook

Context-aware of location, NPCs, tone.

---

### 5.4 Railroad Drift Warning
**Status**: Not Started  
**Priority**: Medium

Monitors session notes and flags:

> "You've pushed toward Outcome A three times despite player resistance."

Suggests:
- Alternate interpretations
- Player-authored solutions
- Soft pivots

---

### 5.5 NPC Voice & Mannerism Coach
**Status**: Not Started  
**Priority**: Medium

During prep or live play:
- Reminds GM how an NPC speaks
- Suggests physical tells
- Emotional states based on recent events

**Why**: Keeps NPCs consistent without scripts

---

### 5.6 Choice Impact Forecaster
**Status**: Not Started  
**Priority**: Medium

Before major choices, shows GM:
- Short-term impacts
- Long-term ripples
- What won't change

**Why**: Encourages meaningful player agency

---

### 5.7 Player Idea Reframer
**Status**: Not Started  
**Priority**: High

When players suggest wild ideas, AI reframes:
- 3 ways it could work
- Mechanical implications
- Story consequences

**Why**: Becomes a "yes-and" engine

---

### 5.8 Theme Drift Detector
**Status**: Not Started  
**Priority**: Low

Monitors sessions and flags:

> "Campaign has drifted from 'hope vs decay' theme"

Suggests:
- Symbolic moments
- NPC behaviors
- Environmental cues

---

## 🚀 Phase 6: Experimental/Advanced Features

### 6.1 Rule-to-Fiction Mapper
**Status**: Not Started  
**Priority**: Low

Translates between mechanics and narrative:
- "Mechanically a failed save. Fictionally, this looks like..."
- "Narratively this feels like... mechanically, consider X"

---

### 6.2 Homebrew Balance Whisperer
**Status**: Not Started  
**Priority**: Low

Evaluates custom content and warns:

> "This will overshadow the ranger at levels 5-7"

---

### 6.3 Parallel World Simulator
**Status**: Not Started  
**Priority**: Very Low

Tracks alternate timelines, surfaces via:
- Dreams
- Visions
- Alternate history artifacts

---

### 6.4 Player Emotional Temperature
**Status**: Not Started  
**Priority**: Low

From chat tone/notes, flags:
- Boredom
- Overwhelm
- Spotlight imbalance

---

## 📊 Implementation Strategy

### Immediate (Next 2-4 weeks)
1. **Quest Board** (Tavern Toolkit) ⭐
2. **The Road** (Tavern Toolkit)

### Short-term (1-2 months)
1. **Session Continuity Assistant** (killer feature)
2. The Brawl (Combat Tracker)
3. The Parley (Social Encounters)
4. Faction Generator

### Medium-term (3-6 months)
1. The Gathering (Tavern Sessions)
2. The Market (Shopping)
3. Intent Interpreter
4. Dead Air Detector
5. Player Idea Reframer

### Long-term (6+ months)
1. Player Behavior Detection
2. Railroad Drift Warning
3. NPC Voice Coach
4. Theme Drift Detector

---

## 🎯 Success Metrics

### User Engagement
- Average generators used per session
- Session prep time reduction
- Return rate after 30 days

### Feature Adoption
- Continuity Assistant usage (% of sessions tracked)
- Canon contradiction catches
- Consequence surfacing engagement

### Quality Indicators
- AI suggestion acceptance rate
- User customization of generated content
- Manual override frequency

---

## 🧠 Philosophy Shift

From: **"What do you want to generate?"**  
To: **"What are you trying to accomplish right now?"**

This transforms Tavkit from:
- ❌ AI as content factory
- ✅ AI as GM cognitive exoskeleton

---

## 📝 Notes

- **Integration First**: New features should connect to existing data (NPCs, locations, quests)
- **Context Awareness**: Use campaign history to inform suggestions
- **Canon Lock**: Maintain consistency with established facts
- **Player Agency**: Never suggest removing player choices, only amplifying their impact
- **Tone Preservation**: Respect campaign theme and style

---

**Last Updated**: January 7, 2026  
**Current Version**: v0.2.2  
**Next Milestone**: Quest Board (Tavern Toolkit)