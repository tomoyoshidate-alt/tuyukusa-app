let sharedCtx: AudioContext | null = null;

/** Module-level singleton AudioContext for the sound system. */
export function getSharedAudioContext(): AudioContext {
  if (!sharedCtx || sharedCtx.state === "closed") {
    sharedCtx = new AudioContext();
  }
  return sharedCtx;
}

export async function resumeSharedAudioContext(): Promise<AudioContext> {
  const ctx = getSharedAudioContext();
  if (ctx.state === "suspended") {
    await ctx.resume();
  }
  return ctx;
}

export function suspendSharedAudioContext(): void {
  if (sharedCtx && sharedCtx.state !== "closed" && sharedCtx.state !== "suspended") {
    void sharedCtx.suspend();
  }
}

export function closeSharedAudioContext(): void {
  if (sharedCtx && sharedCtx.state !== "closed") {
    void sharedCtx.close();
  }
  sharedCtx = null;
}
