// src/commands/fun/subcommands/weather.ts

import type { ChatInputCommandInteraction } from "discord.js";
import { logger } from "../../../../../../utils/logger.js";
import type { WeatherMode } from "../../../../../../services/integrations/weather/types.js";
import { fetchWeatherBundle } from "../../../../../../services/integrations/weather/forecast.js";

function weatherEmoji(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("thunder")) return "🌩️";
  if (t.includes("snow") || t.includes("sleet") || t.includes("blizzard")) return "❄️";
  if (t.includes("rain") || t.includes("shower") || t.includes("drizzle")) return "🌧️";
  if (t.includes("fog") || t.includes("mist") || t.includes("haze")) return "🌫️";
  if (t.includes("cloud") || t.includes("overcast")) return "☁️";
  if (t.includes("sun") || t.includes("clear")) return "☀️";
  return "🌤️";
}

function friendlyWeatherError(err: unknown): string {
  const msg = err instanceof Error ? err.message : "Unknown error";

  if (msg.includes("Circuit") && msg.includes("open")) {
    return "Weather API is temporarily unavailable. Try again in a minute.";
  }
  if (msg.toLowerCase().includes("missing weatherapi_key")) {
    return "Weather is not configured (missing WEATHERAPI_KEY). Ask an admin to set it in `.env`.";
  }

  if (msg.toLowerCase().includes("auth error")) {
    return "Weather is misconfigured (bad WEATHERAPI_KEY). Ask an admin to fix `.env`.";
  }

  if (msg.toLowerCase().includes("rejected the location")) {
    return "I could not find that location. Try a ZIP, city, or `City, ST`.";
  }

  if (msg.toLowerCase().includes("rate limit")) {
    return "WeatherAPI rate limit hit. Try again in a bit.";
  }

  return "Weather API is being dramatic. Try again later.";
}

export async function run(
  interaction: ChatInputCommandInteraction,
  mode: WeatherMode,
): Promise<void> {
  try {
    const days = mode.kind === "daily" ? 1 : 7;

    const bundle = await fetchWeatherBundle({
      location: mode.location,
      unit: mode.unit,
      days,
    });

    const header = `📍 **${bundle.placeLabel}**`;

    const nowBlock: string[] = [];
    if (bundle.now) {
      const nowEmoji = weatherEmoji(bundle.now.condition);
      const wind = bundle.now.wind ? ` • Wind: ${bundle.now.wind}` : "";
      const hum = bundle.now.humidity ? ` • Humidity: ${bundle.now.humidity}` : "";
      const feels = bundle.now.feelsLike ? ` • Feels like: ${bundle.now.feelsLike}` : "";

      nowBlock.push(
        `${nowEmoji} Now: **${bundle.now.temp}** • ${bundle.now.condition}${feels}${wind}${hum}`,
      );
      if (bundle.now.asOf) {
        nowBlock.push(
          `As of: ${bundle.now.asOf}${bundle.tzId ? ` (${bundle.tzId})` : ""}`,
        );
      }
    }

    if (mode.kind === "daily") {
      const today = bundle.days[0];
      if (!today) {
        await interaction.editReply(`${header}\nNo forecast data available right now.`);
        return;
      }

      const emoji = weatherEmoji(today.condition);
      const pop = today.pop ? `☔ ${today.pop}` : "";
      const astro =
        today.sunrise || today.sunset
          ? `Sunrise: ${today.sunrise ?? "N/A"} • Sunset: ${today.sunset ?? "N/A"}`
          : "";

      const lines: string[] = [];
      lines.push(header);
      lines.push("");
      if (nowBlock.length) {
        lines.push(...nowBlock);
        lines.push("");
      }
      lines.push(`${emoji} **Today**`);
      lines.push(`🌡️ ${today.temp}${pop ? ` • ${pop}` : ""}`);
      if (astro) lines.push(astro);

      await interaction.editReply(lines.join("\n"));
      return;
    }

    // 7-day
    const lines: string[] = [];
    lines.push(header);
    lines.push("");
    if (nowBlock.length) {
      lines.push(...nowBlock);
      lines.push("");
    }

    lines.push("📆 **7-Day Forecast**");
    lines.push("");

    for (const d of bundle.days.slice(0, 7)) {
      const emoji = weatherEmoji(d.condition);
      const pop = d.pop ? ` • ☔ ${d.pop}` : "";
      lines.push(`${emoji} **${d.label}**: ${d.temp}${pop}`);
      if (d.sunrise || d.sunset) {
        lines.push(`Sunrise: ${d.sunrise ?? "N/A"} • Sunset: ${d.sunset ?? "N/A"}`);
      }
      lines.push("");
    }

    // remove trailing blank line
    while (lines.length && lines[lines.length - 1] === "") lines.pop();

    await interaction.editReply(lines.join("\n"));

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
    await interaction.editReply(friendlyWeatherError(err));
  }
}
