// src/commands/fun/subcommands/rps/ui.ts
//
// Rock-Paper-Scissors Discord UI: button builders.

import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export function buildChoiceButtons(
  challengeId: string,
  disabled = false,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`rps:${challengeId}:rock`)
      .setLabel("Rock")
      .setEmoji("🪨")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`rps:${challengeId}:paper`)
      .setLabel("Paper")
      .setEmoji("📄")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`rps:${challengeId}:scissors`)
      .setLabel("Scissors")
      .setEmoji("✂️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled),
  );
}

export function buildDeclineButton(
  challengeId: string,
  disabled = false,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`rps:${challengeId}:decline`)
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
      .setCustomId(`rps:${challengeId}:extend`)
      .setLabel("Extend time (starter only)")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("⏱️")
      .setDisabled(disabled),
  );
}
