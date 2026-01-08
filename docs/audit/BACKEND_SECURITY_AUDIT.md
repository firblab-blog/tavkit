# TavKit Backend Security Audit

**Audit Date:** January 4, 2026
**Auditor:** Claude Code
**Scope:** Full backend codebase review (security, efficiency, best practices)

---

## Executive Summary

The TavKit backend demonstrates **solid security practices** and follows Go best practices. The architecture is well-structured with clear separation of concerns. No critical vulnerabilities were found. A few minor improvements are recommended.

**Overall Assessment:** Production-ready

---

## Security Assessment

### Strengths

| Area | Assessment | Details |
|------|------------|---------|
| **SQL Injection** | Excellent | All queries use parameterized statements ($1, $2, etc.). No string concatenation in SQL queries. |
| **Password Hashing** | Excellent | Uses Argon2id with proper parameters (64MB memory, 3 iterations, parallelism 2) and constant-time comparison. |
| **JWT Implementation** | Good | HS256 signing with secret validation, proper expiration handling, signing method verification. |
| **CSRF Protection** | Good | Token-based CSRF protection on state-changing requests with automatic cleanup. |
| **SSRF Protection** | Excellent | Proxy handler validates URLs, blocks private IP ranges (including AWS metadata), and only allows whitelisted sites. |
| **Rate Limiting** | Good | Token bucket implementation with automatic visitor cleanup. |
| **Cookie Security** | Configurable | HttpOnly auth tokens, configurable SameSite and Secure flags for different environments. |
| **Authorization** | Good | Ownership verification in handlers, admin middleware for privileged operations. |

### Issues Found and Fixed

All identified issues have been resolved:

#### 1. CSRF Token Timing Attack Prevention
**File:** `internal/api/middleware/csrf.go`
**Issue:** Token comparison used `==` which is vulnerable to timing attacks.
**Fix:** Replaced with `crypto/subtle.ConstantTimeCompare()` for constant-time comparison.
```go
// Before (vulnerable)
return storedToken.Token == token

// After (secure)
return subtle.ConstantTimeCompare([]byte(storedToken.Token), []byte(token)) == 1
```

#### 2. Internal Error Message Disclosure
**Files:** `internal/api/handlers/ai_handler.go`, `internal/api/handlers/settings_handler.go`
**Issue:** Internal error details were exposed in HTTP 500 responses via `err.Error()`.
**Fix:** Replaced with generic error messages while preserving detailed logging.
```go
// Before (leaks internal details)
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})

// After (secure)
h.logger.Error("Failed to generate content", zap.Error(err))
c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate content"})
```

#### 3. Input Size Validation
**File:** `internal/api/handlers/characters.go`
**Issue:** Large text fields (backstory, notes, etc.) had no size limits, allowing potential memory exhaustion.
**Fix:** Added Gin binding validation with appropriate limits:

| Field Type | Max Length | Examples |
|------------|------------|----------|
| Names | 100 chars | name, race |
| Short text | 200 chars | class_info |
| Medium text | 2,000 chars | personality_traits, ideals, bonds, flaws, treasure |
| Long text | 5,000 chars | appearance, allies_organizations |
| Very long text | 10,000 chars | backstory, notes |
| Physical attributes | 50 chars | age, height, weight, eyes, skin, hair |
| URLs | 500 chars | avatar |

---

## Architecture & Code Quality

### Package Structure

```
backend/
├── cmd/server/          # Application entry point
├── internal/
│   ├── api/
│   │   ├── handlers/    # HTTP request handlers
│   │   ├── middleware/  # Auth, CORS, CSRF, rate limiting
│   │   └── routes.go    # Route definitions
│   ├── auth/            # JWT and password handling
│   ├── config/          # Environment configuration
│   ├── db/              # Database layer (PostgreSQL/SQLite)
│   │   └── schema/      # Embedded SQL migrations
│   ├── ai/              # AI provider abstraction
│   └── services/        # Business logic services
```

### Middleware Chain

