import {
  SlashCommandBuilder,
  AttachmentBuilder,
  MessageFlags,
  type ChatInputCommandInteraction,
} from "discord.js";

/**
 * /history command
 * Returns the last N raw user messages as a DM to the requester.
 * MVP version for chat playback feature (F1).
 */
export const data = new SlashCommandBuilder()
  .setName("history")
  .setDescription("DMs you the most recent messages in this channel")
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
  // Default to 50 messages if no count is provided.
  const count = interaction.options.getInteger("count") ?? 50;

  // Ephemeral: only the caller sees the acknowledgment message.
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  // Fetch messages from the current channel.
  const messages = await interaction.channel?.messages.fetch({ limit: count });
  if (!messages) {
    await interaction.editReply("Could not fetch messages for this channel.");
    return;
  }

  /**
   * Filter user messages only (exclude bots),
   * oldest first so playback reads correctly.
   */
  const userMessages = messages
    .filter((m) => !m.author.bot && m.content)
    .sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  if (userMessages.size === 0) {
    await interaction.editReply("No history found.");
    return;
  }

  /**
   * Build a readable transcript.
   */
  const text = userMessages
    .map((m) => `${m.author.username}: ${m.content}`)
    .join("\n");

  /**
   * If too large for a normal DM, send as a file.
   */
  if (text.length > 2000) {
    const file = new AttachmentBuilder(Buffer.from(text, "utf8"), {
      name: "history.txt",
    });

    try {
      await interaction.user.send({
        content: "Here is your recent chat history:",
        files: [file],
      });

      await interaction.editReply("History sent to your DMs.");
    } catch (err) {
      console.error("[history] DM file send failed", err);
      await interaction.editReply(
        "I generated the history, but your DMs appear to be closed.",
      );
    }

    return;
  }

  /**
   * Normal-length transcript → DM it as text.
   */
  try {
    await interaction.user.send(text);
    await interaction.editReply("History sent to your DMs.");
  } catch (err) {
    console.error("[history] DM text send failed", err);
    await interaction.editReply(
      "I generated the history, but could not DM you. Your DMs may be closed.",
    );
  }
}
