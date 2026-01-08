# CI/CD Pipeline Documentation

## Overview

The TavKit pipeline provides comprehensive quality gates with linting, security scanning, testing, and multi-architecture builds for the Go backend, Python AI service, and React frontend.

## Pipeline Stages

### 1. Lint Stage
Code quality and formatting checks that run fast to provide immediate feedback.

#### lint:go
- **Tool**: golangci-lint v1.61
- **Checks**: errcheck, gosimple, govet, staticcheck, unused, gofmt, goimports, misspell, goconst, gocyclo, dupl, gosec, revive, stylecheck
- **Configuration**: [backend/.golangci.yml](backend/.golangci.yml)
- **Artifacts**: `golangci-lint-report.txt` saved on failure
- **Failure Policy**: Fails pipeline (critical)

#### lint:go-format
- **Tool**: gofmt (built-in)
- **Checks**: Verifies all Go files are properly formatted
- **Fix Command**: `gofmt -w .` in backend directory
- **Failure Policy**: Fails pipeline (critical)

#### lint:python
- **Tools**: pylint, black, mypy
- **Checks**: Code quality, style, type hints
- **Artifacts**: `pylint-report.txt` saved on failure
- **Failure Policy**: Allows failure (informational)

#### lint:frontend
- **Tool**: ESLint
- **Checks**: JavaScript/TypeScript linting rules
- **Artifacts**: `eslint-report.txt` saved on failure
- **Failure Policy**: Fails pipeline (critical)

#### lint:frontend-format
- **Tool**: Prettier
- **Configuration**: [web/.prettierrc](web/.prettierrc)
- **Checks**: Code formatting consistency
- **Fix Command**: `npx prettier --write "src/**/*.{ts,tsx,js,jsx,css,json}"` in web directory
- **Failure Policy**: Fails pipeline (critical)

### 2. Security Stage
Vulnerability scanning and dependency audits.

#### security:go
- **Tool**: gosec
- **Checks**: Common security issues in Go code
- **Artifacts**: `gosec-report.json` saved always
- **Failure Policy**: Allows failure (too strict for MVP)

#### security:python
- **Tools**: bandit (code security), safety (dependency vulnerabilities)
- **Checks**: Python security issues and known CVEs
- **Artifacts**: `bandit-report.json`, `safety-report.json` saved always
- **Failure Policy**: Allows failure (too strict for MVP)

#### security:frontend
- **Tool**: npm audit
- **Checks**: Known vulnerabilities in npm dependencies
- **Artifacts**: `npm-audit-report.json` saved always
- **Failure Policy**: Allows failure (too strict for MVP)

#### security:outdated
- **Schedule**: Runs on main branch and scheduled pipelines
- **Tools**: `go list -u -m all`, `pip list --outdated`, `npm outdated`
- **Artifacts**: Outdated reports for all services (1 month retention)
- **Purpose**: Tracks dependency maintenance needs

### 3. Test Stage
Automated testing with coverage reporting.

#### test:go
- **Framework**: Go testing package
- **Coverage**: Enabled with `-coverprofile=coverage.out`
- **Format**: Cobertura XML for GitLab integration
- **Coverage Display**: Regex extraction `/total:.*?(\d+\.\d+)%/`
- **Artifacts**: `coverage.out`, `coverage.txt` (1 month retention)
- **Failure Policy**: Fails pipeline (critical)

#### test:python
- **Framework**: pytest with pytest-cov
- **Coverage**: XML and HTML reports
- **Coverage Display**: Regex extraction `/TOTAL.*?(\d+)%/`
- **Artifacts**: `coverage.xml`, `htmlcov/` directory (1 month retention)
- **Failure Policy**: Allows failure (tests not fully implemented)

#### test:frontend
- **Framework**: To be configured (Vitest recommended)
- **Status**: Placeholder - tests not yet written
- **Failure Policy**: Allows failure

### 4. Build Stage
Multi-architecture Docker image builds.

#### build
- **Platforms**: linux/amd64, linux/arm64
- **Services**: backend, ai-service, web
- **Registry**: 192.168.4.62:5050 (insecure registry)
- **Tags**: 
  - Version tags: `$CI_COMMIT_TAG` (on git tags)
  - Branch tags: `$CI_COMMIT_REF_SLUG` (on commits)
  - Latest: `:latest` (always)
- **Dependencies**: Waits for all lint, security, and test jobs
- **Cache**: BuildKit inline cache enabled for faster rebuilds

### 5. Deploy Stage

#### deploy-placeholder
- **Trigger**: Manual only on git tags
- **Purpose**: Documents available images, provides deployment instructions
- **Future**: Will be replaced with automated deployment

## Triggering Rules

Most jobs run on:
- Merge requests (`$CI_PIPELINE_SOURCE == "merge_request_event"`)
- Main branch commits (`$CI_COMMIT_BRANCH == "main"`)
- Git tags (`$CI_COMMIT_TAG`)
- Feature branches (`$CI_COMMIT_BRANCH =~ /^feature\//`)
- Bugfix branches (`$CI_COMMIT_BRANCH =~ /^bugfix\//`)

Build and deploy jobs run only on:
- Main branch commits
- Git tags

Security outdated checks run on:
- Main branch
- Scheduled pipelines

## Artifacts

All artifacts are stored temporarily for debugging and auditing:

| Artifact | Retention | Purpose |
|----------|-----------|---------|
| Lint reports | 1 week | Debugging failed linting |
| Security reports | 1 month | Tracking vulnerabilities |
| Coverage reports | 1 month | Code coverage trends |
| Outdated reports | 1 month | Dependency planning |

## Local Development

### Running Linters Locally

**Go Backend:**
```bash
cd backend
golangci-lint run
gofmt -w .
```

**Python AI Service:**
```bash
cd ai-service
black .
pylint **/*.py
```

**React Frontend:**
```bash
cd web
npm run lint
npx prettier --write "src/**/*.{ts,tsx,js,jsx,css,json}"
```

### Running Tests Locally

**Go Backend:**
```bash
cd backend
go test -v -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

**Python AI Service:**
```bash
cd ai-service
pytest --cov=. --cov-report=html
open htmlcov/index.html
```

## Pipeline Optimization

The pipeline uses several optimization strategies:

1. **Parallel Execution**: Lint and security jobs run in parallel
2. **Smart Dependencies**: Build waits for quality gates (with optional failures)
3. **Artifact Caching**: BuildKit inline cache speeds up Docker builds
4. **Selective Execution**: Rules prevent unnecessary pipeline runs
5. **Multi-Stage**: Failures in early stages prevent expensive Docker builds

## Common Issues

### golangci-lint timeout
Increase timeout in [backend/.golangci.yml](backend/.golangci.yml):
```yaml
run:
  timeout: 10m
```

### npm audit too strict
Security findings don't block builds (allow_failure: true). Review and update dependencies periodically.

### Docker buildx issues
Insecure registry configuration handles the local 192.168.4.62:5050 registry. If issues persist, check docker-in-docker service configuration.

## Future Enhancements

- [ ] Add frontend unit tests (Vitest)
- [ ] Add integration tests
- [ ] Add E2E tests (Playwright/Cypress)
- [ ] Add automated deployment to staging
- [ ] Add performance testing
- [ ] Add Docker image scanning (Trivy)
- [ ] Add SBOM generation
- [ ] Add license compliance checks
