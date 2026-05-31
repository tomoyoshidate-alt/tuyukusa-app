export type BinauralBeatId =
  | "morning-alpha"
  | "focus-beta"
  | "meditation-theta"
  | "sleep-delta"
  | "stress-alpha"
  | "energy-beta"
  | "breath-theta"
  | "deep-relax-delta";

export type AmbientSoundId =
  | "silent"
  | "rain"
  | "ocean"
  | "forest"
  | "fire"
  | "suikinkutsu"
  | "uguisu"
  | "space"
  | "underwater"
  | "waterdrops";

export type BinauralBeatPreset = {
  id: string;
  emoji: string;
  label: string;
  waveLabel: string;
  beatHz: number;
  carrierHz: number;
  /** Studio export metadata */
  studio?: boolean;
  memo?: string;
};

let studioBeatPresets: BinauralBeatPreset[] = [];

export function setStudioBeatPresets(presets: BinauralBeatPreset[]): void {
  studioBeatPresets = presets;
}

export function getStudioBeatPresets(): BinauralBeatPreset[] {
  return studioBeatPresets;
}

export function getAllBeatPresets(): BinauralBeatPreset[] {
  return [...BINURAL_BEAT_PRESETS, ...studioBeatPresets];
}

export type AmbientSoundPreset = {
  id: AmbientSoundId;
  emoji: string;
  label: string;
};

export const BINURAL_BEAT_PRESETS: BinauralBeatPreset[] = [
  { id: "morning-alpha", emoji: "", label: "朝の目覚め", waveLabel: "アルファ波 10Hz", beatHz: 10, carrierHz: 200 },
  { id: "focus-beta", emoji: "", label: "集中・仕事", waveLabel: "ベータ波 20Hz", beatHz: 20, carrierHz: 220 },
  { id: "meditation-theta", emoji: "", label: "瞑想・リラックス", waveLabel: "シータ波 6Hz", beatHz: 6, carrierHz: 180 },
  { id: "sleep-delta", emoji: "", label: "睡眠導入", waveLabel: "デルタ波 2Hz", beatHz: 2, carrierHz: 160 },
  { id: "stress-alpha", emoji: "", label: "不安・ストレス解消", waveLabel: "アルファ波 8Hz", beatHz: 8, carrierHz: 190 },
  { id: "energy-beta", emoji: "", label: "運動・活力", waveLabel: "ベータ波 25Hz", beatHz: 25, carrierHz: 240 },
  { id: "breath-theta", emoji: "", label: "深呼吸・整える", waveLabel: "シータ波 4Hz", beatHz: 4, carrierHz: 170 },
  { id: "deep-relax-delta", emoji: "", label: "深いリラックス", waveLabel: "デルタ波 4Hz", beatHz: 4, carrierHz: 150 },
  { id: "gamma-focus", emoji: "", label: "覚醒・ガンマ", waveLabel: "ガンマ波 40Hz", beatHz: 40, carrierHz: 220 },
];

export const AMBIENT_SOUND_PRESETS: AmbientSoundPreset[] = [
  { id: "silent", emoji: "🔇", label: "無音" },
  { id: "rain", emoji: "🌧️", label: "雨音" },
  { id: "ocean", emoji: "🌊", label: "波音" },
  { id: "forest", emoji: "🌳", label: "森の音" },
  { id: "fire", emoji: "🔥", label: "焚き火" },
  { id: "suikinkutsu", emoji: "🎐", label: "水琴窟" },
  { id: "uguisu", emoji: "🐦", label: "うぐいす" },
  { id: "space", emoji: "🌌", label: "宇宙" },
  { id: "underwater", emoji: "🌊", label: "水中" },
  { id: "waterdrops", emoji: "💧", label: "水滴" },
];

export const TIMER_OPTIONS = [5, 10, 20, 30] as const;
export type TimerMinutes = (typeof TIMER_OPTIONS)[number];

export const DIAGNOSIS_BEAT_RECOMMENDATIONS: Record<string, BinauralBeatId> = {
  水滞: "breath-theta",
  血熱: "meditation-theta",
  腎虚: "sleep-delta",
  気虚: "morning-alpha",
  瘀血: "stress-alpha",
};

export function getRecommendedBeatId(diagnosis: string): BinauralBeatId {
  return DIAGNOSIS_BEAT_RECOMMENDATIONS[diagnosis] ?? "meditation-theta";
}

export function getBeatPreset(id: string): BinauralBeatPreset {
  return getAllBeatPresets().find(p => p.id === id) ?? BINURAL_BEAT_PRESETS[2];
}
