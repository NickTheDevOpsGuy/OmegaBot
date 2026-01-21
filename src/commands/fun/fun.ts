// src/commands/timezone/timezone.ts

import {
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { logger } from "../../utils/logger.js";
import {
  clearUserTimezone,
  getUserTimezone,
  setUserTimezone,
} from "../../services/timezone/timezoneStore.js";

export const data = new SlashCommandBuilder()
  .setName("timezone")
  .setDescription("Set and compare timezones, and convert times")

  // /timezone set
  .addSubcommand((s) =>
    s
      .setName("set")
      .setDescription(
        "Save your timezone (IANA like America/New_York or short name like ET)",
      )
      .addStringOption((o) =>
        o
          .setName("zone")
          .setDescription('Examples: "US Eastern", "ET", "America/New_York"')
          .setRequired(true),
      )
      .addBooleanOption((o) =>
        o
          .setName("guild")
          .setDescription("If true, store per-server (otherwise global)")
          .setRequired(false),
      ),
  )

  // /timezone show
  .addSubcommand((s) =>
    s
      .setName("show")
      .setDescription("Show your saved timezone")
      .addBooleanOption((o) =>
        o
          .setName("guild")
          .setDescription("If true, read the per-server timezone")
          .setRequired(false),
      )
      .addBooleanOption((o) =>
        o
          .setName("ephemeral")
          .setDescription("Only show the result to you (default true)")
          .setRequired(false),
      ),
  )

  // /timezone clear
  .addSubcommand((s) =>
    s
      .setName("clear")
      .setDescription("Remove your saved timezone")
      .addBooleanOption((o) =>
        o
          .setName("guild")
          .setDescription("If true, clear the per-server timezone")
          .setRequired(false),
      ),
  )

  // /timezone compare
  .addSubcommand((s) =>
    s
      .setName("compare")
      .setDescription("Compare your time with another user")
      .addUserOption((o) =>
        o.setName("user").setDescription("User to compare with").setRequired(true),
      )
      .addBooleanOption((o) =>
        o
          .setName("guild")
          .setDescription("Use per-server timezones if set")
          .setRequired(false),
      )
      .addBooleanOption((o) =>
        o
          .setName("ephemeral")
          .setDescription("Only show the result to you (default true)")
          .setRequired(false),
      ),
  )

  // /timezone convert
  .addSubcommand((s) =>
    s
      .setName("convert")
      .setDescription("Convert a time from your timezone to another zone")
      .addStringOption((o) =>
        o
          .setName("time")
          .setDescription('Time like "7:30pm" or "19:30"')
          .setRequired(true),
      )
      .addStringOption((o) =>
        o
          .setName("to")
          .setDescription(
            'Target zone (examples: "US Pacific", "PT", "America/Los_Angeles")',
          )
          .setRequired(true),
      )
      .addStringOption((o) =>
        o
          .setName("from")
          .setDescription("Optional from-zone (defaults to your saved timezone)")
          .setRequired(false),
      )
      .addBooleanOption((o) =>
        o
          .setName("guild")
          .setDescription("Use per-server timezone for default 'from'")
          .setRequired(false),
      )
      .addBooleanOption((o) =>
        o
          .setName("ephemeral")
          .setDescription("Only show the result to you (default true)")
          .setRequired(false),
      ),
  )
  .setDMPermission(true);

function deferOpts(ephemeral: boolean): { flags: MessageFlags.Ephemeral } | undefined {
  return ephemeral ? { flags: MessageFlags.Ephemeral } : undefined;
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const sub = interaction.options.getSubcommand(true);

  // Default behavior: ephemeral unless explicitly set to false (for display-y commands)
  const supportsEphemeral = sub === "show" || sub === "compare" || sub === "convert";
  const ephemeral = supportsEphemeral
    ? (interaction.options.getBoolean("ephemeral") ?? true)
    : true;

  await interaction.deferReply(deferOpts(ephemeral));

  try {
    if (sub === "set") return await handleSet(interaction);
    if (sub === "show") return await handleShow(interaction);
    if (sub === "clear") return await handleClear(interaction);
    if (sub === "compare") return await handleCompare(interaction);
    if (sub === "convert") return await handleConvert(interaction);

    await interaction.editReply("Unknown subcommand.");
  } catch (err) {
    logger.error({ err, sub }, "[timezone] failed");
    await interaction.editReply("Timezone command failed. Try again in a bit.");
  }
}

/* -------------------------------------------------------------------------- */
/* Timezone input normalization                                                */
/* -------------------------------------------------------------------------- */

/**
 * Small curated set of friendly names -> IANA zones.
 * This avoids exposing the full IANA list while covering common needs.
 */
const COMMON_TIMEZONES: Array<{ name: string; tz: string; label?: string }> = [
  { name: "US Eastern", tz: "America/New_York", label: "ET" },
  { name: "US Central", tz: "America/Chicago", label: "CT" },
  { name: "US Mountain", tz: "America/Denver", label: "MT" },
  { name: "US Pacific", tz: "America/Los_Angeles", label: "PT" },

  { name: "UTC", tz: "Etc/UTC", label: "UTC" },

  { name: "UK", tz: "Europe/London" },
  { name: "Central Europe", tz: "Europe/Berlin" },

  { name: "India", tz: "Asia/Kolkata" },
  { name: "Japan", tz: "Asia/Tokyo" },
  { name: "Australia East", tz: "Australia/Sydney" },
];

/**
 * Common abbreviations people actually type.
 * Note: abbreviations are ambiguous globally, but this is a pragmatic bot UX choice.
 */
const ALIAS_TO_IANA: Record<string, { tz: string; label?: string }> = {
  // US / common
  et: { tz: "America/New_York", label: "ET" },
  est: { tz: "America/New_York", label: "ET" },
  edt: { tz: "America/New_York", label: "ET" },

  ct: { tz: "America/Chicago", label: "CT" },
  cst: { tz: "America/Chicago", label: "CT" },
  cdt: { tz: "America/Chicago", label: "CT" },

  mt: { tz: "America/Denver", label: "MT" },
  mst: { tz: "America/Denver", label: "MT" },
  mdt: { tz: "America/Denver", label: "MT" },

  pt: { tz: "America/Los_Angeles", label: "PT" },
  pst: { tz: "America/Los_Angeles", label: "PT" },
  pdt: { tz: "America/Los_Angeles", label: "PT" },

  // UTC-ish
  utc: { tz: "Etc/UTC", label: "UTC" },
  gmt: { tz: "Etc/UTC", label: "UTC" },
};

function isValidIanaZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function normalizeKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeZoneInput(raw: string): { tz: string; label?: string } | null {
  const v = raw.trim();
  if (!v) return null;

  const key = normalizeKey(v);

  // Friendly names: "us eastern", "central europe", etc.
  for (const z of COMMON_TIMEZONES) {
    if (normalizeKey(z.name) === key) return { tz: z.tz, label: z.label };
  }

  // Allow a couple shorthand friendly variants people type
  if (key === "eastern" || key === "east") return { tz: "America/New_York", label: "ET" };
  if (key === "central" || key === "midwest")
    return { tz: "America/Chicago", label: "CT" };
  if (key === "mountain") return { tz: "America/Denver", label: "MT" };
  if (key === "pacific" || key === "west")
    return { tz: "America/Los_Angeles", label: "PT" };

  // Abbreviations: "ET", "PST", etc.
  const alias = ALIAS_TO_IANA[key.replace(/\./g, "")];
  if (alias) return { tz: alias.tz, label: alias.label };

  // Power user path: accept IANA directly
  if (isValidIanaZone(v)) return { tz: v };

  return null;
}

function formatLocalTime(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function utcOffsetMinutes(date: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "shortOffset" as unknown as "short",
  }).formatToParts(date);

  const name = parts.find((p) => p.type === "timeZoneName")?.value ?? "UTC+0";
  const m = name.match(/([+-])\s*(\d{1,2})(?::(\d{2}))?$/);
  if (!m) return 0;

  const sign = m[1] === "-" ? -1 : 1;
  const hh = Number(m[2]);
  const mm = Number(m[3] ?? 0);

  return sign * (hh * 60 + mm);
}

