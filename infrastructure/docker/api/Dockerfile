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

# Copy shared packages and apps manifest
COPY packages/ ./packages/
COPY apps/ ./apps/

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

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["uvicorn", "apps.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
