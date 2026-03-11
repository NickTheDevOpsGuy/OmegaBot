// src/commands/profile/subcommands/timezone.ts
//
// /profile timezone [zone] [user]

import type { ChatInputCommandInteraction } from "discord.js";
import { getDb } from "../../../../services/core/database/db.js";
import {
  getTimezone,
  setTimezone,
  isValidTimezone,
  formatTimeInZone,
} from "../profileHelpers.js";
import { logger } from "../../../../utils/logger.js";

export async function run(interaction: ChatInputCommandInteraction): Promise<void> {
  const zone = interaction.options.getString("zone");
  const targetUser = interaction.options.getUser("user");
  const db = getDb();

  if (targetUser) {
    const tz = getTimezone(db, targetUser.id);
    if (tz) {
      await interaction.reply({
        content: `🕐 **${targetUser.username}**'s timezone is **${tz}**\nCurrent time: **${formatTimeInZone(tz)}**`,
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: `${targetUser.username} hasn't set their timezone yet.`,
        ephemeral: true,
      });
    }
    return;
  }

  if (!zone) {
    const tz = getTimezone(db, interaction.user.id);
    if (tz) {
      await interaction.reply({
        content: `🕐 Your timezone is **${tz}**\nCurrent time: **${formatTimeInZone(tz)}**`,
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content:
          "You haven't set a timezone yet. Use `/profile timezone zone:America/New_York` to set one.",
        ephemeral: true,
      });
    }
    return;
  }

  if (!isValidTimezone(zone)) {
    await interaction.reply({
      content: `❌ Invalid timezone: \`${zone}\`\n\nExamples: \`America/New_York\`, \`Europe/London\`, \`Asia/Tokyo\`, \`UTC\`\n[Full list](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)`,
      ephemeral: true,
    });
    return;
  }

  setTimezone(db, interaction.user.id, zone);
  await interaction.reply({
    content: `✅ Timezone set to **${zone}**\nCurrent time: **${formatTimeInZone(zone)}**`,
    ephemeral: true,
  });

  logger.info(
    { userId: interaction.user.id, timezone: zone },
    "[profile/timezone] timezone set",
  );
}
