import type { AmbientSoundId } from "@/src/lib/binauralBeats";

export type DemoSourceId = AmbientSoundId;

export type LfoShape = "sine" | "square" | "random";

export type GranularParams = {
  grainSizeMs: number;
  overlap: number;
  position: number;
  randomness: number;
  pitchShift: number;
  lfoEnabled: boolean;
  lfoSpeed: number;
  lfoDepth: number;
  lfoShape: LfoShape;
  volume: number;
};

export function normalizeGranularParams(raw: Partial<GranularParams> | GranularParams): GranularParams {
  const legacyShape = raw.lfoShape as string | undefined;
  const lfoShape: LfoShape =
    legacyShape === "square" || legacyShape === "random"
      ? legacyShape
      : legacyShape === "triangle"
        ? "square"
        : "sine";
  const lfoEnabled = raw.lfoEnabled === true;
  return {
    grainSizeMs:
      typeof raw.grainSizeMs === "number"
        ? Math.max(10, Math.min(500, raw.grainSizeMs))
        : DEFAULT_GRANULAR_PARAMS.grainSizeMs,
    overlap:
      typeof raw.overlap === "number" ? Math.max(0, Math.min(100, raw.overlap)) : DEFAULT_GRANULAR_PARAMS.overlap,
    position:
      typeof raw.position === "number" ? Math.max(0, Math.min(100, raw.position)) : DEFAULT_GRANULAR_PARAMS.position,
    randomness:
      typeof raw.randomness === "number"
        ? Math.max(0, Math.min(100, raw.randomness))
        : DEFAULT_GRANULAR_PARAMS.randomness,
    pitchShift:
      typeof raw.pitchShift === "number"
        ? Math.max(-48, Math.min(288, Math.round(raw.pitchShift)))
        : DEFAULT_GRANULAR_PARAMS.pitchShift,
    lfoEnabled,
    lfoSpeed:
      typeof raw.lfoSpeed === "number"
        ? Math.max(0.01, Math.min(20, raw.lfoSpeed))
        : DEFAULT_GRANULAR_PARAMS.lfoSpeed,
    lfoDepth:
      typeof raw.lfoDepth === "number"
        ? Math.max(0, Math.min(48, raw.lfoDepth))
        : DEFAULT_GRANULAR_PARAMS.lfoDepth,
    lfoShape,
    volume:
      typeof raw.volume === "number" ? Math.max(0, Math.min(100, raw.volume)) : DEFAULT_GRANULAR_PARAMS.volume,
  };
}

export function formatPitchShiftLabel(semitones: number): string {
  const oct = Math.round((semitones / 12) * 10) / 10;
  if (oct === 0) return "0 oct";
  return oct > 0 ? `+${oct} oct` : `${oct} oct`;
}

export function formatLfoDepthLabel(semitones: number): string {
  const st = Math.round(semitones);
  if (st === 0) return "0st";
  const oct = st / 12;
  const octStr = Number.isInteger(oct) ? String(oct) : String(Math.round(oct * 10) / 10);
  return `${st}st（${octStr}oct）`;
}

export type BinauralChannelConfig = {
  type: "binaural";
  binauralBeatId: string;
  binauralAmbientId: AmbientSoundId;
  volume: number;
};

export type GranularChannelConfig = {
  type: "granular";
  sourceId: DemoSourceId;
  /** When set, load buffer from /audio/{audioFile} instead of procedural demo */
  audioFile?: string;
  volume: number;
  granular: GranularParams;
};

export type ChannelConfig = BinauralChannelConfig | GranularChannelConfig;

export type SoundPreset = {
  id: string;
  name: string;
  channels: [ChannelConfig, ChannelConfig, ChannelConfig];
  masterVolume: number;
  createdAt: number;
};

export type PlaylistMode = "asc" | "desc" | "random";

export type PlaylistSettings = {
  presetIds: string[];
  mode: PlaylistMode;
  fadeSec: number;
  presetDurationSec: number;
  randomizeDuration: boolean;
};

