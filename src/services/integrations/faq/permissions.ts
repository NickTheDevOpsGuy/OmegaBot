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
import { PermissionsBitField } from "discord.js";

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

  const perms = interaction.memberPermissions;
  if (!perms) {
    return { ok: false, reason: "faq.cannot_resolve_permissions" };
  }

  const ok =
    perms.has(PermissionsBitField.Flags.ManageGuild) ||
    perms.has(PermissionsBitField.Flags.Administrator);

  if (!ok) {
    return { ok: false, reason: "faq.need_manage_server" };
  }

  return { ok: true };
}
