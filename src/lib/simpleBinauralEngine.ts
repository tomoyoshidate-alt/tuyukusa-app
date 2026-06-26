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

type EngineNodes = {
  leftOsc: OscillatorNode;
  rightOsc: OscillatorNode;
  binauralGain: GainNode;
  ambientGain: GainNode;
  rhythmGain: GainNode;
  ambientAudio: HTMLAudioElement | null;
  ambientSource: MediaElementAudioSourceNode | null;
};

export type BinauralPlaybackSnapshot = {
  playing: boolean;
  presetId: string;
};

class SimpleBinauralEngine {
  private nodes: EngineNodes | null = null;
  private scheduler = new RhythmScheduler();
  private isPlaying = false;
  private presetId = "relax";
  private ambientId: AmbientId = "none";
  private volumes: LayerVolumes = { binaural: 0.5, ambient: 0.35, rhythm: 0.4 };
  private stopTimer: ReturnType<typeof setTimeout> | null = null;
  private generation = 0;
  private listeners = new Set<(snapshot: BinauralPlaybackSnapshot) => void>();

  get playing(): boolean {
    return this.isPlaying;
  }

  get currentPresetId(): string {
    return this.presetId;
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
    if (!audioCtx || !this.nodes) return;
    const t = audioCtx.currentTime;
    this.nodes.binauralGain.gain.setTargetAtTime(this.volumes.binaural, t, 0.05);
    this.nodes.ambientGain.gain.setTargetAtTime(this.volumes.ambient, t, 0.05);
    this.nodes.rhythmGain.gain.setTargetAtTime(this.volumes.rhythm, t, 0.05);
  }

  getVolumes(): LayerVolumes {
    return { ...this.volumes };
  }

  async setAmbient(id: AmbientId): Promise<void> {
    this.ambientId = id;
    if (!this.isPlaying) return;
    await this.restartAmbient();
  }

  async setPreset(id: string): Promise<void> {
    this.presetId = id;
    this.notify();
    if (!this.isPlaying) return;
    await this.stop();
    await this.play();
  }

  /** Toggle playback for a preset — shared by chat and binaural tab. */
  async playPreset(presetId: string): Promise<void> {
    if (this.isPlaying && this.presetId === presetId) {
      await this.stop();
      return;
    }
    this.presetId = presetId;
    if (this.isPlaying) await this.stop();
    await this.play();
  }

  private async restartAmbient(): Promise<void> {
    if (!audioCtx || !this.nodes) return;
    this.cleanupAmbient();
    await this.startAmbient(audioCtx, this.nodes.ambientGain);
  }

  private cleanupAmbient(): void {
    if (!this.nodes) return;
    const { ambientAudio, ambientSource } = this.nodes;
    if (ambientAudio) {
      try {
        ambientAudio.pause();
        ambientAudio.src = "";
      } catch {
        /* ignore */
      }
    }
    if (ambientSource) {
      try {
        ambientSource.disconnect();
      } catch {
        /* ignore */
      }
    }
    this.nodes.ambientAudio = null;
    this.nodes.ambientSource = null;
  }

