// src/services/weather/geocode.ts

import type { WeatherPoint } from "./types.js";
import { logger } from "../../utils/logger.js";

type ZippopotamPlace = {
  latitude: string;
  longitude: string;
  "place name": string;
  "state abbreviation": string;
};

type ZippopotamResponse = {
  "post code": string;
  places: ZippopotamPlace[];
};

/**
 * Resolve a user-provided location into a WeatherPoint.
 *
 * Current behavior:
 * - If the input looks like a US ZIP, use Zippopotam.us to get lat/lon
 * - Then use NWS points endpoint to get the forecast URL
 */
export async function geocodeLocation(location: string): Promise<WeatherPoint> {
  const trimmed = location.trim();

  // Simple US ZIP detection (5 digits, optionally ZIP+4)
  const zipMatch = trimmed.match(/^\d{5}(-\d{4})?$/);
  if (!zipMatch) {
    throw new Error('Only US ZIP codes are supported right now (example: "02067").');
  }

  const zip = zipMatch[0];

  const geo = await geocodeZipUS(zip);
  const forecastUrl = await getNwsForecastUrl(geo.lat, geo.lon);

  return {
    lat: geo.lat,
    lon: geo.lon,
    label: geo.label,
    forecastUrl,
  };
}

type ZipGeo = { lat: number; lon: number; label: string };

async function geocodeZipUS(zip: string): Promise<ZipGeo> {
  const url = `https://api.zippopotam.us/us/${encodeURIComponent(zip)}`;
  const res = await fetch(url, { headers: { "User-Agent": "OmegaBot" } });

  if (!res.ok) {
    throw new Error(`ZIP not found: ${zip}`);
  }

  const data = (await res.json()) as ZippopotamResponse;
  const place = data.places?.[0];
  if (!place) {
    throw new Error(`No places for ZIP: ${zip}`);
  }

  const lat = Number(place.latitude);
  const lon = Number(place.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error(`Invalid lat/lon returned for ZIP: ${zip}`);
  }

  return {
    lat,
    lon,
    label: `${place["place name"]}, ${place["state abbreviation"]} ${data["post code"]}`,
  };
}

async function getNwsForecastUrl(lat: number, lon: number): Promise<string> {
  const url = `https://api.weather.gov/points/${lat},${lon}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/geo+json",
      "User-Agent": "OmegaBot",
    },
  });

  if (!res.ok) {
    throw new Error(`NWS points error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as {
    properties?: { forecast?: string };
  };

  const forecastUrl = data.properties?.forecast;
  if (!forecastUrl) {
    throw new Error("NWS points response missing forecast URL");
  }

  logger.debug({ lat, lon, forecastUrl }, "[weather] resolved forecast url");
  return forecastUrl;
}
