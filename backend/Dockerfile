FROM golang:1.25.1-alpine AS builder

# Install build dependencies for CGO/SQLite (this step is cached after first run)
RUN apk add --no-cache gcc musl-dev

WORKDIR /app

# Copy go mod files first for better layer caching
COPY go.mod* go.sum* ./

# Download dependencies with cache mount to speed up rebuilds
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go mod download && go mod tidy

# Copy source code after dependencies are cached
COPY . .

# Build binary with CGO enabled for SQLite support and cache mounts
# TARGETARCH is automatically set by Docker BuildKit based on --platform flag
ARG TARGETARCH
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=1 GOOS=linux GOARCH=${TARGETARCH} go build \
    -ldflags="-w -s" \
    -o /app/bin/server \
    ./cmd/server

# Final stage
FROM alpine:3.20

# Install runtime dependencies (including curl for healthcheck)
RUN apk add --no-cache ca-certificates tzdata curl

# Create non-root user
RUN addgroup -g 1000 tavkit && \
    adduser -D -u 1000 -G tavkit tavkit

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/bin/server /app/server

# Copy migrations if they exist (optional for MVP)
# COPY --from=builder --chown=tavkit:tavkit /app/internal/db/migrations /app/migrations

# Create data directory with correct ownership for SQLite
RUN mkdir -p /app/data && chown -R tavkit:tavkit /app/data

# Switch to non-root user
USER tavkit

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/api/v1/health || exit 1

CMD ["/app/server"]
