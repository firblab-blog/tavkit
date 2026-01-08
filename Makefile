.PHONY: help build dev up up-ollama down logs clean test lint format migrate-up migrate-down

# Variables
DOCKER_COMPOSE := docker compose
BACKEND_DIR := backend
AI_SERVICE_DIR := ai-service
WEB_DIR := web

# Default target
help:
	@echo "Tavkit Development Commands"
	@echo ""
	@echo "Development:"
	@echo "  make dev           - Start all services in development mode"
	@echo "  make dev-backend   - Start only backend"
	@echo "  make dev-ai        - Start only AI service"
	@echo "  make dev-web       - Start only frontend"
	@echo ""
	@echo "Docker:"
	@echo "  make build         - Build all Docker images"
	@echo "  make up            - Start core services (backend, AI, web) with SQLite"
	@echo "  make up-ollama     - Start with Ollama (recommended for local testing)"
	@echo "  make up-postgres   - Start with PostgreSQL database"
	@echo "  make up-full       - Start everything (Ollama + PostgreSQL)"
	@echo "  make down          - Stop all services"
	@echo "  make logs          - View logs"
	@echo "  make logs-ollama   - View Ollama logs"
	@echo "  make clean         - Remove containers, volumes, and images"
	@echo ""
	@echo "Database:"
	@echo "  make migrate-up    - Run database migrations"
	@echo "  make migrate-down  - Rollback database migrations"
	@echo "  make db-seed       - Seed database with test data"
	@echo "  make db-reset      - Reset database (drop, migrate, seed)"
	@echo ""
	@echo "Testing:"
	@echo "  make test          - Run all tests"
	@echo "  make test-backend  - Run backend tests"
	@echo "  make test-ai       - Run AI service tests"
	@echo "  make test-web      - Run frontend tests"
	@echo ""
	@echo "Code Quality:"
	@echo "  make lint          - Lint all code"
	@echo "  make format        - Format all code"
	@echo "  make security      - Run security scans"
	@echo ""
	@echo "Utilities:"
	@echo "  make install       - Install all dependencies"
	@echo "  make version       - Show versions of all tools"
	@echo "  make visualize     - Generate architecture diagrams"
	@echo ""
	@echo "AI Provider Options:"
	@echo "  1. Containerized Ollama + SQLite: make up-ollama (fastest for local testing)"
	@echo "  2. External Ollama + SQLite: make up"
	@echo "  3. Containerized Ollama + PostgreSQL: make up-full"
	@echo "  4. Cloud API (OpenAI/Anthropic): make up + set AI_PROVIDER in .env"

# Development
dev:
	@echo "Starting all services in development mode..."
	$(DOCKER_COMPOSE) -f docker-compose.dev.yml up

dev-backend:
	@echo "Starting backend..."
	cd $(BACKEND_DIR) && go run cmd/server/main.go

dev-ai:
	@echo "Starting AI service..."
	cd $(AI_SERVICE_DIR) && poetry run uvicorn app.main:app --reload --port 8001

dev-web:
	@echo "Starting frontend..."
	cd $(WEB_DIR) && npm run dev

# Docker
build:
	@echo "Building Docker images..."
	$(DOCKER_COMPOSE) build

up:
	@echo "🚀 Starting services based on .env configuration..."
	@PROFILES=""; \
	if grep -q "^DB_TYPE=postgres" .env 2>/dev/null && grep -q "^DB_HOST=postgres" .env 2>/dev/null; then \
		echo "📊 Detected bundled PostgreSQL (DB_HOST=postgres)"; \
		PROFILES="$$PROFILES --profile postgres"; \
	elif grep -q "^DB_TYPE=postgres" .env 2>/dev/null; then \
		echo "📊 Detected external PostgreSQL (using existing database)"; \
	fi; \
	if grep -q "^OLLAMA_BASE_URL=http://ollama:" .env 2>/dev/null; then \
		echo "🤖 Detected containerized Ollama configuration"; \
		PROFILES="$$PROFILES --profile ollama"; \
	fi; \
	if [ -z "$$PROFILES" ]; then \
		echo "💾 Using SQLite with external/cloud AI"; \
	fi; \
	$(DOCKER_COMPOSE) $$PROFILES up -d

