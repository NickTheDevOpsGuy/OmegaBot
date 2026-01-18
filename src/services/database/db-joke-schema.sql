-- Add this to your db.ts file in the db.exec() section:

CREATE TABLE IF NOT EXISTS jokes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  joke_text TEXT NOT NULL,
  category TEXT NOT NULL,
  added_by TEXT NOT NULL,
  added_at INTEGER NOT NULL,
  usage_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_jokes_category ON jokes(category);
