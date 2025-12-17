// src/commands/pagination/pagination.ts

import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  type ChatInputCommandInteraction,
} from "discord.js";
import { logger } from "../../utils/logger.js";

/**
 * /pagination command
 * MVP: fetch recent user messages, format into a transcript, split into pages,
 * then let the requester page through it with buttons.
 */
export const data = new SlashCommandBuilder()
  .setName("pagination")
  .setDescription("Page through recent messages in this channel")
  .addIntegerOption((opt) =>
    opt
      .setName("count")
      .setDescription("How many messages to fetch")
      .setMinValue(10)
      .setMaxValue(100),
  );

const MAX_PAGE_CHARS = 1800; // leave room for header + safety
const COLLECTOR_MS = 90_000;

function chunkByChars(text: string, maxChars: number): string[] {
  const lines = text.split("\n");
  const pages: string[] = [];
  let current = "";

  for (const line of lines) {
    // +1 for newline we may add
    const nextLen = current.length + (current ? 1 : 0) + line.length;

    // If a single line is huge, hard-split it
    if (!current && line.length > maxChars) {
      for (let i = 0; i < line.length; i += maxChars) {
        pages.push(line.slice(i, i + maxChars));
      }
      continue;
    }

    if (nextLen > maxChars) {
      if (current) pages.push(current);
      current = line;
      continue;
    }

    current = current ? `${current}\n${line}` : line;
  }

  if (current) pages.push(current);
  return pages.length ? pages : ["(no content)"];
}

function buildRow(pageIndex: number, pageCount: number, disabledAll = false) {
  const prev = new ButtonBuilder()
    .setCustomId("pagination_prev")
    .setLabel("Prev")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disabledAll || pageIndex <= 0);

  const next = new ButtonBuilder()
    .setCustomId("pagination_next")
    .setLabel("Next")
    .setStyle(ButtonStyle.Primary)
    .setDisabled(disabledAll || pageIndex >= pageCount - 1);

  const stop = new ButtonBuilder()
    .setCustomId("pagination_stop")
    .setLabel("Stop")
    .setStyle(ButtonStyle.Danger)
    .setDisabled(disabledAll);

  return new ActionRowBuilder<ButtonBuilder>().addComponents(prev, next, stop);
}

function renderPage(pages: string[], pageIndex: number) {
  const header = `**Playback** (page ${pageIndex + 1}/${pages.length})`;
  return `${header}\n\n${pages[pageIndex]}`;
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const count = interaction.options.getInteger("count") ?? 50;

  try {
    // Not ephemeral: buttons + paging is easier as a normal message.
    await interaction.deferReply();

    if (!interaction.channel || !interaction.channel.isTextBased()) {
      await interaction.editReply("This channel does not support pagination.");
      return;
    }

    const messages = await interaction.channel.messages.fetch({ limit: count });

    const userMessages = messages
      .filter((m) => !m.author.bot && m.content)
      .sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    if (userMessages.size === 0) {
      await interaction.editReply("No usable messages found.");
      return;
    }

    const transcript = userMessages
      .map((m) => `${m.author.username}: ${m.content}`)
      .join("\n");

    const pages = chunkByChars(transcript, MAX_PAGE_CHARS);
    let pageIndex = 0;

    const replyMessage = await interaction.editReply({
      content: renderPage(pages, pageIndex),
      components: [buildRow(pageIndex, pages.length)],
    });

    const collector = replyMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: COLLECTOR_MS,
      filter: (i) => i.user.id === interaction.user.id,
    });

    collector.on("collect", async (i) => {
      try {
        if (i.customId === "pagination_stop") {
          collector.stop("stopped");
          await i.update({
            content: renderPage(pages, pageIndex),
            components: [buildRow(pageIndex, pages.length, true)],
          });
          return;
        }

        if (i.customId === "pagination_prev") {
          pageIndex = Math.max(0, pageIndex - 1);
        }

        if (i.customId === "pagination_next") {
          pageIndex = Math.min(pages.length - 1, pageIndex + 1);
        }

        await i.update({
          content: renderPage(pages, pageIndex),
          components: [buildRow(pageIndex, pages.length)],
        });
      } catch (err) {
        logger.warn(
          { err, userId: interaction.user.id },
          "[pagination] button update failed",
        );
      }
    });

    collector.on("end", async (collected, reason) => {
      try {
        await replyMessage.edit({
          content: renderPage(pages, pageIndex),
          components: [buildRow(pageIndex, pages.length, true)],
        });

        logger.debug(
          {
            reason,
            clicks: collected.size,
            userId: interaction.user.id,
          },
          "[pagination] collector ended",
        );
      } catch (err) {
        logger.warn({ err }, "[pagination] failed to disable buttons");
      }
    });
  } catch (err) {
    logger.error(
      { err, command: "pagination", userId: interaction.user.id },
      "[pagination] command failed",
    );

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply("Something went wrong during pagination.");
      } else {
        await interaction.reply("Something went wrong during pagination.");
      }
    } catch (replyErr) {
      logger.error(
        { err: replyErr },
        "[pagination] failed to send fallback error message",
      );
    }
  }
}
