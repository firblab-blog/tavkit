# Tavkit Quick Start

## TL;DR - Choose Your AI Provider

### 🐳 Option 1: Containerized Ollama (Recommended for Local)

```bash
cp .env.example .env
# Edit: DB_PASSWORD, JWT_SECRET, OLLAMA_BASE_URL=http://ollama:11434
make up-ollama
```

**First run:** 5-10 min (downloads model) | **Next runs:** ~30 sec

### 🖥️ Option 2: External Ollama

```bash
ollama serve  # In separate terminal
cp .env.example .env
# Edit: DB_PASSWORD, JWT_SECRET, OLLAMA_BASE_URL=http://localhost:11434
make up
```

### ☁️ Option 3: OpenAI

```bash
cp .env.example .env
# Edit: AI_PROVIDER=openai, OPENAI_API_KEY, DB_PASSWORD, JWT_SECRET
make up
```

### ☁️ Option 4: Anthropic Claude

```bash
cp .env.example .env
# Edit: AI_PROVIDER=anthropic, ANTHROPIC_API_KEY, DB_PASSWORD, JWT_SECRET
make up
```

---

## What You Get (With Containerized Ollama)

When you run `make up-ollama`, Docker Compose deploys **6 services**:

| Service | Port | Purpose | Auto-Configured |
|---------|------|---------|-----------------|
| PostgreSQL | 5432 | Database | ✅ Yes |
| **Ollama** | 11434 | Local AI (LLM) | ✅ Yes + Model Download |
| AI Service | 8001 | Python FastAPI | ✅ Yes |
| Backend | 8000 | Go API | ✅ Yes |
| Frontend | 3000 | React App | ✅ Yes |
| Ollama Init | - | Downloads AI model | ✅ Yes (runs once) |

**Without Ollama profile (`make up`):** Only 4 services (no Ollama, no init)

---

## First Run Timeline (Containerized Ollama)

```
00:00 - Start docker compose up
00:05 - PostgreSQL ready
00:10 - Ollama starting
00:15 - Downloading llama3.2:7b model (4.5GB)
05:00 - Model downloaded
05:10 - AI service connecting to Ollama
05:15 - Backend starting
05:20 - Frontend ready
05:30 - ✅ All services healthy!

Next run: ~30 seconds (model already downloaded!)
```

---

## Verify Everything Works

### 1. Check All Services
```bash
docker compose ps

# Should show all services as "healthy" or "running"
```

### 2. Test Backend
```bash
curl http://localhost:8000/api/v1/health
# {"status":"healthy"}
```

### 3. Test AI Service
```bash
curl http://localhost:8001/health/ready
# {"status":"ready","ai_provider":"ollama","ai_provider_healthy":true}
```

### 4. Test Ollama
```bash
curl http://localhost:11434/api/tags
# Shows available models
```

### 5. Open Frontend
```
http://localhost:3000
```

---

## Common Commands

```bash
# Start everything
make up

# Stop everything
make down

# Restart (useful after changing model)
make restart

# View logs
make logs

# View logs for specific service
docker compose logs -f ai-service
docker compose logs -f ollama

# Check service health
docker compose ps

# Rebuild after code changes
make build
make up
```

---

## Changing AI Models

Edit `.env`:
```bash
# Faster (for testing)
OLLAMA_MODEL=llama3.2:3b

# Balanced (default)
OLLAMA_MODEL=llama3.2:7b

# Powerful
OLLAMA_MODEL=llama3.1:8b
```

Then:
```bash
make down
make up
# New model downloads automatically
```

---

## Using Cloud AI Instead

### Switch to OpenAI
Edit `.env`:
```bash
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-key-here
```

```bash
make restart
```

### Switch to Anthropic Claude
Edit `.env`:
```bash
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

```bash
make restart
```

### Switch Back to Ollama
Edit `.env`:
```bash
AI_PROVIDER=ollama
```

```bash
make restart
```

---

## Troubleshooting

### "Ollama taking forever to start"
First run downloads ~4.5GB model. Be patient!
```bash
# Watch progress
docker compose logs -f ollama-init
```

### "AI service can't connect to Ollama"
```bash
# Check if Ollama is healthy
docker compose ps ollama

# Check Ollama logs
docker compose logs ollama

# Restart Ollama
docker compose restart ollama ai-service
```

### "Out of disk space"
Ollama models are large:
```bash
# Check model size
docker compose exec ollama ollama list

# Remove unused models
docker compose exec ollama ollama rm old-model:tag
```

### "Services won't start"
```bash
# Check .env has required values
cat .env | grep -E "DB_PASSWORD|JWT_SECRET"

# View all logs
docker compose logs
```

### Clean Start
```bash
# Stop everything
make down

# Remove volumes (WARNING: deletes data!)
docker compose down -v

# Start fresh
make up
```

---

## Development Workflow

### Code Changes

**Backend (Go):**
```bash
# Make changes to backend/*.go files
make build-backend
docker compose restart backend
```

**AI Service (Python):**
```bash
# Make changes to ai-service/*.py files  
make build-ai
docker compose restart ai-service
```

**Frontend (React):**
```bash
# For development, run outside Docker:
cd web
npm install
npm run dev
# Hot reload on http://localhost:3000
```

### Testing
```bash
# Test backend
cd backend && go test ./...

# Test AI service
cd ai-service && poetry run pytest

# Test frontend
cd web && npm test
```

---

## Production Deployment

When ready for production:

```bash
# Build production images
docker compose build

# Start with production settings
ENVIRONMENT=production docker compose up -d

# With Caddy reverse proxy (SSL)
docker compose --profile proxy up -d
```

---

## Resource Usage

| Component | CPU | RAM | Disk |
|-----------|-----|-----|------|
| PostgreSQL | Low | 100MB | 500MB |
| Ollama (idle) | Low | 500MB | 5GB |
| Ollama (generating) | High | 6-8GB | 5GB |
| AI Service | Low | 100MB | 500MB |
| Backend | Low | 50MB | 50MB |
| Frontend | Low | 20MB | 50MB |
| **Total** | | **~8GB RAM** | **~7GB disk** |

**Mac Mini M4 Recommendation:** 16GB+ RAM for smooth operation

---

## Next Steps

1. ✅ Services running? → Register at http://localhost:3000/register
2. ✅ Test AI generation → Create an NPC in the dashboard
3. ✅ Explore the API → http://localhost:8000/api/v1/health
4. 📚 Read docs → `docs/ARCHITECTURE.md`, `docs/DEVELOPMENT.md`
5. 🚀 Start building → Check `TODO.md` for features to implement

---

**Enjoy your self-contained D&D GM toolkit! 🎲⚔️🐉**
