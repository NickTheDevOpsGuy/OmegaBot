import {
  DiscordAPIError,
  PermissionsBitField,
  type ChatInputCommandInteraction,
  type TextBasedChannel,
} from "discord.js";
import { env } from "../../../config/env.js";
import { getContextLogger } from "../../core/logging/requestContext.js";

const MAX_AUDIT_MESSAGE_LENGTH = 1800;

type SendableChannel = TextBasedChannel & {
  permissionsFor?: (memberOrUser: string) => PermissionsBitField | null;
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

function canSendAuditMessage(channel: SendableChannel, clientUserId: string): boolean {
  if (typeof channel.permissionsFor !== "function") return true;

  const permissions = channel.permissionsFor(clientUserId);
  if (!permissions) return false;

  return (
    permissions.has(PermissionsBitField.Flags.ViewChannel) &&
    permissions.has(PermissionsBitField.Flags.SendMessages)
  );
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

    const clientUserId = interaction.client.user?.id;
    if (!clientUserId) {
      getContextLogger().warn({ channelId }, "[admin-audit] client user unavailable");
      return;
    }

    if (!canSendAuditMessage(channel, clientUserId)) {
      getContextLogger().warn(
        { channelId, clientUserId },
        "[admin-audit] bot lacks permission to send to audit channel",
      );
      return;
    }

    await channel.send({
      content: truncateAuditContent(content),
    });
  } catch (err) {
    if (err instanceof DiscordAPIError && (err.code === 50001 || err.code === 50013)) {
      getContextLogger().warn(
        { channelId, code: err.code, status: err.status },
        "[admin-audit] skipping audit log because channel access is missing",
      );
      return;
    }

    getContextLogger().warn({ err, channelId }, "[admin-audit] send threw");
  }
}
