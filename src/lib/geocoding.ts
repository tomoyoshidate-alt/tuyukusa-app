const OPEN_METEO_GEOCODING = "https://geocoding-api.open-meteo.com/v1/search";

export type GeocodingResult = {
  name: string;
  latitude: number;
  longitude: number;
  admin1?: string;
  country?: string;
};

export async function searchCity(query: string): Promise<GeocodingResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = new URL(OPEN_METEO_GEOCODING);
  url.searchParams.set("name", trimmed);
  url.searchParams.set("count", "8");
  url.searchParams.set("language", "ja");
  url.searchParams.set("format", "json");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);

  const data = (await res.json()) as {
    results?: Array<{
      name: string;
      latitude: number;
      longitude: number;
      admin1?: string;
      country?: string;
    }>;
  };

  return (data.results ?? []).map(r => ({
    name: r.admin1 ? `${r.name}（${r.admin1}）` : r.name,
    latitude: r.latitude,
    longitude: r.longitude,
    admin1: r.admin1,
    country: r.country,
  }));
}

export function formatGeocodingLabel(result: GeocodingResult): string {
  return result.name;
}
