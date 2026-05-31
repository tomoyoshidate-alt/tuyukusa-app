export function clampPitchSemis(value: number): number {
  return Math.max(-48, Math.min(288, Math.round(value)));
}

export function formatPitchOctaves(semitones: number): string {
  const oct = Math.round((semitones / 12) * 10) / 10;
  if (oct === 0) return "0 oct";
  return oct > 0 ? `+${oct} oct` : `${oct} oct`;
}

export function clampLfoDepthSemis(value: number): number {
  return Math.max(0, Math.min(48, Math.round(value)));
}

export function formatLfoDepthLabel(semitones: number): string {
  const st = Math.round(semitones);
  if (st === 0) return "0st";
  const oct = st / 12;
  const octStr = Number.isInteger(oct) ? String(oct) : String(Math.round(oct * 10) / 10);
  return `${st}st（${octStr}oct）`;
}

export function playbackRateForSemis(semitones: number): number {
  return Math.pow(2, semitones / 12);
}
