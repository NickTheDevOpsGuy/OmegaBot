// src/utils/embedHelpers.ts
//
// Standardized embed builders for consistent bot-wide message readability.

import { EmbedBuilder } from "discord.js";
import { EmbedColors } from "./colors.js";

/**
 * Success (green): confirmations, wins, saved state.
 */
export function createSuccessEmbed(title: string, description?: string): EmbedBuilder {
  const embed = new EmbedBuilder().setColor(EmbedColors.Success).setTitle(title);
  if (description) embed.setDescription(description);
  return embed;
}

/**
 * Error (red): failures, validation errors, API errors.
 */
export function createErrorEmbed(title: string, description?: string): EmbedBuilder {
  const embed = new EmbedBuilder().setColor(EmbedColors.Error).setTitle(title);
  if (description) embed.setDescription(description);
  return embed;
}

/**
 * Info (blue): informational messages, tips, non-urgent notices.
 */
export function createInfoEmbed(title: string, description?: string): EmbedBuilder {
  const embed = new EmbedBuilder().setColor(EmbedColors.Info).setTitle(title);
  if (description) embed.setDescription(description);
  return embed;
}

/**
 * Warning (orange): caution, rate limits, soft failures.
 */
export function createWarningEmbed(title: string, description?: string): EmbedBuilder {
  const embed = new EmbedBuilder().setColor(EmbedColors.Warning).setTitle(title);
  if (description) embed.setDescription(description);
  return embed;
}
