#!/usr/bin/env node
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

type GuildConfigJson = Record<string, unknown>;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveDbPath(): string {
  const raw = (process.env.DATABASE_PATH || "data/omegabot.db").trim();
  if (raw === ":memory:") {
    throw new Error("DATABASE_PATH=:memory: cannot be inspected by this script.");
  }

  return path.isAbsolute(raw) ? raw : path.resolve(__dirname, "..", raw);
}

function usage(): never {
  console.error(
    [
      "Usage:",
      "  npm run welcome:config -- show <guild-id>",
      "  npm run welcome:config -- clear <guild-id>",
      "  npm run welcome:config -- set <guild-id> <message-file>",
      "",
      "Examples:",
      "  npm run welcome:config -- show 1457815270126256178",
      "  npm run welcome:config -- clear 1457815270126256178",
      "  npm run welcome:config -- set 1457815270126256178 ./welcome-message.txt",
    ].join("\n"),
  );
  process.exit(1);
}

function ensureGuildConfigTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS guild_config (
      guild_id TEXT PRIMARY KEY,
      config TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
}

function readStoredConfig(db: Database.Database, guildId: string): GuildConfigJson {
  const row = db
    .prepare(`SELECT config FROM guild_config WHERE guild_id = ?`)
    .get(guildId) as { config: string } | undefined;

  if (!row) return {};

  const parsed = JSON.parse(row.config) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Stored config for guild ${guildId} is not a JSON object.`);
  }

  return parsed as GuildConfigJson;
}

function writeStoredConfig(
  db: Database.Database,
  guildId: string,
  config: GuildConfigJson,
): void {
  const updatedAt = Date.now();
  db.prepare(
    `INSERT INTO guild_config (guild_id, config, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(guild_id) DO UPDATE SET
      config = excluded.config,
      updated_at = excluded.updated_at`,
  ).run(guildId, JSON.stringify({ ...config, updatedAt }), updatedAt);
}

const [, , action, guildId, messageFile] = process.argv;
if (!action || !guildId) usage();

const dbPath = resolveDbPath();
if (!fs.existsSync(dbPath)) {
  throw new Error(`Database file not found: ${dbPath}`);
}

const db = new Database(dbPath);
try {
  ensureGuildConfigTable(db);

  if (action === "show") {
    const config = readStoredConfig(db, guildId);
    const welcomeMessage =
      typeof config.welcomeMessage === "string" ? config.welcomeMessage : null;

    console.log("Database path:", dbPath);
    console.log("Guild ID:", guildId);
    console.log("Welcome message stored:", welcomeMessage ? "yes" : "no");
    if (welcomeMessage) {
      console.log("Length:", welcomeMessage.length);
      console.log("\n--- welcomeMessage ---");
      console.log(welcomeMessage);
    }
    process.exit(0);
  }

  if (action === "clear") {
    const config = readStoredConfig(db, guildId);
    delete config.welcomeMessage;
    config.welcomeEnabled = true;
    writeStoredConfig(db, guildId, config);
    console.log(`Cleared stored welcomeMessage for guild ${guildId}.`);
    process.exit(0);
  }

  if (action === "set") {
    if (!messageFile) usage();

    const resolvedMessageFile = path.isAbsolute(messageFile)
      ? messageFile
      : path.resolve(process.cwd(), messageFile);
    const welcomeMessage = fs.readFileSync(resolvedMessageFile, "utf8").trim();

    if (!welcomeMessage) {
      throw new Error("Message file is empty after trimming whitespace.");
    }

    const config = readStoredConfig(db, guildId);
    config.welcomeMessage = welcomeMessage;
    config.welcomeEnabled = true;
    writeStoredConfig(db, guildId, config);
    console.log(
      `Set welcomeMessage for guild ${guildId} from ${resolvedMessageFile} (${welcomeMessage.length} chars).`,
    );
    process.exit(0);
  }

  usage();
} finally {
  db.close();
}
