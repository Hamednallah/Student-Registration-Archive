# Docker Environments
## Dev | Test | Production — Complete Setup Guide

---

## Overview

| Environment | Compose File | Purpose | DB | Redis |
|-------------|-------------|---------|-----|-------|
| dev | `docker-compose.dev.yml` | Local development, hot reload | SQLite | Mock |
| test | `docker-compose.test.yml` | CI/CD integration tests | PostgreSQL 15 | Redis 7 |
| prod | `docker-compose.prod.yml` | Local prod simulation (pre-AWS) | PostgreSQL 15 | Redis 7 |

---

## File: `docker/Dockerfile.api`

```dockerfile
# ============================================================
# STAGE 1: Dependencies
# ============================================================
FROM node:20-alpine AS deps
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace manifests
COPY pnpm-workspace.yaml .
COPY package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/

# Install dependencies (without postinstall scripts)
RUN pnpm install --frozen-lockfile --ignore-scripts

# ============================================================
# STAGE 2: Build shared package
# ============================================================
FROM deps AS build-shared
WORKDIR /app
COPY packages/shared ./packages/shared
RUN pnpm --filter @psau/shared build

# ============================================================
# STAGE 3: Build API
# ============================================================
FROM build-shared AS build-api
COPY packages/api ./packages/api
RUN pnpm --filter @psau/api build

# ============================================================
# STAGE 4: Production runtime
# ============================================================
FROM node:20-alpine AS production

# Security: non-root user
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 --ingroup nodejs psau

WORKDIR /app

# Copy only production artifacts
COPY --from=build-api --chown=psau:nodejs /app/packages/api/dist ./dist
COPY --from=build-api --chown=psau:nodejs /app/packages/shared/dist ./shared
COPY --from=deps      --chown=psau:nodejs /app/node_modules ./node_modules
COPY --from=deps      --chown=psau:nodejs /app/packages/api/node_modules ./packages/api/node_modules

# Copy DB migration files (needed at startup)
COPY --from=build-api --chown=psau:nodejs /app/packages/api/db ./db

USER psau

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-8080}/health || exit 1

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "dist/server.js"]
```

---

## File: `docker/Dockerfile.api.dev`

```dockerfile
FROM node:20-alpine
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Install system deps for SQLite native binding
RUN apk add --no-cache python3 make g++ sqlite

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/

RUN pnpm install --frozen-lockfile

# Source mounted as volume at runtime — no COPY needed
CMD ["pnpm", "--filter", "@psau/api", "dev"]
```

---

## File: `docker/Dockerfile.web`

```dockerfile
# ============================================================
# STAGE 1: Build
# ============================================================
FROM node:20-alpine AS build

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/web/package.json ./packages/web/

RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY packages/web ./packages/web

# Build args injected at build time
ARG VITE_API_URL=/api
ARG VITE_APP_VERSION=unknown

RUN pnpm --filter @psau/shared build
RUN pnpm --filter @psau/web build

# ============================================================
# STAGE 2: Nginx serve
# ============================================================
FROM nginx:1.25-alpine AS production

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

COPY docker/nginx.conf /etc/nginx/conf.d/psau.conf
COPY --from=build /app/packages/web/dist /usr/share/nginx/html

# Security: run nginx as non-root
RUN chown -R nginx:nginx /usr/share/nginx/html \
 && chmod -R 755 /usr/share/nginx/html

HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost/health || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

---

## File: `docker/nginx.conf`

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript 
               text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1000;

    # Static assets — long cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # API proxy (in prod this is handled by ALB — this is for local prod sim)
    location /api/ {
        proxy_pass http://api:8080/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    # SSE (Server-Sent Events) — disable buffering
    location /api/v1/migration/status/ {
        proxy_pass http://api:8080/v1/migration/status/;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 3600s;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding on;
    }

    # SPA fallback — all non-asset routes serve index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

---

## File: `docker/docker-compose.dev.yml`

```yaml
# ============================================================
# DEVELOPMENT ENVIRONMENT
# Hot reload, SQLite, no Redis (in-memory mock)
# Usage: docker compose -f docker/docker-compose.dev.yml up
# ============================================================
version: "3.9"

