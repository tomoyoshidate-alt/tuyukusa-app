export type BinauralBeatId =
  | "calm-alpha"
  | "focus-beta"
  | "relax-alpha"
  | "energy-beta"
  | "sleep-delta"
  | "study-beta"
  | "desk-beta"
  | "labor-beta"
  | "calm-anger"
  | "runnynose-theta"
  | "itch-alpha"
  | "meditation-theta"
  | "sadness-alpha"
  | "flashback-alpha";

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
  | "waterdrops"
  | "ultrasonic"
  | "astral"
  | "polyrhythm";

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

let loadedBeatPresets: BinauralBeatPreset[] | null = null;

export function setLoadedBeatPresets(presets: BinauralBeatPreset[]): void {
  loadedBeatPresets = presets.length > 0 ? presets : null;
}

/** @deprecated use setLoadedBeatPresets */
export function setStudioBeatPresets(presets: BinauralBeatPreset[]): void {
  setLoadedBeatPresets(presets);
}

export function getLoadedBeatPresets(): BinauralBeatPreset[] {
  return loadedBeatPresets ?? [];
}

/** @deprecated use getLoadedBeatPresets */
export function getStudioBeatPresets(): BinauralBeatPreset[] {
  return getLoadedBeatPresets();
}

export function getAllBeatPresets(): BinauralBeatPreset[] {
  if (loadedBeatPresets && loadedBeatPresets.length > 0) return loadedBeatPresets;
  return BINURAL_BEAT_PRESETS;
}

export type AmbientSoundPreset = {
  id: AmbientSoundId;
  emoji: string;
  label: string;
};

/**
 * 432Hz を基音（左耳キャリア）とするプリセット群。
 * 実際に鳴らす左右周波数は基音キー（既定 A432）で決まり、beatHz が左右差＝誘導する脳波になる。
 * memo は「知りたい人が読める」周波数・脳波の解説。carrierHz は基音キー未適用時のフォールバック値。
 */
export const BINURAL_BEAT_PRESETS: BinauralBeatPreset[] = [
  { id: "calm-alpha", emoji: "🍃", label: "落ち着き", waveLabel: "アルファ波 8Hz", beatHz: 8, carrierHz: 432,
    memo: "低アルファ8Hz。緊張をゆるめ、心を落ち着ける基本の脳波。" },
  { id: "focus-beta", emoji: "🎯", label: "集中", waveLabel: "低ベータ/SMR 14Hz", beatHz: 14, carrierHz: 432,
    memo: "低ベータ(SMR)14Hz。適度な覚醒で、集中を途切れさせない。" },
  { id: "relax-alpha", emoji: "🌿", label: "リラックス", waveLabel: "アルファ波 10Hz", beatHz: 10, carrierHz: 432,
    memo: "アルファ10Hz。安静時の脳波。リラックスと軽い集中の両立。" },
  { id: "energy-beta", emoji: "⚡", label: "やる気", waveLabel: "ベータ波 20Hz", beatHz: 20, carrierHz: 432,
    memo: "ベータ20Hz。思考と活動を後押しする覚醒の脳波。" },
  { id: "sleep-delta", emoji: "🌙", label: "睡眠", waveLabel: "デルタ波 2Hz", beatHz: 2, carrierHz: 432,
    memo: "デルタ2Hz。深い睡眠・回復の周波数。就寝前に。" },
  { id: "study-beta", emoji: "📚", label: "勉強", waveLabel: "ベータ波 15Hz", beatHz: 15, carrierHz: 432,
    memo: "ベータ15Hz。暗記・思考など学習に向く覚醒レベル。" },
  { id: "desk-beta", emoji: "💻", label: "デスクワーク", waveLabel: "低ベータ 12Hz", beatHz: 12, carrierHz: 432,
    memo: "12Hz前後。長時間の事務作業を、疲れにくく穏やかに支える。" },
  { id: "labor-beta", emoji: "🛠️", label: "肉体労働", waveLabel: "ベータ波 22Hz", beatHz: 22, carrierHz: 432,
    memo: "ベータ22Hz。体を動かす作業の活力と覚醒。" },
  { id: "calm-anger", emoji: "🧘", label: "怒りを鎮める", waveLabel: "低アルファ 8Hz", beatHz: 8, carrierHz: 432,
    memo: "アルファ8Hz。高ぶりを鎮め、上った肝の気を降ろす助けに。" },
  { id: "runnynose-theta", emoji: "🌬️", label: "鼻水をとめる", waveLabel: "シータ波 4Hz", beatHz: 4, carrierHz: 432,
    memo: "4Hzの深い呼吸帯。自律神経を整え、水滞（冷え・鼻水）を動かす手助けに。※医療行為ではありません。" },
  { id: "itch-alpha", emoji: "🌸", label: "痒みを緩和する", waveLabel: "アルファ波 10Hz", beatHz: 10, carrierHz: 432,
    memo: "アルファ10Hz。掻きたい衝動から意識をそらし、こもった熱をしずめる助けに。" },
  { id: "meditation-theta", emoji: "🕯️", label: "瞑想", waveLabel: "シータ波 6Hz", beatHz: 6, carrierHz: 432,
    memo: "シータ6Hz。瞑想・深いリラックス・入眠期の脳波。" },
  { id: "sadness-alpha", emoji: "💧", label: "悲しみを癒す", waveLabel: "アルファ/シータ 7Hz", beatHz: 7, carrierHz: 432,
    memo: "7Hz前後。感情の波をやわらげ、心を落ち着かせる。" },
  { id: "flashback-alpha", emoji: "🌅", label: "フラッシュバックを抑える", waveLabel: "アルファ波 10Hz", beatHz: 10, carrierHz: 432,
    memo: "アルファ10Hz。「今ここ」に意識を戻すグラウンディングの助けに。" },
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
  { id: "ultrasonic", emoji: "🔊", label: "超音波" },
  { id: "astral", emoji: "✨", label: "アストラルレコーズ" },
  { id: "polyrhythm", emoji: "🥁", label: "ポリリズム" },
];

export const TIMER_OPTIONS = [5, 10, 20, 30] as const;
export type TimerMinutes = (typeof TIMER_OPTIONS)[number];

export const DIAGNOSIS_BEAT_RECOMMENDATIONS: Record<string, BinauralBeatId> = {
  水滞: "runnynose-theta",
  血熱: "meditation-theta",
  腎虚: "sleep-delta",
  気虚: "relax-alpha",
  瘀血: "calm-anger",
};

export function getRecommendedBeatId(diagnosis: string): BinauralBeatId {
  return DIAGNOSIS_BEAT_RECOMMENDATIONS[diagnosis] ?? "meditation-theta";
}

export function getBeatPreset(id: string): BinauralBeatPreset {
  return getAllBeatPresets().find(p => p.id === id) ?? BINURAL_BEAT_PRESETS[2];
}
