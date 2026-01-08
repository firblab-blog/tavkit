# Getting Started with Tavkit

Complete guide to running Tavkit locally for development.

## Prerequisites

**For Docker (Recommended):**
- **Docker 28+** with Docker Compose
- **8GB+ RAM** (if using Ollama)
- **10GB+ free disk space** (if using Ollama for AI model)

**For Manual Setup (Advanced):**
- **Go 1.23+** - Backend API
- **Python 3.13+** - AI service
- **Node.js 22+** (LTS) - Frontend
- **PostgreSQL 17** or **SQLite** - Database

---

## AI Provider Options

Tavkit gives you **4 flexible options** for AI features:

### 1. 🐳 Containerized Ollama (Recommended for Local Testing)
- **Best for:** Local development and testing
- **Pros:** Free, private, runs on your machine
- **Cons:** Slower than cloud APIs, requires 8GB RAM
- **Setup:** `make up-ollama` - that's it!
- **First run:** Downloads model (~5-10 min), then instant

### 2. 🖥️ External Ollama (Use Your Own Installation)
- **Best for:** You already have Ollama installed separately
- **Setup:** Set `OLLAMA_BASE_URL=http://localhost:11434` in .env
- **Run:** `make up` (no profile needed)

### 3. ☁️ OpenAI (Cloud API)
- **Best for:** Production, need fast/high-quality responses
- **Pros:** Fast, high quality (GPT-4)
- **Cons:** Costs money per request
- **Setup:** Add `OPENAI_API_KEY` to .env, set `AI_PROVIDER=openai`

### 4. ☁️ Anthropic Claude (Cloud API)
- **Best for:** Production, alternative to OpenAI
- **Pros:** Fast, high quality (Claude 3)
- **Cons:** Costs money per request
- **Setup:** Add `ANTHROPIC_API_KEY` to .env, set `AI_PROVIDER=anthropic`

---

## Quick Start with Docker

### Option A: With Containerized Ollama (Recommended for Local)

Deploys Ollama automatically with the app:

```bash
# 1. Clone and enter directory
cd firblab-tavkit

# 2. Copy environment file
cp .env.example .env

# 3. Edit .env and set required values:
#    - DB_PASSWORD (min 32 chars)
#    - JWT_SECRET (min 32 chars)
#    - OLLAMA_BASE_URL=http://ollama:11434 (for containerized)
#    Everything else has good defaults!

# 4. Start all services WITH Ollama profile
make up-ollama
# Or: docker compose --profile ollama up -d

# First run will:
# ✅ Start PostgreSQL database
# ✅ Start Ollama LLM server
# ✅ Download llama3.2:7b model (~4.5GB - takes 5-10 min)
# ✅ Start AI service
# ✅ Start Go backend
# ✅ Start React frontend

# 5. Watch the logs (optional)
make logs
# Or specifically for Ollama: make logs-ollama

# 6. Access the application
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
# AI Service: http://localhost:8001
# Ollama: http://localhost:11434
```

**⏱️ Timeline:**
- **First startup:** 5-10 minutes (downloading model)
- **Next startups:** ~30 seconds (model cached)

---

### Option B: With External Ollama

Use Ollama you've installed separately:

```bash
# 1. Make sure Ollama is running on your machine
ollama serve  # In separate terminal

# 2. Setup .env
cp .env.example .env
# Edit .env:
#    - OLLAMA_BASE_URL=http://localhost:11434 (external)
#    - DB_PASSWORD and JWT_SECRET

# 3. Start services WITHOUT Ollama profile
make up
# Or: docker compose up -d

# This skips Ollama container, uses your local installation
```

---

### Option C: With OpenAI

Use cloud API (costs money):

```bash
# 1. Setup .env
cp .env.example .env
# Edit .env:
#    - AI_PROVIDER=openai
#    - OPENAI_API_KEY=sk-your-key-here
#    - DB_PASSWORD and JWT_SECRET

# 2. Start services
make up

# No Ollama needed!
```

---

### Option D: With Anthropic Claude

Use cloud API (costs money):

```bash
# 1. Setup .env
cp .env.example .env
# Edit .env:
#    - AI_PROVIDER=anthropic
#    - ANTHROPIC_API_KEY=sk-ant-your-key-here
#    - DB_PASSWORD and JWT_SECRET

# 2. Start services
make up

# No Ollama needed!
```

---

## Verify Everything Works

```bash
# Check all containers are healthy
docker compose ps
make logs
# Wait for "Model ready!" message

# 6. Access the application
#    Frontend: http://localhost:3000
#    Backend API: http://localhost:8000
#    AI Service: http://localhost:8001
#    Ollama: http://localhost:11434
```

**First startup takes 5-10 minutes to download the AI model. Subsequent starts are instant!**

## What Gets Deployed

When you run `make up`, Docker Compose automatically deploys:

1. **PostgreSQL 17** - Database (port 5432)
2. **Ollama** - Local LLM server (port 11434)
3. **Ollama Init** - Downloads the AI model automatically
4. **AI Service** - Python FastAPI (port 8001)
5. **Backend** - Go API (port 8000)
6. **Frontend** - React app (port 3000)

**Everything is pre-configured and works together out of the box!**

## Choosing AI Models

Edit `.env` to change the model:

```bash
# Fast & Small (good for testing) - 2GB
OLLAMA_MODEL=llama3.2:3b

# Balanced (recommended) - 4.5GB
OLLAMA_MODEL=llama3.2:7b

# More Powerful - 4.7GB
OLLAMA_MODEL=llama3.1:8b

# Creative Writing - 4.1GB
OLLAMA_MODEL=mistral:7b
```

