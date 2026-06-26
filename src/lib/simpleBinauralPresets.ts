export const CARRIER = 130.81; // C3 — shared by all presets

export type Preset = {
  id: string;
  name: string;
  band: string;
  beatHz: number;
  poly: { l: number; r: number; bpm: number; lHz: number; rHz: number };
};

export const PRESETS: Preset[] = [
  { id: "relax", name: "リラックス", band: "α", beatHz: 10, poly: { l: 3, r: 2, bpm: 60, lHz: 261.63, rHz: 392.0 } },
  { id: "meditate", name: "瞑想", band: "θ", beatHz: 6, poly: { l: 2, r: 3, bpm: 50, lHz: 261.63, rHz: 392.0 } },
  { id: "sleep", name: "睡眠導入", band: "δ/θ", beatHz: 4, poly: { l: 3, r: 2, bpm: 46, lHz: 261.63, rHz: 261.63 } },
  { id: "calm", name: "イライラ鎮静", band: "低α", beatHz: 8, poly: { l: 3, r: 4, bpm: 56, lHz: 261.63, rHz: 349.23 } },
  { id: "create", name: "創造性", band: "θ", beatHz: 7, poly: { l: 4, r: 3, bpm: 64, lHz: 261.63, rHz: 349.23 } },
  { id: "appetite", name: "食欲増進", band: "高α", beatHz: 11, poly: { l: 4, r: 5, bpm: 72, lHz: 261.63, rHz: 329.63 } },
  { id: "focus", name: "集中", band: "低β/SMR", beatHz: 14, poly: { l: 5, r: 4, bpm: 84, lHz: 261.63, rHz: 329.63 } },
  { id: "energy", name: "やる気", band: "β", beatHz: 16, poly: { l: 4, r: 3, bpm: 92, lHz: 261.63, rHz: 392.0 } },
  { id: "suppress", name: "食欲抑制", band: "β", beatHz: 20, poly: { l: 5, r: 3, bpm: 88, lHz: 261.63, rHz: 440.0 } },
  { id: "recover", name: "回復・癒し", band: "深δ", beatHz: 2, poly: { l: 2, r: 3, bpm: 44, lHz: 261.63, rHz: 392.0 } },
];

export type AmbientId = "none" | "mizutama" | "uchu" | "tori" | "umi";

export const AMBIENT_OPTIONS: { id: AmbientId; label: string; file?: string }[] = [
  { id: "none", label: "なし" },
  { id: "mizutama", label: "水滴", file: "mizutama.mp3" },
  { id: "uchu", label: "宇宙", file: "uchu.mp3" },
  { id: "tori", label: "鳥の声", file: "tori.mp3" },
  { id: "umi", label: "海", file: "umi.mp3" },
];

export function getPresetById(id: string): Preset {
  return PRESETS.find(p => p.id === id) ?? PRESETS[0];
}
