# Environment Configuration

## Overview

The frontend uses different API URLs depending on the environment:

- **Local Development**: Direct connection to backend on `http://localhost:8000/api/v1`
- **Production (Docker)**: Relative path `/api/v1` that nginx proxies to backend

## Files

### `.env.production` (Committed)
Used for Docker builds. Contains:
```
VITE_API_URL=/api/v1
```

This is the **correct** configuration for production deployments because:
1. The web app is served by nginx on port 80/8080
2. Nginx proxies `/api/*` requests to the backend container
3. Using relative paths makes the app work on any domain/IP

### `.env.example` (Committed)
Template for local development. Copy to `.env` for local dev:
```bash
cp .env.example .env
```

Contains:
```
VITE_API_URL=http://localhost:8000/api/v1
```

### `.env` (Local only, gitignored)
Your local override for development. Not committed to git.

## How It Works

### Local Development
1. Frontend runs on Vite dev server (port 5173)
2. Makes requests to `http://localhost:8000/api/v1/*`
3. Backend runs directly on port 8000

### Docker/Production
1. Frontend built as static files, served by nginx (port 80)
2. Makes requests to `/api/v1/*` (relative path)
3. Nginx proxies to `http://backend:8000/api/v1/*`
4. No CORS issues since everything appears to be same origin

## Build Process

The Dockerfile automatically uses `.env.production` when building:
- Vite's build process reads `.env.production` in production mode
- Values are baked into the built JavaScript files
- No environment variables needed at runtime

## Troubleshooting

### Login shows 404 with doubled path `/api/v1/api/v1/...`
This happens when VITE_API_URL is incorrectly set to include `/api/v1`:
- ❌ Wrong: `VITE_API_URL=http://localhost:8080/api/v1`
- ✅ Correct: `VITE_API_URL=/api/v1`

### Can't connect to backend locally
Check your `.env` file has the full URL:
- ✅ Correct: `VITE_API_URL=http://localhost:8000/api/v1`
