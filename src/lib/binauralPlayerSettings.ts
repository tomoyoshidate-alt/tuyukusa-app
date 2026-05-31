import type { BinauralBeatPreset } from "@/src/lib/binauralBeats";

export type BaseKey = "C" | "Am";

export const BASE_KEY_FREQUENCIES: Record<BaseKey, number> = {
  C: 261.63,
  Am: 220.0,
};

export const BASE_KEY_LABELS: Record<BaseKey, string> = {
  C: "C（明るい・安定）",
  Am: "Am（深み・内省）",
};

export type BinauralPlayerSettings = {
  baseKey: BaseKey;
  fadeSec: number;
};

const STORAGE_KEY = "tuyukusa-bb-player-settings";

const DEFAULTS: BinauralPlayerSettings = {
  baseKey: "C",
  fadeSec: 5,
};

export function readBinauralPlayerSettings(): BinauralPlayerSettings {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const data = JSON.parse(raw) as Partial<BinauralPlayerSettings>;
    const baseKey = data.baseKey === "Am" ? "Am" : "C";
    const fadeSec =
      typeof data.fadeSec === "number"
        ? Math.max(0, Math.min(30, Math.round(data.fadeSec)))
        : DEFAULTS.fadeSec;
    return { baseKey, fadeSec };
  } catch {
    return { ...DEFAULTS };
  }
}

export function writeBinauralPlayerSettings(partial: Partial<BinauralPlayerSettings>): BinauralPlayerSettings {
  const next = { ...readBinauralPlayerSettings(), ...partial };
  if (partial.fadeSec !== undefined) {
    next.fadeSec = Math.max(0, Math.min(30, Math.round(partial.fadeSec)));
  }
  if (partial.baseKey !== undefined) {
    next.baseKey = partial.baseKey === "Am" ? "Am" : "C";
  }
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }
  return next;
}

/** Left = base key frequency; right = base + beat difference. */
export function resolveBeatPreset(preset: BinauralBeatPreset, baseKey: BaseKey): BinauralBeatPreset {
  const carrierHz = BASE_KEY_FREQUENCIES[baseKey];
  return {
    ...preset,
    carrierHz,
  };
}

export function formatBeatFrequencies(preset: BinauralBeatPreset, baseKey: BaseKey): string {
  const resolved = resolveBeatPreset(preset, baseKey);
  const left = resolved.carrierHz.toFixed(1);
  const right = (resolved.carrierHz + resolved.beatHz).toFixed(1);
  return `L ${left}Hz · R ${right}Hz（差分 ${resolved.beatHz}Hz）`;
}
