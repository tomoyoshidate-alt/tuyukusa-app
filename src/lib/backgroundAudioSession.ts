import { SilentAudioKeeper } from "@/src/lib/silentAudioKeeper";

type ResumeCallback = () => void;

declare global {
  interface Navigator {
    audioSession?: {
      type: "auto" | "playback" | "transient" | "ambient" | "solo";
    };
  }
}

/** Playback session – required for iOS background / screen-off audio. */
export function configurePlaybackAudioSession(): void {
  if (typeof navigator === "undefined") return;
  try {
    if (navigator.audioSession) {
      navigator.audioSession.type = "playback";
    }
  } catch {
    /* not supported */
  }
}

/** @deprecated Use configurePlaybackAudioSession */
export function configureMixAudioSession(): void {
  configurePlaybackAudioSession();
}

/**
 * Shared background audio session (ref-counted).
 * BB and radio share one silent-audio loop + visibility / wake-lock handlers.
 */
class BackgroundAudioSession {
  private silentKeeper = new SilentAudioKeeper();
  private wakeLock: WakeLockSentinel | null = null;
  private wasPausedByCall = false;
  private refCount = 0;
  private resumeCallbacks = new Set<ResumeCallback>();
  private audioContexts = new Set<AudioContext>();
  private ctxHandlerCleanups = new Map<AudioContext, () => void>();
  private globalHandlersBound = false;

  async acquire(onVisibleResume: ResumeCallback): Promise<void> {
    this.resumeCallbacks.add(onVisibleResume);
    this.refCount += 1;

    if (this.refCount === 1) {
      configurePlaybackAudioSession();
      this.bindGlobalHandlers();
      await this.silentKeeper.start();
      await this.acquireWakeLock();
      await this.resumeAllAudioContexts();
    } else {
      configurePlaybackAudioSession();
      await this.silentKeeper.resume();
    }
  }

  release(onVisibleResume: ResumeCallback): void {
    this.resumeCallbacks.delete(onVisibleResume);
    this.refCount = Math.max(0, this.refCount - 1);
    if (this.refCount === 0) {
      this.teardown();
    }
  }

  /** @deprecated Prefer acquire/release */
  async start(onVisibleResume: ResumeCallback): Promise<void> {
    await this.acquire(onVisibleResume);
  }

  /** @deprecated Prefer acquire/release */
  stop(): void {
    this.resumeCallbacks.clear();
    this.refCount = 0;
    this.teardown();
  }

  registerAudioContext(ctx: AudioContext): () => void {
    this.audioContexts.add(ctx);
    return () => this.audioContexts.delete(ctx);
  }

  bindAudioContext(ctx: AudioContext): void {
    if (this.ctxHandlerCleanups.has(ctx)) return;
    const handler = () => {
      if (this.refCount === 0) return;
      const state = ctx.state as string;
      if (state === "interrupted") {
        this.handleCallInterrupt();
      } else if (ctx.state === "running" && this.wasPausedByCall) {
        void this.handleCallResume();
      }
    };
    ctx.addEventListener("statechange", handler);
    this.ctxHandlerCleanups.set(ctx, () => ctx.removeEventListener("statechange", handler));
  }

  async resumeAll(): Promise<void> {
    configurePlaybackAudioSession();
    await this.silentKeeper.resume();
    await this.resumeAllAudioContexts();
    this.resumeCallbacks.forEach(cb => {
      try {
        cb();
      } catch {
        /* ignore */
      }
    });
    await this.acquireWakeLock();
  }

  pauseForCall(): void {
    this.silentKeeper.pause();
  }

  private async resumeAllAudioContexts(): Promise<void> {
    for (const ctx of this.audioContexts) {
      const state = ctx.state as string;
      if (state === "suspended" || state === "interrupted") {
        try {
          await ctx.resume();
        } catch {
          /* ignore */
        }
      }
    }
  }

  private handleCallInterrupt(): void {
    if (this.wasPausedByCall) return;
    this.wasPausedByCall = true;
    this.silentKeeper.pause();
  }

  private async handleCallResume(): Promise<void> {
    if (!this.wasPausedByCall) return;
    this.wasPausedByCall = false;
    await this.resumeAll();
  }

  private bindGlobalHandlers(): void {
    if (this.globalHandlersBound || typeof document === "undefined") return;
    this.globalHandlersBound = true;

    document.addEventListener("visibilitychange", () => {
      if (this.refCount === 0) return;
      if (document.visibilityState === "visible") {
        void this.resumeAll();
      } else {
        void this.silentKeeper.start();
      }
    });

    window.addEventListener("focus", () => {
      if (this.refCount > 0) void this.resumeAll();
    });

    window.addEventListener("pageshow", event => {
      if (this.refCount > 0 && event.persisted) void this.resumeAll();
    });

    document.addEventListener("resume", () => {
      if (this.refCount > 0) void this.resumeAll();
    });

    if ("wakeLock" in navigator) {
      document.addEventListener("visibilitychange", () => {
        if (this.refCount > 0 && document.visibilityState === "visible") {
          void this.acquireWakeLock();
        }
      });
    }
  }

  private async acquireWakeLock(): Promise<void> {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    try {
      if (this.wakeLock && !this.wakeLock.released) return;
      this.wakeLock = await navigator.wakeLock.request("screen");
      this.wakeLock.addEventListener("release", () => {
        this.wakeLock = null;
      });
    } catch {
      /* ignore – unsupported or tab not visible */
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

  private teardown(): void {
    this.wasPausedByCall = false;
    this.ctxHandlerCleanups.forEach(cleanup => cleanup());
    this.ctxHandlerCleanups.clear();
    this.audioContexts.clear();
    this.silentKeeper.stop();
    void this.releaseWakeLock();
  }
}

export const sharedBackgroundAudioSession = new BackgroundAudioSession();

export class BackgroundAudioSessionLegacy extends BackgroundAudioSession {}

export function bindAudioContextInterrupt(
  ctx: AudioContext,
  handlers: { onInterrupt: () => void; onResume: () => void }
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
