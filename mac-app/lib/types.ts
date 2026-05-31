export type BBWaveform = "sine" | "square" | "triangle";

export type BBPreset = {
  id: string;
  name: string;
  icon?: string;
  leftHz: number;
  rightHz: number;
  waveform: BBWaveform;
  fadeInSec: number;
  fadeOutSec: number;
  masterVolume: number;
  memo: string;
  updatedAt: string;
};

export type LfoWaveform = "sine" | "triangle" | "random";

export type GranularPreset = {
  id: string;
  name: string;
  icon?: string;
  audioFile: string;
  grainSizeMs: number;
  grainDensity: number;
  overlapPct: number;
  positionPct: number;
  randomnessPct: number;
  pitchSemis: number;
  lfoEnabled: boolean;
  lfoSpeedHz: number;
  lfoDepthSemis: number;
  lfoWaveform: LfoWaveform;
  reverbPct: number;
  volume: number;
  memo: string;
  updatedAt: string;
};

export type PresetStore<T> = { presets: T[] };

export const DEFAULT_BB_PRESET = (): BBPreset => ({
  id: crypto.randomUUID(),
  name: "新規BBプリセット",
  icon: "",
  leftHz: 200,
  rightHz: 210,
  waveform: "sine",
  fadeInSec: 3,
  fadeOutSec: 3,
  masterVolume: 70,
  memo: "",
  updatedAt: new Date().toISOString(),
});

export const DEFAULT_GRANULAR_PRESET = (): GranularPreset => ({
  id: crypto.randomUUID(),
  name: "新規グラニュラープリセット",
  icon: "",
  audioFile: "",
  grainSizeMs: 120,
  grainDensity: 12,
  overlapPct: 50,
  positionPct: 0,
  randomnessPct: 20,
  pitchSemis: 0,
  lfoEnabled: false,
  lfoSpeedHz: 0.2,
  lfoDepthSemis: 2,
  lfoWaveform: "sine",
  reverbPct: 25,
  volume: 70,
  memo: "",
  updatedAt: new Date().toISOString(),
});
