import type { AmbientSoundId, BinauralBeatId } from "@/src/lib/binauralBeats";

export type DemoSourceId = AmbientSoundId;

export type LfoShape = "sine" | "triangle" | "random";

export type GranularParams = {
  grainSizeMs: number;
  overlap: number;
  position: number;
  randomness: number;
  pitchShift: number;
  lfoSpeed: number;
  lfoDepth: number;
  lfoShape: LfoShape;
  volume: number;
};

export type BinauralChannelConfig = {
  type: "binaural";
  binauralBeatId: BinauralBeatId;
  binauralAmbientId: AmbientSoundId;
  volume: number;
};

export type GranularChannelConfig = {
  type: "granular";
  sourceId: DemoSourceId;
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
  randomness: 25,
  pitchShift: 0,
  lfoSpeed: 0.15,
  lfoDepth: 3,
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
  { id: "waveform", emoji: "🌊", label: "波形" },
  { id: "circle", emoji: "🔵", label: "円形スペクトラム" },
  { id: "particle", emoji: "✨", label: "パーティクル" },
  { id: "spiral", emoji: "🌀", label: "渦巻き" },
  { id: "aurora", emoji: "🎆", label: "オーロラ" },
  { id: "stars", emoji: "💫", label: "星空" },
  { id: "petals", emoji: "🌸", label: "花びら" },
];

export const OVERLAY_OPTIONS: { id: OverlayOption; emoji: string; label: string }[] = [
  { id: "clock", emoji: "🕐", label: "現在時刻" },
  { id: "pomodoro", emoji: "⏱️", label: "ポモドーロ残り" },
  { id: "schedule", emoji: "📅", label: "次スケジュールまで" },
  { id: "presetTimer", emoji: "⏳", label: "プリセット切替まで" },
  { id: "none", emoji: "🔇", label: "何も表示しない" },
];
