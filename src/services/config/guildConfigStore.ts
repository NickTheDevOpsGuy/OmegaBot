// src/services/config/guildConfigStore.ts

import fs from "fs";
import path from "path";
import { DEFAULT_GUILD_CONFIG, type GuildConfig, type GuildConfigPatch } from "./types.js";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "guild-config.json");

type StoreShape = Record<string, Omit<GuildConfig, "guildId">>;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readStore(): StoreShape {
  try {
    const raw = fs.readFileSync(FILE_PATH, "utf8");
    return JSON.parse(raw) as StoreShape;
  } catch {
    return {};
  }
}

function writeStore(store: StoreShape) {
  ensureDataDir();
  fs.writeFileSync(FILE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export function getGuildConfig(guildId: string): GuildConfig {
  const store = readStore();
  const saved = store[guildId] ?? {};
  return { guildId, ...DEFAULT_GUILD_CONFIG, ...saved };
}

export function setGuildConfig(guildId: string, patch: GuildConfigPatch): GuildConfig {
  const store = readStore();
  const current = store[guildId] ?? DEFAULT_GUILD_CONFIG;
  const next = { ...current, ...patch };
  store[guildId] = next;
  writeStore(store);
  return { guildId, ...next };
}