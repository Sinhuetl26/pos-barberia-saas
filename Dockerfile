# ======================================================================
# SYSTECH STUDIO - MULTI-STAGE DOCKERFILE (PRODUCTION READY)
# Monorepo Node.js 20 Alpine for API & Database Engine
# ======================================================================

# --- STAGE 1: Dependency Installation & Build ---
FROM node:20-alpine AS builder

WORKDIR /app

# Install OpenSSL required by Prisma engine on Alpine
RUN apk add --no-cache openssl libc6-compat

# Copy workspace package manifests
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/database/package.json ./packages/database/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy full source tree
COPY . .

# P1.1 FIX: Switch Prisma schema to PostgreSQL for Docker production container
RUN node scripts/switch_db.js postgres

# Generate Prisma Client for PostgreSQL
RUN npm run db:generate

# Compile API TypeScript to CommonJS (dist/)
RUN npm run build --workspace=@systech/api

RUN npm run build --workspace=@systech/database

# Prune devDependencies to reduce image footprint
# The lockfile retains Prisma through @prisma/client's peer dependency.
# Keep that CLI for checked migrations, without retaining build/watch tooling.
RUN npm prune --omit=dev --ignore-scripts --offline --no-audit --no-fund

# Fail the build if pruning loses required generated/runtime assets or leaves
# development tools (including their currently reported advisory chains).
RUN test -f node_modules/prisma/build/index.js && \
    test -f node_modules/.prisma/client/index.js && \
    test -f packages/database/index.js && \
    test ! -d node_modules/vite && \
    test ! -d node_modules/tailwindcss && \
    test ! -d node_modules/ts-node-dev && \
    test ! -d node_modules/braces && \
    test ! -d node_modules/source-map-js && \
    test ! -d node_modules/postcss-selector-parser

# --- STAGE 2: Lightweight Production Runner ---
FROM node:20-alpine AS runner

WORKDIR /app

# Set Production Environment
ENV NODE_ENV=production
ENV PORT=3001

# Install OpenSSL runtime for Prisma queries
RUN apk add --no-cache openssl dumb-init curl

# Create non-root user for container security
RUN addgroup -g 1001 -S systech && \
    adduser -u 1001 -S systech -G systech

# Copy pruned node_modules and built artifacts from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/packages/database ./packages/database
COPY --from=builder /app/packages/licensing ./packages/licensing
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh
COPY --from=builder /app/scripts/check_postgres.js ./scripts/check_postgres.js

RUN chmod +x ./scripts/docker-entrypoint.sh

# Switch to unprivileged user
USER systech

# Expose backend REST API port
EXPOSE 3001

# Health check to ensure service readiness
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

ENTRYPOINT ["./scripts/docker-entrypoint.sh"]

# Start server using dumb-init for proper PID 1 signal forwarding
CMD ["dumb-init", "node", "apps/api/dist/index.js"]
