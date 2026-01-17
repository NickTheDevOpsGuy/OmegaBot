#!/usr/bin/env node
import { readFileSync, existsSync, writeFileSync } from "fs";
import { initDatabase, getDb } from "../services/database/db.js";
import { logger } from "../utils/logger.js";

console.log("🔄 Migrating ALL data to SQLite...\n");

initDatabase();
const db = getDb();

let totalMigrated = 0;

// ============================================================
// Migrate FAQs
// ============================================================
if (existsSync("data/faqs.json")) {
  console.log("📝 Migrating FAQs...");
  const faqData = JSON.parse(readFileSync("data/faqs.json", "utf-8"));
  const faqs = Object.values(faqData.entries || {}) as any[];

  db.transaction(() => {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO faqs 
      (key, title, body, tags, answer, created_at, updated_at, usage_count, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const faq of faqs) {
      const answer = faq.title ? `**${faq.title}**\n\n${faq.body}` : faq.body;
      stmt.run(
        faq.key,
        faq.title || "",
        faq.body || "",
        JSON.stringify(faq.tags || []),
        answer,
        new Date(faq.createdAt).getTime(),
        new Date(faq.updatedAt).getTime(),
        faq.usageCount || 0,
        faq.createdBy || "unknown",
        faq.updatedBy || "unknown",
      );
    }
  })();

  writeFileSync("data/faqs.json.migrated", readFileSync("data/faqs.json"));
  console.log(`  ✓ Migrated ${faqs.length} FAQs`);
  totalMigrated += faqs.length;
}

// ============================================================
// Migrate Timezones
// ============================================================
if (existsSync("data/timezones.json")) {
  console.log("🌍 Migrating timezones...");
  const tzData = JSON.parse(readFileSync("data/timezones.json", "utf-8"));

  db.transaction(() => {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO user_timezones (user_id, timezone, updated_at)
      VALUES (?, ?, ?)
    `);

    for (const [userId, tz] of Object.entries(tzData)) {
      stmt.run(userId, tz as string, Date.now());
    }
  })();

  const count = Object.keys(tzData).length;
  writeFileSync("data/timezones.json.migrated", readFileSync("data/timezones.json"));
  console.log(`  ✓ Migrated ${count} timezones`);
  totalMigrated += count;
}

// ============================================================
// Migrate Guild Config
// ============================================================
if (existsSync("data/guild-config.json")) {
  console.log("⚙️  Migrating guild configurations...");
  const configData = JSON.parse(readFileSync("data/guild-config.json", "utf-8"));

  db.transaction(() => {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO guild_config (guild_id, config, updated_at)
      VALUES (?, ?, ?)
    `);

    for (const [guildId, config] of Object.entries(configData)) {
      stmt.run(guildId, JSON.stringify(config), Date.now());
    }
  })();

  const count = Object.keys(configData).length;
  writeFileSync(
    "data/guild-config.json.migrated",
    readFileSync("data/guild-config.json"),
  );
  console.log(`  ✓ Migrated ${count} guild configs`);
  totalMigrated += count;
}

// ============================================================
// Migrate Fun Usage
// ============================================================
if (existsSync("data/fun-usage.json")) {
  console.log("🎮 Migrating fun command usage...");
  const funData = JSON.parse(readFileSync("data/fun-usage.json", "utf-8"));

  db.transaction(() => {
    const stmt = db.prepare(`
      INSERT INTO fun_usage (user_id, command, timestamp)
      VALUES (?, ?, ?)
    `);

    let count = 0;
    for (const [userId, commands] of Object.entries(funData)) {
      if (typeof commands === "object" && commands !== null) {
        for (const [command, usageCount] of Object.entries(commands)) {
          // Add entries for each usage (approximated with current timestamp)
          for (let i = 0; i < (usageCount as number); i++) {
            stmt.run(userId, command, Date.now() - i * 1000);
            count++;
          }
        }
      }
    }
  })();

  writeFileSync("data/fun-usage.json.migrated", readFileSync("data/fun-usage.json"));
  console.log(`  ✓ Migrated fun usage data`);
}

// ============================================================
// Migrate GitHub Last Seen
// ============================================================
if (existsSync("data/github-assignees.json")) {
  console.log("📦 Migrating GitHub state...");
  const ghData = JSON.parse(readFileSync("data/github-assignees.json", "utf-8"));

  if (ghData.itemsByNumber) {
    db.transaction(() => {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO github_last_seen (repo_key, last_seen_timestamp, entity_type)
        VALUES (?, ?, ?)
      `);

      for (const [number, item] of Object.entries(ghData.itemsByNumber)) {
        const typedItem = item as any;
        stmt.run(`item_${number}`, Date.now(), typedItem.kind || "Issue");
      }
    })();
  }

  writeFileSync(
    "data/github-assignees.json.migrated",
    readFileSync("data/github-assignees.json"),
  );
  console.log(`  ✓ Migrated GitHub state`);
}

console.log(`\n✅ Migration complete! Migrated ${totalMigrated} total items`);
console.log("\nOriginal files renamed to *.migrated for safety");
