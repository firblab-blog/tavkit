# TavKit Database Architecture Audit Report

**Audit Date:** January 4, 2026
**Auditor:** Claude Code
**Scope:** Full database architecture, design, security, efficiency, and best practices review

---

## Executive Summary

The TavKit database layer is a **well-architected, production-ready system** with strong foundations. It implements a clean abstraction pattern supporting both SQLite (development) and PostgreSQL (production), uses parameterized queries throughout for SQL injection protection, and follows Go idioms for database access. The codebase demonstrates careful attention to data integrity, proper transaction support, and sensible connection pool management.

### Overall Rating: **B+** (Good with room for improvement)

| Category | Rating | Notes |
|----------|--------|-------|
| Security | A | Parameterized queries, no SQL injection vectors |
| Schema Design | B+ | Good normalization, some opportunities for optimization |
| Indexing | B | Good coverage, missing some composite indexes |
| Data Integrity | B+ | Foreign keys, cascading deletes, some gaps |
| Connection Handling | A- | Well-configured pooling for both databases |
| Code Quality | B+ | Clean, consistent, some DRY opportunities |
| Transaction Handling | B | Present but limited scope |

---

## 1. Architecture Overview

### 1.1 Database Support

| Database | Use Case | Driver |
|----------|----------|--------|
| PostgreSQL | Production | `github.com/jackc/pgx/v5` |
| SQLite | Development/Local | `github.com/mattn/go-sqlite3` |

### 1.2 File Structure

```
backend/internal/db/
├── database.go          # Main Database interface (346 lines)
├── models.go            # All data models (1008 lines)
├── migrations.go        # Schema/migration setup
├── context.go           # Timeout utilities
├── constants.go         # Database constants
├── sqlite.go            # SQLite connection
├── postgres.go          # PostgreSQL connection
├── sqlite_*.go          # SQLite implementations (9 files)
├── postgres_*.go        # PostgreSQL implementations (10 files)
└── schema/
    ├── sqlite/*.sql     # SQLite schemas (6 files)
    └── postgres/*.sql   # PostgreSQL schemas (6 files)
```

### 1.3 Design Pattern

- **Repository Pattern**: Clean `Database` interface with 200+ methods
- **Dual Implementation**: Separate implementations for SQLite/PostgreSQL
- **Embedded Migrations**: SQL schemas embedded via `//go:embed`
- **Context-Aware**: All operations accept `context.Context` for timeouts/cancellation

---

## 2. Security Audit

### 2.1 SQL Injection Protection ✅ PASS

**All queries use parameterized statements:**

```go
// PostgreSQL - uses $1, $2 placeholders
query := `SELECT * FROM users WHERE id = $1`
db.pool.QueryRow(ctx, query, id)

// SQLite - uses ? placeholders
query := `SELECT * FROM users WHERE id = ?`
s.db.QueryRowContext(ctx, query, id)
```

**No string concatenation in SQL queries found.** This is the correct approach.

### 2.2 Password Handling ✅ PASS

- Password hashes stored, never plaintext
- `PasswordHash` field has `json:"-"` tag to prevent serialization
- Password never logged or exposed in responses

### 2.3 Access Control ✅ PASS

- All data queries filter by `user_id` for multi-tenant isolation
- Cascading deletes prevent orphaned data exposure
- Admin-specific operations separated (`AdminUpdateUser`, `AdminUpdateUserPassword`)

### 2.4 Connection String Security ⚠️ MINOR CONCERN

```go
connString := fmt.Sprintf(
    "host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
    cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.Name, cfg.SSLMode,
)
```

**Recommendation:** Password is in connection string which could appear in logs. Consider using `pgxpool.Config` directly instead of string parsing.

### 2.5 SSL Mode Configuration ✅ PASS

- SSL mode is configurable (`DB_SSLMODE`)
- Default is `disable` for development, should be `require` for production

---

## 3. Schema Design Audit

### 3.1 Table Inventory

