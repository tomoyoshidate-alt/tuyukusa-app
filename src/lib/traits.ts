/** Mirrors profiles.traits — stored locally until Supabase auth sync is wired. */
export type TraitsLocation = {
  city: string;
  lat: number;
  lon: number;
};

export type UserTraits = {
  location?: TraitsLocation;
  /** 体質メモ（花粉症モジュール等で参照） */
  constitution?: string;
};

export const TRAITS_STORAGE_KEY = "tuyukusa-user-traits";

export const DEFAULT_CHOFU_LOCATION: TraitsLocation = {
  city: "調布市",
  lat: 35.6506,
  lon: 139.5407,
};

export const INITIAL_USER_TRAITS: UserTraits = {};

export function normalizeUserTraits(data: unknown): UserTraits {
  if (!data || typeof data !== "object") return { ...INITIAL_USER_TRAITS };
  const d = data as Partial<UserTraits>;
  let location: TraitsLocation | undefined;
  if (d.location && typeof d.location === "object") {
    const loc = d.location as Partial<TraitsLocation>;
    if (typeof loc.lat === "number" && typeof loc.lon === "number") {
      location = {
        city: typeof loc.city === "string" ? loc.city.trim() : DEFAULT_CHOFU_LOCATION.city,
        lat: loc.lat,
        lon: loc.lon,
      };
    }
  }
  return {
    location,
    constitution: typeof d.constitution === "string" ? d.constitution.trim() : undefined,
  };
}

export function loadUserTraits(): UserTraits {
  if (typeof window === "undefined") return { ...INITIAL_USER_TRAITS };
  try {
    const raw = localStorage.getItem(TRAITS_STORAGE_KEY);
    if (raw) return normalizeUserTraits(JSON.parse(raw));
  } catch {
    /* ignore */
  }
  return { ...INITIAL_USER_TRAITS };
}

export function saveUserTraits(traits: UserTraits): UserTraits {
  const normalized = normalizeUserTraits(traits);
  if (typeof window !== "undefined") {
    localStorage.setItem(TRAITS_STORAGE_KEY, JSON.stringify(normalized));
  }
  return normalized;
}

export function getEffectiveLocation(traits?: UserTraits): TraitsLocation {
  return traits?.location ?? DEFAULT_CHOFU_LOCATION;
}
