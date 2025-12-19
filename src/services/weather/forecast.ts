// src/services/weather/forecast.ts

import { logger } from "../../utils/logger.js";
import type { TempUnit, WeatherPoint, WeatherMode } from "./types.js";

/**
 * NWS forecast response shape (trimmed to what we use).
 * Docs: https://www.weather.gov/documentation/services-web-api
 */
export type NwsForecastResponse = {
  properties?: {
    periods?: NwsPeriod[];
  };
};

export type NwsPeriod = {
  name?: string; // "Tonight", "Friday", etc.
  startTime?: string;
  endTime?: string;
  isDaytime?: boolean;
  temperature?: number;
  temperatureUnit?: "F" | "C";
  windSpeed?: string; // "5 to 10 mph"
  windDirection?: string; // "NW"
  shortForecast?: string; // "Partly Cloudy"
  detailedForecast?: string;
  probabilityOfPrecipitation?: {
    unitCode?: string;
    value?: number | null; // percent as number, can be null
  };
  relativeHumidity?: {
    value?: number | null;
  };
};

/**
 * Fetch forecast for a resolved weather point.
 * Expects point.forecastUrl to be a valid NWS forecast endpoint.
 */
export async function fetchForecast(point: WeatherPoint): Promise<NwsForecastResponse> {
  const res = await fetch(point.forecastUrl, {
    headers: {
      Accept: "application/geo+json, application/json",
      "User-Agent": "OmegaBot",
    },
  });

  if (!res.ok) {
    throw new Error(`NWS forecast error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as unknown;

  // Light validation so we fail with a useful message (not "cannot read 0")
  const periods = (data as any)?.properties?.periods;
  if (!Array.isArray(periods)) {
    logger.warn(
      { label: point.label, keys: Object.keys((data as any) ?? {}) },
      "[weather] forecast missing properties.periods",
    );
  }

  return data as NwsForecastResponse;
}

/**
 * Format a single “daily” style forecast (first available period).
 * This is used for /fun weather daily.
 */
export function formatDaily(
  label: string,
  forecast: NwsForecastResponse,
  unit: TempUnit,
): string {
  const periods = forecast?.properties?.periods;

  if (!Array.isArray(periods) || periods.length === 0) {
    return `🌦️ ${label}\nNo forecast periods returned. Try another location or try again later.`;
  }

  const p = periods[0];

  const name = p.name ?? "Forecast";
  const short = p.shortForecast ?? "Weather data available";
  const temp = formatTemp(p.temperature, p.temperatureUnit, unit);
  const wind = formatWind(p.windDirection, p.windSpeed);
  const pop = formatPop(p.probabilityOfPrecipitation?.value);

  return [
    `🌦️ **${label}**`,
    `🗓️ ${name}`,
    `📋 ${short}`,
    temp ? `🌡️ ${temp}` : null,
    wind ? `💨 ${wind}` : null,
    pop ? `☔ ${pop}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Format a simple 7-day style forecast (first 7-ish periods).
 * This is used for /fun weather 7day.
 */
export function format7Day(
  label: string,
  forecast: NwsForecastResponse,
  unit: TempUnit,
): string {
  const periods = forecast?.properties?.periods;

  if (!Array.isArray(periods) || periods.length === 0) {
    return `🌦️ ${label}\nNo forecast periods returned. Try another location or try again later.`;
  }

  const take = periods.slice(0, 7);

  const lines = take.map((p) => {
    const name = p.name ?? "Forecast";
    const short = p.shortForecast ?? "Weather";
    const temp = formatTemp(p.temperature, p.temperatureUnit, unit);
    const pop = formatPop(p.probabilityOfPrecipitation?.value);

    const bits = [
      `• **${name}**: ${short}`,
      temp ? `(${temp})` : null,
      pop ? `☔ ${pop}` : null,
    ].filter(Boolean);

    return bits.join(" ");
  });

  return [`🌦️ **${label}**`, ...lines].join("\n");
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatTemp(
  temp?: number,
  tempUnit?: "F" | "C",
  desired?: TempUnit,
): string | null {
  if (typeof temp !== "number" || !Number.isFinite(temp)) return null;

  // If API tells us the unit, convert if needed.
  if (tempUnit === "F" && desired === "c") {
    return `${fToC(temp)}°C`;
  }
  if (tempUnit === "C" && desired === "f") {
    return `${cToF(temp)}°F`;
  }

  // Otherwise, display as-is with best guess.
  const shownUnit = tempUnit ?? (desired === "c" ? "C" : "F");
  return `${Math.round(temp)}°${shownUnit}`;
}

function formatWind(dir?: string, speed?: string): string | null {
  const d = dir?.trim();
  const s = speed?.trim();
  if (!d && !s) return null;
  if (d && s) return `${d} ${s}`;
  return d ?? s ?? null;
}

/**
 * Probability of precipitation.
 * That "4%" you saw is usually "probabilityOfPrecipitation.value".
 */
function formatPop(value?: number | null): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return `${Math.round(value)}% chance`;
}

function fToC(f: number): number {
  return Math.round(((f - 32) * 5) / 9);
}

function cToF(c: number): number {
  return Math.round((c * 9) / 5 + 32);
}
