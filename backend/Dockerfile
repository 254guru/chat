# ── Stage 1: dependency resolver ──────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

# Upgrade pip; no extra tooling needed
RUN pip install --no-cache-dir --upgrade pip

# Bump timeouts for slow / rate-limited PyPI mirrors in CI environments
ENV PIP_DEFAULT_TIMEOUT=180 \
    PIP_RETRIES=5 \
    PIP_NO_CACHE_DIR=1

# Install all runtime dependencies explicitly so Docker caches this layer.
RUN pip install --timeout 180 \
        "fastapi>=0.111.0" \
        "uvicorn[standard]>=0.30.0" \
        "python-socketio>=5.11.0" \
        "pydantic>=2.7.0" \
        "pydantic-settings>=2.3.0" \
        "python-jose[cryptography]>=3.3.0" \
        "bcrypt>=4.0.0" \
        "redis>=5.0.4" \
        "aioredis>=2.0.1" \
        "asyncpg>=0.29.0" \
        "sqlalchemy[asyncio]>=2.0.30" \
        "alembic>=1.13.1" \
        "python-dotenv>=1.0.1" \
        "python-multipart>=0.0.9" \
        "httpx>=0.27.0"

# ── Stage 2: production image ──────────────────────────────────────────────
FROM python:3.12-slim AS runtime

LABEL maintainer="your@email.com"
LABEL org.opencontainers.image.title="RealtimeChat Backend"
LABEL org.opencontainers.image.version="2.0.0"

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy source
COPY app/ ./app/

# Non-root user for security
RUN addgroup --system app && adduser --system --ingroup app app
USER app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
