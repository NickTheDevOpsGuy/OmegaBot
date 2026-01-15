// src/commands/fun/subcommands/weather.ts

import type { ChatInputCommandInteraction } from "discord.js";
import { logger } from "../../../utils/logger.js";
import type {
  WeatherMode,
  TempUnit,
  NwsForecastResponse,
} from "../../../services/weather/types.js";
import { geocodeLocation } from "../../../services/weather/geocode.js";
import { fetchForecast } from "../../../services/weather/forecast.js";

/**
 * Run handler for /fun weather and /fun weather7
 *
 * IMPORTANT:
 * - NOT a slash command by itself
 * - Must NOT call reply() or deferReply()
 * - Parent command owns the interaction lifecycle
 */
export async function run(
  interaction: ChatInputCommandInteraction,
  mode: WeatherMode,
): Promise<void> {
  try {
    const point = await geocodeLocation(mode.location);
    const forecast = (await fetchForecast(point)) as NwsForecastResponse;

    const text =
      mode.kind === "daily"
        ? formatDaily(point.label, forecast, mode.unit)
        : format7Day(point.label, forecast, mode.unit);

    await interaction.editReply(text);

    logger.debug(
      {
        userId: interaction.user.id,
        mode: mode.kind,
        unit: mode.unit,
        location: mode.location,
      },
      "[fun/weather] sent",
    );
  } catch (err) {
    logger.error({ err, mode }, "[fun/weather] failed");
    await interaction.editReply("🌩️ Weather API is being dramatic. Try again later.");
  }
}

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

type NwsPeriod = {
  name?: string;
  startTime?: string;
  isDaytime?: boolean;
  temperature?: number;
  temperatureUnit?: string; // "F" or "C" typically
  shortForecast?: string;
  detailedForecast?: string;
  probabilityOfPrecipitation?: { value: number | null } | null;
};

function getPeriods(forecast: NwsForecastResponse): NwsPeriod[] {
  const periods = forecast?.properties?.periods;
  return Array.isArray(periods) ? (periods as NwsPeriod[]) : [];
}

/* -------------------------------------------------------------------------- */
/*                                 FORMATTERS                                 */
/* -------------------------------------------------------------------------- */

function toC(f: number): number {
  return (f - 32) * (5 / 9);
}

function toF(c: number): number {
  return c * (9 / 5) + 32;
}

function formatTemp(
  value: number,
  fromUnit: string | undefined,
  target: TempUnit,
): string {
  const from = (fromUnit ?? "F").toUpperCase();

  // target is "f" | "c"
  if (target === "f") {
    const f = from === "C" ? toF(value) : value;
    return `${Math.round(f)}°F`;
  }

  const c = from === "F" ? toC(value) : value;
  return `${Math.round(c)}°C`;
}

function forecastEmoji(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("thunder")) return "🌩️";
  if (t.includes("snow") || t.includes("flurr")) return "❄️";
  if (t.includes("rain") || t.includes("shower") || t.includes("drizzle")) return "🌧️";
  if (t.includes("cloud")) return "☁️";
  if (t.includes("sun") || t.includes("clear")) return "☀️";
  if (t.includes("fog") || t.includes("haze")) return "🌫️";
  return "🌤️";
}

function safePop(period: NwsPeriod): number {
  const v = period.probabilityOfPrecipitation?.value;
  return typeof v === "number" ? v : 0;
}

function formatDaily(
  label: string,
  forecast: NwsForecastResponse,
  unit: TempUnit,
): string {
  const periods = getPeriods(forecast);

  if (periods.length === 0) {
    return `📍 **${label}**\nNo forecast data available right now.`;
  }

  const p = periods[0];

  const name = p.name ?? "Today";
  const short = p.shortForecast ?? "Forecast unavailable";
  const emoji = forecastEmoji(short);

  const temp =
    typeof p.temperature === "number"
      ? formatTemp(p.temperature, p.temperatureUnit, unit)
      : "N/A";

  const pop = safePop(p);

  const details = p.detailedForecast ?? short;

  return [
    `📍 **${label}**`,
    `${emoji} **${name}**`,
    `🌡️ ${temp}`,
    `☔ ${pop}%`,
    "",
    details,
  ].join("\n");
}

function format7Day(
  label: string,
  forecast: NwsForecastResponse,
  unit: TempUnit,
): string {
  const periods = getPeriods(forecast);

  if (periods.length === 0) {
    return `📍 **${label}**\nNo forecast data available right now.`;
  }

  // Prefer daytime periods for a cleaner "7 day" list.
  const dayPeriods = periods.filter((p) => p.isDaytime === true);
  const list = (dayPeriods.length ? dayPeriods : periods).slice(0, 7);

  const lines: string[] = [`📍 **${label}**`, "📆 **7-Day Forecast**"];

  for (const p of list) {
    const name = p.name ?? "Day";
    const short = p.shortForecast ?? "Forecast unavailable";
    const emoji = forecastEmoji(short);

    const temp =
      typeof p.temperature === "number"
        ? formatTemp(p.temperature, p.temperatureUnit, unit)
        : "N/A";

    const pop = safePop(p);

    lines.push(`${emoji} **${name}**: ${temp} ☔ ${pop}%`);
  }

  return lines.join("\n");
}
