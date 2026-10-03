#!/usr/bin/env bash
# ======================================================================
# SYSTECH STUDIO - DATABASE BACKUP & RESTORATION SCRIPT
# Supports both PostgreSQL (production) and SQLite (local dev)
# ======================================================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

if [[ -n "${DATABASE_URL:-}" && "$DATABASE_URL" == postgres* ]]; then
  echo "🐘 [PostgreSQL] Iniciando respaldo de base de datos..."
  BACKUP_FILE="$BACKUP_DIR/systech_pg_backup_${TIMESTAMP}.sql.gz"
  pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"
  echo "✅ Respaldo generado con éxito en: $BACKUP_FILE"

  # Para restaurar ejecutar:
  # gunzip -c "$BACKUP_FILE" | psql "$DATABASE_URL"
elif [ -f "packages/database/prisma/dev.db" ]; then
  echo "📁 [SQLite] Iniciando respaldo de dev.db..."
  BACKUP_FILE="$BACKUP_DIR/dev_backup_${TIMESTAMP}.db"
  cp "packages/database/prisma/dev.db" "$BACKUP_FILE"
  echo "✅ Respaldo SQLite generado con éxito en: $BACKUP_FILE"
else
  echo "⚠️ No se detectó base de datos configurada para respaldar."
  exit 1
fi
