FROM python:3.13-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry with pip cache mount
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir poetry==2.0.1

# Copy poetry files
COPY pyproject.toml poetry.lock* ./

# Install dependencies with cache mounts
RUN --mount=type=cache,target=/root/.cache/pypoetry \
    --mount=type=cache,target=/root/.cache/pip \
    poetry config virtualenvs.create false \
    && poetry install --no-interaction --no-ansi --no-root --only main

# Copy application code
COPY . .

# Install the application
RUN poetry install --no-interaction --no-ansi --only-root

# Create non-root user
RUN useradd -m -u 1000 tavkit && chown -R tavkit:tavkit /app

USER tavkit

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8001/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
