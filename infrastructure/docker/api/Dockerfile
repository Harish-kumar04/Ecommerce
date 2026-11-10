FROM python:3.12-slim AS base

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy shared packages, apps manifest, and seed scripts
COPY packages/ ./packages/
COPY apps/ ./apps/
COPY scripts/ ./scripts/

# Install shared packages in dependency order + apps
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
        -e packages/config \
        -e packages/database \
        -e packages/auth \
        -e packages/validation \
        -e packages/commerce \
        -e packages/automation \
        -e packages/analytics \
        -e packages/integrations \
        -e packages/seo \
        -e apps

# Default production-ready environment variables (can be overridden in cloud dashboard)
ENV DATABASE_URL="sqlite+aiosqlite:///./bookstore.db" \
    CORS_ORIGINS='["*"]' \
    RATE_LIMIT_FAIL_CLOSED="false" \
    PORT="8000"

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# Seed the 27 Muthamilarignar Pathipagam books (idempotent) and start the API server
CMD ["sh", "-c", "python scripts/demo_seed.py && uvicorn apps.api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
