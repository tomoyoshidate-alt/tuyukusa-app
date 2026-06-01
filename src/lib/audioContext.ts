import { MASTER_SAMPLE_RATE } from "@/src/lib/audioQuality";

/** Single shared AudioContext — created once at module load in the browser. */
export const audioCtx =
  typeof window !== "undefined"
    ? new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
        sampleRate: MASTER_SAMPLE_RATE,
      })
    : null;

/** Returns the shared AudioContext singleton (null during SSR). */
export function getAudioContext(): AudioContext | null {
  return audioCtx;
}

export async function resumeAudioCtx(): Promise<void> {
  if (audioCtx && audioCtx.state === "suspended") {
    await audioCtx.resume();
  }
}
