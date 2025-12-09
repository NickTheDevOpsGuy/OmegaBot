import dotenv from "dotenv";
dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set in environment`);
  }
  return value;
}

export const env = {
  token: requireEnv("DISCORD_TOKEN"),
  appId: requireEnv("DISCORD_APP_ID"),
  guildId: requireEnv("DISCORD_GUILD_ID"),
  summaryMode: process.env.SUMMARY_MODE ?? "local",
  openAIKey: process.env.OPENAI_API_KEY ?? null
};