function formatUtcOffset(date: Date, tz: string): string {
  const mins = utcOffsetMinutes(date, tz);
  const sign = mins < 0 ? "-" : "+";
  const abs = Math.abs(mins);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `UTC${sign}${hh}:${mm}`;
}

function formatDeltaRelative(deltaMinutes: number): string {
  if (deltaMinutes === 0) return "same as you";

  const ahead = deltaMinutes > 0;
  const abs = Math.abs(deltaMinutes);
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;

  const hPart = hours > 0 ? `${hours}h` : "";
  const mPart = mins > 0 ? `${mins}m` : "";
  const space = hPart && mPart ? " " : "";

  return `${hPart}${space}${mPart} ${ahead ? "ahead" : "behind"}`.trim();
}

function scopeFromBool(guildFlag: boolean | null | undefined): "guild" | "global" {
  return guildFlag ? "guild" : "global";
}

async function getTzOrNull(
  interaction: ChatInputCommandInteraction,
  userId: string,
  scope: "guild" | "global",
) {
  const guildId = interaction.inGuild() ? interaction.guildId : null;
  return getUserTimezone({ userId, guildId, scope });
}

function shortHint(): string {
  return [
    "Examples:",
    '`/timezone set zone:"US Eastern"`',
    "`/timezone set zone:ET`",
    "`/timezone set zone:America/New_York`",
    "",
    "Common zones: US Eastern, US Central, US Mountain, US Pacific, UTC, UK, Central Europe, India, Japan, Australia East",
  ].join("\n");
}