up-ollama:
	@echo "Starting services with Ollama (SQLite database)..."
	@echo "⏳ First run will download AI model (~4.5GB, 5-10 min)"
	@echo "📦 Subsequent runs are instant (~30 sec)"
	$(DOCKER_COMPOSE) --profile ollama up -d

up-postgres:
	@echo "Starting services with PostgreSQL (no Ollama)..."
	$(DOCKER_COMPOSE) --profile postgres up -d

up-full:
	@echo "Starting ALL services (Ollama + PostgreSQL)..."
	@echo "⏳ First run will download AI model (~4.5GB, 5-10 min)"
	$(DOCKER_COMPOSE) --profile ollama --profile postgres up -d

down:
	@echo "Stopping services..."
	$(DOCKER_COMPOSE) --profile ollama --profile postgres down

logs:
	$(DOCKER_COMPOSE) logs -f

logs-ollama:
	@echo "Viewing Ollama logs..."
	$(DOCKER_COMPOSE) logs -f ollama ollama-init

clean:
	@echo "Cleaning up..."
	$(DOCKER_COMPOSE) down -v --remove-orphans
	docker system prune -f

# Database
migrate-up:
	@echo "Running migrations..."
	cd $(BACKEND_DIR) && go run cmd/migrate/main.go up

migrate-down:
	@echo "Rolling back migrations..."
	cd $(BACKEND_DIR) && go run cmd/migrate/main.go down 1

db-seed:
	@echo "Seeding database..."
	cd $(BACKEND_DIR) && go run cmd/seed/main.go

db-reset:
	@echo "Resetting database..."
	cd $(BACKEND_DIR) && go run cmd/seed/main.go --reset

# Testing
test: test-backend test-ai test-web

test-backend:
	@echo "Running backend tests..."
	cd $(BACKEND_DIR) && go test -v -race -coverprofile=coverage.out ./...

test-ai:
	@echo "Running AI service tests..."
	cd $(AI_SERVICE_DIR) && poetry run pytest

test-web:
	@echo "Running frontend tests..."
	cd $(WEB_DIR) && npm test

# Code Quality
lint: lint-backend lint-ai lint-web

lint-backend:
	@echo "Linting backend..."
	cd $(BACKEND_DIR) && golangci-lint run

lint-ai:
	@echo "Linting AI service..."
	cd $(AI_SERVICE_DIR) && poetry run ruff check . && poetry run mypy app/

lint-web:
	@echo "Linting frontend..."
	cd $(WEB_DIR) && npm run lint

format: format-backend format-ai format-web

format-backend:
	@echo "Formatting backend..."
	cd $(BACKEND_DIR) && go fmt ./...

format-ai:
	@echo "Formatting AI service..."
	cd $(AI_SERVICE_DIR) && poetry run black . && poetry run ruff check . --fix

format-web:
	@echo "Formatting frontend..."
	cd $(WEB_DIR) && npm run format

security:
	@echo "Running security scans..."
	@echo "Backend..."
	cd $(BACKEND_DIR) && gosec ./...
	@echo "AI Service..."
	cd $(AI_SERVICE_DIR) && poetry run bandit -r app/
	@echo "Docker images..."
	trivy image tavkit-backend tavkit-ai-service tavkit-web || true

# Utilities
install: install-backend install-ai install-web

install-backend:
	@echo "Installing backend dependencies..."
	cd $(BACKEND_DIR) && go mod download

install-ai:
	@echo "Installing AI service dependencies..."
	cd $(AI_SERVICE_DIR) && poetry install

install-web:
	@echo "Installing frontend dependencies..."
	cd $(WEB_DIR) && npm install

version:
	@echo "Versions:"
	@echo "  Go:     $$(go version)"
	@echo "  Python: $$(python --version)"
	@echo "  Node:   $$(node --version)"
	@echo "  npm:    $$(npm --version)"
	@echo "  Docker: $$(docker --version)"

visualize:
	@echo "Generating architecture diagrams..."
	@./scripts/generate-visualizations.sh

