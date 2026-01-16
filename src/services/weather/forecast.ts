// src/services/weather/forecast.ts

import { logger } from "../../utils/logger.js";
import type { TempUnit } from "../../services/weather/types.js";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type WeatherApiResponse = {
  location?: {
    name?: string;
    region?: string;
    country?: string;
    tz_id?: string;
    localtime?: string; // "2026-01-16 10:18"
  };
  current?: {
    last_updated?: string;
    temp_f?: number;
    temp_c?: number;
    feelslike_f?: number;
    feelslike_c?: number;
    condition?: { text?: string };
    wind_mph?: number;
    wind_kph?: number;
    wind_dir?: string;
    humidity?: number;
  };
  forecast?: {
    forecastday?: Array<{
      date?: string;
      day?: {
        maxtemp_f?: number;
        maxtemp_c?: number;
        mintemp_f?: number;
        mintemp_c?: number;
        daily_chance_of_rain?: number;
        daily_chance_of_snow?: number;
        condition?: { text?: string };
      };
      astro?: {
        sunrise?: string;
        sunset?: string;
      };
    }>;
  };
};

// IMPORTANT: forecastday is optional, so strip undefined before indexing
type ForecastDay = NonNullable<
  NonNullable<WeatherApiResponse["forecast"]>["forecastday"]
>[number];

export type WeatherNow = {
  temp: string;
  feelsLike?: string;
  condition: string;
  asOf?: string;
  humidity?: string;
  wind?: string;
};

export type WeatherDay = {
  label: string;
  temp: string;
  pop?: string;
  condition: string;
  sunrise?: string;
  sunset?: string;
};

