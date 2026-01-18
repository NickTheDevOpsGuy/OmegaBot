// src/unregisterCommands.ts
import { REST, Routes } from "discord.js";
import { config } from "dotenv";

config();

const token = process.env.DISCORD_TOKEN;
const appId = process.env.DISCORD_APP_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !appId) {
  console.error("❌ Missing DISCORD_TOKEN or DISCORD_APP_ID in .env");
  process.exit(1);
}

const rest = new REST().setToken(token);

(async () => {
  try {
    console.log("🗑️  Deleting all commands...");
    console.log("");

    // Delete guild commands if DISCORD_GUILD_ID is set
    if (guildId) {
      console.log(`Deleting guild commands for guild: ${guildId}`);
      await rest.put(Routes.applicationGuildCommands(appId, guildId), {
        body: [],
      });
      console.log("✅ Guild commands deleted");
    }

    // Delete global commands
    console.log("Deleting global commands...");
    await rest.put(Routes.applicationCommands(appId), { body: [] });
    console.log("✅ Global commands deleted");

    console.log("");
    console.log("✅ All commands successfully deleted!");
    console.log("");
    console.log("Next steps:");
    console.log("  npm run register  - Register commands again");
  } catch (error) {
    console.error("❌ Error deleting commands:", error);
    process.exit(1);
  }
})();