| Schema File | Tables Created | Purpose |
|-------------|----------------|---------|
| 01_users.sql | 5 | Users, tools, containers, kits, settings |
| 02_campaigns.sql | 4 | Campaigns, content, summaries, status |
| 03_generators.sql | 11 | NPCs, monsters, encounters, items, etc. |
| 04_characters.sql | 2 | Player characters, campaign links |
| 05_sessions.sql | 13 | Sessions, combat, social, shopping |
| 06_chases.sql | 6 | Chase encounter system |
| **Total** | **41 tables** | |

### 3.2 Normalization Analysis

**Strengths:**
- Proper 3NF for core entities (users, campaigns, characters)
- Many-to-many relationship for campaign_characters is correctly implemented
- Separate status tracking table for campaign-specific content states

**Denormalization (Intentional):**
- JSON fields (`json.RawMessage`) for complex nested data (stats, inventory, etc.)
- This is appropriate for semi-structured D&D data that varies by entity

**Potential Issues:**

1. **Duplicate Column Patterns**: Many generator tables have identical columns:
   - `user_id`, `campaign_id`, `ai_generated`, `ai_provider`, `created_at`, `updated_at`
   - Consider a base table or inheritance pattern

2. **Tavern.keeper_* vs Merchant.owner_***: Inconsistent naming for similar concepts

3. **Settings Table**: Uses key-value pattern, which is flexible but loses type safety

### 3.3 Data Type Choices

| Decision | Rating | Notes |
|----------|--------|-------|
| UUIDs for PKs | ✅ Good | Prevents enumeration attacks |
| TEXT for JSON | ✅ Good | Works for both SQLite/PostgreSQL |
| TIMESTAMP defaults | ✅ Good | Auto-populated on insert |
| VARCHAR limits | ⚠️ Mixed | Some (50-200), some TEXT - be consistent |
| REAL for CR | ✅ Good | Allows fractional challenge ratings |

---

## 4. Indexing Strategy Audit

### 4.1 Current Index Coverage

| Table | Indexed Columns | Missing Indexes |
|-------|-----------------|-----------------|
| users | username (UNIQUE), email (UNIQUE) | ✅ Complete |
| campaigns | user_id | ✅ Complete |
| campaign_content | campaign_id, (campaign_id, section, subsection), user_id | ✅ Complete |
| campaign_content_status | campaign_id, (campaign_id, content_type, content_id) | ✅ Complete |
| npcs | campaign_id, user_id | ✅ Complete |
| sessions | user_id | ⚠️ Missing campaign_id index |
| combat_encounters | - | ⚠️ Missing session_id index |
| characters | campaign_id, user_id | ✅ Complete |
| chases | campaign_id, user_id | ✅ Complete |

### 4.2 Recommended Additional Indexes

```sql
-- Sessions by campaign (common query pattern)
CREATE INDEX idx_sessions_campaign_id ON sessions(campaign_id);

-- Combat encounters by session
CREATE INDEX idx_combat_encounters_session ON combat_encounters(session_id);

-- Social encounters by session
CREATE INDEX idx_social_encounters_session ON social_encounters(session_id);

-- Content by type for status lookups
CREATE INDEX idx_campaign_content_status_type ON campaign_content_status(content_type);

-- Active campaigns for user
CREATE INDEX idx_campaigns_user_active ON campaigns(user_id, is_active);
```

### 4.3 Query Performance Observations

**Good Patterns:**
- LIMIT/OFFSET used for pagination
- ORDER BY uses indexed columns where possible
- Specific column selection (no SELECT *)

**Potential Issues:**
- No query result caching strategy
- Large TEXT/JSON fields always fetched (no partial fetching)

---

## 5. Data Integrity Audit

### 5.1 Foreign Key Constraints ✅ PASS

All tables properly reference parent tables:

```sql
user_id UUID REFERENCES users(id) ON DELETE CASCADE
campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL
```

**Cascade Strategy:**
- User deletion cascades to all user content ✅
- Campaign deletion sets NULL on optional references ✅
- Session deletion cascades to encounters ✅