export type WeatherBundle = {
  placeLabel: string;
  tzId?: string;
  localTime?: string;
  now?: WeatherNow;
  days: WeatherDay[];
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function requireWeatherApiKey(): string {
  const key = process.env.WEATHERAPI_KEY?.trim();
  if (!key) {
    throw new Error("Missing WEATHERAPI_KEY. Set it in .env (WEATHERAPI_KEY=...).");
  }
  return key;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readApiErrorMessage(data: unknown): string | null {
  const root = isRecord(data) ? data : null;
  const err = root && isRecord(root.error) ? root.error : null;
  const msg = err && typeof err.message === "string" ? err.message : null;
  return msg ?? null;
}

function pickTemp(unit: TempUnit, f?: number, c?: number): string | null {
  if (unit === "c") {
    return typeof c === "number" && Number.isFinite(c) ? `${Math.round(c)}°C` : null;
  }
  return typeof f === "number" && Number.isFinite(f) ? `${Math.round(f)}°F` : null;
}

function formatWind(
  unit: TempUnit,
  dir?: string,
  mph?: number,
  kph?: number,
): string | null {
  const d = dir?.trim();

  if (unit === "c") {
    if (typeof kph === "number" && Number.isFinite(kph)) {
      return d ? `${d} ${Math.round(kph)} kph` : `${Math.round(kph)} kph`;
    }
    return null;
  }

  if (typeof mph === "number" && Number.isFinite(mph)) {
    return d ? `${d} ${Math.round(mph)} mph` : `${Math.round(mph)} mph`;
  }
  return null;
}

function buildPlaceLabel(loc: WeatherApiResponse["location"] | undefined): string {
  const name = loc?.name?.trim();
  const region = loc?.region?.trim();
  const country = loc?.country?.trim();

  const bits = [name, region].filter(Boolean);
  if (bits.length) return bits.join(", ");

  return country ?? "Unknown location";
}

function dailyPopString(item: ForecastDay | undefined): string | null {
  if (!item?.day) return null;

  const rain = item.day.daily_chance_of_rain;
  const snow = item.day.daily_chance_of_snow;

  const r = typeof rain === "number" && Number.isFinite(rain) ? rain : null;
  const s = typeof snow === "number" && Number.isFinite(snow) ? snow : null;

  const best = [r, s]
    .filter((x): x is number => typeof x === "number")
    .sort((a, b) => b - a)[0];

  return typeof best === "number" ? `${Math.round(best)}%` : null;
}

/* -------------------------------------------------------------------------- */
/* Main fetch                                                                 */
/* -------------------------------------------------------------------------- */

export async function fetchWeatherBundle(args: {
  location: string;
  unit: TempUnit;
  days: number;
}): Promise<WeatherBundle> {
  const key = requireWeatherApiKey();

  const q = args.location.trim();
  if (!q) throw new Error("Location cannot be empty.");

  const safeDays = Math.max(1, Math.min(args.days, 10));

  const url =
    `https://api.weatherapi.com/v1/forecast.json` +
    `?key=${encodeURIComponent(key)}` +
    `&q=${encodeURIComponent(q)}` +
    `&days=${encodeURIComponent(String(safeDays))}` +
    `&aqi=no&alerts=no`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "OmegaBot",
    },
  });

  const raw = await res.text();
  let parsed: WeatherApiResponse | null = null;

  try {
    parsed = JSON.parse(raw) as WeatherApiResponse;
  } catch {
    parsed = null;
  }

  if (!res.ok) {
    const msg = readApiErrorMessage(parsed) ?? res.statusText ?? "Unknown error";

    if (res.status === 401 || res.status === 403) {
      throw new Error(`WeatherAPI auth error (${res.status}). Check WEATHERAPI_KEY. ${msg}`);
    }
    if (res.status === 400) {
      throw new Error(`WeatherAPI rejected the location. ${msg}`);
    }
    if (res.status === 429) {
      throw new Error("WeatherAPI rate limit hit. Try again in a bit.");
    }

    throw new Error(`WeatherAPI error (${res.status}): ${msg}`);
  }

  const placeLabel = buildPlaceLabel(parsed?.location);
  const tzId = parsed?.location?.tz_id;
  const localTime = parsed?.location?.localtime;

  const nowTemp = pickTemp(args.unit, parsed?.current?.temp_f, parsed?.current?.temp_c);
  const feels = pickTemp(args.unit, parsed?.current?.feelslike_f, parsed?.current?.feelslike_c);

  const now: WeatherNow | undefined = nowTemp
    ? {
        temp: nowTemp,
        feelsLike: feels ?? undefined,
        condition: parsed?.current?.condition?.text?.trim() ?? "Unknown",
        asOf: parsed?.current?.last_updated,
        humidity:
          typeof parsed?.current?.humidity === "number"
            ? `${parsed.current.humidity}%`
            : undefined,
        wind:
          formatWind(
            args.unit,
            parsed?.current?.wind_dir,
            parsed?.current?.wind_mph,
            parsed?.current?.wind_kph,
          ) ?? undefined,
      }
    : undefined;

  const days: WeatherDay[] = [];
  const fd: ForecastDay[] = parsed?.forecast?.forecastday ?? [];

  for (let i = 0; i < fd.length; i += 1) {
    const item = fd[i];
    const label = i === 0 ? "Today" : item.date ?? `Day ${i + 1}`;

    const max = pickTemp(args.unit, item.day?.maxtemp_f, item.day?.maxtemp_c);
    const min = pickTemp(args.unit, item.day?.mintemp_f, item.day?.mintemp_c);
    const temp = max && min ? `${min} to ${max}` : max ?? min ?? "N/A";

    days.push({
      label,
      temp,
      condition: item.day?.condition?.text?.trim() ?? "Forecast unavailable",
      pop: dailyPopString(item) ?? undefined,
      sunrise: item.astro?.sunrise,
      sunset: item.astro?.sunset,
    });
  }

  logger.debug(
    { q, placeLabel, tzId, localTime, days: days.length },
    "[weather] weather bundle fetched",
  );

  return { placeLabel, tzId, localTime, now, days };
}