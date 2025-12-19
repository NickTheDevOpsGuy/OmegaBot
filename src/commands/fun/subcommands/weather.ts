// src/commands/fun/subcommands/weather.ts

import type { ChatInputCommandInteraction } from "discord.js";
import { logger } from "../../../utils/logger.js";
import type { WeatherMode, TempUnit } from "../../../services/weather/types.js";
import { geocodeLocation } from "../../../services/weather/geocode.js";
import { fetchForecast } from "../../../services/weather/forecast.js";

/**
 * Run handler for /fun weather
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
    const forecast = await fetchForecast(point);

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
/*                               FORMATTERS                                   */
/* -------------------------------------------------------------------------- */

function formatTemp(celsius: number, unit: TempUnit): string {
  return unit === "f"
    ? `${Math.round((celsius * 9) / 5 + 32)}°F`
    : `${Math.round(celsius)}°C`;
}

function weatherEmoji(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code <= 45) return "☁️";
  if (code <= 65) return "🌧️";
  if (code <= 75) return "❄️";
  return "🌩️";
}

function formatDaily(label: string, forecast: any, unit: TempUnit): string {
  const day = forecast.daily;

  const emoji = weatherEmoji(day.weathercode[0]);
  const min = formatTemp(day.temperature_2m_min[0], unit);
  const max = formatTemp(day.temperature_2m_max[0], unit);

  const rain = day.precipitation_probability_max?.[0] ?? 0;

  return [
    `📍 **${label}**`,
    `${emoji} **Today**`,
    `🌡️ ${min} → ${max}`,
    `☔ ${rain}%`,
  ].join("\n");
}

function format7Day(label: string, forecast: any, unit: TempUnit): string {
  const lines: string[] = [`📍 **${label}**`, "📆 **7-Day Forecast**"];

  for (let i = 0; i < 7; i++) {
    const emoji = weatherEmoji(forecast.daily.weathercode[i]);
    const min = formatTemp(forecast.daily.temperature_2m_min[i], unit);
    const max = formatTemp(forecast.daily.temperature_2m_max[i], unit);
    const rain = forecast.daily.precipitation_probability_max?.[i] ?? 0;
    const date = forecast.daily.time[i];

    lines.push(`${emoji} ${date}: ${min} → ${max} ☔ ${rain}%`);
  }

  return lines.join("\n");
}