/* -------------------------------------------------------------------------- */
/* Handlers                                                                    */
/* -------------------------------------------------------------------------- */

async function handleSet(interaction: ChatInputCommandInteraction): Promise<void> {
  const raw = interaction.options.getString("zone", true);
  const guildFlag = interaction.options.getBoolean("guild") ?? false;
  const scope = scopeFromBool(guildFlag);

  const normalized = normalizeZoneInput(raw);
  if (!normalized) {
    await interaction.editReply(
      ["I could not understand that timezone.", "", shortHint()].join("\n"),
    );
    return;
  }

  const guildId = interaction.inGuild() ? interaction.guildId : null;
  const saved = await setUserTimezone({
    userId: interaction.user.id,
    guildId,
    scope,
    timezone: normalized.tz,
    label: normalized.label,
  });

  const now = new Date();
  const local = formatLocalTime(now, saved.timezone);
  const offset = formatUtcOffset(now, saved.timezone);

  await interaction.editReply(
    [
      "Saved your timezone.",
      "",
      `Zone: ${saved.timezone}${saved.label ? ` (${saved.label})` : ""}`,
      `Now: ${local} | ${offset}`,
      `Scope: ${scope === "guild" ? "this server" : "global"}`,
    ].join("\n"),
  );
}

async function handleShow(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildFlag = interaction.options.getBoolean("guild") ?? false;
  const scope = scopeFromBool(guildFlag);

  const tz = await getTzOrNull(interaction, interaction.user.id, scope);
  if (!tz) {
    await interaction.editReply(["No timezone saved yet.", "", shortHint()].join("\n"));
    return;
  }

  const now = new Date();
  const local = formatLocalTime(now, tz.timezone);
  const offset = formatUtcOffset(now, tz.timezone);

  await interaction.editReply(
    [
      "Your timezone:",
      `Zone: ${tz.timezone}${tz.label ? ` (${tz.label})` : ""}`,
      `Now: ${local} | ${offset}`,
      `Scope: ${scope === "guild" ? "this server" : "global"}`,
    ].join("\n"),
  );
}

async function handleClear(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildFlag = interaction.options.getBoolean("guild") ?? false;
  const scope = scopeFromBool(guildFlag);
  const guildId = interaction.inGuild() ? interaction.guildId : null;

  const ok = await clearUserTimezone({ userId: interaction.user.id, guildId, scope });
  await interaction.editReply(
    ok ? "Cleared your saved timezone." : "No saved timezone to clear.",
  );
}

