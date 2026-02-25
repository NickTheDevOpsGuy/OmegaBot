#!/usr/bin/env bash
# Backup OmegaBot SQLite database.
# Usage: ./scripts/backup-db.sh [destination-dir]
# Default destination: data/backups/
# Cron example (daily at 2 AM): 0 2 * * * /path/to/OmegaBot/scripts/backup-db.sh

set -e
DB_PATH="${DATABASE_PATH:-data/omegabot.db}"
DEST="${1:-data/backups}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

if [[ ! -f "$DB_PATH" ]]; then
  echo "Database not found at $DB_PATH"
  exit 1
fi

mkdir -p "$DEST"
BACKUP_FILE="$DEST/omegabot-$(date +%Y%m%d-%H%M%S).db"
cp "$DB_PATH" "$BACKUP_FILE"

# Verify backup integrity
if command -v sqlite3 >/dev/null 2>&1; then
  if ! sqlite3 "$BACKUP_FILE" "PRAGMA integrity_check;" | grep -q "^ok$"; then
    echo "ERROR: Backup failed integrity check!" >&2
    rm -f "$BACKUP_FILE"
    exit 1
  fi
fi

echo "Backed up to $BACKUP_FILE"

# Optional: keep only last N backups (default 7)
KEEP="${BACKUP_KEEP:-7}"
ls -t "$DEST"/omegabot-*.db 2>/dev/null | tail -n +$((KEEP + 1)) | xargs rm -f 2>/dev/null || true
