// src/services/config/index.ts

/**
 * Public API barrel for config services.
 *
 * Keeps imports cleaner:
 *   import { getGuildConfig } from "../config/index.js";
 * instead of:
 *   import { getGuildConfig } from "../config/guildConfigStore.js";
 */

export { getGuildConfig, setGuildConfig } from "./guildConfigStore.js";
export { DEFAULT_GUILD_CONFIG } from "./types.js";
export type { GuildConfig, GuildConfigPatch } from "./types.js";