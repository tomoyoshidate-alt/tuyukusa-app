export type RegionOption = {
  id: string;
  label: string;
  lat: number;
  lon: number;
};

export const REGION_OPTIONS: RegionOption[] = [
  { id: "tokyo", label: "東京", lat: 35.6812, lon: 139.7671 },
  { id: "osaka", label: "大阪", lat: 34.6937, lon: 135.5023 },
  { id: "nagoya", label: "名古屋", lat: 35.1815, lon: 136.9066 },
  { id: "sapporo", label: "札幌", lat: 43.0618, lon: 141.3545 },
  { id: "sendai", label: "仙台", lat: 38.2682, lon: 140.8694 },
  { id: "fukuoka", label: "福岡", lat: 33.5904, lon: 130.4017 },
  { id: "hiroshima", label: "広島", lat: 34.3853, lon: 132.4553 },
  { id: "naha", label: "那覇", lat: 26.2124, lon: 127.6809 },
];

export const DEFAULT_REGION_ID = "tokyo";

export function getRegionById(regionId: string): RegionOption {
  return REGION_OPTIONS.find(r => r.id === regionId) ?? REGION_OPTIONS[0];
}

export type LocationSettings = {
  regionId: string;
};

export const INITIAL_LOCATION_SETTINGS: LocationSettings = {
  regionId: DEFAULT_REGION_ID,
};

export function normalizeLocationSettings(data: unknown): LocationSettings {
  if (!data || typeof data !== "object") return INITIAL_LOCATION_SETTINGS;
  const d = data as Partial<LocationSettings>;
  const regionId =
    typeof d.regionId === "string" && REGION_OPTIONS.some(r => r.id === d.regionId)
      ? d.regionId
      : DEFAULT_REGION_ID;
  return { regionId };
}
