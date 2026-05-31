import { resumeAudioCtx } from "@/src/lib/audioContext";
import { AlarmEngine } from "@/src/lib/alarmEngine";
import {
  configurePlaybackAudioSession,
  sharedBackgroundAudioSession,
} from "@/src/lib/backgroundAudioSession";
import { BinauralAudioEngine } from "@/src/lib/binauralAudioEngine";
import type { AmbientSoundId, BinauralBeatPreset } from "@/src/lib/binauralBeats";
import {
  readBinauralPlayerSettings,
  resolveBeatPreset,
  type BaseKey,
} from "@/src/lib/binauralPlayerSettings";
import {
  fireSwAlarm,
  scheduleSwAlarm,
  stopSwAlarm,
} from "@/src/lib/timerServiceWorker";
import { triggerAirplaneModeShortcutIfEnabled } from "@/src/lib/timerEndSettings";

export type BinauralPlaybackSnapshot = {
  isPlaying: boolean;
  isAlarmRinging: boolean;
  isTransitioning: boolean;
  remainingSec: number;
  timerMinutes: number | null;
  presetId: string;
  ambientId: AmbientSoundId;
  baseKey: BaseKey;
};

type Listener = (snapshot: BinauralPlaybackSnapshot) => void;

class BinauralPlaybackManager {
  private engine: BinauralAudioEngine | null = null;
  private tickRef: ReturnType<typeof setInterval> | null = null;
  private endAtRef = 0;
  private timerMinutes: number | null = null;
  private preset: BinauralBeatPreset | null = null;
  private ambientId: AmbientSoundId = "rain";
  private baseKey: BaseKey = "C";
  private volumes = { master: 0.7, binaural: 0.45, ambient: 0.35 };
  private alarmRef: AlarmEngine | null = null;
  private isAlarmRinging = false;
  private listeners = new Set<Listener>();
  private ctxUnregister: (() => void) | null = null;
  private readonly bgResumeHandler = (): void => {
    void this.engine?.resumeIfSuspended();
    void this.engine?.resumeAfterInterrupt();
  };

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    const snapshot = this.getSnapshot();
    this.listeners.forEach(l => l(snapshot));
  }

  getSnapshot(): BinauralPlaybackSnapshot {
    const remainingSec =
      this.endAtRef > 0 ? Math.max(0, Math.ceil((this.endAtRef - Date.now()) / 1000)) : 0;
    return {
      isPlaying: this.engine?.isPlaying() ?? false,
      isAlarmRinging: this.isAlarmRinging,
      isTransitioning: this.engine?.isTransitioning() ?? false,
      remainingSec,
      timerMinutes: this.timerMinutes,
      presetId: this.preset?.id ?? "",
      ambientId: this.ambientId,
      baseKey: this.baseKey,
    };
  }

  private resolvePreset(preset: BinauralBeatPreset): BinauralBeatPreset {
    return resolveBeatPreset(preset, this.baseKey);
  }

  private getFadeSec(): number {
    return readBinauralPlayerSettings().fadeSec;
  }

  isPlaying(): boolean {
    return this.engine?.isPlaying() ?? false;
  }

  async start(
    preset: BinauralBeatPreset,
    ambientId: AmbientSoundId,
    timerMinutes: number | null,
    volumes: { master: number; binaural: number; ambient: number },
    options?: { baseKey?: BaseKey; fadeSec?: number }
  ): Promise<void> {
    const settings = readBinauralPlayerSettings();
    this.baseKey = options?.baseKey ?? settings.baseKey;
    const fadeSec = options?.fadeSec ?? settings.fadeSec;
    await this.stopImmediate({ silent: true });
    this.preset = preset;
    this.ambientId = ambientId;
    this.timerMinutes = timerMinutes;
    this.volumes = volumes;

    const resolved = this.resolvePreset(preset);
    const engine = new BinauralAudioEngine();
    this.engine = engine;
    await resumeAudioCtx();
    await engine.start(resolved, ambientId, { fadeInSec: fadeSec });
    engine.setMasterVolume(volumes.master);
    engine.setBinauralVolume(volumes.binaural);
    engine.setAmbientVolume(volumes.ambient);

    configurePlaybackAudioSession();
    await sharedBackgroundAudioSession.acquire(this.bgResumeHandler);
    const ctx = engine.getAudioContext();
    if (ctx) {
      this.ctxUnregister = sharedBackgroundAudioSession.registerAudioContext(ctx);
      sharedBackgroundAudioSession.bindAudioContext(ctx);
      engine.bindContextStateHandler(
        () => sharedBackgroundAudioSession.pauseForCall(),
        () => {
          void this.engine?.resumeAfterInterrupt();
        }
      );
    }
    this.setupMediaSession(preset);

    if (timerMinutes) {
      this.endAtRef = Date.now() + timerMinutes * 60 * 1000;
      scheduleSwAlarm(
        this.endAtRef,
        "バイノーラルタイマー終了",
        `${preset.label} · ${timerMinutes}分が経過しました`,
        "binaural"
      );
    } else {
      this.endAtRef = 0;
    }

    this.clearTick();
    this.tickRef = setInterval(() => {
      if (this.endAtRef > 0) {
        const left = Math.max(0, Math.ceil((this.endAtRef - Date.now()) / 1000));
        if (left <= 0) {
          this.handleTimerEnd();
          return;
        }
      }
      void this.engine?.resumeIfSuspended();
      void sharedBackgroundAudioSession.resumeAll();
      this.emit();
    }, 500);

    this.emit();
  }

  stop(options?: { silent?: boolean }): void {
    void this.stopImmediate(options);
  }

  private async stopImmediate(options?: { silent?: boolean }): Promise<void> {
    this.clearTick();
    const fadeSec = this.getFadeSec();
    if (this.engine?.isPlaying() && !options?.silent && fadeSec > 0) {
      this.emit();
      await this.engine.stopWithFade(fadeSec);
    } else {
      this.engine?.stop();
    }
    this.engine = null;
    this.endAtRef = 0;
    this.stopAlarm();
    stopSwAlarm();
    this.releaseBackgroundSession();
    this.clearMediaSession();
    if (!options?.silent) this.emit();
  }

  updatePreset(preset: BinauralBeatPreset): void {
    this.preset = preset;
    this.engine?.updatePreset(this.resolvePreset(preset));
    this.setupMediaSession(preset);
    this.emit();
  }

  async applyChanges(
    preset: BinauralBeatPreset,
    ambientId: AmbientSoundId,
    options?: { baseKey?: BaseKey; fadeSec?: number }
  ): Promise<void> {
    if (!this.engine?.isPlaying()) return;
    const settings = readBinauralPlayerSettings();
    this.preset = preset;
    this.ambientId = ambientId;
    this.baseKey = options?.baseKey ?? settings.baseKey;
    const fadeSec = options?.fadeSec ?? settings.fadeSec;
    await this.engine.applyChanges(this.resolvePreset(preset), ambientId, { fadeSec });
    this.setupMediaSession(preset);
    this.emit();
  }

  hasPendingChanges(presetId: string, ambientId: AmbientSoundId, baseKey?: BaseKey): boolean {
    if (!this.engine?.isPlaying()) return false;
    const key = baseKey ?? readBinauralPlayerSettings().baseKey;
    return this.preset?.id !== presetId || this.ambientId !== ambientId || this.baseKey !== key;
  }

  setVolumes(volumes: { master: number; binaural: number; ambient: number }): void {
    this.volumes = volumes;
    if (!this.engine) return;
    this.engine.setMasterVolume(volumes.master);
    this.engine.setBinauralVolume(volumes.binaural);
    this.engine.setAmbientVolume(volumes.ambient);
  }

  resumeAudio(): void {
    void this.engine?.resumeIfSuspended();
    void this.engine?.resumeAfterInterrupt();
    void sharedBackgroundAudioSession.resumeAll();
  }

  stopAlarm(): void {
    this.alarmRef?.stop();
    this.alarmRef = null;
    this.isAlarmRinging = false;
    stopSwAlarm();
    this.emit();
  }

  startAlarm(title: string, body: string, options?: { skipSwNotify?: boolean }): void {
    if (this.alarmRef?.isActive()) return;
    this.isAlarmRinging = true;
    const alarm = new AlarmEngine();
    this.alarmRef = alarm;
    alarm.start();
    if (!options?.skipSwNotify) {
      fireSwAlarm(title, body, "binaural");
    }
    triggerAirplaneModeShortcutIfEnabled();
    this.emit();
  }

  /** Called when Service Worker timer fires while page may be suspended. */
  onTimerExpiredFromSw(title: string, body: string): void {
    this.clearTick();
    this.engine?.stop();
    this.engine = null;
    this.endAtRef = 0;
    this.releaseBackgroundSession();
    this.clearMediaSession();
    this.startAlarm(title, body, { skipSwNotify: true });
  }

  private handleTimerEnd(): void {
    stopSwAlarm();
    this.onTimerExpiredFromSw("タイマー終了", "バイノーラルビートのセッションが終わりました");
  }

  private clearTick(): void {
    if (this.tickRef) {
      clearInterval(this.tickRef);
      this.tickRef = null;
    }
  }

  private releaseBackgroundSession(): void {
    this.ctxUnregister?.();
    this.ctxUnregister = null;
    sharedBackgroundAudioSession.release(this.bgResumeHandler);
  }

  private setupMediaSession(preset: BinauralBeatPreset): void {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `${preset.emoji} ${preset.label}`,
        artist: "つゆくさ バイノーラルビート",
        album: "つゆくさアプリ",
      });
      navigator.mediaSession.playbackState = "playing";
    } catch {
      /* ignore */
    }
  }

  private clearMediaSession(): void {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.playbackState = "none";
      navigator.mediaSession.metadata = null;
    } catch {
      /* ignore */
    }
  }
}

export const binauralPlaybackManager = new BinauralPlaybackManager();