export type VisualizerEffect =
  | "waveform"
  | "circle"
  | "particle"
  | "spiral"
  | "aurora"
  | "stars"
  | "petals";

export type OverlayOption = "clock" | "pomodoro" | "schedule" | "presetTimer" | "none";

export type VisualizerSettings = {
  effect: VisualizerEffect;
  overlays: OverlayOption[];
  screensaver: boolean;
};

export type SoundSystemSnapshot = {
  isPlaying: boolean;
  isPlaylistActive: boolean;
  masterVolume: number;
  channels: [ChannelConfig, ChannelConfig, ChannelConfig];
  currentPresetId: string | null;
  currentPresetName: string | null;
  presetRemainingSec: number;
  playlistIndex: number;
  playlistTotal: number;
};

export const DEFAULT_GRANULAR_PARAMS: GranularParams = {
  grainSizeMs: 120,
  overlap: 50,
  position: 0,
  randomness: 20,
  pitchShift: 0,
  lfoEnabled: false,
  lfoSpeed: 0.5,
  lfoDepth: 2,
  lfoShape: "sine",
  volume: 70,
};

export const DEFAULT_PLAYLIST_SETTINGS: PlaylistSettings = {
  presetIds: [],
  mode: "asc",
  fadeSec: 10,
  presetDurationSec: 180,
  randomizeDuration: true,
};

export const DEFAULT_VISUALIZER_SETTINGS: VisualizerSettings = {
  effect: "waveform",
  overlays: ["clock"],
  screensaver: false,
};

export function defaultBinauralChannel(): BinauralChannelConfig {
  return {
    type: "binaural",
    binauralBeatId: "meditation-theta",
    binauralAmbientId: "rain",
    volume: 0.45,
  };
}

export function defaultGranularChannel(sourceId: DemoSourceId = "ocean"): GranularChannelConfig {
  return {
    type: "granular",
    sourceId,
    volume: 0.35,
    granular: { ...DEFAULT_GRANULAR_PARAMS },
  };
}

export function defaultPresetChannels(): [ChannelConfig, ChannelConfig, ChannelConfig] {
  return [defaultBinauralChannel(), defaultGranularChannel("forest"), defaultGranularChannel("suikinkutsu")];
}

export const DEMO_SOURCE_OPTIONS: { id: DemoSourceId; emoji: string; label: string }[] = [
  { id: "ocean", emoji: "🌊", label: "波音" },
  { id: "rain", emoji: "🌧️", label: "雨音" },
  { id: "forest", emoji: "🌳", label: "森" },
  { id: "fire", emoji: "🔥", label: "焚き火" },
  { id: "suikinkutsu", emoji: "💧", label: "水琴窟" },
  { id: "uguisu", emoji: "🐦", label: "うぐいす" },
  { id: "space", emoji: "🌌", label: "宇宙" },
  { id: "underwater", emoji: "🌊", label: "水中" },
  { id: "waterdrops", emoji: "💧", label: "水滴" },
  { id: "silent", emoji: "🔇", label: "無音" },
];

export const VISUALIZER_EFFECTS: { id: VisualizerEffect; emoji: string; label: string }[] = [
  { id: "waveform", emoji: "", label: "波形" },
  { id: "circle", emoji: "", label: "円形スペクトラム" },
  { id: "particle", emoji: "", label: "パーティクル" },
  { id: "spiral", emoji: "", label: "渦巻き" },
  { id: "aurora", emoji: "", label: "オーロラ" },
  { id: "stars", emoji: "", label: "星空" },
  { id: "petals", emoji: "", label: "花びら" },
];

export const OVERLAY_OPTIONS: { id: OverlayOption; emoji: string; label: string }[] = [
  { id: "clock", emoji: "", label: "現在時刻" },
  { id: "pomodoro", emoji: "", label: "ポモドーロ残り" },
  { id: "schedule", emoji: "", label: "次スケジュールまで" },
  { id: "presetTimer", emoji: "", label: "プリセット切替まで" },
  { id: "none", emoji: "", label: "何も表示しない" },
];
