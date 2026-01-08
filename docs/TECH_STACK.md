**TavKit** (Tavern + Toolkit) is a self-hosted web application designed to be a Dungeon Master's command center. It combines persistent embedded websites, AI-powered content generators, and comprehensive campaign management into a single unified interface.

**Campaign Context-Aware AI Generation:** TavKit's standout feature is its intelligent AI integration. The system analyzes your entire campaign to generate a comprehensive summary, which then serves as context for all AI generators. When creating NPCs, monsters, encounters, locations, quests, or other content, the AI understands your campaign's themes, factions, locations, and narrative context—ensuring generated content feels cohesive and tailored to your world. All generated content can be saved directly to your campaign with a single click.

---

## Key Features

### Persistent Embedded Tools
Embed external D&D tools (5e.tools, D&D Beyond, Roll20, etc.) directly in the interface. These embedded tools persist across browser sessions—no more losing your place when you close the browser or switch between tools.

### Comprehensive Campaign Management
Organize your entire campaign across **22 dedicated content sections**: NPCs, Monsters, Locations, Quests, Items, Encounters, Factions, Sessions, Dialogues, Rumors, and more. Each section supports markdown formatting for rich notes.

### AI-Powered Content Generation
**13 specialized AI generators** create campaign-specific content:
- **NPCs** - Personalities, backstories, motivations, stats
- **Monsters** - Custom creatures with lore and tactics
- **Encounters** - Balanced combat scenarios
- **Locations** - Detailed settings with secrets and NPCs
- **Quests** - Plot hooks with objectives and rewards
- **Items** - Magic items with properties and history
- **Dialogues** - NPC conversation trees with skill checks
- **Rumors** - Plot hooks and worldbuilding flavor
- **Taverns** - Inns with keepers, menus, patrons, and events
- **Merchants** - Shops with inventory, owners, and haggling
- **Traps** - Mechanical and magical hazards with solutions
- **Critters** - Small creatures and familiars
- **Chases** - Pursuit scenarios with obstacles and complications

### Multi-Provider AI Support
Choose your AI provider based on your priorities:
- **Ollama** (Local) - 100% offline, privacy-first, no API costs
- **OpenAI** - Fast, reliable, GPT-4 Turbo and GPT-4o models
- **Anthropic** - Claude Haiku and Sonnet for high-quality, nuanced content

Switch providers anytime through the admin settings.

---

## The Problem It Solves

Dungeon Masters juggle dozens of tools during game prep:

- **Multiple browser tabs** for D&D Beyond, 5etools, Roll20, Foundry VTT
- **Scattered notes** across different apps and platforms
- **Manual content creation** taking hours per session
- **Lost context** when switching between tools
- **Privacy concerns** with cloud-based AI services

## Why Build This?

- **Unified workspace** - All tools in one persistent interface
- **AI-powered generation** - Create NPCs, monsters, encounters in seconds
- **Campaign organization** - Centralized campaign notes and content
- **Self-hosted privacy** - Your data stays on your infrastructure
- **Local AI option** - Use Ollama for 100% offline generation
- **Learning opportunity** - Explore microservices, AI integration, and modern web architecture












## The Tech Stack

### Frontend: React 18 + TypeScript + Vite

**Why React for this project:**

- Component-based architecture perfect for complex UI
- TypeScript provides type safety for large codebase
- Vite offers instant hot reload during development
- Rich ecosystem for state management (Zustand)

**Key Technologies:**

- **Zustand** for state management (simpler than Redux)
- **React Router** for navigation
- **Axios** for HTTP client
- **React Markdown** for rendering campaign notes
- **Tailwind CSS** for styling (custom tavern theme)

### Backend: Go 1.25 + Gin Framework

**Why Go for the backend:**

- Compiled language = fast execution and small binaries
- Excellent concurrency with goroutines
- Strong standard library
- Built-in HTTP server (no nginx needed for dev)
- Easy deployment (single static binary)
- Type safety without JVM overhead
- Perfect for API gateways and proxies

**Key Technologies:**

- **Gin** web framework (Express-like for Go)
- **JWT authentication** with HttpOnly cookies
- **Argon2id** password hashing with constant-time comparison
- **CSRF protection** middleware for state-changing requests
- **Rate limiting** with token bucket algorithm
- **PostgreSQL and SQLite** support (database abstraction)
- **Zap** structured logging

### AI Service: Python 3.12 + FastAPI

**Why Python for AI:**

- Best AI/ML ecosystem (LangChain, transformers, etc.)
- Native Ollama SDK support
- OpenAI and Anthropic official clients
- Easy prompt engineering and experimentation
- Async/await for concurrent requests
- Fast iteration on AI features

**Key Technologies:**

- **FastAPI** for async API endpoints
- **Pydantic** for request/response validation
- **aiohttp** for async HTTP requests
- **LangChain** integration (future)
- Multiple AI provider abstractions

### Database: PostgreSQL 17 + SQLite

**Dual database support:**

#### PostgreSQL (Production)

- Full ACID compliance
- Better for multi-user scenarios
- JSON column support for flexible schemas
- Robust for large datasets
- Optional profile in docker-compose

#### SQLite (Development/Small Deployments)

- Zero configuration
- File-based (easy backups)
- Perfect for single-user or small groups
- Included by default
- No separate container needed









## Security

TavKit implements defense-in-depth security across all layers:

### Authentication & Session Management
- **JWT tokens** in HttpOnly cookies (immune to XSS token theft)
- **CSRF tokens** validated on all state-changing requests
- **Argon2id** password hashing (memory-hard, timing-attack resistant)
- **Constant-time comparisons** for all security-sensitive operations

### Input Validation & Output Encoding
- **Parameterized SQL queries** - zero SQL injection vectors
- **DOMPurify sanitization** - XSS prevention for user content
- **Gin binding validation** - type-safe request parsing with size limits
- **Generic error messages** - no internal details leaked to clients

### Network & Infrastructure Security
- **SSRF protection** - proxy blocks private IP ranges (including AWS metadata)
- **URL whitelisting** - only approved external sites can be embedded
- **Rate limiting** - token bucket per-IP prevents abuse
- **Iframe sandbox** - embedded content runs with restricted permissions

For detailed security information, see:
- [Backend Security Audit](BACKEND_SECURITY_AUDIT.md)
- [Frontend Security Audit](FRONTEND_SECURITY_AUDIT.md)
- [Security Policy](/SECURITY.md)

---

## Infrastructure

### Docker + Docker Compose

- Multi-service orchestration
- Separate containers: `backend`, `ai-service`, `web`, `postgres`, `ollama`
- Profile-based deployment (`postgres` profile, `ollama` profile)
- Volume mounts for persistent data
- Health checks for service dependencies

### GitLab CI/CD

- Automated linting (`golangci-lint`, `pylint`, `eslint`)
- Security scanning (`Trivy`, `gosec`)
- Docker image builds
- Multi-stage pipelines
- Private registry support

### Makefile Automation

Consistent commands across platforms:

```bash
make up-ollama    # Start with local AI
make up-postgres  # Start with PostgreSQL
make dev          # Development mode
make test         # Run all tests
```