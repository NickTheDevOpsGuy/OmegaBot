// src/services/faq/permissions.ts
//
// FAQ permission policy.
//
// Goals:
// - Keep permission rules centralized and boring.
// - Command files call canFaqAction() and show a friendly reason.
//
// You can evolve this later to support:
// - per-guild config
// - role allowlists
// - per-action overrides

import type { ChatInputCommandInteraction } from "discord.js";
import { canUseBotAdmin } from "../../core/permissions/botAdmin.js";

export type FaqAction = "add" | "get" | "list" | "remove";

export type PermissionResult = { ok: true } | { ok: false; reason: string };

export function canFaqAction(
  interaction: ChatInputCommandInteraction,
  action: FaqAction,
): PermissionResult {
  // get/list can be used anywhere for now
  if (action === "get" || action === "list") return { ok: true };

  // add/remove should be guild-only if you want permissions to matter
  if (!interaction.inGuild()) {
    return { ok: false, reason: "faq.action_guild_only" };
  }

  if (!canUseBotAdmin(interaction)) {
    return { ok: false, reason: "faq.need_manage_server" };
  }

  return { ok: true };
}