services:
  api:
    build:
      context: ..
      dockerfile: docker/Dockerfile.api.dev
    container_name: psau-api-dev
    volumes:
      # Mount source for hot reload
      - ../packages/api/src:/app/packages/api/src
      - ../packages/shared/src:/app/packages/shared/src
      # Persist SQLite database between restarts
      - psau-dev-sqlite:/app/packages/api/data
      # Persist node_modules (avoid reinstall on restart)
      - /app/node_modules
      - /app/packages/api/node_modules
      - /app/packages/shared/node_modules
    ports:
      - "8080:8080"
    environment:
      NODE_ENV: development
      PORT: 8080
      DATABASE_URL: sqlite:./data/psau_dev.db
      JWT_SECRET: dev-secret-at-least-32-characters-long-for-testing
      JWT_REFRESH_SECRET: dev-refresh-secret-at-least-32-characters-long
      JWT_ACCESS_EXPIRES_IN: 15m
      JWT_REFRESH_EXPIRES_IN: 7d
      REDIS_ENABLED: "false"           # Uses in-memory mock in dev
      LOG_LEVEL: debug
      CORS_ORIGINS: http://localhost:3000,http://localhost:5173
      BACKUP_SCHEDULER_ENABLED: "false"
      SWAGGER_ENABLED: "true"
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:8080/health"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 30s

  web:
    image: node:20-alpine
    container_name: psau-web-dev
    working_dir: /app
    command: sh -c "corepack enable && pnpm --filter @psau/web dev --host"
    volumes:
      - ../:/app
      - /app/node_modules
      - /app/packages/web/node_modules
    ports:
      - "5173:5173"
    environment:
      VITE_API_URL: http://localhost:8080/api
      VITE_APP_VERSION: dev
    depends_on:
      api:
        condition: service_healthy

volumes:
  psau-dev-sqlite:
    name: psau-dev-sqlite

networks:
  default:
    name: psau-dev
```

---

## File: `docker/docker-compose.test.yml`

```yaml
# ============================================================
# TEST ENVIRONMENT
# Used by CI/CD and local integration testing
# PostgreSQL 15 + Redis 7 — mirrors production dependencies
# Usage: docker compose -f docker/docker-compose.test.yml up --abort-on-container-exit
# ============================================================
version: "3.9"

