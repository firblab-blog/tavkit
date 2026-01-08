# Tavkit Deployment Guide

This guide covers deploying Tavkit in production environments, including all required environment variables and service configurations.

## Service Architecture

Tavkit consists of 4 core services:

| Service | Port | Purpose | Required |
|---------|------|---------|----------|
| **postgres** | 5432 | PostgreSQL with pgvector | Yes (for RAG) |
| **backend** | 8000 | Go API server | Yes |
| **ai-service** | 8001 | Python AI service | Yes |
| **web** | 80/3000 | React frontend (nginx) | Yes |

Optional services:
- **ollama** - Local LLM (if using Ollama provider)
- **caddy** - Reverse proxy with SSL

## Environment Variables

### PostgreSQL (postgres)

```yaml
environment:
  - POSTGRES_DB=tavkit
  - POSTGRES_USER=tavkit
  - POSTGRES_PASSWORD=${DB_PASSWORD}  # REQUIRED - secure password
  - POSTGRES_INITDB_ARGS=--encoding=UTF8 --lc-collate=C --lc-ctype=C
  - POSTGRES_HOST_AUTH_METHOD=scram-sha-256
```

**Important:** Use `pgvector/pgvector:pg17` (or pg16) image for RAG features. The standard `postgres:alpine` image does NOT include pgvector.

### Backend (backend)

```yaml
environment:
  # Database Configuration
  - DB_TYPE=postgres              # sqlite or postgres
  - DB_HOST=postgres              # hostname of postgres container
  - DB_PORT=5432
  - DB_NAME=tavkit
  - DB_USER=tavkit
  - DB_PASSWORD=${DB_PASSWORD}    # REQUIRED - must match postgres
  - DB_SSLMODE=disable            # or 'require' for external postgres

  # Authentication
  - JWT_SECRET=${JWT_SECRET}      # REQUIRED - secure random string

  # AI Service Connection
  - PYTHON_AI_SERVICE_URL=http://ai-service:8001

  # AI Provider Configuration
  - ENABLE_AI=true
  - AI_PROVIDER=ollama            # ollama, anthropic, or openai
  - OLLAMA_BASE_URL=http://host.docker.internal:11434  # or http://ollama:11434
  - OLLAMA_MODEL=llama3.2:7b
  - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
  - ANTHROPIC_MODEL=claude-sonnet-4-20250514
  - OPENAI_API_KEY=${OPENAI_API_KEY}
  - OPENAI_MODEL=gpt-4-turbo-preview

  # Admin Account (auto-created on first run)
  - ADMIN_EMAIL=${ADMIN_EMAIL}
  - ADMIN_PASSWORD=${ADMIN_PASSWORD}

  # Server Configuration
  - PORT=8000
  - ENVIRONMENT=production
  - LOG_LEVEL=info
  - CORS_ALLOWED_ORIGINS=https://your-domain.com,http://localhost:3000
```

### AI Service (ai-service)

**CRITICAL:** The ai-service needs database access for RAG (wiki knowledge base) features.

```yaml
environment:
  # AI Provider Configuration
  - AI_PROVIDER=ollama            # ollama, anthropic, or openai
  - OLLAMA_BASE_URL=http://host.docker.internal:11434
  - OLLAMA_MODEL=llama3.2:7b
  - OLLAMA_TIMEOUT=120
  - OLLAMA_MAX_TOKENS=800
  - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
  - ANTHROPIC_MODEL=claude-haiku-4-5-20251001
  - ANTHROPIC_MAX_TOKENS=800
  - OPENAI_API_KEY=${OPENAI_API_KEY}
  - OPENAI_MODEL=gpt-4-turbo-preview
  - OPENAI_MAX_TOKENS=800
  - AI_TEMPERATURE=0.7

  # Server Configuration
  - CORS_ORIGINS=https://your-domain.com,http://localhost:3000
  - LOG_LEVEL=info
  - PORT=8001

  # DATABASE CONFIGURATION (Required for RAG features)
  - DB_HOST=postgres              # REQUIRED for RAG
  - DB_PORT=5432                  # REQUIRED for RAG
  - DB_NAME=tavkit                # REQUIRED for RAG
  - DB_USER=tavkit                # REQUIRED for RAG
  - DB_PASSWORD=${DB_PASSWORD}    # REQUIRED for RAG - must match postgres
```

**Without the DB_* environment variables, the ai-service cannot:**
- List available setting packs (Eberron, Forgotten Realms, etc.)
- Run wiki scrape jobs
- Provide RAG context for AI generations

### Web (web)

The web container is nginx serving static files. No environment variables needed, but it must be able to resolve the `backend` hostname.

```yaml
depends_on:
  - backend  # Important: nginx needs backend to be running
```

## Ansible Deployment Example

For automated deployments, here's an example Ansible task structure:

