#!/bin/bash

set -e

echo "🗄️  SQLite Installation (No Backup, No Migration)"
echo "=================================================="
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }

if [ ! -f "package.json" ]; then
    print_error "Run from OmegaBot root"
    exit 1
fi

# ============================================================
# Step 1: Install dependencies
# ============================================================
echo "1. Installing better-sqlite3..."
npm install better-sqlite3
npm install --save-dev @types/better-sqlite3

print_success "Dependencies installed"

# ============================================================
# Step 2: Delete old JSON files
# ============================================================
echo ""
echo "2. Removing old JSON files..."

rm -f data/faqs.json
rm -f data/fun-usage.json
rm -f data/timezones.json
rm -f data/guild-config.json
rm -f data/github-assignees.json
rm -f data/*.json.backup
rm -f data/*.json.migrated

print_success "Removed old data files"

# ============================================================
# Step 3: Create database service
# ============================================================
echo ""
echo "3. Creating database service..."

mkdir -p src/services/database

cat > src/services/database/db.ts << 'DBEOF'
// src/services/database/db.ts
import Database from "better-sqlite3";
import { logger } from "../../utils/logger.js";
import fs from "fs";
import path from "path";

let db: Database.Database | null = null;

export function initDatabase(): Database.Database {
  if (db) return db;

  const databasePath = process.env.DATABASE_PATH || "data/omegabot.db";
  const dbDir = path.dirname(databasePath);
  
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  logger.info({ path: databasePath }, "Initializing database");
  db = new Database(databasePath);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS faqs (
      key TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      tags TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      usage_count INTEGER DEFAULT 0,
      created_by TEXT,
      updated_by TEXT
    );

    CREATE TABLE IF NOT EXISTS user_timezones (
      user_id TEXT PRIMARY KEY,
      timezone TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS guild_config (
      guild_id TEXT PRIMARY KEY,
      config TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fun_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      command TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_fun_usage_user ON fun_usage(user_id);
    CREATE INDEX IF NOT EXISTS idx_fun_usage_command ON fun_usage(command);

    CREATE TABLE IF NOT EXISTS github_last_seen (
      repo_key TEXT PRIMARY KEY,
      last_seen_timestamp INTEGER NOT NULL,
      entity_type TEXT NOT NULL
    );
  `);

  logger.info("Database tables created");
  return db;
}

export function getDb(): Database.Database {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    logger.info("Closing database");
    db.close();
    db = null;
  }
}

export function transaction<T>(fn: (db: Database.Database) => T): T {
  const database = getDb();
  const txn = database.transaction(fn);
  return txn(database);
}
DBEOF

print_success "Created database service"

# ============================================================
# Step 4: Update bot.ts
# ============================================================
echo ""
echo "4. Updating bot.ts..."

if grep -q "initDatabase" src/bot.ts; then
    print_success "Database initialization already in bot.ts"
else
    sed -i '1a import { initDatabase, closeDatabase } from "./services/database/db.js";' src/bot.ts
    
    sed -i '/client\.login/i \
initDatabase();\
logger.info("Database initialized");\
\
process.on("SIGINT", () => {\
  logger.info("Shutting down...");\
  closeDatabase();\
  process.exit(0);\
});\
' src/bot.ts
    
    print_success "Updated bot.ts"
fi

# ============================================================
# Step 5: Update .env
# ============================================================
echo ""
echo "5. Updating .env files..."

if ! grep -q "DATABASE_PATH" .env.example; then
    echo "" >> .env.example
    echo "DATABASE_PATH=data/omegabot.db" >> .env.example
fi

if [ -f ".env" ] && ! grep -q "DATABASE_PATH" .env; then
    echo "" >> .env
    echo "DATABASE_PATH=data/omegabot.db" >> .env
fi

print_success "Updated .env files"

# ============================================================
# Step 6: Build
# ============================================================
echo ""
echo "6. Building..."
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "╔════════════════════════════════════════════════════════╗"
    echo "║  ✅ SQLite Installed!                                 ║"
    echo "╚════════════════════════════════════════════════════════╝"
    echo ""
    print_success "Database service ready"
    print_success "All tables created"
    print_success "Old JSON files deleted"
    echo ""
    echo "📋 Next Step:"
    echo "   ./fix-store-compatibility.sh"
    echo ""
    echo "   Then: npm start"
    echo ""
else
    print_error "Build failed"
    exit 1
fi
