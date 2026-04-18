import type { ChatInputCommandInteraction, TextBasedChannel } from "discord.js";
import { env } from "../../../config/env.js";
import { getContextLogger } from "../../core/logging/requestContext.js";

const MAX_AUDIT_MESSAGE_LENGTH = 1800;

type SendableChannel = TextBasedChannel & {
  send: (payload: { content: string }) => Promise<unknown>;
};

function isSendableTextChannel(channel: unknown): channel is SendableChannel {
  if (!channel || typeof channel !== "object") return false;

  const candidate = channel as {
    isTextBased?: () => boolean;
    send?: unknown;
  };

  return (
    typeof candidate.isTextBased === "function" &&
    candidate.isTextBased() &&
    typeof candidate.send === "function"
  );
}

function truncateAuditContent(content: string): string {
  if (content.length <= MAX_AUDIT_MESSAGE_LENGTH) return content;
  return content.slice(0, MAX_AUDIT_MESSAGE_LENGTH - 3) + "...";
}

export async function sendAdminAuditLog(
  interaction: ChatInputCommandInteraction,
  content: string,
): Promise<void> {
  const channelId = env.botAdminAuditChannelId;
  if (!channelId) return;

  try {
    const channel = await interaction.client.channels.fetch(channelId);

    if (!isSendableTextChannel(channel)) {
      getContextLogger().warn(
        { channelId, type: channel?.type ?? null },
        "[admin-audit] audit channel is not text-sendable",
      );
      return;
    }

    await channel.send({
      content: truncateAuditContent(content),
    });
  } catch (err) {
    getContextLogger().warn({ err, channelId }, "[admin-audit] send threw");
  }
}
