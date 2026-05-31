import type { GranularParams } from "@/src/lib/soundSystem/types";
import type { BinauralBeatPreset } from "@/src/lib/binauralBeats";
import {
  fetchBbPresetsFromSupabase,
  fetchGranularPresetsFromSupabase,
  isSupabaseConfigured,
} from "@mac/lib/presetSupabase";

export type StudioBbPreset = {
  id: string;
  name: string;
  icon?: string;
  leftHz: number;
  rightHz: number;
  waveform?: "sine" | "square" | "triangle";
  fadeInSec?: number;
  fadeOutSec?: number;
  masterVolume?: number;
  memo?: string;
  updatedAt?: string;
};

export type StudioGranularPreset = {
  id: string;
  name: string;
  icon?: string;
  audioFile: string;
  grainSizeMs: number;
  grainDensity?: number;
  overlapPct: number;
  positionPct: number;
  randomnessPct: number;
  pitchSemis: number;
  lfoEnabled?: boolean;
  lfoSpeedHz?: number;
  lfoDepthSemis?: number;
  lfoWaveform?: "sine" | "triangle" | "random";
  reverbPct?: number;
  volume: number;
  memo?: string;
  updatedAt?: string;
};

export type StudioPresetStore<T> = { presets: T[] };

function brainwaveLabel(diffHz: number): string {
  if (diffHz < 4) return "δ波";
  if (diffHz < 8) return "θ波";
  if (diffHz < 13) return "α波";
  if (diffHz < 30) return "β波";
  return "γ波";
}

export function studioBbPresetId(id: string): string {
  return id.startsWith("studio:") ? id : `studio:${id}`;
}

export async function fetchStudioBbPresets(): Promise<StudioBbPreset[]> {
  if (isSupabaseConfigured()) {
    try {
      const store = await fetchBbPresetsFromSupabase();
      return store.presets;
    } catch (err) {
      console.error("[fetchStudioBbPresets supabase]", err);
    }
  }
  try {
    const res = await fetch("/presets/bb-presets.json", { cache: "no-store" });
    if (!res.ok) return [];
    const data = (await res.json()) as StudioPresetStore<StudioBbPreset>;
    return Array.isArray(data.presets) ? data.presets : [];
  } catch {
    return [];
  }
}

export async function fetchStudioGranularPresets(): Promise<StudioGranularPreset[]> {
  if (isSupabaseConfigured()) {
    try {
      const store = await fetchGranularPresetsFromSupabase();
      return store.presets;
    } catch (err) {
      console.error("[fetchStudioGranularPresets supabase]", err);
    }
  }
  try {
    const res = await fetch("/presets/granular-presets.json", { cache: "no-store" });
    if (!res.ok) return [];
    const data = (await res.json()) as StudioPresetStore<StudioGranularPreset>;
    return Array.isArray(data.presets) ? data.presets : [];
  } catch {
    return [];
  }
}

export function studioBbToWaveLabel(p: StudioBbPreset): string {
  const diff = Math.abs(p.rightHz - p.leftHz);
  return `${brainwaveLabel(diff)} ${diff.toFixed(1)}Hz · L${p.leftHz} R${p.rightHz}`;
}

export function studioGranularToParams(p: StudioGranularPreset): GranularParams {
  return {
    grainSizeMs: p.grainSizeMs,
    overlap: p.overlapPct,
    position: p.positionPct,
    randomness: p.randomnessPct,
    pitchShift: p.pitchSemis,
    lfoSpeed: p.lfoEnabled ? (p.lfoSpeedHz ?? 0.2) : 0,
    lfoDepth: p.lfoEnabled ? (p.lfoDepthSemis ?? 0) : 0,
    lfoShape: p.lfoWaveform ?? "sine",
    volume: p.volume,
  };
}

export function studioBbToBeatPreset(raw: StudioBbPreset): BinauralBeatPreset {
  const beatHz = Math.abs(raw.rightHz - raw.leftHz);
  const carrierHz = Math.min(raw.leftHz, raw.rightHz);
  return {
    id: studioBbPresetId(raw.id),
    emoji: raw.icon ?? "",
    label: raw.name,
    waveLabel: studioBbToWaveLabel(raw),
    beatHz,
    carrierHz,
    studio: true,
    memo: raw.memo,
  };
}
