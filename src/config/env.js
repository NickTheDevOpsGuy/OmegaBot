import dotenv from "dotenv";
dotenv.config();

export const env = {
  token: process.env.DISCORD_TOKEN,
  appId: process.env.DISCORD_APP_ID,
  guildId: process.env.DISCORD_GUILD_ID,
  summaryMode: process.env.SUMMARY_MODE || "local"
};