async function handleCompare(interaction: ChatInputCommandInteraction): Promise<void> {
  const target = interaction.options.getUser("user", true);
  const guildFlag = interaction.options.getBoolean("guild") ?? false;
  const scope = scopeFromBool(guildFlag);

  const [a, b] = await Promise.all([
    getTzOrNull(interaction, interaction.user.id, scope),
    getTzOrNull(interaction, target.id, scope),
  ]);

  if (!a) {
    await interaction.editReply(
      ["You have no timezone saved.", "Run `/timezone set` first.", "", shortHint()].join(
        "\n",
      ),
    );
    return;
  }

  if (!b) {
    await interaction.editReply(
      "That user has no timezone saved. Ask them to run `/timezone set` first.",
    );
    return;
  }

  const now = new Date();
  const aNow = formatLocalTime(now, a.timezone);
  const bNow = formatLocalTime(now, b.timezone);
  const aOff = formatUtcOffset(now, a.timezone);
  const bOff = formatUtcOffset(now, b.timezone);

  const delta = utcOffsetMinutes(now, b.timezone) - utcOffsetMinutes(now, a.timezone);
  const rel = formatDeltaRelative(delta);

  await interaction.editReply(
    [
      "Timezone compare:",
      "",
      `${interaction.user.username}: ${aNow} (${a.timezone}) | ${aOff}`,
      `${target.username}: ${bNow} (${b.timezone}) | ${bOff}`,
      "",
      `${target.username} is ${rel}.`,
    ].join("\n"),
  );
}

function parseTimeString(raw: string): { hours: number; minutes: number } | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;

  // Match "19:30" or "7:30pm" or "7pm"
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!m) return null;

  let hh = Number(m[1]);
  const mm = Number(m[2] ?? 0);
  const ap = (m[3] ?? "").toLowerCase();

  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (mm < 0 || mm > 59) return null;

  if (ap) {
    if (hh < 1 || hh > 12) return null;
    if (ap === "pm" && hh !== 12) hh += 12;
    if (ap === "am" && hh === 12) hh = 0;
  } else {
    if (hh < 0 || hh > 23) return null;
  }

  return { hours: hh, minutes: mm };
}

function formatTimeForZone(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function guessDateInZone(now: Date, tz: string, h: number, m: number): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const mo = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";

  const assumedUtc = new Date(
    `${y}-${mo}-${d}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00.000Z`,
  );

  const offMin = utcOffsetMinutes(assumedUtc, tz);
  return new Date(assumedUtc.getTime() - offMin * 60_000);
}

async function handleConvert(interaction: ChatInputCommandInteraction): Promise<void> {
  const rawTime = interaction.options.getString("time", true);
  const rawTo = interaction.options.getString("to", true);
  const rawFrom = interaction.options.getString("from") ?? "";
  const guildFlag = interaction.options.getBoolean("guild") ?? false;
  const scope = scopeFromBool(guildFlag);

  const toNorm = normalizeZoneInput(rawTo);
  if (!toNorm) {
    await interaction.editReply(
      ["I could not understand the **to** timezone.", "", shortHint()].join("\n"),
    );
    return;
  }

  let fromTz: string | null = null;
  let fromLabel: string | undefined;

  if (rawFrom.trim()) {
    const fromNorm = normalizeZoneInput(rawFrom);
    if (!fromNorm) {
      await interaction.editReply(
        ["I could not understand the **from** timezone.", "", shortHint()].join("\n"),
      );
      return;
    }
    fromTz = fromNorm.tz;
    fromLabel = fromNorm.label;
  } else {
    const saved = await getTzOrNull(interaction, interaction.user.id, scope);
    if (!saved) {
      await interaction.editReply(
        "No saved timezone found for you. Either run `/timezone set` first, or pass `from:`.",
      );
      return;
    }
    fromTz = saved.timezone;
    fromLabel = saved.label;
  }

  const parsed = parseTimeString(rawTime);
  if (!parsed) {
    await interaction.editReply('Time must look like "7:30pm" or "19:30".');
    return;
  }

  const now = new Date();
  const instant = guessDateInZone(now, fromTz, parsed.hours, parsed.minutes);

  const fromTime = formatTimeForZone(instant, fromTz);
  const toTime = formatTimeForZone(instant, toNorm.tz);

  const fromOff = formatUtcOffset(instant, fromTz);
  const toOff = formatUtcOffset(instant, toNorm.tz);

  const delta = utcOffsetMinutes(instant, toNorm.tz) - utcOffsetMinutes(instant, fromTz);
  const rel = formatDeltaRelative(delta);

  await interaction.editReply(
    [
      "Time conversion:",
      "",
      `From: ${fromTime} (${fromTz}${fromLabel ? `, ${fromLabel}` : ""}) | ${fromOff}`,
      `To:   ${toTime} (${toNorm.tz}${toNorm.label ? `, ${toNorm.label}` : ""}) | ${toOff}`,
      "",
      `That is ${rel}.`,
    ].join("\n"),
  );
}
