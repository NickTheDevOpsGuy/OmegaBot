// src/i18n/index.ts
// i18n for future localization. Add locale files under src/i18n/locales/{locale}.ts

export type Locale = "en" | "es" | "de"; // extend as needed

const DEFAULT_LOCALE: Locale = "en";

const translations: Record<Locale, Record<string, string>> = {
  en: {
    "rate_limit.try_again": "Try again in {seconds}s",
    "rate_limit.slow_down": "Slow down!",
    "error.generic": "Something went wrong. Try again later.",
    "error.api_unavailable": "API is temporarily unavailable. Try again in a minute.",
    "error.interaction_failed": "Something went wrong. Try again later.",
    "quote.saved": "Quote #{id} saved!",
    "suggestion.posted": "Suggestion posted.",
    "help.no_commands": "No commands found. Check the command loader.",
  },
  es: {
    "rate_limit.try_again": "Intenta de nuevo en {seconds}s",
    "rate_limit.slow_down": "¡Más despacio!",
    "error.generic": "Algo salió mal. Intenta de nuevo más tarde.",
    "error.api_unavailable": "La API no está disponible. Intenta en un minuto.",
    "error.interaction_failed": "Algo salió mal. Intenta de nuevo más tarde.",
    "quote.saved": "¡Cita #{id} guardada!",
    "suggestion.posted": "Sugerencia publicada.",
    "help.no_commands": "No se encontraron comandos.",
  },
  de: {
    "rate_limit.try_again": "Versuche es in {seconds}s erneut",
    "rate_limit.slow_down": "Langsamer!",
    "error.generic": "Etwas ist schiefgelaufen. Versuche es später erneut.",
    "error.api_unavailable": "Die API ist vorübergehend nicht verfügbar.",
    "error.interaction_failed": "Etwas ist schiefgelaufen. Versuche es später erneut.",
    "quote.saved": "Zitat #{id} gespeichert!",
    "suggestion.posted": "Vorschlag eingereicht.",
    "help.no_commands": "Keine Befehle gefunden.",
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
 * Resolve locale from Discord guild preference or user preference.
 * For now returns default; extend with guild_config or user settings.
 */
export function resolveLocale(/* guildId?: string, userId?: string */): Locale {
  return DEFAULT_LOCALE;
}
