import { audioCtx, resumeAudioCtx } from "@/src/lib/audioContext";
import {
  CARRIER,
  getPresetById,
  type AmbientId,
  type Preset,
} from "@/src/lib/simpleBinauralPresets";

const FADE_SEC = 1.5;
const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_SEC = 0.1;

/** linearRampToValueAtTime を使用。厳密な音量維持には将来 equal-power（cos/sin）へ差し替え可。 */
export function clampCrossfadeSec(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(3000, value);
}

/** Short synth hit — swap this function later for one-shot samples. */
export function playHitSound(
  ctx: AudioContext,
  freq: number,
  pan: -1 | 1,
  when: number,
  outputGain: GainNode
): void {
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = freq;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0, when);
  env.gain.linearRampToValueAtTime(1, when + 0.003);
  env.gain.exponentialRampToValueAtTime(0.001, when + 0.123);

  const panner = ctx.createStereoPanner();
  panner.pan.value = pan;

  osc.connect(env);
  env.connect(panner);
  panner.connect(outputGain);

  osc.start(when);
  osc.stop(when + 0.15);
}

function getSupabaseAmbientUrl(fileName: string): string | null {
  if (typeof window === "undefined") return null;
  const base = localStorage.getItem("supabaseUrl")?.replace(/\/$/, "");
  if (!base) return null;
  return `${base}/storage/v1/object/public/audio/ambient/${fileName}`;
}

type LayerVolumes = {
  binaural: number;
  ambient: number;
  rhythm: number;
};

type MasterGraph = {
  masterGain: GainNode;
  binauralUserGain: GainNode;
  rhythmUserGain: GainNode;
  envUserGain: GainNode;
};

class RhythmScheduler {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private cycleStart = 0;
  private poly: Preset["poly"] | null = null;
  private rhythmGain: GainNode | null = null;
  private playing = false;

  start(ctx: AudioContext, poly: Preset["poly"], rhythmGain: GainNode, startAt: number): void {
    this.poly = poly;
    this.rhythmGain = rhythmGain;
    this.playing = true;
    this.cycleStart = startAt;
    this.intervalId = setInterval(() => this.tick(ctx), LOOKAHEAD_MS);
  }

  private tick(ctx: AudioContext): void {
    if (!this.playing || !this.poly || !this.rhythmGain) return;
    const now = ctx.currentTime;
    const horizon = now + SCHEDULE_AHEAD_SEC;
    const cycleDur = 60 / this.poly.bpm;

    while (this.cycleStart < horizon) {
      for (let i = 0; i < this.poly.l; i++) {
        const t = this.cycleStart + (i / this.poly.l) * cycleDur;
        if (t >= now && t < horizon) {
          playHitSound(ctx, this.poly.lHz, -1, t, this.rhythmGain);
        }
      }
      for (let j = 0; j < this.poly.r; j++) {
        const t = this.cycleStart + (j / this.poly.r) * cycleDur;
        if (t >= now && t < horizon) {
          playHitSound(ctx, this.poly.rHz, 1, t, this.rhythmGain);
        }
      }
      this.cycleStart += cycleDur;
    }
  }

  stop(): void {
    this.playing = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.poly = null;
    this.rhythmGain = null;
  }
}

class Voice {
  readonly preset: Preset;
  readonly leftOsc: OscillatorNode;
  readonly rightOsc: OscillatorNode;
  readonly binauralXfadeGain: GainNode;
  readonly rhythmXfadeGain: GainNode;
  readonly scheduler = new RhythmScheduler();
  private destroyed = false;

  constructor(
    ctx: AudioContext,
    preset: Preset,
    binauralUserGain: GainNode,
    rhythmUserGain: GainNode,
    xfadeInitial: number
  ) {
    this.preset = preset;

    this.binauralXfadeGain = ctx.createGain();
    this.binauralXfadeGain.gain.value = xfadeInitial;
    this.rhythmXfadeGain = ctx.createGain();
    this.rhythmXfadeGain.gain.value = xfadeInitial;

    this.binauralXfadeGain.connect(binauralUserGain);
    this.rhythmXfadeGain.connect(rhythmUserGain);

    this.leftOsc = ctx.createOscillator();
    this.leftOsc.type = "sine";
    this.leftOsc.frequency.value = CARRIER;

    this.rightOsc = ctx.createOscillator();
    this.rightOsc.type = "sine";
    this.rightOsc.frequency.value = CARRIER + preset.beatHz;

    const leftPan = ctx.createStereoPanner();
    leftPan.pan.value = -1;
    const rightPan = ctx.createStereoPanner();
    rightPan.pan.value = 1;

    this.leftOsc.connect(leftPan);
    leftPan.connect(this.binauralXfadeGain);
    this.rightOsc.connect(rightPan);
    rightPan.connect(this.binauralXfadeGain);
  }

