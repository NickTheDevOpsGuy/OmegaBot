// src/services/weather/types.ts

/**
 * Temperature unit preference.
 */
export type TempUnit = "f" | "c";

/**
 * Execution modes for the weather command.
 */
export type WeatherMode =
  | { kind: "daily"; location: string; unit: TempUnit }
  | { kind: "7day"; location: string; unit: TempUnit };

/**
 * A resolved geographic point returned from geocoding.
 * This is what forecast fetchers consume.
 */
export type WeatherPoint = {
  lat: number;
  lon: number;
  label: string;

  /**
   * Fully qualified NWS forecast endpoint URL.
   * Example:
   * https://api.weather.gov/gridpoints/BOX/65,72/forecast
   */
  forecastUrl: string;
};