  private async startAmbient(ctx: AudioContext, ambientGain: GainNode): Promise<void> {
    if (!this.nodes || this.ambientId === "none") return;

    const fileMap: Record<Exclude<AmbientId, "none">, string> = {
      mizutama: "mizutama.mp3",
      uchu: "uchu.mp3",
      tori: "tori.mp3",
      umi: "umi.mp3",
    };
    const fileName = fileMap[this.ambientId];
    const url = getSupabaseAmbientUrl(fileName);
    if (!url) return;

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

      const source = ctx.createMediaElementSource(audio);
      source.connect(ambientGain);
      await audio.play();

      this.nodes.ambientAudio = audio;
      this.nodes.ambientSource = source;
    } catch {
      /* 404 or missing — stay silent */
    }
  }

  private startBinauralOscillators(ctx: AudioContext, preset: Preset, binauralGain: GainNode): {
    leftOsc: OscillatorNode;
    rightOsc: OscillatorNode;
  } {
    const leftOsc = ctx.createOscillator();
    leftOsc.type = "sine";
    leftOsc.frequency.value = CARRIER;

    const rightOsc = ctx.createOscillator();
    rightOsc.type = "sine";
    rightOsc.frequency.value = CARRIER + preset.beatHz;

    const leftPan = ctx.createStereoPanner();
    leftPan.pan.value = -1;
    const rightPan = ctx.createStereoPanner();
    rightPan.pan.value = 1;

    leftOsc.connect(leftPan);
    leftPan.connect(binauralGain);
    rightOsc.connect(rightPan);
    rightPan.connect(binauralGain);

    const startAt = ctx.currentTime + FADE_SEC;
    leftOsc.start(startAt);
    rightOsc.start(startAt);

    return { leftOsc, rightOsc };
  }

  async play(): Promise<void> {
    if (!audioCtx || this.isPlaying) return;
    this.generation++;
    if (this.stopTimer) {
      clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }
    await resumeAudioCtx();

    const ctx = audioCtx;
    const preset = getPresetById(this.presetId);
    const now = ctx.currentTime;

    const binauralGain = ctx.createGain();
    const ambientGain = ctx.createGain();
    const rhythmGain = ctx.createGain();

    binauralGain.gain.setValueAtTime(0, now);
    ambientGain.gain.setValueAtTime(0, now);
    rhythmGain.gain.setValueAtTime(0, now);

    binauralGain.connect(ctx.destination);
    ambientGain.connect(ctx.destination);
    rhythmGain.connect(ctx.destination);

    const fadeEnd = now + FADE_SEC;
    binauralGain.gain.linearRampToValueAtTime(this.volumes.binaural, fadeEnd);
    ambientGain.gain.linearRampToValueAtTime(this.volumes.ambient, fadeEnd);
    rhythmGain.gain.linearRampToValueAtTime(this.volumes.rhythm, fadeEnd);

    const { leftOsc, rightOsc } = this.startBinauralOscillators(ctx, preset, binauralGain);

    this.nodes = {
      leftOsc,
      rightOsc,
      binauralGain,
      ambientGain,
      rhythmGain,
      ambientAudio: null,
      ambientSource: null,
    };

    await this.startAmbient(ctx, ambientGain);
    this.scheduler.start(ctx, preset.poly, rhythmGain, fadeEnd);
    this.isPlaying = true;
    this.notify();
  }

  async stop(): Promise<void> {
    if (!audioCtx || !this.isPlaying || !this.nodes) return;

    const ctx = audioCtx;
    const nodes = this.nodes;
    const now = ctx.currentTime;
    const fadeEnd = now + FADE_SEC;

    this.scheduler.stop();
    this.isPlaying = false;
    this.notify();

    nodes.binauralGain.gain.cancelScheduledValues(now);
    nodes.ambientGain.gain.cancelScheduledValues(now);
    nodes.rhythmGain.gain.cancelScheduledValues(now);
    nodes.binauralGain.gain.setValueAtTime(nodes.binauralGain.gain.value, now);
    nodes.ambientGain.gain.setValueAtTime(nodes.ambientGain.gain.value, now);
    nodes.rhythmGain.gain.setValueAtTime(nodes.rhythmGain.gain.value, now);
    nodes.binauralGain.gain.linearRampToValueAtTime(0, fadeEnd);
    nodes.ambientGain.gain.linearRampToValueAtTime(0, fadeEnd);
    nodes.rhythmGain.gain.linearRampToValueAtTime(0, fadeEnd);

    if (this.stopTimer) clearTimeout(this.stopTimer);
    const gen = ++this.generation;
    this.stopTimer = setTimeout(() => {
      if (gen !== this.generation) return;
      try {
        nodes.leftOsc.stop();
        nodes.rightOsc.stop();
      } catch {
        /* ignore */
      }
      this.cleanupAmbient();
      try {
        nodes.binauralGain.disconnect();
        nodes.ambientGain.disconnect();
        nodes.rhythmGain.disconnect();
      } catch {
        /* ignore */
      }
      this.nodes = null;
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