  start(ctx: AudioContext, when: number): void {
    if (this.destroyed) return;
    this.leftOsc.start(when);
    this.rightOsc.start(when);
    this.scheduler.start(ctx, this.preset.poly, this.rhythmXfadeGain, when);
  }

  destroyNow(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scheduler.stop();
    try {
      this.leftOsc.stop();
      this.rightOsc.stop();
    } catch {
      /* ignore */
    }
    try {
      this.binauralXfadeGain.disconnect();
      this.rhythmXfadeGain.disconnect();
    } catch {
      /* ignore */
    }
  }
}

type AmbientLayer = {
  envXfadeGain: GainNode;
  audio: HTMLAudioElement | null;
  source: MediaElementAudioSourceNode | null;
};

export type BinauralPlaybackSnapshot = {
  playing: boolean;
  presetId: string;
};

class SimpleBinauralEngine {
  private master: MasterGraph | null = null;
  private currentVoice: Voice | null = null;
  private activeVoices = new Set<Voice>();
  private currentAmbient: AmbientLayer | null = null;
  private isPlaying = false;
  private presetId = "relax";
  private ambientId: AmbientId = "none";
  private volumes: LayerVolumes = { binaural: 0.5, ambient: 0.35, rhythm: 0.4 };
  private crossfadeSec = 3;
  private stopTimer: ReturnType<typeof setTimeout> | null = null;
  private stopGeneration = 0;
  private crossfadeGeneration = 0;
  private listeners = new Set<(snapshot: BinauralPlaybackSnapshot) => void>();

  get playing(): boolean {
    return this.isPlaying;
  }

  get currentPresetId(): string {
    return this.presetId;
  }

  getCrossfadeSec(): number {
    return this.crossfadeSec;
  }

  getSnapshot(): BinauralPlaybackSnapshot {
    return { playing: this.isPlaying, presetId: this.presetId };
  }

