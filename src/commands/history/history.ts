import {
  SlashCommandBuilder,
  AttachmentBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";

/**
 * /history command
 * Returns the last N raw messages (no summarization).
 * MVP version for chat playback feature (F1).
 */
export const data = new SlashCommandBuilder()
  .setName("history")
  .setDescription("Show the most recent messages in plain text")
  .addIntegerOption((opt) =>
    opt
      .setName("count")
      .setDescription("How many messages to fetch")
      .setMinValue(5)
      .setMaxValue(50),
  );

export async function execute(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  // Use the requested count, or default to 50 messages.
  const count = interaction.options.getInteger("count") ?? 50;

  await interaction.deferReply();

  const messages = await interaction.channel?.messages.fetch({ limit: count });
  if (!messages) {
    await interaction.editReply("Could not fetch messages for this channel.");
    return;
  }

  /**
   * Filter out bots so playback only includes real user messages.
   * Sort oldest→newest so the playback follows the conversation flow.
   */
  const userMessages = messages
    .filter((m) => !m.author.bot && m.content)
    .sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  /**
   * Nothing to show.
   */
  if (userMessages.size === 0) {
    await interaction.editReply("No history found.");
    return;
  }

  /**
   * Combine messages into a simple “username: content” transcript, one per line.
   */
  const text = userMessages
    .map((m) => `${m.author.username}: ${m.content}`)
    .join("\n");

  /**
   * If the history exceeds Discord’s 2000-character limit, send it as a text file instead of a normal message.
   */
  if (text.length > 2000) {
    const file = new AttachmentBuilder(Buffer.from(text), {
      name: "history.txt",
    });
    await interaction.editReply({
      content: "History was too long to display, so I attached it as a file.",
      files: [file],
    });
    return;
  }

 await interaction.editReply(text);
}
