// src/commands/fun/subcommands/darts/ui.ts
//
// Darts PvP challenge: button builders.

import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export function buildThrowButton(
  challengeId: string,
  disabled = false,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`darts:${challengeId}:throw`)
      .setLabel("Throw my darts")
      .setEmoji("🎯")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled),
  );
}

export function buildDeclineButton(
  challengeId: string,
  disabled = false,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`darts:${challengeId}:decline`)
      .setLabel("Decline")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
  );
}

export function buildExtendButton(
  challengeId: string,
  disabled = false,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`darts:${challengeId}:extend`)
      .setLabel("Extend time (starter only)")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("⏱️")
      .setDisabled(disabled),
  );
}
