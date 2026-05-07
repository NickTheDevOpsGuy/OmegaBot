// src/services/config/types.ts

/**
 * Per-guild configuration.
 *
 * Keep this explicit (no index signatures) so TypeScript
 * catches typos when updating config.
 */
export type GuildConfig = {
  guildId: string;

  /* ------------------------------------------------------------------ */
  /* Welcome messages                                                    */
  /* ------------------------------------------------------------------ */
  welcomeEnabled: boolean;
  welcomeChannelId: string | null;

  /* ------------------------------------------------------------------ */
  /* Starboard                                                           */
  /* ------------------------------------------------------------------ */
  starboardChannelId: string | null;
  starboardThreshold: number;

  /* ------------------------------------------------------------------ */
  /* Rules                                                               */
  /* ------------------------------------------------------------------ */
  rulesChannelId: string | null;

  /* ------------------------------------------------------------------ */
  /* Leveling                                                            */
  /* ------------------------------------------------------------------ */
  levelingEnabled: boolean;
  levelingAnnounceChannelId: string | null;

  /* ------------------------------------------------------------------ */
  /* Metadata                                                            */
  /* ------------------------------------------------------------------ */
  updatedAt: number;
};

/**
 * Default values used when a guild has no stored config yet.
 */
export const DEFAULT_GUILD_CONFIG: Omit<GuildConfig, "guildId"> = {
  // Welcome
  welcomeEnabled: true,
  welcomeChannelId: null,

  // Starboard
  starboardChannelId: null,
  starboardThreshold: 3,

  // Rules
  rulesChannelId: null,

  // Leveling
  levelingEnabled: true,
  levelingAnnounceChannelId: null,

  // Metadata
  updatedAt: 0,
};

/**
 * Patch type used by setters.
 *
 * - guildId is immutable
 * - updatedAt is controlled internally
 */
export type GuildConfigPatch = Partial<Omit<GuildConfig, "guildId" | "updatedAt">>;
