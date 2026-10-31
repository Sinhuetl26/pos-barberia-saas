#!/bin/sh
set -e

# ======================================================================
# SYSTECH STUDIO - DOCKER CONTAINER ENTRYPOINT
# Handles automated migrations on startup for PostgreSQL
# ======================================================================

case "$DATABASE_URL" in
  postgres://*|postgresql://*) ;;
  *) echo "[Docker Entrypoint] Configura una URL PostgreSQL explícita." >&2; exit 1 ;;
esac

echo "[Docker Entrypoint] Aplicando migraciones versionadas..."
./node_modules/.bin/prisma migrate deploy --schema=packages/database/prisma/schema.postgres.prisma
echo "[Docker Entrypoint] Comprobando historial y esquema antes de iniciar..."
node scripts/check_postgres.js

echo "✨ [Docker Entrypoint] Iniciando servidor de producción..."
exec "$@"
