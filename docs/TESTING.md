# Testing Guide for Tavkit

Comprehensive testing guide covering unit tests, integration tests, and AI provider testing.

---

## Testing Philosophy

Tavkit uses a **layered testing approach**:

1. **Unit Tests**: Test individual components in isolation
2. **Integration Tests**: Test service interactions
3. **E2E Tests**: Test full user workflows
4. **Manual Tests**: Test AI generation quality

---

## AI Provider Testing

### Using Different Providers

The system is designed to work with **any** AI provider. Switch by changing environment variables:

#### Development (Local with Ollama)
```bash
# .env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:7b
```

#### Production (Cloud)
```bash
# .env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4
```

#### Testing (Mock or Fast Model)
```bash
# For fast tests
AI_PROVIDER=ollama
OLLAMA_MODEL=llama3.2:3b  # Smaller, faster

# Or mock in tests
# See: ai-service/tests/test_providers.py
```

### Testing Strategy per Environment

| Environment | Provider | Model | Purpose |
|------------|----------|-------|---------|
| Local Dev | Ollama | llama3.2:7b | Full features, free |
| Unit Tests | Mock | N/A | Fast, predictable |
| Integration | Ollama | llama3.2:3b | Fast, real AI |
| Staging | OpenAI | gpt-3.5-turbo | Cloud validation |
| Production | Ollama/OpenAI | llama3.2:7b / gpt-4 | Best quality |

---

## Backend Testing (Go)

### Unit Tests

```bash
cd backend

# Run all tests
go test ./...

# Run with coverage
go test -cover ./...

# Run specific package
go test ./internal/api/handlers

# Verbose output
go test -v ./...

# Run specific test
go test -v ./internal/auth -run TestJWTManager
```

### Test Structure
```go
// backend/internal/auth/jwt_test.go
package auth_test

import (
    "testing"
    "firblab-tavkit/backend/internal/auth"
)

func TestGenerateToken(t *testing.T) {
    manager, err := auth.NewJWTManager("test-secret-key-32-chars-long", "1h")
    if err != nil {
        t.Fatal(err)
    }
    
    token, err := manager.GenerateToken("user123", "testuser")
    if err != nil {
        t.Errorf("Failed to generate token: %v", err)
    }
    
    if token == "" {
        t.Error("Token is empty")
    }
}
```

### Integration Tests with Database

```go
// backend/internal/db/database_test.go
package db_test

import (
    "context"
    "testing"
    "firblab-tavkit/backend/internal/config"
    "firblab-tavkit/backend/internal/db"
)

func TestUserCRUD(t *testing.T) {
    // Use test database
    cfg := &config.DatabaseConfig{
        Driver: "sqlite",
        Source: ":memory:",
    }
    
    database, err := db.NewPostgresDB(cfg)
    if err != nil {
        t.Fatal(err)
    }
    defer database.Close()
    
    // Test create user
    user := &db.User{
        Username: "test",
        Email:    "test@example.com",
        Password: "hashed",
    }
    
    err = database.CreateUser(context.Background(), user)
    if err != nil {
        t.Errorf("Failed to create user: %v", err)
    }
    
    // Test retrieve user
    retrieved, err := database.GetUserByEmail(context.Background(), "test@example.com")
    if err != nil {
        t.Errorf("Failed to get user: %v", err)
    }
    
    if retrieved.Username != "test" {
        t.Errorf("Expected username 'test', got '%s'", retrieved.Username)
    }
}
```

### Running Backend Tests

```bash
# Quick test
make test-backend

# With coverage report
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out

# Race detection
go test -race ./...

# Benchmarks
go test -bench=. ./...
```

---

## AI Service Testing (Python)

### Unit Tests

```bash
cd ai-service

# Run all tests
poetry run pytest

# With coverage
poetry run pytest --cov=app --cov-report=html

# Specific test file
poetry run pytest tests/test_providers.py

# Specific test
poetry run pytest tests/test_providers.py::test_ollama_provider

# Verbose
poetry run pytest -v -s
```

### Test Structure

```python
# ai-service/tests/test_providers.py
import pytest
from app.providers.ollama import OllamaProvider
from app.config import settings

@pytest.mark.asyncio
async def test_ollama_provider():
    """Test Ollama provider generation"""
    provider = OllamaProvider()
    
    result = await provider.generate(
        prompt="Say hello",
        max_tokens=10
    )
    
    assert result is not None
    assert len(result) > 0

@pytest.mark.asyncio
async def test_ollama_health():
    """Test Ollama health check"""
    provider = OllamaProvider()
    
    is_healthy = await provider.health_check()
    
    # Should be True if Ollama is running
    assert isinstance(is_healthy, bool)
```

### Mocking AI Providers

```python
# ai-service/tests/test_generators.py
import pytest
from unittest.mock import AsyncMock, Mock
from app.generators.npc_generator import NPCGenerator

@pytest.fixture
def mock_provider():
    """Mock AI provider for testing"""
    provider = Mock()
    provider.generate = AsyncMock(return_value='''
    {
        "name": "Test NPC",
        "race": "Elf",
        "class": "Ranger",
        "level": 5,
        "description": "A mysterious figure"
    }
    ''')
    return provider

@pytest.mark.asyncio
async def test_npc_generator(mock_provider):
    """Test NPC generation with mock provider"""
    generator = NPCGenerator(mock_provider)
    
    npc = await generator.generate(
        prompt="Create an elf ranger",
        race="Elf",
        class_name="Ranger",
        level=5
    )
    
    assert npc["name"] == "Test NPC"
    assert npc["race"] == "Elf"
    assert npc["level"] == 5
    
    # Verify provider was called
    mock_provider.generate.assert_called_once()
```

### Testing with Real Ollama

