import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat and lon are required' }, { status: 400 });
  }

  const weatherRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,precipitation&hourly=temperature_2m,relative_humidity_2m,weather_code&daily=sunrise,sunset&forecast_days=1&timezone=Asia%2FTokyo`
  );
  const weather = await weatherRes.json();

  const now = new Date();
  const lunarAge = getLunarAge(now);
  const moonPhase = getMoonPhase(lunarAge);

  const hourly = (weather.hourly?.time ?? []).map((time: string, i: number) => ({
    hour: new Date(time).getHours(),
    temperature: weather.hourly.temperature_2m[i] as number,
    humidity: weather.hourly.relative_humidity_2m[i] as number,
    weatherCode: weather.hourly.weather_code[i] as number,
  }));

  const sunriseRaw = weather.daily?.sunrise?.[0] as string | undefined;
  const sunsetRaw = weather.daily?.sunset?.[0] as string | undefined;

  return NextResponse.json({
    temperature: weather.current.temperature_2m,
    humidity: weather.current.relative_humidity_2m,
    weatherCode: weather.current.weather_code,
    precipitation: weather.current.precipitation,
    moonAge: lunarAge,
    moonPhase: moonPhase,
    sunrise: formatSunTime(sunriseRaw),
    sunset: formatSunTime(sunsetRaw),
    hourly,
  });
}

function formatSunTime(iso: string | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Tokyo" });
}

function getLunarAge(date: Date): number {
  const knownNewMoon = new Date('2024-01-11T11:57:00Z');
  const lunarCycle = 29.53058867;
  const diff = (date.getTime() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24);
  return ((diff % lunarCycle) + lunarCycle) % lunarCycle;
}

function getMoonPhase(age: number): string {
  if (age < 1.85) return '新月';
  if (age < 7.38) return '三日月';
  if (age < 9.22) return '上弦の月';
  if (age < 12.92) return '十三夜';
  if (age < 14.77) return '満月';
  if (age < 18.48) return '十六夜';
  if (age < 22.15) return '下弦の月';
  if (age < 25.83) return '有明月';
  return '晦日月';
}
