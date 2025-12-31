// src/services/config/types.ts

/**
 * GuildConfig
 *
 * Per-guild configuration for OmegaBot.
 * This is intentionally small and focused so we can expand safely over time.
 */
export type GuildConfig = {
  /** Discord guild (server) id */
  guildId: string;

  /* ------------------------------------------------------------------ */
  /* Welcome / onboarding                                                 */
  /* ------------------------------------------------------------------ */

  /**
   * Master enable/disable for welcome messages in this guild.
   * Defaults to true.
   */
  welcomeEnabled: boolean;

  /**
   * Preferred channel for welcome messages.
   * If null, we fall back to system channel, then first text channel.
   */
  welcomeChannelId: string | null;
};

/**
 * Patch type used to update config values without requiring the full object.
 * guildId is excluded intentionally (immutable key).
 */
export type GuildConfigPatch = Partial<Omit<GuildConfig, "guildId">>;

/**
 * Default config for new guilds.
 * Applied automatically when no saved config exists.
 */
export const DEFAULT_GUILD_CONFIG: Omit<GuildConfig, "guildId"> = {
  welcomeEnabled: true,
  welcomeChannelId: null,
};
