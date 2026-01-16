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

    // Forecast (what you already had)
    const forecast = (await fetchForecast(point)) as NwsForecastResponse;

    // Current conditions best-effort (may be unavailable for some locations)
    const current = await fetchCurrentConditions(point, mode.unit);

    const text =
      mode.kind === "daily"
        ? formatDaily(point.label, forecast, mode.unit, current)
        : format7Day(point.label, forecast, mode.unit, current);

    await interaction.editReply(text);

    logger.debug(
      {
        userId: interaction.user.id,
        mode: mode.kind,
        unit: mode.unit,
        location: mode.location,
        hasCurrent: Boolean(current),
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

type CurrentConditions = {
  tempText: string; // already formatted in target unit
  shortText: string; // summary like "Clear" / "Overcast"
  windText: string; // e.g. "NE 7 mph"
  observedAt: string; // ISO string
};

function getPeriods(forecast: NwsForecastResponse): NwsPeriod[] {
  const periods = (forecast as unknown as { properties?: { periods?: unknown } })
    ?.properties?.periods;
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

function formatObservedTime(iso: string): string {
  // Keep it simple and local-looking without pulling in libs.
  // Discord users can interpret this easily.
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

/* -------------------------------------------------------------------------- */
/*                                  OUTPUT                                    */
/* -------------------------------------------------------------------------- */

function formatDaily(
  label: string,
  forecast: NwsForecastResponse,
  unit: TempUnit,
  current: CurrentConditions | null,
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

  const nowLine = current
    ? `Now: ${current.tempText} • ${current.shortText}${current.windText ? ` • Wind ${current.windText}` : ""}`
    : "";

  const observedLine = current ? `As of: ${formatObservedTime(current.observedAt)}` : "";

  return [
    `📍 **${label}**`,
    `${emoji} **${name}**`,
    `🌡️ ${temp}`,
    `☔ ${pop}%`,
    ...(nowLine ? [nowLine] : []),
    ...(observedLine ? [observedLine] : []),
    "",
    details,
  ].join("\n");
}

function format7Day(
  label: string,
  forecast: NwsForecastResponse,
  unit: TempUnit,
  current: CurrentConditions | null,
): string {
  const periods = getPeriods(forecast);

  if (periods.length === 0) {
    return `📍 **${label}**\nNo forecast data available right now.`;
  }

  const dayPeriods = periods.filter((p) => p.isDaytime === true);
  const list = (dayPeriods.length ? dayPeriods : periods).slice(0, 7);

  const lines: string[] = [`📍 **${label}**`];

  if (current) {
    const nowLine = `Now: ${current.tempText} • ${current.shortText}${current.windText ? ` • Wind ${current.windText}` : ""}`;
    lines.push(nowLine);
    lines.push(`As of: ${formatObservedTime(current.observedAt)}`);
  }

  lines.push("📆 **7-Day Forecast**");

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

/* -------------------------------------------------------------------------- */
/*                        CURRENT CONDITIONS (BEST EFFORT)                    */
/* -------------------------------------------------------------------------- */

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      Accept: "application/geo+json, application/json",
      "User-Agent": "OmegaBot",
    },
  });

  if (!res.ok) {
    throw new Error(`NWS error: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as T;
}

function pickNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

async function fetchCurrentConditions(
  point: unknown,
  unit: TempUnit,
): Promise<CurrentConditions | null> {
  try {
    // 1) Try to get observationStations URL from the geocode "point" (if your service provides it)
    const stationsUrlFromPoint =
      (point as { observationStationsUrl?: unknown }).observationStationsUrl ??
      (point as { stationsUrl?: unknown }).stationsUrl;

    let stationsUrl: string | null =
      typeof stationsUrlFromPoint === "string" && stationsUrlFromPoint.length > 0
        ? stationsUrlFromPoint
        : null;

    // 2) If we don't have it, try to derive it from lat/lon via api.weather.gov/points/{lat},{lon}
    if (!stationsUrl) {
      const lat =
        (point as { lat?: unknown }).lat ??
        (point as { latitude?: unknown }).latitude ??
        (point as { y?: unknown }).y;
      const lon =
        (point as { lon?: unknown }).lon ??
        (point as { lng?: unknown }).lng ??
        (point as { longitude?: unknown }).longitude ??
        (point as { x?: unknown }).x;

      const latNum = pickNumber(lat);
      const lonNum = pickNumber(lon);

      if (latNum === null || lonNum === null) {
        return null;
      }

      const pt = await fetchJson<{
        properties?: { observationStations?: string };
      }>(`https://api.weather.gov/points/${latNum},${lonNum}`);

      const obsStations = pt?.properties?.observationStations;
      if (typeof obsStations === "string" && obsStations.length > 0) {
        stationsUrl = obsStations;
      } else {
        return null;
      }
    }

    // 3) Fetch stations, pick first
    const stations = await fetchJson<{
      features?: Array<{ properties?: { stationIdentifier?: string } }>;
    }>(stationsUrl);

    const stationId =
      stations?.features?.[0]?.properties?.stationIdentifier &&
      typeof stations.features[0].properties.stationIdentifier === "string"
        ? stations.features[0].properties.stationIdentifier
        : null;

    if (!stationId) return null;

    // 4) Latest observation
    const obs = await fetchJson<{
      properties?: {
        timestamp?: string;
        textDescription?: string;
        temperature?: { value?: number | null; unitCode?: string };
        windSpeed?: { value?: number | null; unitCode?: string };
        windDirection?: { value?: number | null; unitCode?: string };
      };
    }>(`https://api.weather.gov/stations/${stationId}/observations/latest`);

    const props = obs?.properties;
    if (!props) return null;

    const observedAt =
      typeof props.timestamp === "string" && props.timestamp.length > 0
        ? props.timestamp
        : new Date().toISOString();

    const shortText =
      typeof props.textDescription === "string" && props.textDescription.length > 0
        ? props.textDescription
        : "Current conditions";

    // temperature.value is typically Celsius
    const tempC = props.temperature?.value;
    const tempNum = typeof tempC === "number" && Number.isFinite(tempC) ? tempC : null;

    const tempText =
      tempNum === null
        ? "N/A"
        : unit === "f"
          ? `${Math.round(toF(tempNum))}°F`
          : `${Math.round(tempNum)}°C`;

    // wind speed.value is typically in m/s
    const windMs = props.windSpeed?.value;
    const windNum = typeof windMs === "number" && Number.isFinite(windMs) ? windMs : null;

    const windMph = windNum === null ? null : Math.round(windNum * 2.236936); // m/s -> mph

    const windDirDeg = props.windDirection?.value;
    const windDirNum =
      typeof windDirDeg === "number" && Number.isFinite(windDirDeg) ? windDirDeg : null;

    const windDir = windDirNum === null ? "" : degreesToCardinal(windDirNum);

    const windText =
      windMph === null ? "" : windDir ? `${windDir} ${windMph} mph` : `${windMph} mph`;

    return {
      tempText,
      shortText,
      windText,
      observedAt,
    };
  } catch (err) {
    logger.debug({ err }, "[fun/weather] current conditions unavailable");
    return null;
  }
}

function degreesToCardinal(deg: number): string {
  // 16-wind compass
  const dirs = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  const normalized = ((deg % 360) + 360) % 360;
  const idx = Math.round(normalized / 22.5) % 16;
  return dirs[idx] ?? "N";
}
