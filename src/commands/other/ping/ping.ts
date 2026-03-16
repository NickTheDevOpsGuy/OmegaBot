import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { getContextLogger } from "../../../services/core/logging/requestContext.js";
import { errMessage, getUserFacingReason } from "../../../utils/errors.js";
import { logger } from "../../../utils/logger.js";

/**
 * Defines the /ping command.
 * Used to verify that the bot is responding and to measure latency.
 */
export const data = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Ping test with latency");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    /**
     * Send the initial reply.
     * We avoid deprecated fetchReply option and instead fetch the reply after.
     */
    await interaction.reply("Pinging...");

    /**
     * Fetch the bot's reply message so we can compute latency.
     */
    const sent = await interaction.fetchReply();

    /**
     * Measure latency:
     * - interaction.createdTimestamp is when Discord received the slash command
     * - sent.createdTimestamp is when Discord created the bot's response
     */
    const latency = sent.createdTimestamp - interaction.createdTimestamp;

    /**
     * WebSocket heartbeat is the current ping between the bot and Discord's gateway.
     * Lower numbers mean a healthier connection.
     */
    const wsPing = interaction.client.ws.ping;

    /**
     * Debug-level logging so we can observe bot health without spamming logs.
     */
    logger.debug(
      {
        latency,
        wsPing,
        userId: interaction.user.id,
      },
      "[ping] latency check",
    );

    /**
     * Edit the original message to show actual latency numbers.
     */
    await interaction.editReply(
      `Pong. Round trip latency is ${latency}ms. WebSocket heartbeat is ${wsPing}ms.`,
    );
  } catch (err) {
    /**
     * Extremely unlikely path, but included for consistency with other commands.
     */
    getContextLogger().error({ err }, `[ping] latency check threw: ${errMessage(err)}`);
    const msg = `❌ ${getUserFacingReason(err)}`;
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply(msg);
    } else {
      await interaction.reply(msg);
    }
  }
}
