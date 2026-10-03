#!/bin/sh
set -e

# ======================================================================
# SYSTECH STUDIO - DOCKER CONTAINER ENTRYPOINT
# Handles automated migrations on startup for PostgreSQL
# ======================================================================

if [ -n "$DATABASE_URL" ]; then
  echo "🚀 [Docker Entrypoint] Verificando y aplicando migraciones de base de datos..."
  npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma || {
    echo "⚠️ [Docker Entrypoint] Fallback: Ejecutando db push si no hay historial de migraciones..."
    npx prisma db push --schema=packages/database/prisma/schema.prisma --accept-data-loss || true
  }
fi

echo "✨ [Docker Entrypoint] Iniciando servidor de producción..."
exec "$@"
