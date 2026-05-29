import { SilentAudioKeeper } from "@/src/lib/silentAudioKeeper";

type AudioContextStateHandler = {
  onInterrupt: () => void;
  onResume: () => void;
};

declare global {
  interface Navigator {
    audioSession?: {
      type: "auto" | "playback" | "transient" | "ambient" | "solo";
    };
  }
}

/** Configure mix-friendly audio session (ambient = mix with other apps). */
export function configureMixAudioSession(): void {
  if (typeof navigator === "undefined") return;
  try {
    if (navigator.audioSession) {
      navigator.audioSession.type = "ambient";
    }
  } catch {
    /* not supported */
  }
}

export class BackgroundAudioSession {
  private silentKeeper = new SilentAudioKeeper();
  private visibilityBound = false;
  private wakeLock: WakeLockSentinel | null = null;
  private wasPausedByCall = false;
  private active = false;
  private onVisibleResume: (() => void) | null = null;
  private ctxStateCleanup: (() => void) | null = null;

  async start(onVisibleResume: () => void): Promise<void> {
    this.active = true;
    this.onVisibleResume = onVisibleResume;
    configureMixAudioSession();
    await this.silentKeeper.start();
    this.bindVisibilityHandler();
    await this.acquireWakeLock();
  }

  stop(): void {
    this.active = false;
    this.onVisibleResume = null;
    this.wasPausedByCall = false;
    this.ctxStateCleanup?.();
    this.ctxStateCleanup = null;
    this.silentKeeper.stop();
    void this.releaseWakeLock();
  }

  bindAudioContext(ctx: AudioContext): void {
    this.ctxStateCleanup?.();
    const handler = () => {
      if (!this.active) return;
      const state = ctx.state as string;
      if (state === "interrupted") {
        this.handleCallInterrupt();
      } else if (state === "running" && this.wasPausedByCall) {
        void this.handleCallResume();
      }
    };
    ctx.addEventListener("statechange", handler);
    this.ctxStateCleanup = () => ctx.removeEventListener("statechange", handler);
  }

  async resumeAll(): Promise<void> {
    configureMixAudioSession();
    await this.silentKeeper.resume();
    this.onVisibleResume?.();
    await this.acquireWakeLock();
  }

  pauseForCall(): void {
    this.silentKeeper.pause();
  }

  private handleCallInterrupt(): void {
    if (this.wasPausedByCall) return;
    this.wasPausedByCall = true;
    this.silentKeeper.pause();
  }

  private async handleCallResume(): Promise<void> {
    if (!this.wasPausedByCall) return;
    this.wasPausedByCall = false;
    configureMixAudioSession();
    await this.silentKeeper.resume();
    this.onVisibleResume?.();
  }

  private bindVisibilityHandler(): void {
    if (this.visibilityBound || typeof document === "undefined") return;
    this.visibilityBound = true;

    document.addEventListener("visibilitychange", () => {
      if (!this.active) return;
      if (document.visibilityState === "visible") {
        void this.resumeAll();
      } else {
        void this.silentKeeper.start();
      }
    });

    window.addEventListener("focus", () => {
      if (this.active) void this.resumeAll();
    });

    document.addEventListener("resume", () => {
      if (this.active) void this.resumeAll();
    });
  }

  private async acquireWakeLock(): Promise<void> {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    try {
      if (this.wakeLock) return;
      this.wakeLock = await navigator.wakeLock.request("screen");
      this.wakeLock.addEventListener("release", () => {
        this.wakeLock = null;
      });
    } catch {
      /* ignore */
    }
  }

  private async releaseWakeLock(): Promise<void> {
    try {
      await this.wakeLock?.release();
    } catch {
      /* ignore */
    }
    this.wakeLock = null;
  }
}

export function bindAudioContextInterrupt(
  ctx: AudioContext,
  handlers: AudioContextStateHandler
): () => void {
  let pausedByCall = false;
  const handler = () => {
    const state = ctx.state as string;
    if (state === "interrupted") {
      if (!pausedByCall) {
        pausedByCall = true;
        handlers.onInterrupt();
      }
    } else if (ctx.state === "running" && pausedByCall) {
      pausedByCall = false;
      handlers.onResume();
    }
  };
  ctx.addEventListener("statechange", handler);
  return () => ctx.removeEventListener("statechange", handler);
}
