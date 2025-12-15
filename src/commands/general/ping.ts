import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";

/**
 * Defines the /ping command.
 * Used to verify that the bot is responding and to measure latency.
 */
export const data = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Ping test with latency");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  /**
   * First reply (with fetchReply: true) returns the actual message object.
   * We use this to calculate round-trip latency between interaction and reply.
   */
  const sent = await interaction.reply({
    content: "Pinging...",
    fetchReply: true,
  });

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
   * Edit the original message to show actual latency numbers.
   * This keeps the interaction tidy instead of sending another message.
   */
  await interaction.editReply(
    `Pong. Round trip latency is ${latency}ms. WebSocket heartbeat is ${wsPing}ms.`,
  );
}
