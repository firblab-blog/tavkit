# 🏗️ Tavkit Architecture

## Overview

Tavkit uses a **microservices architecture** with clear separation of concerns:

- **Go Backend** - High-performance API gateway and business logic
- **Python AI Service** - AI/ML workloads and LLM integration
- **React Frontend** - Modern, type-safe user interface
- **PostgreSQL** - Relational data storage
- **Ollama** - Local LLM inference

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Caddy Reverse Proxy                      │
│              SSL/TLS + Load Balancing                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                    HTTP/HTTPS
                         │
         ┌───────────────┴───────────────┐
         │                               │
    WebSocket                         HTTP API
         │                               │
┌────────▼────────┐            ┌────────▼─────────┐
│                 │            │                  │
│   Go Backend    │◄──────────►│  Python AI API   │
│   (Port 8000)   │    HTTP    │   (Port 8001)    │
│                 │            │                  │
│  ┌───────────┐  │            │  ┌────────────┐ │
│  │  Router   │  │            │  │  FastAPI   │ │
│  └─────┬─────┘  │            │  └──────┬─────┘ │
│        │        │            │         │       │
│  ┌─────▼─────┐  │            │  ┌──────▼─────┐ │
│  │Middleware │  │            │  │ Generators │ │
│  │ - Auth    │  │            │  │ - NPC      │ │
│  │ - CORS    │  │            │  │ - Monster  │ │
│  │ - Limiter │  │            │  │ - Encounter│ │
│  └─────┬─────┘  │            │  └──────┬─────┘ │
│        │        │            │         │       │
│  ┌─────▼─────┐  │            │  ┌──────▼─────┐ │
│  │ Handlers  │  │            │  │ Providers  │ │
│  │ - Users   │  │            │  │ - Ollama   │ │
│  │ - Tools   │  │            │  │ - OpenAI   │ │
│  │ - NPCs    │  │            │  │ - Claude   │ │
│  └─────┬─────┘  │            │  └──────┬─────┘ │
│        │        │            │         │       │
│  ┌─────▼─────┐  │            │         │       │
│  │ Services  │──┼────────────┼─────────┘       │
│  │ - DB      │  │   HTTP     │                 │
│  │ - AI      │  │   Client   │                 │
│  │ - Git     │  │            │                 │
│  └─────┬─────┘  │            └─────────────────┘
│        │        │                      │
└────────┼────────┘                      │
         │                               │
         │                               │
┌────────▼─────────────────┐    ┌────────▼─────────┐
│    PostgreSQL DB         │    │  Ollama Service  │
│                          │    │                  │
│  Tables:                 │    │  Models:         │
│  - users                 │    │  - llama3.2:7b   │
│  - tools                 │    │  - mistral:7b    │
│  - npcs                  │    │  - codellama:7b  │
│  - monsters              │    │                  │
│  - encounters            │    │  Hardware:       │
│  - sessions              │    │  - Mac Mini M4   │
│                          │    │  - Metal GPU     │
└──────────────────────────┘    └──────────────────┘
```

---

## Component Details

### **1. Frontend (React + TypeScript)**

**Responsibilities:**
- User interface rendering
- Client-side routing
- State management
- API communication
- WebSocket connections
- Input validation (first line of defense)
- XSS prevention (DOMPurify)

**Tech Stack:**
- React 18 (component-based UI)
- TypeScript (type safety)
- Zustand (state management)
- React Query (server state)
- Axios (HTTP client)
- Socket.io (WebSocket)
- TailwindCSS (styling)
- Vite (build tool)

**Key Features:**
- Responsive design
- Dark mode support
- Tabbed interface for tools
- iframe embedding with CSP
- Real-time updates

---

### **2. Go Backend (API Gateway)**

**Responsibilities:**
- HTTP API routing
- Authentication & authorization (JWT)
- Database operations (PostgreSQL)
- WebSocket management
- Request validation
- Rate limiting
- CORS handling
- Proxying to AI service
- Git provider integration

**Tech Stack:**
- Gin (web framework)
- pgx (PostgreSQL driver)
- JWT (authentication)
- bcrypt (password hashing)
- Validator (input validation)
- Zap (logging)
- Swagger (API docs)

**API Endpoints:**

```
POST   /api/auth/register          # User registration
POST   /api/auth/login             # User login
POST   /api/auth/refresh           # Refresh JWT token

GET    /api/users/me               # Current user info
PATCH  /api/users/me               # Update profile

GET    /api/tools                  # List user's tools
POST   /api/tools                  # Create tool
PATCH  /api/tools/:id              # Update tool
DELETE /api/tools/:id              # Delete tool