Requests flow through middleware in this order:
1. **Recovery** - Panic recovery with logging
2. **Logger** - Structured request logging
3. **CORS** - Cross-origin resource sharing
4. **Rate Limit** - Per-IP request throttling
5. **Auth** - JWT token validation (protected routes)
6. **CSRF** - Token validation for state-changing requests

### Design Patterns

- **Factory Pattern** - AI provider selection (Claude, Ollama, OpenAI)
- **Repository Pattern** - Database interface with PostgreSQL/SQLite implementations
- **Dependency Injection** - Handlers receive dependencies via constructors
- **Middleware Chain** - Composable request processing

---

## Database Layer

### Security Features

- Parameterized queries throughout (no SQL injection vectors)
- UUID primary keys for all entities
- Proper cascading deletes in foreign key constraints
- Appropriate indexes on foreign keys and lookup columns
- Transaction-safe embedded schema migrations

### Supported Databases

| Database | Use Case |
|----------|----------|
| PostgreSQL | Production deployments |
| SQLite | Development and single-user deployments |

---

## Configuration Security

### Required Environment Variables

| Variable | Purpose | Validation |
|----------|---------|------------|
| `JWT_SECRET` | Token signing | Minimum 32 characters |
| `DB_PASSWORD` | PostgreSQL password | Required for postgres |

### Production Recommendations

```bash
# Required for production
COOKIE_SECURE=true
COOKIE_SAMESITE=Strict
CORS_ALLOWED_ORIGINS=https://your-domain.com
ENVIRONMENT=production
```

---

## Performance Features

| Feature | Configuration | Default |
|---------|---------------|---------|
| Connection Pool | `DB_MAX_CONNECTIONS` | 25 |
| Query Timeout | `DB_QUERY_TIMEOUT` | 30s |
| Rate Limiting | `RATE_LIMIT_REQUESTS_PER_SECOND` | 20 |
| Burst Allowance | `RATE_LIMIT_BURST` | 50 |
| Proxy Response Limit | Hardcoded | 50MB |

---

## API Security Summary

| Endpoint Group | Authentication | CSRF | Rate Limited |
|----------------|----------------|------|--------------|
| `/api/v1/auth/*` | Public | N/A | Yes |
| `/api/v1/health/*` | Public | N/A | Yes |
| `/api/v1/proxy` | Public | N/A | Yes |
| `/api/v1/users/*` | Required | Yes | Yes |
| `/api/v1/campaigns/*` | Required | Yes | Yes |
| `/api/v1/admin/*` | Admin Only | Yes | Yes |

---

## Audit Findings Summary

| Category | Status | Notes |
|----------|--------|-------|
| SQL Injection | ✅ Secure | Parameterized queries |
| Authentication | ✅ Secure | JWT + Argon2id |
| Authorization | ✅ Secure | Ownership checks |
| CSRF | ✅ Protected | Token-based |
| SSRF | ✅ Protected | Whitelist + IP blocking |
| Rate Limiting | ✅ Enabled | Token bucket |
| XSS | ✅ Protected | JSON responses |
| Input Validation | ✅ Secure | Gin binding + size limits |
| Error Handling | ✅ Secure | Generic messages |
| Code Quality | ✅ Good | Clean architecture |

---

## Files Reviewed

### Security-Critical Files
- `internal/auth/jwt.go` - JWT token management
- `internal/auth/password.go` - Argon2id password hashing
- `internal/api/middleware/auth.go` - Authentication middleware
- `internal/api/middleware/csrf.go` - CSRF protection
- `internal/api/middleware/ratelimit.go` - Rate limiting
- `internal/api/handlers/proxy.go` - External site proxy with SSRF protection
- `internal/config/config.go` - Configuration validation

### Database Layer
- `internal/db/database.go` - Database interface
- `internal/db/postgres*.go` - PostgreSQL implementations
- `internal/db/sqlite*.go` - SQLite implementations
- `internal/db/schema/` - SQL migration files

### API Handlers
- `internal/api/routes.go` - Route definitions
- `internal/api/handlers/*.go` - All handler implementations

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-04 | Initial audit completed |
| 2026-01-04 | CSRF constant-time comparison added |
| 2026-01-04 | Error message sanitization implemented |
| 2026-01-04 | Input size validation added |
