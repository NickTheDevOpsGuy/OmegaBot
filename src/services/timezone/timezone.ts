//src/services/timezone/timezone.ts
import {
  SlashCommandBuilder,
  MessageFlags,
  type ChatInputCommandInteraction,
} from "discord.js";
import {
  assertValidTimeZone,
  clearUserTimezone,
  getUserTimezone,
  setUserTimezone,
} from "../../services/timezone/timezoneStore.js";
import { logger } from "../../utils/logger.js";

/**
 * /timezone command
 *
 * Stores a per-user IANA timezone like "America/New_York".
 * Does not guess timezones. Validates via Intl.
 */
export const data = new SlashCommandBuilder()
  .setName("timezone")
  .setDescription("Set or clear your timezone for /history timestamps")
  .addSubcommand((sub) =>
    sub
      .setName("set")
      .setDescription("Set your timezone (IANA format)")
      .addStringOption((opt) =>
        opt
          .setName("tz")
          .setDescription('IANA timezone like "America/New_York"')
          .setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub.setName("clear").setDescription("Clear your saved timezone"),
  )
  .addSubcommand((sub) => sub.setName("show").setDescription("Show your saved timezone"));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const sub = interaction.options.getSubcommand();
  const userId = interaction.user.id;

  try {
    if (sub === "show") {
      const current = getUserTimezone(userId);
      await interaction.editReply(
        current ? `Your timezone is set to: ${current}` : "You have no timezone set.",
      );
      return;
    }

    if (sub === "clear") {
      clearUserTimezone(userId);
      logger.info({ userId }, "Timezone cleared");
      await interaction.editReply("Timezone cleared.");
      return;
    }

    // sub === "set"
    const tz = interaction.options.getString("tz", true).trim();

    try {
      assertValidTimeZone(tz);
    } catch {
      logger.warn({ userId, tz }, "Invalid timezone provided");
      await interaction.editReply(
        `That timezone is not valid. Use an IANA value like "America/New_York" or "Europe/London".`,
      );
      return;
    }

    setUserTimezone(userId, tz);
    logger.info({ userId, tz }, "Timezone set");
    await interaction.editReply(`Timezone saved: ${tz}`);
  } catch (err) {
    logger.error({ err, userId, sub }, "Timezone command failed unexpectedly");

    await interaction.editReply("Something went wrong while updating your timezone.");
  }
}