GET    /api/npcs                   # List NPCs
POST   /api/npcs                   # Create NPC
POST   /api/npcs/generate          # AI-generate NPC
GET    /api/npcs/:id               # Get NPC
DELETE /api/npcs/:id               # Delete NPC

GET    /api/monsters               # List monsters
POST   /api/monsters/generate      # AI-generate monster
GET    /api/monsters/:id           # Get monster

POST   /api/encounters/generate    # AI-generate encounter
GET    /api/encounters             # List encounters

POST   /api/dice/roll              # Roll dice
GET    /api/git/repos              # List Git repos
GET    /api/git/file               # Get file content
```

**WebSocket Events:**
```
connect                            # Client connects
disconnect                         # Client disconnects
join_session                       # Join DM session
leave_session                      # Leave session
dice_roll                          # Broadcast dice roll
tool_update                        # Broadcast tool change
```

---

### **3. Python AI Service (LLM Integration)**

**Responsibilities:**
- LLM prompt engineering
- AI model management
- Generator implementations
- Provider fallback logic
- Response parsing and validation
- Structured output formatting

**Tech Stack:**
- FastAPI (async web framework)
- Uvicorn (ASGI server)
- LangChain (AI orchestration)
- Ollama SDK (local LLM)
- OpenAI SDK (fallback)
- Anthropic SDK (fallback)
- Pydantic (data validation)

**API Endpoints:**

```
GET    /health                     # Health check
GET    /models                     # List available models

POST   /generate/npc               # Generate NPC
POST   /generate/monster           # Generate monster
POST   /generate/encounter         # Generate encounter
POST   /generate/description       # Generate description
POST   /generate/plot-hook         # Generate plot hook

GET    /config                     # Current config
POST   /config/provider            # Change provider
```

**Generator Flow:**

```
1. Receive request from Go backend
2. Extract parameters (race, class, CR, etc.)
3. Select appropriate prompt template
4. Build structured prompt
5. Call LLM provider (Ollama primary)
6. Parse response into JSON
7. Validate output schema (Pydantic)
8. Return structured data
9. (On failure) Retry with fallback provider
```

---

### **4. Database (PostgreSQL)**

**Responsibilities:**
- Persistent data storage
- ACID transactions
- User data
- Generated content
- Tool configurations
- Session history

**Schema Design:**

```sql
-- Core tables
users           # User accounts
tools           # User's configured tools
sessions        # DM session history

-- Generated content
npcs            # AI-generated NPCs
monsters        # AI-generated monsters
encounters      # AI-generated encounters
descriptions    # AI-generated descriptions

-- Relationships
user_tools      # Many-to-many: users <-> tools
encounter_monsters  # Many-to-many: encounters <-> monsters
```

**Migrations:**
- Managed by golang-migrate
- Version controlled
- Up/down migrations
- Atomic transactions

---

### **5. Ollama (LLM Service)**

**Responsibilities:**
- LLM model hosting
- Inference execution
- Model loading/unloading
- GPU/Metal acceleration
- Context management

**Configuration:**
```bash
# Mac Mini M4 optimized
OLLAMA_NUM_PARALLEL=4
OLLAMA_NUM_GPU=1
OLLAMA_METAL=1
OLLAMA_NUM_CTX=4096
```

**Models:**
- `llama3.2:7b` - Primary (general purpose)
- `mistral:7b` - Fallback (creative)
- `codellama:7b` - Rules/stats

---

## Communication Patterns

### **1. Request Flow: Frontend → Backend → AI**

```
User clicks "Generate NPC" button
    ↓
[React] NPCGenerator.tsx
    ↓ HTTP POST /api/npcs/generate
    ↓ {race: "elf", class: "wizard"}
[Go] handlers/npcs.go
    ↓ Validate JWT token
    ↓ Validate input
    ↓ HTTP POST http://ai-service:8001/generate/npc
[Python] generators/npc_generator.py
    ↓ Load prompt template
    ↓ POST http://ollama:11434/api/generate
[Ollama] llama3.2:7b model
    ↓ Generate text
    ↓ Return JSON
[Python] Parse and validate output
    ↓ Return structured JSON
[Go] Save to PostgreSQL
    ↓ Return to frontend
[React] Display generated NPC
```

### **2. WebSocket Flow: Real-time Updates**

```
DM rolls dice
    ↓
[React] Send dice_roll event
    ↓ WebSocket
[Go] Receive event
    ↓ Broadcast to all players
    ↓ WebSocket