services:
  postgres:
    image: postgres:15-alpine
    container_name: psau-postgres-test
    environment:
      POSTGRES_DB: psau_test
      POSTGRES_USER: psau_test
      POSTGRES_PASSWORD: psau_test_password
    ports:
      - "5433:5432"           # Non-standard port to avoid conflict with local postgres
    volumes:
      - psau-test-pg:/var/lib/postgresql/data
      - ../packages/api/db/migrations:/docker-entrypoint-initdb.d:ro
      # Runs all migrations on container init
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U psau_test -d psau_test"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 20s
    tmpfs:
      - /var/lib/postgresql/data   # Use tmpfs for speed (tests don't need persistence)

  redis:
    image: redis:7-alpine
    container_name: psau-redis-test
    command: redis-server --save "" --appendonly no   # No persistence needed for tests
    ports:
      - "6380:6379"           # Non-standard port
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  api-test:
    build:
      context: ..
      dockerfile: docker/Dockerfile.api
      target: build-api          # Use build stage (has dev dependencies for tests)
    container_name: psau-api-test
    command: pnpm --filter @psau/api test:integration
    environment:
      NODE_ENV: test
      PORT: 8080
      DATABASE_URL: postgresql://psau_test:psau_test_password@postgres:5432/psau_test
      REDIS_URL: redis://redis:6379
      REDIS_ENABLED: "true"
      JWT_SECRET: test-secret-at-least-32-characters-long-for-ci
      JWT_REFRESH_SECRET: test-refresh-secret-at-least-32-chars-long
      JWT_ACCESS_EXPIRES_IN: 15m
      JWT_REFRESH_EXPIRES_IN: 7d
      LOG_LEVEL: warn             # Reduce noise during tests
      CORS_ORIGINS: http://localhost:3000
      BACKUP_SCHEDULER_ENABLED: "false"
      SWAGGER_ENABLED: "false"
      # Test-specific
      SEED_TEST_DATA: "true"
      BYPASS_RATE_LIMIT: "true"   # Rate limiting breaks integration tests
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  web-test:
    build:
      context: ..
      dockerfile: docker/Dockerfile.web
      target: build              # Build stage (has test runner)
    container_name: psau-web-test
    command: pnpm --filter @psau/web test:unit
    environment:
      NODE_ENV: test

  e2e:
    image: mcr.microsoft.com/playwright:v1.44.0-jammy
    container_name: psau-e2e
    working_dir: /app
    command: pnpm --filter @psau/web test:e2e
    volumes:
      - ../packages/web:/app/packages/web
      - ../packages/shared:/app/packages/shared
    environment:
      BASE_URL: http://api-test:8080
      CI: "true"
      PWDEBUG: "0"
    depends_on:
      api-test:
        condition: service_started

volumes:
  psau-test-pg:
    name: psau-test-pg

networks:
  default:
    name: psau-test
```

---

## File: `docker/docker-compose.prod.yml`

```yaml
# ============================================================
# PRODUCTION SIMULATION ENVIRONMENT
# Mirrors AWS setup locally for final pre-deploy verification
# Usage: docker compose -f docker/docker-compose.prod.yml up
# NEVER use dev secrets here — generate real secrets
# ============================================================
version: "3.9"

services:
  postgres:
    image: postgres:15-alpine
    container_name: psau-postgres-prod
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-psau}
      POSTGRES_USER: ${POSTGRES_USER:-psau}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}
    volumes:
      - psau-prod-pg:/var/lib/postgresql/data
      - ../packages/api/db/migrations:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-psau} -d ${POSTGRES_DB:-psau}"]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 30s
    # PostgreSQL tuning for production
    command: >
      postgres
        -c shared_buffers=256MB
        -c effective_cache_size=768MB
        -c maintenance_work_mem=64MB
        -c checkpoint_completion_target=0.9
        -c wal_buffers=16MB
        -c default_statistics_target=100
        -c random_page_cost=1.1
        -c effective_io_concurrency=200
        -c max_connections=50
        -c log_statement=ddl
        -c log_min_duration_statement=1000

  redis:
    image: redis:7-alpine
    container_name: psau-redis-prod
    restart: unless-stopped
    command: >
      redis-server
        --requirepass ${REDIS_PASSWORD:?REDIS_PASSWORD is required}
        --maxmemory 256mb
        --maxmemory-policy allkeys-lru
        --save 60 1000
        --appendonly yes
    volumes:
      - psau-prod-redis:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 15s
      timeout: 5s
      retries: 5

  api:
    build:
      context: ..
      dockerfile: docker/Dockerfile.api
      target: production
    container_name: psau-api-prod
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 8080
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      REDIS_ENABLED: "true"
      JWT_SECRET: ${JWT_SECRET:?JWT_SECRET is required}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET:?JWT_REFRESH_SECRET is required}
      JWT_ACCESS_EXPIRES_IN: 15m
      JWT_REFRESH_EXPIRES_IN: 7d
      CORS_ORIGINS: ${CORS_ORIGINS:?CORS_ORIGINS is required}
      LOG_LEVEL: info
      BACKUP_SCHEDULER_ENABLED: "true"
      SWAGGER_ENABLED: "false"     # Disable Swagger in production
      GDRIVE_CLIENT_ID: ${GDRIVE_CLIENT_ID}
      GDRIVE_CLIENT_SECRET: ${GDRIVE_CLIENT_SECRET}
      APP_VERSION: ${APP_VERSION:-unknown}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '1.0'

  web:
    build:
      context: ..
      dockerfile: docker/Dockerfile.web
      target: production
      args:
        VITE_API_URL: /api
        VITE_APP_VERSION: ${APP_VERSION:-unknown}
    container_name: psau-web-prod
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      api:
        condition: service_healthy
    deploy:
      resources:
        limits:
          memory: 128M
          cpus: '0.5'

