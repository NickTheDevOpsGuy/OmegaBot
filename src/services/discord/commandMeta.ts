// src/services/discord/commandMeta.ts

/**
 * Minimal metadata shape used by /help.
 *
 * This is intentionally defensive: it tries to extract command names and
 * descriptions from whatever your loader stores in `client.commands`.
 */

export type CommandListItem = {
  name: string;
  description: string;
  group: string;
  adminOnly: boolean;
};

type MaybeCommandModule = {
  data?: {
    name?: string;
    description?: string;
    toJSON?: () => { name?: string; description?: string };
    default_member_permissions?: string | null;
  };
  meta?: Partial<Pick<CommandListItem, "group" | "adminOnly">>;
};

type MaybeHasCommandsMap = {
  commands?: Map<string, unknown>;
};

/**
 * Extract a list of commands from a Discord client object.
 *
 * Supports common shapes:
 * - client.commands = Map<string, { data: SlashCommandBuilder, execute: fn }>
 * - client.commands = Map<string, { data: { name, description } }>
 *
 * If nothing matches, returns an empty array and /help remains static.
 */
export function extractCommandList(client: unknown): CommandListItem[] {
  const c = client as MaybeHasCommandsMap;

  if (!c?.commands || !(c.commands instanceof Map)) return [];

  const items: CommandListItem[] = [];

  for (const [fallbackName, modUnknown] of c.commands.entries()) {
    const mod = modUnknown as MaybeCommandModule;

    const fromJson = safeToJson(mod?.data);
    const name = (mod?.data?.name ?? fromJson?.name ?? fallbackName)?.trim();
    if (!name) continue;

    const description = (mod?.data?.description ?? fromJson?.description ?? "").trim();

    // Best-effort group: use explicit meta.group if provided, else infer.
    // (You can improve this later by having the loader attach folder name.)
    const group = (mod?.meta?.group ?? inferGroupFromName(name)).trim();

    // Best-effort adminOnly:
    // - If command module sets meta.adminOnly, trust it
    // - Else if default_member_permissions is set on command data, consider it adminOnly
    const adminOnly =
      Boolean(mod?.meta?.adminOnly) || Boolean(mod?.data?.default_member_permissions);

    items.push({
      name,
      description,
      group,
      adminOnly,
    });
  }

  return items;
}

function safeToJson(data: unknown): { name?: string; description?: string } | null {
  try {
    const d = data as { toJSON?: () => unknown };
    if (typeof d?.toJSON !== "function") return null;
    const j = d.toJSON() as { name?: string; description?: string };
    return j ?? null;
  } catch {
    return null;
  }
}

function inferGroupFromName(name: string): string {
  // Minimal inference, keeps output readable until the loader tags groups.
  if (name === "help") return "general";
  if (name === "config") return "admin";
  if (name.includes("github")) return "github";
  return "other";
}