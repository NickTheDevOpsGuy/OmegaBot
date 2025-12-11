import {
  SlashCommandBuilder,
  AttachmentBuilder,
  MessageFlags,
  type ChatInputCommandInteraction,
} from "discord.js";
import { summarize } from "../../services/summary/summarizer.js";

/**
 * Defines the /summary command.
 * Summarizes recent messages from the current channel and sends the result via DM.
 */
export const data = new SlashCommandBuilder()
  .setName("summary")
  .setDescription("Summarize recent messages and DM it to you")
  .addIntegerOption((opt) =>
    opt
      .setName("count")
      .setDescription("How many messages to fetch")
      .setMinValue(10)
      .setMaxValue(100),
  );

/**
 * Handler for the /summary command.
 *
 * Flow:
 * 1. Defer an ephemeral reply so the user sees “working…” without cluttering the channel.
 * 2. Validate the channel can provide messages.
 * 3. Fetch the last N messages, filter out bots and empty content.
 * 4. Build a plain-text transcript.
 * 5. Run the transcript through the summarizer.
 * 6. Try to DM the summary to the user (text or file).
 * 7. Handle and report errors gracefully.
 */
export async function execute(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  // Use the requested count or default to 50 messages.
  const count = interaction.options.getInteger("count") ?? 50;

  try {
    /**
     * Use flags instead of the deprecated `ephemeral: true`.
     * This keeps the response visible only to the user while work happens.
     */
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    /**
     * Guard: make sure the interaction channel supports text messages.
     * Some interaction contexts (like certain system channels) cannot be summarized.
     */
    if (!interaction.channel || !interaction.channel.isTextBased()) {
      await interaction.editReply(
        "This channel does not support summarizing messages.",
      );
      return;
    }

    // Fetch the most recent messages up to the requested limit.
    const messages = await interaction.channel.messages.fetch({ limit: count });

    // Nothing in the channel at all.
    if (messages.size === 0) {
      await interaction.editReply("No messages found to summarize.");
      return;
    }

    /**
     * Filter out bot messages and anything without content,
     * then sort oldest → newest so the transcript reads in conversation order.
     */
    const userMessages = messages
      .filter((m) => !m.author.bot && m.content)
      .sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    // If everything filtered out (all bots or empty content), there is nothing useful to summarize.
    if (userMessages.size === 0) {
      await interaction.editReply("No usable messages found to summarize.");
      return;
    }

    /**
     * Build a simple “username: content” transcript that the summarizer can consume.
     */
    const text = userMessages
      .map((m) => `${m.author.username}: ${m.content}`)
      .join("\n");

    // Generate the summary using either local or LLM mode, depending on configuration.
    const output = await summarize(text);

    // Defensive guard: handle a blank or missing summary result.
    if (!output || output.trim().length === 0) {
      await interaction.editReply("Summary came back empty.");
      return;
    }

    /**
     * DM-only delivery mode:
     * If the summary is too long for a normal Discord message, send it as a file attachment instead.
     */
    if (output.length > 2000) {
      const file = new AttachmentBuilder(Buffer.from(output, "utf8"), {
        name: "summary.txt",
      });

      try {
        // Attempt to DM the file to the user.
        await interaction.user.send({
          content: "Here is your summary (too long to send as a message):",
          files: [file],
        });

        // Confirm in the ephemeral reply that the summary was sent.
        await interaction.editReply("Summary sent to your DMs.");
      } catch (err) {
        console.error("[summary] DM file send failed", err);
        await interaction.editReply(
          "I generated the summary, but your DMs appear to be closed.",
        );
      }

      return;
    }

    /**
     * Normal-sized summary:
     * Send it as a plain DM message, then confirm in the ephemeral reply.
     */
    try {
      await interaction.user.send(output);
      await interaction.editReply("Summary sent to your DMs.");
    } catch (err) {
      console.error("[summary] DM text send failed", err);
      await interaction.editReply(
        "I generated the summary, but could not DM you. Your DMs may be closed.",
      );
    }
  } catch (err) {
    /**
     * Top-level catch: if anything in the summarization pipeline fails,
     * log the error and try to send a generic failure message back to the user.
     */
    console.error("[summary] Summary generation failed", err);

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply(
          "Something went wrong while generating the summary.",
        );
      } else {
        await interaction.reply({
          content: "Something went wrong while generating the summary.",
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (replyErr) {
      // Final fallback if even the error reply fails.
      console.error(
        "[summary] Failed to send fallback error message",
        replyErr,
      );
    }
  }
}
