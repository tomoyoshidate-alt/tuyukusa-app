export type PollenLevel = "low" | "moderate" | "high" | "very_high";

export type WeatherSnapshot = {
  temperature: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  weatherCode: number;
};

export type EnvironmentProvider = {
  getWeather(lat: number, lon: number): Promise<WeatherSnapshot>;
  getPollenLevel(
    lat: number,
    lon: number,
    date: Date,
    weather?: Pick<WeatherSnapshot, "windSpeed" | "precipitation">
  ): Promise<PollenLevel>;
};

export const POLLEN_LEVEL_LABELS: Record<PollenLevel, string> = {
  low: "低い",
  moderate: "やや多い",
  high: "多い",
  very_high: "非常に多い",
};
