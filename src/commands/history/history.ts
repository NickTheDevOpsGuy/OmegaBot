// src/commands/history/history.ts
import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  AttachmentBuilder,
} from "discord.js";
import { logger } from "../../utils/logger.js";

export const data = new SlashCommandBuilder()
  .setName("history")
  .setDescription("Get recent message history via DM")
  .addIntegerOption((opt) =>
    opt
      .setName("count")
      .setDescription("Number of messages to retrieve (default: 50, max: 100)")
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(100)
  );

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const count = interaction.options.getInteger("count") ?? 50;

  try {
    // Fetch messages from the channel
    const messages = await interaction.channel?.messages.fetch({ limit: count });

    if (!messages || messages.size === 0) {
      await interaction.editReply("No messages found in this channel.");
      return;
    }

    // Format messages in chronological order (oldest first)
    const formatted = Array.from(messages.values())
      .reverse()
      .map((msg) => {
        const timestamp = msg.createdAt.toLocaleString();
        const author = msg.author.tag;
        const content = msg.content || "[No text content]";
        return `[${timestamp}] ${author}: ${content}`;
      })
      .join("\n\n");

    // Try to send via DM
    try {
      const user = interaction.user;

      // If content is small enough, send directly
      if (formatted.length < 1900) {
        await user.send({
          content: `**Message History** (${messages.size} messages from #${interaction.channel?.name || "channel"})\n\n${formatted}`,
        });
        await interaction.editReply(
          `✅ Sent ${messages.size} messages to your DMs!`
        );
      } else {
        // Content too long - send as file
        const buffer = Buffer.from(formatted, "utf-8");
        const attachment = new AttachmentBuilder(buffer, {
          name: `history-${Date.now()}.txt`,
        });

        await user.send({
          content: `**Message History** (${messages.size} messages from #${interaction.channel?.name || "channel"})`,
          files: [attachment],
        });

        await interaction.editReply(
          `✅ Sent ${messages.size} messages to your DMs as a file!`
        );
      }
    } catch (dmError) {
      // User has DMs disabled
      logger.warn(
        { userId: interaction.user.id, error: dmError },
        "[history] Could not send DM"
      );

      await interaction.editReply(
        "❌ I couldn't send you a DM. Please enable DMs from server members and try again."
      );
    }
  } catch (error) {
    logger.error({ error, count }, "[history] Command failed");
    await interaction.editReply(
      "❌ Failed to fetch message history. Please try again."
    );
  }
}
