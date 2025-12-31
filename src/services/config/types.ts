// src/services/config/types.ts

export type GuildConfig = {
  guildId: string;

  // Onboarding / welcome flow
  welcomeEnabled: boolean;
  welcomeChannelId: string | null;
};

export type GuildConfigPatch = Partial<Omit<GuildConfig, "guildId">>;

export const DEFAULT_GUILD_CONFIG: Omit<GuildConfig, "guildId"> = {
  welcomeEnabled: true,
  welcomeChannelId: null,
};