  subscribe(listener: (snapshot: BinauralPlaybackSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const snapshot = this.getSnapshot();
    this.listeners.forEach(listener => listener(snapshot));
  }

  setVolumes(volumes: Partial<LayerVolumes>): void {
    this.volumes = { ...this.volumes, ...volumes };
    if (!audioCtx || !this.master) return;
    const t = audioCtx.currentTime;
    this.master.binauralUserGain.gain.setTargetAtTime(this.volumes.binaural, t, 0.05);
    this.master.rhythmUserGain.gain.setTargetAtTime(this.volumes.rhythm, t, 0.05);
    this.master.envUserGain.gain.setTargetAtTime(this.volumes.ambient, t, 0.05);
  }

  getVolumes(): LayerVolumes {
    return { ...this.volumes };
  }

  private buildMaster(ctx: AudioContext): MasterGraph {
    const masterGain = ctx.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(ctx.destination);

    const binauralUserGain = ctx.createGain();
    const rhythmUserGain = ctx.createGain();
    const envUserGain = ctx.createGain();

    binauralUserGain.connect(masterGain);
    rhythmUserGain.connect(masterGain);
    envUserGain.connect(masterGain);

    return { masterGain, binauralUserGain, rhythmUserGain, envUserGain };
  }

  private trackVoice(voice: Voice): void {
    this.activeVoices.add(voice);
  }

  private buildVoice(ctx: AudioContext, preset: Preset, xfadeInitial: number): Voice {
    const voice = new Voice(
      ctx,
      preset,
      this.master!.binauralUserGain,
      this.master!.rhythmUserGain,
      xfadeInitial
    );
    this.trackVoice(voice);
    return voice;
  }

  private destroyAllVoices(): void {
    for (const voice of this.activeVoices) {
      voice.destroyNow();
    }
    this.activeVoices.clear();
    this.currentVoice = null;
  }

  private destroyAmbientLayer(layer: AmbientLayer): void {
    if (layer.audio) {
      try {
        layer.audio.pause();
        layer.audio.src = "";
      } catch {
        /* ignore */
      }
    }
    if (layer.source) {
      try {
        layer.source.disconnect();
      } catch {
        /* ignore */
      }
    }
    try {
      layer.envXfadeGain.disconnect();
    } catch {
      /* ignore */
    }
  }

  private rampXfadeGains(now: number, gains: AudioParam[], end: number, target: number): void {
    for (const gain of gains) {
      gain.cancelScheduledValues(now);
      gain.setValueAtTime(gain.value, now);
      gain.linearRampToValueAtTime(target, end);
    }
  }

  /**
   * プリセット切替。再生中かつ crossfadeSec > 0 なら新旧ボイスをクロスフェード。
   */
  setPreset(id: string, crossfadeSec: number, isPlaying = this.isPlaying): void {
    this.crossfadeSec = clampCrossfadeSec(crossfadeSec);
    this.presetId = id;
    this.notify();

    if (!isPlaying || !audioCtx || !this.master) return;

    const preset = getPresetById(id);
    const ctx = audioCtx;
    const now = ctx.currentTime;
    const fade = this.crossfadeSec;

    if (!isPlaying || fade <= 0 || !this.currentVoice) {
      this.currentVoice?.destroyNow();
      this.activeVoices.clear();
      const voice = this.buildVoice(ctx, preset, 1);
      if (isPlaying) voice.start(ctx, now);
      this.currentVoice = voice;
      return;
    }

    const oldVoice = this.currentVoice;
    const newVoice = this.buildVoice(ctx, preset, 0);
    newVoice.start(ctx, now);

    const end = now + fade;
    this.rampXfadeGains(now, [oldVoice.binauralXfadeGain.gain, oldVoice.rhythmXfadeGain.gain], end, 0);
    this.rampXfadeGains(now, [newVoice.binauralXfadeGain.gain, newVoice.rhythmXfadeGain.gain], end, 1);

    this.crossfadeGeneration++;
    setTimeout(() => {
      oldVoice.destroyNow();
      this.activeVoices.delete(oldVoice);
    }, fade * 1000 + 200);

    this.currentVoice = newVoice;
  }

  async setAmbient(id: AmbientId, crossfadeSec?: number): Promise<void> {
    this.ambientId = id;
    const fade = clampCrossfadeSec(crossfadeSec ?? this.crossfadeSec);
    if (!this.isPlaying || !audioCtx || !this.master) return;
    await this.crossfadeAmbient(fade);
  }

  private async loadAmbientSource(ctx: AudioContext, ambientId: Exclude<AmbientId, "none">): Promise<AmbientLayer | null> {
    const fileMap: Record<Exclude<AmbientId, "none">, string> = {
      mizutama: "mizutama.mp3",
      uchu: "uchu.mp3",
      tori: "tori.mp3",
      umi: "umi.mp3",
    };
    const url = getSupabaseAmbientUrl(fileMap[ambientId]);
    if (!url) return null;

    try {
      const audio = new Audio();
      audio.loop = true;
      audio.crossOrigin = "anonymous";
      audio.src = url;
      audio.load();

      await new Promise<void>((resolve, reject) => {
        const onCanPlay = () => {
          audio.removeEventListener("canplaythrough", onCanPlay);
          audio.removeEventListener("error", onError);
          resolve();
        };
        const onError = () => {
          audio.removeEventListener("canplaythrough", onCanPlay);
          audio.removeEventListener("error", onError);
          reject(new Error("ambient load failed"));
        };
        audio.addEventListener("canplaythrough", onCanPlay);
        audio.addEventListener("error", onError);
      });

      const envXfadeGain = ctx.createGain();
      const source = ctx.createMediaElementSource(audio);
      source.connect(envXfadeGain);
      await audio.play();

      return { envXfadeGain, audio, source };
    } catch {
      return null;
    }
  }

  private async crossfadeAmbient(crossfadeSec: number): Promise<void> {
    if (!audioCtx || !this.master) return;
    const ctx = audioCtx;
    const now = ctx.currentTime;
    const oldAmbient = this.currentAmbient;

    const fadeOutOld = (layer: AmbientLayer, onDone: () => void): void => {
      if (crossfadeSec <= 0) {
        this.destroyAmbientLayer(layer);
        onDone();
        return;
      }
      layer.envXfadeGain.gain.cancelScheduledValues(now);
      layer.envXfadeGain.gain.setValueAtTime(layer.envXfadeGain.gain.value, now);
      layer.envXfadeGain.gain.linearRampToValueAtTime(0, now + crossfadeSec);
      setTimeout(onDone, crossfadeSec * 1000 + 200);
    };

    if (this.ambientId === "none") {
      if (!oldAmbient) return;
      this.currentAmbient = null;
      fadeOutOld(oldAmbient, () => {});
      return;
    }

    const newAmbient = await this.loadAmbientSource(ctx, this.ambientId);
    if (!newAmbient) {
      if (oldAmbient) {
        fadeOutOld(oldAmbient, () => {
          if (this.currentAmbient === oldAmbient) this.currentAmbient = null;
        });
      }
      return;
    }

    newAmbient.envXfadeGain.connect(this.master.envUserGain);

    if (!oldAmbient || crossfadeSec <= 0) {
      if (oldAmbient) this.destroyAmbientLayer(oldAmbient);
      newAmbient.envXfadeGain.gain.value = 1;
      this.currentAmbient = newAmbient;
      return;
    }

    newAmbient.envXfadeGain.gain.cancelScheduledValues(now);
    newAmbient.envXfadeGain.gain.setValueAtTime(0, now);
    oldAmbient.envXfadeGain.gain.cancelScheduledValues(now);
    oldAmbient.envXfadeGain.gain.setValueAtTime(oldAmbient.envXfadeGain.gain.value, now);

    const end = now + crossfadeSec;
    oldAmbient.envXfadeGain.gain.linearRampToValueAtTime(0, end);
    newAmbient.envXfadeGain.gain.linearRampToValueAtTime(1, end);

    const oldRef = oldAmbient;
    setTimeout(() => {
      this.destroyAmbientLayer(oldRef);
    }, crossfadeSec * 1000 + 200);

    this.currentAmbient = newAmbient;
  }

  /** Toggle playback for a preset — shared by chat and binaural tab. */
  async playPreset(presetId: string): Promise<void> {
    if (this.isPlaying && this.presetId === presetId) {
      await this.stop();
      return;
    }

    if (this.isPlaying && this.presetId !== presetId) {
      this.setPreset(presetId, this.crossfadeSec, true);
      return;
    }

    this.presetId = presetId;
    this.notify();
    if (!this.isPlaying) await this.play();
  }

  async play(): Promise<void> {
    if (!audioCtx || this.isPlaying) return;

    if (this.stopTimer) {
      clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }
    this.stopGeneration++;

    await resumeAudioCtx();
    const ctx = audioCtx;
    const now = ctx.currentTime;
    const preset = getPresetById(this.presetId);

    this.master = this.buildMaster(ctx);

    this.master.binauralUserGain.gain.setValueAtTime(0, now);
    this.master.rhythmUserGain.gain.setValueAtTime(0, now);
    this.master.envUserGain.gain.setValueAtTime(0, now);

    const fadeEnd = now + FADE_SEC;
    this.master.binauralUserGain.gain.linearRampToValueAtTime(this.volumes.binaural, fadeEnd);
    this.master.rhythmUserGain.gain.linearRampToValueAtTime(this.volumes.rhythm, fadeEnd);
    this.master.envUserGain.gain.linearRampToValueAtTime(this.volumes.ambient, fadeEnd);

    this.destroyAllVoices();
    const voice = this.buildVoice(ctx, preset, 1);
    voice.start(ctx, fadeEnd);
    this.currentVoice = voice;

    if (this.ambientId !== "none") {
      const ambient = await this.loadAmbientSource(ctx, this.ambientId);
      if (ambient && this.master) {
        ambient.envXfadeGain.gain.value = 1;
        ambient.envXfadeGain.connect(this.master.envUserGain);
        this.currentAmbient = ambient;
      }
    }

    this.isPlaying = true;
    this.notify();
  }

  async stop(): Promise<void> {
    if (!audioCtx || !this.isPlaying || !this.master) return;

    const ctx = audioCtx;
    const master = this.master;
    const now = ctx.currentTime;
    const fadeEnd = now + FADE_SEC;

    this.crossfadeGeneration++;

    for (const voice of this.activeVoices) {
      voice.scheduler.stop();
    }

    this.isPlaying = false;
    this.notify();

    master.binauralUserGain.gain.cancelScheduledValues(now);
    master.rhythmUserGain.gain.cancelScheduledValues(now);
    master.envUserGain.gain.cancelScheduledValues(now);
    master.binauralUserGain.gain.setValueAtTime(master.binauralUserGain.gain.value, now);
    master.rhythmUserGain.gain.setValueAtTime(master.rhythmUserGain.gain.value, now);
    master.envUserGain.gain.setValueAtTime(master.envUserGain.gain.value, now);
    master.binauralUserGain.gain.linearRampToValueAtTime(0, fadeEnd);
    master.rhythmUserGain.gain.linearRampToValueAtTime(0, fadeEnd);
    master.envUserGain.gain.linearRampToValueAtTime(0, fadeEnd);

    if (this.stopTimer) clearTimeout(this.stopTimer);
    const gen = ++this.stopGeneration;
    this.stopTimer = setTimeout(() => {
      if (gen !== this.stopGeneration) return;
      this.destroyAllVoices();
      if (this.currentAmbient) {
        this.destroyAmbientLayer(this.currentAmbient);
        this.currentAmbient = null;
      }
      try {
        master.binauralUserGain.disconnect();
        master.rhythmUserGain.disconnect();
        master.envUserGain.disconnect();
        master.masterGain.disconnect();
      } catch {
        /* ignore */
      }
      this.master = null;
      this.stopTimer = null;
    }, FADE_SEC * 1000 + 50);
  }

  async toggle(): Promise<void> {
    if (this.isPlaying) await this.stop();
    else await this.play();
  }

  async toggleCurrentPreset(): Promise<void> {
    await this.playPreset(this.presetId);
  }
}

export const simpleBinauralEngine = new SimpleBinauralEngine();
