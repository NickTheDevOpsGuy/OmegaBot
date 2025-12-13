import {
  SlashCommandBuilder,
  AttachmentBuilder,
  MessageFlags,
  type ChatInputCommandInteraction,
} from "discord.js";

/**
 * /history command
 *
 * Returns the last N raw user messages from the current channel
 * and delivers them privately via DM to the requester.
 *
 * This is the MVP implementation for chat playback (F1).
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

/**
 * Execute the /history command.
 */
export async function execute(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  // Default to 50 messages if no count is provided.
  const count = interaction.options.getInteger("count") ?? 50;

  // Acknowledge the command privately so only the caller sees status updates.
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  // Ensure the command is run in a text-based channel.
  if (!interaction.channel || !interaction.channel.isTextBased()) {
    await interaction.editReply("This channel does not support message history.");
    return;
  }

  // Fetch recent messages from the channel.
  const messages = await interaction.channel.messages.fetch({ limit: count });

  /**
   * Filter out bot messages and sort oldest → newest
   * so the transcript reads naturally.
   */
  const userMessages = messages
    .filter((m) => !m.author.bot && m.content)
    .sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  if (userMessages.size === 0) {
    await interaction.editReply("No history found.");
    return;
  }

  /**
   * Build a readable transcript using 24-hour time.
   */
  const text = userMessages
    .map((m) => {
      const dt = new Date(m.createdTimestamp).toLocaleString("en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      return `[${dt}] ${m.author.username}: ${m.content}`;
    })
    .join("\n");

  /**
   * If the transcript exceeds Discord’s 2000-character limit,
   * send it as a text file instead.
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
   * Normal-length transcript → send as a DM message.
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