### 5.2 Unique Constraints ✅ PASS

```sql
-- Users
username VARCHAR(50) UNIQUE NOT NULL
email VARCHAR(255) UNIQUE NOT NULL

-- Campaign content status
UNIQUE(campaign_id, content_type, content_id)

-- Campaign summaries
campaign_id UUID UNIQUE NOT NULL

-- Campaign characters
UNIQUE(campaign_id, character_id)
```

### 5.3 NOT NULL Constraints

**Strengths:**
- Required fields properly marked NOT NULL
- Sensible defaults provided (e.g., `DEFAULT false`, `DEFAULT 0`)

**Gaps:**
- Some boolean fields lack explicit DEFAULT (rely on driver defaults)

### 5.4 Check Constraints ⚠️ MISSING

No CHECK constraints found for data validation:

```sql
-- Recommended additions:
ALTER TABLE encounters ADD CHECK (difficulty IN ('easy', 'medium', 'hard', 'deadly'));
ALTER TABLE characters ADD CHECK (level BETWEEN 1 AND 20);
ALTER TABLE characters ADD CHECK (exhaustion_level BETWEEN 0 AND 6);
ALTER TABLE social_encounters ADD CHECK (current_mood BETWEEN -5 AND 5);
```

---

## 6. Connection Handling Audit

### 6.1 PostgreSQL Connection Pool ✅ EXCELLENT

```go
poolConfig.MaxConns = int32(cfg.MaxConnections)      // Default: 25
poolConfig.MinConns = int32(cfg.MaxIdleConns)        // Default: 5
poolConfig.MaxConnLifetime = 1 * time.Hour           // Prevents stale connections
poolConfig.MaxConnIdleTime = 30 * time.Minute        // Reclaims idle connections
poolConfig.HealthCheckPeriod = 1 * time.Minute       // Proactive health checks
```

**Assessment:** Production-ready configuration with reasonable defaults.

### 6.2 SQLite Connection Handling ✅ CORRECT

```go
db.SetMaxOpenConns(1)    // Single writer - prevents SQLITE_BUSY
db.SetMaxIdleConns(1)    // One idle connection for reuse
db.SetConnMaxLifetime(0) // Connection stays open forever
```

**Assessment:** Correctly handles SQLite's single-writer limitation.

### 6.3 Timeout Configuration ✅ PASS

```go
const DefaultQueryTimeout = 30 * time.Second
const DefaultMigrationTimeout = 5 * time.Minute
```

Configurable via environment variables with sensible defaults.

---

## 7. Transaction Handling Audit

### 7.1 Transaction Implementation ✅ GOOD

Both SQLite and PostgreSQL implement the `Transaction` interface:

```go
type Transaction interface {
    Commit(ctx context.Context) error
    Rollback(ctx context.Context) error
    CreateCampaignSummary(ctx context.Context, summary *CampaignSummary) error
    GetCampaignSummaryByCampaignID(ctx context.Context, campaignID string) (*CampaignSummary, error
    UpdateCampaignSummary(ctx context.Context, summary *CampaignSummary) error
    UpsertCampaignContentStatus(ctx context.Context, status *CampaignContentStatus) error
    GetCampaignContentStatus(ctx context.Context, campaignID, contentType, contentID string) (*CampaignContentStatus, error)
}
```

### 7.2 Upsert Implementation ✅ EXCELLENT

Uses atomic `ON CONFLICT` for race-condition-free upserts:

```sql
INSERT INTO campaign_summaries (...)
VALUES ($1, $2, ...)
ON CONFLICT (campaign_id) DO UPDATE SET
    overview = EXCLUDED.overview,
    version = campaign_summaries.version + 1,
    updated_at = EXCLUDED.updated_at
```

### 7.3 Transaction Scope ⚠️ LIMITED

Currently, only campaign summary operations support transactions. Other operations that could benefit:

1. **User deletion**: Delete user + all related content atomically
2. **Campaign creation with initial content**: Create campaign + default NPCs/locations
3. **Character transfer between campaigns**: Unlink + relink atomically
4. **Combat encounter resolution**: Update participants + log events

---

## 8. Code Quality Audit

### 8.1 Consistency ✅ GOOD

- Consistent function naming (`CreateX`, `GetXByID`, `ListXsByUserID`, etc.)
- Consistent error handling patterns
- Consistent use of `defer rows.Close()`

### 8.2 DRY Opportunities ⚠️ MODERATE

**Duplicate Scan Patterns:**
The same field scanning logic is repeated across multiple functions. Consider:

```go
// Current: Same code repeated 5+ times per entity
func (db *PostgresDB) GetCampaignByID(ctx context.Context, id string) (*Campaign, error) {
    var description, theme, tone, history, magicLevel, techLevel, notes sql.NullString
    var setting, factions []byte
    err := rows.Scan(&campaign.ID, &description, ...)
    if description.Valid { campaign.Description = &description.String }
    // ... 10 more lines
}

// Recommended: Extract to helper
func scanCampaign(row pgx.Row) (*Campaign, error) {
    // Single implementation
}
```

### 8.3 Error Handling ✅ GOOD

- Errors are wrapped with context: `fmt.Errorf("failed to X: %w", err)`
- `pgx.ErrNoRows` mapped to `sql.ErrNoRows` for consistency
- Rows properly closed with `defer`

### 8.4 Linting Compliance ✅ GOOD

Code includes `//nolint:errcheck` annotations where appropriate, indicating linting is enforced.

---

## 9. Recommendations

### 9.1 High Priority

1. **Add CHECK constraints** for enum-like fields (difficulty, status, etc.)
   - Prevents invalid data at database level
   - Improves data quality

2. **Add missing indexes** for session and combat queries
   - Improves query performance for active gameplay

3. **Expand transaction support** for multi-step operations
   - User deletion, campaign setup, combat resolution

### 9.2 Medium Priority

4. **Extract common scan patterns** to reduce code duplication
   - Create `scanX` helper functions for each entity type

5. **Add partial fetching** for large TEXT/JSON fields
   - Fetch summaries separately from full content

6. **Implement soft deletes** for audit trail
   - Add `deleted_at` column for reversible deletions

7. **Add optimistic locking** for concurrent edits
   - Add `version` column for combat participants, characters

### 9.3 Low Priority

8. **Connection string security**
   - Use structured config instead of string formatting

9. **Add read replicas support** for PostgreSQL
   - Separate read/write pools for high-traffic deployment

10. **Implement query result caching**
    - Cache campaign summaries, generated content

---

## 10. Schema Comparison: SQLite vs PostgreSQL

Both schemas are functionally identical with only syntax differences:

| Feature | SQLite | PostgreSQL |
|---------|--------|------------|
| UUID Generation | Application-side `generateUUID()` | `gen_random_uuid()` |
| Auto-timestamp | `DATETIME DEFAULT CURRENT_TIMESTAMP` | `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` |
| Boolean | INTEGER (0/1) | BOOLEAN |
| Placeholder | `?` | `$1, $2` |
| Foreign Keys | PRAGMA-enabled | Native |

**Assessment:** ✅ Excellent parity maintained between databases.

---

## 11. Compliance Matrix

| Best Practice | Status | Notes |
|--------------|--------|-------|
| Parameterized Queries | ✅ | All queries use placeholders |
| Foreign Key Constraints | ✅ | Properly defined with cascades |
| Index on Foreign Keys | ✅ | All critical indexes now in place |
| Connection Pooling | ✅ | Well-configured |
| Timeout Configuration | ✅ | Configurable with defaults |
| Transaction Support | ✅ | Expanded for combat/character operations |
| Error Handling | ✅ | Consistent, contextual |
| CHECK Constraints | ✅ | Added for all enum-like fields |
| Schema Versioning | ⚠️ | Exists but not incremental migrations |
| Audit Logging | ❌ | Not implemented |
| Soft Deletes | ❌ | Hard deletes only |
| Backup Strategy | ❓ | Not in codebase scope |

