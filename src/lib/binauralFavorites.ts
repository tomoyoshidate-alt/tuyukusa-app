import type { AmbientSoundId, BinauralBeatId, TimerMinutes } from "@/src/lib/binauralBeats";

export type BinauralFavorite = {
  id: string;
  name: string;
  beatId: BinauralBeatId;
  ambientId: AmbientSoundId;
  masterVolume: number;
  binauralVolume: number;
  ambientVolume: number;
  timerMinutes: TimerMinutes | null;
  createdAt: number;
};

export const BB_FAVORITES_STORAGE_KEY = "tuyukusa-bb-favorites";
export const BB_FAVORITES_MAX = 10;

export function normalizeBinauralFavorites(data: unknown): BinauralFavorite[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter(
      (item): item is BinauralFavorite =>
        !!item &&
        typeof item === "object" &&
        typeof (item as BinauralFavorite).id === "string" &&
        typeof (item as BinauralFavorite).name === "string" &&
        typeof (item as BinauralFavorite).beatId === "string" &&
        typeof (item as BinauralFavorite).ambientId === "string"
    )
    .slice(0, BB_FAVORITES_MAX);
}

export function readBinauralFavorites(): BinauralFavorite[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(BB_FAVORITES_STORAGE_KEY);
    return raw ? normalizeBinauralFavorites(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export function writeBinauralFavorites(favorites: BinauralFavorite[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      BB_FAVORITES_STORAGE_KEY,
      JSON.stringify(favorites.slice(0, BB_FAVORITES_MAX))
    );
  } catch {
    /* ignore */
  }
}
