import type { PlaylistSettings, SoundPreset } from "@/src/lib/soundSystem/types";
import { DEFAULT_PLAYLIST_SETTINGS, defaultPresetChannels } from "@/src/lib/soundSystem/types";

const PRESETS_KEY = "tuyukusa-sound-presets";
const PLAYLIST_KEY = "tuyukusa-sound-playlist";

export function readPresets(): SoundPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as SoundPreset[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function writePresets(presets: SoundPreset[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
  } catch {
    /* ignore */
  }
}

export function readPlaylistSettings(): PlaylistSettings {
  if (typeof window === "undefined") return DEFAULT_PLAYLIST_SETTINGS;
  try {
    const raw = localStorage.getItem(PLAYLIST_KEY);
    if (!raw) return DEFAULT_PLAYLIST_SETTINGS;
    const d = JSON.parse(raw) as Partial<PlaylistSettings>;
    return {
      presetIds: Array.isArray(d.presetIds) ? d.presetIds : [],
      mode: d.mode === "desc" || d.mode === "random" ? d.mode : "asc",
      fadeSec: typeof d.fadeSec === "number" ? Math.min(180, Math.max(0, d.fadeSec)) : 10,
      presetDurationSec:
        typeof d.presetDurationSec === "number"
          ? Math.min(600, Math.max(1, d.presetDurationSec))
          : 180,
      randomizeDuration: d.randomizeDuration !== false,
    };
  } catch {
    return DEFAULT_PLAYLIST_SETTINGS;
  }
}

export function writePlaylistSettings(settings: PlaylistSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PLAYLIST_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

export function createPreset(name: string, channels = defaultPresetChannels(), masterVolume = 0.75): SoundPreset {
  return {
    id: `preset-${Date.now()}`,
    name,
    channels: JSON.parse(JSON.stringify(channels)) as SoundPreset["channels"],
    masterVolume,
    createdAt: Date.now(),
  };
}
