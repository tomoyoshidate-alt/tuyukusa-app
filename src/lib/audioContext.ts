/** Single shared AudioContext — created once at module load in the browser. */
export const audioCtx =
  typeof window !== "undefined"
    ? new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    : null;

export async function resumeAudioCtx(): Promise<void> {
  if (audioCtx && audioCtx.state === "suspended") {
    await audioCtx.resume();
  }
}
