# Contributing to TavKit

Thanks for your interest in contributing! This project welcomes contributions whether they're AI-assisted or fully human-written.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://gitlab.com/yourusername/tavkit.git`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test thoroughly
6. Commit with descriptive messages
7. Push and open a Pull Request

## Development Setup

See [GETTING_STARTED.md](docs/GETTING_STARTED.md) for complete setup instructions.

Quick setup:
```bash
# With Docker (recommended)
make up-ollama

# Manual setup
cd backend && go run cmd/server/main.go
cd ai-service && poetry run python app/main.py
cd web && npm run dev
```

## Code Standards

### Go Backend
- Follow [Effective Go](https://go.dev/doc/effective_go) guidelines
- Run `golangci-lint run` before committing
- Maintain >80% test coverage
- Use `make test-backend` to run tests

### Python AI Service
- Follow PEP 8
- Use type hints
- Run `pylint` and `mypy` before committing
- Use `make test-ai` to run tests

### React Frontend
- Follow the existing component structure
- Use TypeScript strictly
- Run `npm run lint` before committing
- Use `make test-web` to run tests

## Testing

All contributions must include tests:

```bash
# Run all tests
make test

# Run specific service tests
make test-backend
make test-ai
make test-web
```

## Security

Security is critical for a self-hosted application:

1. **Never commit secrets** - Use environment variables
2. **Run security scans**:
   ```bash
   make security-scan
   ```
3. **Review dependencies** for known vulnerabilities
4. **Test authentication** and authorization thoroughly

## AI-Assisted Development

We're cool with AI-assisted contributions. If you used Claude, Copilot, or another AI tool to help write code, that's fine - just make sure you understand what it generated and test it thoroughly.

### Quick Guidelines

- ✅ Review and understand all AI-generated code
- ✅ Test everything thoroughly  
- ✅ Run security scans (`make security-scan`)
- ❌ Don't blindly copy-paste without understanding
- ❌ Don't skip testing or security reviews

That's it. No need to mark commits or anything fancy - just write good code and make sure it works.

## Pull Request Process

1. **Update documentation** - If you changed behavior
2. **Add tests** - For all new functionality
3. **Run all checks**:
   ```bash
   make lint
   make test
   make security-scan
   ```
4. **Write clear PR description**:
   - What does it do?
   - Why is it needed?
   - How was it tested?
   - Was AI used? How?

### PR Template

```markdown
## Description
Brief description of changes

## Motivation
Why is this change needed?

## Changes
- Change 1
- Change 2

## Testing
How was this tested?

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Security scan passed
- [ ] Linting passed
- [ ] All tests pass
```

## Commit Message Guidelines

Use clear, descriptive commit messages:

```bash
# Good
git commit -m "Add rate limiting to NPC generator

Prevents API abuse by limiting users to 5 generations per minute.
Uses token bucket algorithm with per-user tracking.

Co-authored-by: Claude <claude@anthropic.com>"

# Bad
git commit -m "fix stuff"
```

### Format

```
<type>: <subject>

<body>

<footer>
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks
- `security:` Security fixes

## Code Review

All PRs require review. Reviewers will check:

1. **Code quality** - Readable, maintainable
2. **Tests** - Comprehensive coverage
3. **Security** - No obvious vulnerabilities
4. **Documentation** - Clear and accurate
5. **Performance** - No obvious issues
6. **AI contributions** - Properly reviewed and marked

## Project Structure

```
tavkit/
├── backend/          # Go backend
├── ai-service/       # Python AI service
├── web/              # React frontend
├── docs/             # Documentation
├── deploy/           # Deployment configs
└── .gitlab-ci.yml    # CI/CD pipeline
```

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed architecture.

## Style Guides

### Go

```go
// Good
func (s *NPCService) CreateNPC(ctx context.Context, npc *models.NPC) error {
    if err := s.validate(npc); err != nil {
        return fmt.Errorf("validation failed: %w", err)
    }
    
    return s.db.Create(ctx, npc)
}

// Bad
func CreateNPC(npc *models.NPC) error {
    s.db.Create(npc) // No error handling
    return nil
}
```

### Python

```python
# Good
async def generate_npc(
    race: str,
    char_class: str,
    level: int,
    campaign_context: Optional[str] = None
) -> NPC:
    """Generate an NPC with AI.
    
    Args:
        race: Character race
        char_class: Character class
        level: Character level
        campaign_context: Optional campaign context for better generation
        
    Returns:
        Generated NPC instance
        
    Raises:
        ValidationError: If parameters are invalid
        AIProviderError: If AI generation fails
    """
    prompt = self._build_prompt(race, char_class, level, campaign_context)
    response = await self.ai_provider.generate(prompt)
    return NPC.parse(response)

# Bad
async def generate_npc(race, char_class, level):
    return await self.ai_provider.generate(f"Make NPC: {race} {char_class}")
```

### TypeScript/React

```typescript
// Good
interface NPCGeneratorProps {
  campaignId: string;
  onGenerated: (npc: NPC) => void;
  onError: (error: Error) => void;
}

export const NPCGenerator: React.FC<NPCGeneratorProps> = ({
  campaignId,
  onGenerated,
  onError,
}) => {
  const [loading, setLoading] = useState(false);
  
  const handleGenerate = async (params: NPCParams) => {
    setLoading(true);
    try {
      const npc = await generateNPC(campaignId, params);
      onGenerated(npc);
    } catch (error) {
      onError(error as Error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleGenerate}>
      {/* Form fields */}
    </form>
  );
};

// Bad
export const NPCGenerator = ({ campaignId }) => {
  const handleGenerate = () => {
    generateNPC(campaignId); // No error handling, no loading state
  };
  
  return <button onClick={handleGenerate}>Generate</button>;
};
```

## Documentation

### Code Comments

```go
// Good - Explains WHY
// Using exponential backoff because Ollama can be slow under load
// and we want to give it time to recover rather than hammering it
func (c *OllamaClient) retryWithBackoff(ctx context.Context, fn func() error) error {
    // ...
}

// Bad - Explains WHAT (which is obvious)
// This function retries with backoff
func (c *OllamaClient) retryWithBackoff(ctx context.Context, fn func() error) error {
    // ...
}
```

### README Updates

If your change affects user-facing behavior, update:
- `README.md` - Project overview
- `docs/GETTING_STARTED.md` - Setup instructions
- `docs/ARCHITECTURE.md` - System design (if architectural change)

## Questions?

- **General questions**: [GitLab Discussions](https://gitlab.com/yourusername/tavkit/-/discussions)
- **Bug reports**: [GitLab Issues](https://gitlab.com/yourusername/tavkit/-/issues)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to TavKit!** 🍺⚔️

Whether you're contributing human-written code, AI-assisted code, or helping with documentation, your work helps make campaign management better for DMs everywhere.