```python
# ai-service/tests/integration/test_ollama_integration.py
import pytest
from app.providers.ollama import OllamaProvider
from app.config import settings

@pytest.mark.integration
@pytest.mark.skipif(
    not settings.OLLAMA_BASE_URL.startswith("http://localhost"),
    reason="Ollama not available locally"
)
@pytest.mark.asyncio
async def test_real_ollama_generation():
    """Integration test with real Ollama instance"""
    provider = OllamaProvider()
    
    # Verify Ollama is running
    is_healthy = await provider.health_check()
    if not is_healthy:
        pytest.skip("Ollama not running")
    
    # Test generation
    result = await provider.generate(
        prompt="Generate a fantasy character name",
        max_tokens=50
    )
    
    assert result is not None
    assert len(result) > 0
    print(f"Generated: {result}")
```

### Running AI Service Tests

```bash
# All tests (with mocks)
make test-ai

# Integration tests (requires Ollama)
poetry run pytest -m integration

# Skip integration tests
poetry run pytest -m "not integration"

# With coverage
poetry run pytest --cov=app --cov-report=term-missing

# Specific generator
poetry run pytest tests/test_generators.py -v
```

---

## Frontend Testing (React)

### Unit Tests with Vitest

```bash
cd web

# Run tests
npm test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch

# UI mode
npm run test:ui
```

### Test Structure

```typescript
// web/src/components/auth/Login.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Login from './Login'

describe('Login Component', () => {
  it('renders login form', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument()
  })
  
  it('handles form submission', async () => {
    const mockLogin = vi.fn()
    
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )
    
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    })
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' }
    })
    
    fireEvent.click(screen.getByRole('button', { name: /login/i }))
    
    // Add assertions for API calls
  })
})
```

### E2E Tests with Playwright

```typescript
// web/e2e/login.spec.ts
import { test, expect } from '@playwright/test'

test('user can login', async ({ page }) => {
  await page.goto('http://localhost:3000/login')
  
  await page.fill('input[type="email"]', 'test@example.com')
  await page.fill('input[type="password"]', 'password123')
  
  await page.click('button:has-text("Login")')
  
  await expect(page).toHaveURL(/dashboard/)
  await expect(page.locator('text=Dashboard')).toBeVisible()
})
```

---

## Integration Testing

### Full Stack Integration

```bash
# Start all services
make dev

# Run integration tests
cd backend
go test -tags=integration ./tests/integration/...

# Or with script
./scripts/run-integration-tests.sh
```

### Example Integration Test

```go
// backend/tests/integration/api_test.go
//go:build integration

package integration

import (
    "bytes"
    "encoding/json"
    "net/http"
    "testing"
)

func TestFullUserFlow(t *testing.T) {
    baseURL := "http://localhost:8000"
    
    // Register user
    registerData := map[string]string{
        "username": "testuser",
        "email":    "test@example.com",
        "password": "password123",
    }
    
    body, _ := json.Marshal(registerData)
    resp, err := http.Post(
        baseURL+"/api/v1/auth/register",
        "application/json",
        bytes.NewBuffer(body),
    )
    
    if err != nil {
        t.Fatal(err)
    }
    defer resp.Body.Close()
    
    if resp.StatusCode != http.StatusCreated {
        t.Errorf("Expected 201, got %d", resp.StatusCode)
    }
    
    // Parse token
    var authResp struct {
        Token string `json:"token"`
    }
    json.NewDecoder(resp.Body).Decode(&authResp)
    
    // Use token for authenticated request
    req, _ := http.NewRequest("GET", baseURL+"/api/v1/users/me", nil)
    req.Header.Set("Authorization", "Bearer "+authResp.Token)
    
    resp, err = http.DefaultClient.Do(req)
    if err != nil {
        t.Fatal(err)
    }
    defer resp.Body.Close()
    
    if resp.StatusCode != http.StatusOK {
        t.Errorf("Expected 200, got %d", resp.StatusCode)
    }
}
```

---

## Test Data & Fixtures

### Database Fixtures

```sql
-- db/fixtures/test_data.sql
INSERT INTO users (id, username, email, password) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'testuser', 'test@example.com', '$argon2id$...');

INSERT INTO npcs (id, user_id, name, race, class) VALUES
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Test NPC', 'Elf', 'Ranger');
```

### Loading Fixtures

```bash
# Load test data
psql -U postgres -h localhost -d tavkit_test -f db/fixtures/test_data.sql

# Or via Makefile
make db-test-data
```

---

## CI/CD Testing

Tests run automatically in GitLab CI:

```yaml
# .gitlab-ci.yml (already configured)
test:backend:
  script:
    - cd backend
    - go test ./...

test:ai-service:
  script:
    - cd ai-service
    - poetry install
    - poetry run pytest

test:frontend:
  script:
    - cd web
    - npm ci
    - npm test
```

---

## Testing Checklist

### Before Committing
- [ ] All unit tests pass (`make test`)
- [ ] Code is formatted (`make lint`)
- [ ] New features have tests
- [ ] Integration tests pass (if applicable)

### Before Deploying
- [ ] All tests pass in CI/CD
- [ ] Integration tests pass with real services
- [ ] Security scan passes
- [ ] Performance tests acceptable
- [ ] Manual smoke tests completed

---

## Quick Reference

```bash
# Run all tests
make test

# Backend only
make test-backend
cd backend && go test ./...

# AI service only
make test-ai
cd ai-service && poetry run pytest

# Frontend only  
make test-web
cd web && npm test

# Integration tests
make test-integration

# With coverage
make test-coverage

# Specific test
go test -v ./internal/auth -run TestJWTManager
poetry run pytest tests/test_providers.py::test_ollama
npm test -- Login.test.tsx
```

---

**Now you can test with confidence! 🧪✅**