[React] Update UI for all clients
```

### **3. Error Handling**

```
Primary LLM fails (Ollama timeout)
    ↓
[Python] Catch exception
    ↓ Switch to fallback (OpenAI)
    ↓ Retry generation
    ↓ (If fallback also fails)
    ↓ Return pre-generated template
    ↓ Log error for monitoring
```

---

## Scalability Considerations

### **Horizontal Scaling**

1. **Go Backend** - Stateless, easily replicated
   - Load balance with Caddy/nginx
   - Session state in PostgreSQL

2. **Python AI Service** - CPU/GPU intensive
   - Scale based on generation load
   - Queue system for batch processing

3. **PostgreSQL** - Single writer, multiple readers
   - Read replicas for scaling reads
   - Connection pooling

4. **Ollama** - GPU-bound
   - Dedicated GPU machines
   - Request queuing

### **Vertical Scaling**

- **Mac Mini M4** - AI inference (M4 chip + Metal)
- **Proxmox LXC** - Backend services (CPU)
- **Database Server** - Memory and IOPS

---

## Security Architecture

### **Defense in Depth**

```
Layer 1: Network (Firewall, VPN)
Layer 2: Reverse Proxy (Caddy - TLS, rate limiting)
Layer 3: Backend (JWT auth, CORS, input validation)
Layer 4: Database (Parameterized queries, row-level security)
Layer 5: Application (Password hashing, XSS prevention)
```

### **Authentication Flow**

```
User submits credentials
    ↓
[Go] Validate input format
    ↓ Hash password (bcrypt)
    ↓ Query database
    ↓ Compare hashes
    ↓ Generate JWT token (HS256)
    ↓ Set HttpOnly cookie
    ↓ Return token + user info
```

### **Authorization Flow**

```
Client sends request with JWT
    ↓
[Go] Extract token from header/cookie
    ↓ Verify signature
    ↓ Check expiration
    ↓ Extract user ID
    ↓ Query user permissions
    ↓ Allow/deny request
```

---

## Deployment Architecture

### **Docker Compose (Development)**

```yaml
services:
  backend:      # Go API
  ai-service:   # Python AI
  postgres:     # Database
  ollama:       # LLM (optional)
  web:          # React (dev server)
  caddy:        # Reverse proxy
```

### **Production (Proxmox + Mac Mini)**

```
Proxmox LXC Container:
  - Backend (Go)
  - AI Service (Python)
  - PostgreSQL
  - Caddy

Mac Mini M4:
  - Ollama (Metal GPU)
  - Exposed on network
```

### **Kubernetes (Future)**

```
Deployments:
  - backend (3 replicas)
  - ai-service (2 replicas)
  - postgres (statefulset)

Services:
  - ClusterIP (internal)
  - LoadBalancer (external)

Ingress:
  - NGINX/Traefik
  - SSL termination
```

---

## Technology Decisions

### **Why Go for Backend?**

✅ **Performance** - Compiled, concurrent  
✅ **Security** - Memory-safe, type-safe  
✅ **Simplicity** - Easy to read/audit  
✅ **Tooling** - Built-in testing, formatting  
✅ **Docker** - Tiny binaries (~10MB)  

### **Why Python for AI?**

✅ **Ecosystem** - Best AI libraries  
✅ **LangChain** - AI orchestration  
✅ **Ollama SDK** - Native integration  
✅ **Rapid iteration** - Fast prototyping  

### **Why React for Frontend?**

✅ **TypeScript** - Type safety  
✅ **Ecosystem** - Massive library support  
✅ **Components** - Reusable UI  
✅ **Tooling** - Vite, ESLint, Prettier  

### **Why PostgreSQL?**

✅ **ACID** - Data integrity  
✅ **JSONB** - Flexible schema  
✅ **Extensions** - Full-text search  
✅ **Mature** - Battle-tested  

---

## Future Enhancements

### **Phase 1: Performance**
- Redis caching layer
- CDN for static assets
- Database query optimization
- GraphQL API option

### **Phase 2: Features**
- Voice integration (TTS/STT)
- Image generation (Stable Diffusion)
- Real-time collaboration
- Mobile app (React Native)

### **Phase 3: Infrastructure**
- Kubernetes deployment
- Multi-region support
- Disaster recovery
- Auto-scaling

---

## References

- [Go Best Practices](https://go.dev/doc/effective_go)
- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [React Documentation](https://react.dev)
- [PostgreSQL Documentation](https://postgresql.org/docs)
- [Ollama Documentation](https://ollama.com/docs)
