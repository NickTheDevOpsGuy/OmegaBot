// src/i18n/index.ts
// i18n for future localization. Add locale files under src/i18n/locales/{locale}.ts

export type Locale = "en" | "es" | "de"; // extend as needed

const DEFAULT_LOCALE: Locale = "en";

const translations: Record<Locale, Record<string, string>> = {
  en: {
    "rate_limit.try_again": "Try again in {seconds}s",
    "rate_limit.slow_down": "Slow down!",
    "rate_limit.cooldown_full":
      "⏱️ Slow down! Try again in **{seconds}** seconds (rate limit: {cooldownSec}s).",
    "error.generic": "That didn't work. Try again in a moment.",
    "error.api_unavailable": "API is temporarily unavailable. Try again in a minute.",
    "error.interaction_failed": "The command didn't complete. Try again in a moment.",
    "quote.saved": "Quote #{id} saved!",
    "suggestion.posted": "Suggestion posted.",
    "help.no_commands": "No commands found. Check the command loader.",
    "common.guild_only": "This command can only be used in a server.",
    "quotes.guild_only": "Quotes can only be used in a server!",
    "faq.key_empty": "Key cannot be empty.",
    "faq.title_empty": "Title cannot be empty.",
    "faq.body_empty": "Body cannot be empty.",
    "faq.key_too_long": "Key is too long (max {max} characters).",
    "faq.remove_guild_only": "`/faq remove` can only be used in a server.",
    "faq.action_guild_only": "`/faq add/remove` can only be used in a server.",
    "faq.cannot_resolve_permissions":
      "Could not resolve your permissions for this server.",
    "faq.need_manage_server": "You need Manage Server or Administrator to do that.",
    "admin.no_permission":
      "You don't have permission to use moderation commands. Allowed users are set in `.env` (ADMIN_USER_IDS) or via moderator roles with `/config moderator-role`.",
    "admin.missing_permissions":
      "I am missing required permissions. Check my role permissions, and make sure my role is above the target user's role.",
    "admin.interaction_expired":
      "That took too long and Discord expired the command. Try again.",
    "admin.command_failed":
      "The moderation command didn't complete. Check my permissions and role position.",
  },
  es: {
    "rate_limit.try_again": "Intenta de nuevo en {seconds}s",
    "rate_limit.slow_down": "¡Más despacio!",
    "rate_limit.cooldown_full":
      "⏱️ ¡Más despacio! Intenta en **{seconds}** segundos (límite: {cooldownSec}s).",
    "error.generic": "Eso no funcionó. Intenta de nuevo en un momento.",
    "error.api_unavailable": "La API no está disponible. Intenta en un minuto.",
    "error.interaction_failed":
      "El comando no se completó. Intenta de nuevo en un momento.",
    "quote.saved": "¡Cita #{id} guardada!",
    "suggestion.posted": "Sugerencia publicada.",
    "help.no_commands": "No se encontraron comandos.",
    "common.guild_only": "Este comando solo puede usarse en un servidor.",
    "quotes.guild_only": "¡Las citas solo pueden usarse en un servidor!",
    "faq.key_empty": "La clave no puede estar vacía.",
    "faq.title_empty": "El título no puede estar vacío.",
    "faq.body_empty": "El contenido no puede estar vacío.",
    "faq.key_too_long": "La clave es demasiado larga (máx. {max} caracteres).",
    "faq.remove_guild_only": "`/faq remove` solo puede usarse en un servidor.",
    "faq.action_guild_only": "`/faq add/remove` solo puede usarse en un servidor.",
    "faq.cannot_resolve_permissions":
      "No se pudieron resolver tus permisos en este servidor.",
    "faq.need_manage_server":
      "Necesitas Gestionar servidor o Administrador para hacer eso.",
    "admin.no_permission":
      "No tienes permiso para usar comandos de moderación. Los usuarios permitidos se configuran en `.env` (ADMIN_USER_IDS) o con roles de moderador con `/config moderator-role`.",
    "admin.missing_permissions":
      "Me faltan permisos necesarios. Revisa los permisos de mi rol y que mi rol esté por encima del del usuario objetivo.",
    "admin.interaction_expired":
      "Tardó demasiado y Discord cerró el comando. Intenta de nuevo.",
    "admin.command_failed":
      "El comando de moderación no se completó. Revisa mis permisos y la posición de mi rol.",
  },
  de: {
    "rate_limit.try_again": "Versuche es in {seconds}s erneut",
    "rate_limit.slow_down": "Langsamer!",
    "rate_limit.cooldown_full":
      "⏱️ Langsamer! Versuche in **{seconds}** Sekunden erneut (Limit: {cooldownSec}s).",
    "error.generic": "Das hat nicht funktioniert. Versuche es in einem Moment erneut.",
    "error.api_unavailable": "Die API ist vorübergehend nicht verfügbar.",
    "error.interaction_failed":
      "Der Befehl wurde nicht ausgeführt. Versuche es in einem Moment erneut.",
    "quote.saved": "Zitat #{id} gespeichert!",
    "suggestion.posted": "Vorschlag eingereicht.",
    "help.no_commands": "Keine Befehle gefunden.",
    "common.guild_only": "Dieser Befehl kann nur auf einem Server verwendet werden.",
    "quotes.guild_only": "Zitate können nur auf einem Server verwendet werden!",
    "faq.key_empty": "Der Schlüssel darf nicht leer sein.",
    "faq.title_empty": "Der Titel darf nicht leer sein.",
    "faq.body_empty": "Der Inhalt darf nicht leer sein.",
    "faq.key_too_long": "Der Schlüssel ist zu lang (max. {max} Zeichen).",
    "faq.remove_guild_only": "`/faq remove` kann nur auf einem Server verwendet werden.",
    "faq.action_guild_only":
      "`/faq add/remove` kann nur auf einem Server verwendet werden.",
    "faq.cannot_resolve_permissions":
      "Deine Berechtigungen für diesen Server konnten nicht ermittelt werden.",
    "faq.need_manage_server": "Du brauchst Server verwalten oder Administrator dafür.",
    "admin.no_permission":
      "Du hast keine Berechtigung für Moderationsbefehle. Erlaubte Nutzer werden in `.env` (ADMIN_USER_IDS) oder über Moderatorrollen mit `/config moderator-role` festgelegt.",
    "admin.missing_permissions":
      "Mir fehlen erforderliche Berechtigungen. Prüfe meine Rollenberechtigungen und dass meine Rolle über der des Zielnutzers steht.",
    "admin.interaction_expired":
      "Das hat zu lange gedauert, Discord hat den Befehl abgebrochen. Versuche es erneut.",
    "admin.command_failed":
      "Der Moderationsbefehl wurde nicht ausgeführt. Prüfe meine Berechtigungen und meine Rollenposition.",
  },
};

/**
 * Get a translated string for the given key.
 * Falls back to English if locale or key is missing.
 */
export function t(
  key: string,
  locale: Locale = DEFAULT_LOCALE,
  vars?: Record<string, string | number>,
): string {
  const localeMap = translations[locale] ?? translations.en;
  let str = localeMap[key] ?? translations.en[key] ?? key;

  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return str;
}

/**
 * Map Discord locale (e.g. "en-US", "es-ES") to our Locale type.
 */
function discordLocaleToLocale(discordLocale: string | null): Locale {
  if (!discordLocale) return DEFAULT_LOCALE;
  const prefix = discordLocale.split("-")[0].toLowerCase();
  if (prefix === "es") return "es";
  if (prefix === "de") return "de";
  return "en";
}

/**
 * Resolve locale from Discord guild preference or interaction.
 */
export function resolveLocale(guildLocale?: string | null): Locale {
  return guildLocale ? discordLocaleToLocale(guildLocale) : DEFAULT_LOCALE;
}
