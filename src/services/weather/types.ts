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

/* -------------------------------------------------------------------------- */
/* Legacy (NWS)                                                               */
/* Kept intentionally so old code references do not break during transition.  */
/* Not used by the WeatherAPI.com path.                                       */
/* -------------------------------------------------------------------------- */

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

export type NwsForecastResponse = {
  properties?: {
    periods?: Array<{
      name?: string;
      startTime?: string;
      isDaytime?: boolean;
      temperature?: number;
      temperatureUnit?: string; // usually "F" or "C"
      shortForecast?: string;
      detailedForecast?: string;
      probabilityOfPrecipitation?: { value: number | null } | null;
    }>;
  };
};