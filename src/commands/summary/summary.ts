import {
  SlashCommandBuilder,
  AttachmentBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { summarize } from "../../services/summary/summarizer.js";

/**
 * Defines the /summary command.
 * Used to summarize the chats.
 */

export const data = new SlashCommandBuilder()
  .setName("summary")
  .setDescription("Summarize recent messages")
  .addIntegerOption((opt) =>
    opt
      .setName("count")
      .setDescription("How many messages to fetch")
      .setMinValue(10)
      .setMaxValue(100),
  );

/**
 * Caps at 50 lines by default
 */

export async function execute(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const count = interaction.options.getInteger("count") ?? 50;

  try {
    // FIXED: Use flags instead of ephemeral: true
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const messages = await interaction.channel?.messages.fetch({ limit: count });
  /**
   * Guard: if we could not fetch messages (no channel or API issue),
   * tell the user and stop instead of throwing later.
   */
  if (!messages) {
    await interaction.editReply("Could not fetch messages for this channel.");
    return;
  }

  /**
   * Filter out bots so summaries don’t include automated noise.
   * Sort oldest→newest so the summary respects conversation order.
   */
  const userMessages = messages
    .filter((m) => !m.author.bot && m.content)
    .sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  /**
   * If no non-bot messages remain after filtering, tell the user there is nothing to summarize.
   */
  if (userMessages.size === 0) {
    await interaction.editReply("No usable messages found to summarize.");
    return;
  }

  /**
   * Combine messages into a simple “username: content” transcript, one per line.
   */
  const text = userMessages
    .map((m) => `${m.author.username}: ${m.content}`)
    .join("\n");

  const output = await summarize(text);

  /**
   * If the summary exceeds Discord’s 2000-character limit, send it as a text file instead of a normal message.
   */
  if (output.length > 2000) {
    const file = new AttachmentBuilder(Buffer.from(output), {
      name: "summary.txt",
    });
    await interaction.editReply({
      content: "Summary was too long. Uploaded as file.",
      files: [file],
    });
    return;
  }

  /**
   * Edit the deferred reply with the final summary text.
   */
  await interaction.editReply(output);
}