```yaml
- name: Create docker-compose.yml
  ansible.windows.win_copy:
    content: |
      services:
        postgres:
          image: pgvector/pgvector:pg17  # NOT postgres:alpine!
          environment:
            - POSTGRES_DB={{ db_name }}
            - POSTGRES_USER={{ db_user }}
            - POSTGRES_PASSWORD={{ db_password }}
          # ...

        backend:
          environment:
            - DB_TYPE=postgres
            - DB_HOST=postgres
            - DB_PASSWORD={{ db_password }}
            - JWT_SECRET={{ jwt_secret }}
            - PYTHON_AI_SERVICE_URL=http://ai-service:8001
            # ...

        ai-service:
          environment:
            - AI_PROVIDER={{ ai_provider }}
            # DATABASE CONFIG - REQUIRED FOR RAG
            - DB_HOST=postgres
            - DB_PORT={{ db_port }}
            - DB_NAME={{ db_name }}
            - DB_USER={{ db_user }}
            - DB_PASSWORD={{ db_password }}
            # ...

        web:
          depends_on:
            - backend
          # ...
```

## RAG Knowledge Base Setup

The RAG (Retrieval Augmented Generation) feature requires:

1. **PostgreSQL with pgvector extension**
   - Use `pgvector/pgvector:pg17` image
   - Standard `postgres:alpine` will fail with: `extension "vector" is not available`

2. **AI Service database configuration**
   - All 5 DB_* environment variables must be set
   - Without them, the Settings page shows "No setting packs available"

3. **Backend migration**
   - Migration `0003_pgvector_wiki_rag.sql` creates tables and seeds setting packs
   - Runs automatically on backend startup

4. **Embedding Provider (Automatic)**

   The ai-service automatically selects the embedding provider based on available API keys:

   | Priority | Condition | Embedding Provider | Dimensions |
   |----------|-----------|-------------------|------------|
   | 1 | `OPENAI_API_KEY` is set | OpenAI `text-embedding-3-small` | 1536 |
   | 2 | Fallback | Ollama `nomic-embed-text` | 768 |

   **Embedding provider is independent of text generation!**
   You can use Ollama for NPC/location generation while using OpenAI for embeddings.

   **For new deployments:**
   - Apply migration `0004_variable_embedding_dimensions.sql` for dynamic dimension support
   - This allows any embedding model to work without schema changes

   **For existing deployments with migration 0003:**
   - If you have `OPENAI_API_KEY`: Everything works (1536 dims)
   - If using Ollama only: Apply migration 0004, then re-scrape wikis

   **Apply migration 0004:**
   ```bash
   docker exec -i tavkit-postgres psql -U tavkit -d tavkit < \
     backend/internal/db/migrations/postgres/0004_variable_embedding_dimensions.sql
   ```

### Verify RAG is Working

```bash
# Check if setting packs exist in database
docker exec -it tavkit-postgres psql -U tavkit -d tavkit \
  -c "SELECT slug, name FROM setting_knowledge_packs;"

# Expected output: 8 rows (eberron, forgotten-realms, etc.)

# Check ai-service logs for connection errors
docker logs tavkit-ai-service | grep -i "password\|error\|failed"
```

### Common RAG Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| "extension vector not available" | Wrong postgres image | Use `pgvector/pgvector:pg17` |
| "No setting packs available" | ai-service can't reach DB | Add DB_* env vars to ai-service |
| "password authentication failed" | DB_PASSWORD mismatch | Ensure same password everywhere |
| 403 on scrape endpoint | CSRF token expired | Log out and log back in |
| "expected 1536 dimensions, not 768" | Ollama embeddings with migration 0003 | Apply migration 0004 or set OPENAI_API_KEY |

## CSRF Token Handling

Tavkit uses CSRF tokens for state-changing requests. The tokens are:
- Generated on login
- Stored in memory on the backend
- Sent as `csrf_token` cookie
- Must be included as `X-CSRF-Token` header on POST/PUT/DELETE requests

**Important:** If the backend restarts, all CSRF tokens are invalidated. Users must log out and log back in.

## Health Checks

All services expose health endpoints:

```bash
# Backend
curl http://localhost:8000/api/v1/health
# {"status":"healthy"}

# AI Service
curl http://localhost:8001/health
# {"status":"healthy"}

# PostgreSQL
docker exec tavkit-postgres pg_isready -U tavkit -d tavkit
# /var/run/postgresql:5432 - accepting connections
```

## Minimum Required Environment Variables

At minimum, you need to set these in your deployment:

| Variable | Where | Purpose |
|----------|-------|---------|
| `DB_PASSWORD` | postgres, backend, ai-service | Database authentication |
| `JWT_SECRET` | backend | JWT token signing |
| `AI_PROVIDER` | backend, ai-service | Which AI to use |
| `*_API_KEY` | backend, ai-service | Cloud AI credentials (if using) |

## Recommended Production Settings

```yaml
# Security
POSTGRES_HOST_AUTH_METHOD: scram-sha-256
DB_SSLMODE: require  # If using external postgres

# Performance
OLLAMA_TIMEOUT: 120
AI_TEMPERATURE: 0.7

# Logging
LOG_LEVEL: info
ENVIRONMENT: production

# Restart policy
restart: unless-stopped
```

## Upgrade Process

1. Pull new images
2. Stop services
3. Start services (migrations run automatically)
4. Verify health checks

```bash
docker compose pull
docker compose down
docker compose up -d
docker compose ps  # All should show "healthy"
```

If migrations fail, check backend logs:
```bash
docker logs tavkit-backend | grep -i migration
```
