import type { PollenLevel } from "./types";

/**
 * 花粉レベル推定（スタブ）。
 * 将来有償API（例: 環境省・民間花粉予報API）に差し替え可能な構造。
 * 現状は月（スギ・ヒノキ 2〜4月、ブタクサ 9〜10月）＋風速・降水から推定。
 */
export async function getPollenLevel(
  _lat: number,
  _lon: number,
  date: Date,
  weather?: { windSpeed: number; precipitation: number }
): Promise<PollenLevel> {
  const month = date.getMonth() + 1;
  let score = 0;

  if (month >= 2 && month <= 4) score += 3;
  else if (month >= 9 && month <= 10) score += 2;

  const wind = weather?.windSpeed ?? 0;
  const rain = weather?.precipitation ?? 0;

  if (wind >= 5) score += 1;
  if (wind >= 10) score += 1;
  if (rain >= 0.5) score -= 1;
  if (rain >= 2) score -= 2;

  if (score <= 0) return "low";
  if (score === 1) return "moderate";
  if (score <= 3) return "high";
  return "very_high";
}