volumes:
  psau-prod-pg:
    name: psau-prod-pg
  psau-prod-redis:
    name: psau-prod-redis

networks:
  default:
    name: psau-prod
```

---

## Environment Variables — Complete Reference

### File: `.env.example` (commit this — without values)

```bash
# ============================================================
# PSAU — Environment Variables Reference
# Copy to .env.dev / .env.test / .env.prod and fill values
# NEVER commit .env files with real values
# ============================================================

# Application
NODE_ENV=                          # development | test | production
PORT=8080
APP_VERSION=                       # injected by CI

# Database
DATABASE_URL=                      # postgresql://user:pass@host:5432/db
                                   # OR sqlite:./data/psau.db (dev only)
POSTGRES_DB=psau
POSTGRES_USER=psau
POSTGRES_PASSWORD=                 # min 32 chars random — generate with: openssl rand -base64 32

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=                    # required in prod
REDIS_ENABLED=true                 # false uses in-memory mock (dev only)

# Auth
JWT_SECRET=                        # min 32 chars — generate: openssl rand -base64 48
JWT_REFRESH_SECRET=                # different from JWT_SECRET
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGINS=                      # comma-separated: https://psau.edu.sd,https://www.psau.edu.sd

# Logging
LOG_LEVEL=info                     # error | warn | info | http | debug

# Features
BACKUP_SCHEDULER_ENABLED=true
SWAGGER_ENABLED=false              # true only in dev/test

# Google Drive (backup)
GDRIVE_CLIENT_ID=
GDRIVE_CLIENT_SECRET=
GDRIVE_REDIRECT_URI=               # https://psau.edu.sd/api/v1/backup/gdrive/callback

# AWS (prod only)
AWS_REGION=me-south-1              # Bahrain — closest to Sudan
AWS_S3_BACKUP_BUCKET=
AWS_SES_FROM_ADDRESS=              # noreply@psau.edu.sd

# Monitoring (prod only)
SENTRY_DSN=                        # optional, for error tracking
```

---

## Local Development Quick Start

```bash
# 1. Clone and install
git clone https://github.com/psau/academic-system.git psau
cd psau
corepack enable
pnpm install

# 2. Copy env file
cp .env.example .env.dev
# Edit .env.dev — the defaults work for dev, no changes needed

# 3. Start all services (API + Web + SQLite)
docker compose -f docker/docker-compose.dev.yml up

# API available at:  http://localhost:8080
# Web available at:  http://localhost:5173
# Swagger docs:      http://localhost:8080/api-docs
# Health check:      http://localhost:8080/health

# 4. Seed dev database
docker exec psau-api-dev pnpm db:seed

# 5. Verify GPA tests pass (CRITICAL)
docker exec psau-api-dev pnpm --filter @psau/api test:unit packages/api/src/services/gpa.service.test.ts
```

## Database Migration Commands

```bash
# Run all pending migrations
pnpm db:migrate

# Rollback last migration
pnpm db:migrate:rollback

# Create new migration
pnpm db:migrate:create "add_graduation_check_columns"

# Seed test data (test env only)
pnpm db:seed:test

# Reset and reseed (dev env only — DESTRUCTIVE)
pnpm db:reset
```
