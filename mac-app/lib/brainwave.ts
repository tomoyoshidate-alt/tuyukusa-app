export type BrainwaveBand = "δ波" | "θ波" | "α波" | "β波" | "γ波";

export function getBbDiffHz(leftHz: number, rightHz: number): number {
  return Math.abs(rightHz - leftHz);
}

export function classifyBrainwave(diffHz: number): BrainwaveBand {
  if (diffHz < 4) return "δ波";
  if (diffHz < 8) return "θ波";
  if (diffHz < 13) return "α波";
  if (diffHz < 30) return "β波";
  return "γ波";
}

export function brainwaveDescription(band: BrainwaveBand): string {
  const map: Record<BrainwaveBand, string> = {
    "δ波": "0.5–4Hz（深い睡眠・回復）",
    "θ波": "4–8Hz（瞑想・創造性）",
    "α波": "8–13Hz（リラックス・集中）",
    "β波": "13–30Hz（覚醒・論理思考）",
    "γ波": "30Hz+（高次認知）",
  };
  return map[band];
}