Then restart:
```bash
make restart
# New model will be downloaded automatically
```

## Manual Setup (Development)

### 1. Database Setup

**Option A: PostgreSQL (Recommended)**
```bash
# Start PostgreSQL
docker run -d \
  --name tavkit-db \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=tavkit \
  -p 5432:5432 \
  postgres:17-alpine

# Run migrations
psql -U postgres -h localhost -d tavkit -f db/migrations/001_init.sql
```

**Option B: SQLite**
```bash
# Just set in .env:
DB_DRIVER=sqlite
DB_SOURCE=./tavkit.db
```

### 2. Backend (Go)

```bash
cd backend

# Install dependencies
go mod download

# Copy and configure environment
cp ../.env.example ../.env
# Edit .env with your settings

# Run migrations (if not already done)
go run cmd/server/main.go migrate

# Start server
go run cmd/server/main.go
# Or use: make run-backend

# Server runs on :8000
```

### 3. AI Service (Python)

```bash
cd ai-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install poetry
poetry install

# Configure environment
# Add to .env:
AI_PROVIDER=ollama  # or openai, anthropic
OLLAMA_BASE_URL=http://localhost:11434

# Start service
poetry run python app/main.py
# Or use: make run-ai

# Service runs on :8001
```

**Setting up Ollama (Local LLM)**
```bash
# Install Ollama
brew install ollama  # macOS
# Or download from https://ollama.ai

# Start Ollama service
ollama serve

# Pull model
ollama pull llama3.2:7b

# Test
curl http://localhost:11434/api/tags
```

### 4. Frontend (React)

```bash
cd web

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit if needed (defaults to localhost:8000)

# Start development server
npm run dev
# Or use: make run-web

# App runs on :3000
```

## Testing the Setup

### 1. Health Checks
```bash
# Backend
curl http://localhost:8000/api/v1/health

# AI Service
curl http://localhost:8001/health

# Frontend (should load)
open http://localhost:3000
```

### 2. Register a User
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 3. Generate an NPC (requires auth token)
```bash
# Login first
TOKEN=$(curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | jq -r '.token')

# Generate NPC
curl -X POST http://localhost:8000/api/v1/npcs/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A mysterious elven ranger",
    "race": "Elf",
    "class": "Ranger",
    "level": 5
  }'
```

## Development Workflow

### Using Make Commands
```bash
make help           # Show all commands
make dev            # Start all services in development mode
make test           # Run all tests
make lint           # Run linters
make build          # Build all services
make clean          # Clean build artifacts
```

### Backend Development
```bash
cd backend
go test ./...                    # Run tests
go run cmd/server/main.go        # Run server
go build -o bin/server cmd/server/main.go  # Build
```

### AI Service Development
```bash
cd ai-service
poetry run pytest                # Run tests
poetry run python app/main.py    # Run server
poetry run black .               # Format code
poetry run mypy app              # Type check
```

### Frontend Development
```bash
cd web
npm test                         # Run tests
npm run dev                      # Development server
npm run build                    # Production build
npm run lint                     # Lint code
```

## Environment Variables

Key variables needed in `.env`:

```bash
# Server
SERVER_PORT=8000
SERVER_ENVIRONMENT=development

# Database
DB_DRIVER=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tavkit
DB_USER=postgres
DB_PASSWORD=your_secure_password  # REQUIRED, min 32 chars

# Auth
JWT_SECRET=your_jwt_secret_key    # REQUIRED, min 32 chars
JWT_EXPIRATION=24h

# AI Service
AI_BASE_URL=http://localhost:8001
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:7b

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

## Troubleshooting

### "Failed to connect to database"
- Ensure PostgreSQL is running: `docker ps` or `pg_isready`
- Check DB_PASSWORD in .env matches database password
- Verify DB_HOST and DB_PORT are correct

### "AI service not responding"
- Ensure Ollama is running: `curl http://localhost:11434/api/tags`
- Check AI_BASE_URL in backend .env
- Verify model is downloaded: `ollama list`

### "Frontend can't connect to backend"
- Check VITE_API_URL in web/.env
- Ensure backend is running on correct port
- Check CORS_ALLOWED_ORIGINS includes frontend URL

### Port already in use
```bash
# Find and kill process
lsof -ti:8000 | xargs kill  # Backend
lsof -ti:8001 | xargs kill  # AI service
lsof -ti:3000 | xargs kill  # Frontend
```

## Next Steps

1. **Read the Documentation**
   - `docs/ARCHITECTURE.md` - System design
   - `docs/DEVELOPMENT.md` - Development guide
   - `TODO.md` - Development roadmap

2. **Explore the API**
   - Backend API: http://localhost:8000/api/v1
   - AI Service API: http://localhost:8001/api/v1
   - Health checks: `/health` and `/health/ready`

3. **Join Development**
   - Check `TODO.md` for tasks
   - Run tests before committing
   - Follow contribution guidelines

## Useful Commands

```bash
# Database
make db-migrate          # Run migrations
make db-reset            # Reset database
make db-seed             # Seed test data

# Docker
make up                  # Start all containers
make down                # Stop all containers
make logs                # View logs

# Testing
make test                # Run all tests
make test-backend        # Test backend only
make test-ai             # Test AI service
make test-web            # Test frontend

# Building
make build               # Build all
make build-backend       # Build Go binary
make build-ai            # Build AI Docker image
make build-web           # Build React app
```

## Resources

- Go Docs: https://golang.org/doc/
- FastAPI: https://fastapi.tiangolo.com/
- React: https://react.dev/
- Ollama: https://ollama.ai/
- PostgreSQL: https://www.postgresql.org/docs/
