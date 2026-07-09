import type { WeatherSnapshot } from "./types";

const OPEN_METEO_FORECAST = "https://api.open-meteo.com/v1/forecast";

export async function getWeather(lat: number, lon: number): Promise<WeatherSnapshot> {
  const url = new URL(OPEN_METEO_FORECAST);
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set(
    "current",
    "temperature_2m,relative_humidity_2m,weather_code,precipitation,wind_speed_10m"
  );
  url.searchParams.set("timezone", "auto");

  const res = await fetch(url.toString(), { next: { revalidate: 900 } });
  if (!res.ok) throw new Error(`Open-Meteo weather failed: ${res.status}`);

  const data = (await res.json()) as {
    current?: {
      temperature_2m?: number;
      relative_humidity_2m?: number;
      weather_code?: number;
      precipitation?: number;
      wind_speed_10m?: number;
    };
  };

  const current = data.current ?? {};
  return {
    temperature: current.temperature_2m ?? 0,
    humidity: current.relative_humidity_2m ?? 0,
    windSpeed: current.wind_speed_10m ?? 0,
    precipitation: current.precipitation ?? 0,
    weatherCode: current.weather_code ?? 0,
  };
}