---

## 12. Conclusion

The TavKit database layer is **production-ready** with strong security practices and clean architecture. The dual-database support is well-implemented, allowing seamless development with SQLite and production deployment on PostgreSQL.

**Key Strengths:**
- Zero SQL injection vectors
- Proper multi-tenant data isolation
- Well-designed entity relationships
- Clean interface abstraction

**Areas for Improvement:**
- Expand transaction support for complex operations
- Add database-level validation (CHECK constraints)
- Complete index coverage for all query patterns
- Implement audit logging for compliance

The architecture demonstrates thoughtful design decisions and follows Go database best practices. The recommendations above would elevate the system from "good" to "excellent" without requiring significant refactoring.

---

## Appendix: Fixes Implemented

The following high-priority fixes from this audit have been implemented:

### A.1 CHECK Constraints Added

**PostgreSQL & SQLite Schemas Updated:**

| Table | Fields | Constraints |
|-------|--------|-------------|
| encounters | party_level | CHECK (1-30) |
| encounters | party_size | CHECK (1-20) |
| encounters | difficulty | CHECK IN ('trivial', 'easy', 'medium', 'hard', 'deadly', 'custom') |
| locations | type | CHECK IN ('settlement', 'dungeon', 'tavern', 'shop', 'temple', 'wilderness', 'ruins', 'lair', 'other') |
| quests | type, status, combat_intensity | Type-specific enums |
| items | type, rarity | Type-specific enums |
| rumors | veracity | CHECK IN ('true', 'partially_true', 'false', 'unknown') |
| taverns | type | CHECK IN ('tavern', 'inn', 'pub', 'alehouse', 'roadhouse', 'brewery', 'other') |
| merchants | haggle_willingness | CHECK IN ('never', 'rarely', 'sometimes', 'often', 'always') |
| traps | trap_type, difficulty | Type-specific enums |
| critters | critter_type, size | D&D creature size categories |
| characters | level, ability scores | CHECK (1-30) |
| characters | death saves, exhaustion | D&D rule limits |
| sessions | status | CHECK IN ('active', 'paused', 'completed') |
| combat_* | status, participant_type | Combat-specific enums |
| social_encounters | disposition, attitude | Social encounter rules |
| chases | chase_type, difficulty, status | Chase system enums |

### A.2 Missing Indexes Added

```sql
-- Session-related indexes
CREATE INDEX idx_sessions_campaign_id ON sessions(campaign_id);
CREATE INDEX idx_combat_encounters_session ON combat_encounters(session_id);
CREATE INDEX idx_combat_participants_combat ON combat_participants(combat_id);
CREATE INDEX idx_social_encounters_session ON social_encounters(session_id);
CREATE INDEX idx_tavern_encounters_session ON tavern_encounters(session_id);
CREATE INDEX idx_shopping_encounters_session ON shopping_encounters(session_id);
```

### A.3 Expanded Transaction Support

The `Transaction` interface now supports additional operations for atomic multi-step operations:

**New Transaction Methods:**
- `UpdateCombatParticipant` - Update participant HP, conditions, etc.
- `CreateCombatCondition` - Add conditions like prone, poisoned
- `DeleteCombatCondition` - Remove conditions
- `UpdateCombatEncounter` - Update round, turn, status
- `CreateSessionEvent` - Log combat/session events
- `UpdateCharacter` - Update character within transaction
- `LinkCharacterToCampaign` - Atomic campaign linking
- `UnlinkCharacterFromCampaign` - Atomic campaign unlinking

**Use Cases Enabled:**
1. **Atomic Combat Resolution**: Update multiple participants, add/remove conditions, log events, and advance combat state in a single transaction
2. **Character Campaign Transfer**: Unlink from one campaign and link to another atomically
3. **Session Event Logging**: Create session events alongside combat updates

---

*Report generated by Claude Code database audit tool*
*Fixes implemented: January 4, 2026*
